import type { BlockTimeline, LayoutNode } from "../types";

interface TimelineNodeEntry {
  blockId: string;
  timelines: BlockTimeline[];
}

function hasTimelineContent(t: BlockTimeline): boolean {
  return t.tracks.some((track) => track.keyframes.length > 0) || t.cssVarTracks.some((track) => track.keyframes.length > 0) || t.clipPathTracks.some((track) => track.keyframes.length > 0);
}

function collectTimelineNodes(nodes: LayoutNode[], out: TimelineNodeEntry[] = []): TimelineNodeEntry[] {
  for (const node of nodes) {
    const timelines = (node.timelines ?? []).filter(hasTimelineContent);
    if (timelines.length) out.push({ blockId: node.id, timelines });
    if (node.children?.length) collectTimelineNodes(node.children, out);
  }
  return out;
}

function countItineraryRoadmaps(nodes: LayoutNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (node.type === "ItineraryRoadmap") count++;
    if (node.children?.length) count += countItineraryRoadmaps(node.children);
  }
  return count;
}

/**
 * The runtime half of this export: plain DOM/GSAP functions, emitted as a
 * literal string rather than called directly, since they execute in the
 * *published page's* browser — not here at export time. Ported from
 * apps/web/src/components/builder/AnimatedBox.tsx (the real component that
 * drives these same `node.timelines` today) so behavior matches exactly.
 * One deliberate difference: AnimatedBox mounts an extra wrapper `<div ref>`
 * around each animated block and resolves stagger targets via
 * `el.firstElementChild.children`; the exported static HTML has no such
 * wrapper — `[data-block-id]` (see LayoutRenderer/exportPage.tsx) *is* the
 * target element, so stagger targets are `el.children` directly instead.
 */
const RUNTIME_SOURCE = `
document.addEventListener("DOMContentLoaded", function () {
  if (typeof gsap === "undefined") return;
  if (typeof ScrollTrigger !== "undefined") gsap.registerPlugin(ScrollTrigger);
  if (typeof SplitText !== "undefined") gsap.registerPlugin(SplitText);

  // ── Unified BlockTimeline (v2) runtime — one execution path for every
  // trigger mode, replacing the old separate NodeAnimationConfig (from/to
  // tween) and BlockTimeline (keyframe-only) systems. ──────────────────────

  function gsapPropName(prop) {
    if (prop === "rotate") return "rotation";
    if (prop === "borderRadius") return "borderRadius"; // number in the data model, gsap accepts px implicitly via the unit-suffixed variant below
    return prop;
  }

  function gsapPropValue(prop, value) {
    if (prop === "borderRadius" && typeof value === "number") return value + "px";
    return value;
  }

  // One .to()/.set() call per segment between consecutive keyframes on one
  // track — "hold" interpolation emits a zero-duration .set() at the
  // segment's start instead of a tween, producing the step-function jump at
  // the NEXT keyframe's time rather than a gradual change.
  function forEachSegment(bt, addTween, addSet) {
    (bt.tracks || []).forEach(function (track) {
      var kfs = track.keyframes.slice().sort(function (a, b) { return a.time - b.time; });
      if (kfs.length === 1) { addSet((function () { var v = {}; v[gsapPropName(track.property)] = gsapPropValue(track.property, kfs[0].value); return v; })(), kfs[0].time); return; }
      for (var i = 0; i < kfs.length - 1; i++) {
        var a = kfs[i], b = kfs[i + 1];
        var dur = b.time - a.time;
        if (dur <= 0) continue;
        var prop = gsapPropName(track.property);
        if (a.interpolation === "hold") {
          var holdVars = {}; holdVars[prop] = gsapPropValue(track.property, a.value);
          addSet(holdVars, a.time);
          var jumpVars = {}; jumpVars[prop] = gsapPropValue(track.property, b.value);
          addSet(jumpVars, b.time);
        } else {
          // .to() only animates FROM whatever the element's live rendered
          // value already is — without this .set(), the first segment's
          // authored "from" value (the common single from->to case) was
          // silently ignored: an untouched DOM node rarely already matches
          // "from", so the "tween" ran between two identical values.
          if (i === 0) { var startVars = {}; startVars[prop] = gsapPropValue(track.property, a.value); addSet(startVars, a.time); }
          var vars = { duration: dur, ease: a.easingOut === "none" || a.easingOut === "linear" ? "none" : a.easingOut };
          vars[prop] = gsapPropValue(track.property, b.value);
          addTween(vars, a.time);
        }
      }
    });
    (bt.cssVarTracks || []).forEach(function (track) {
      var kfs = track.keyframes.slice().sort(function (a, b) { return a.time - b.time; });
      if (kfs.length === 1) { var v = {}; v[track.varName] = kfs[0].value; addSet(v, kfs[0].time); return; }
      for (var i = 0; i < kfs.length - 1; i++) {
        var a = kfs[i], b = kfs[i + 1];
        var dur = b.time - a.time;
        if (dur <= 0) continue;
        if (a.interpolation === "hold") {
          var hv = {}; hv[track.varName] = a.value; addSet(hv, a.time);
          var jv = {}; jv[track.varName] = b.value; addSet(jv, b.time);
        } else {
          if (i === 0) { var startCv = {}; startCv[track.varName] = a.value; addSet(startCv, a.time); }
          var cvars = { duration: dur, ease: a.easingOut === "none" || a.easingOut === "linear" ? "none" : a.easingOut };
          cvars[track.varName] = b.value;
          addTween(cvars, a.time);
        }
      }
    });
    (bt.clipPathTracks || []).forEach(function (track) {
      var kfs = track.keyframes.slice().sort(function (a, b) { return a.time - b.time; });
      if (kfs.length === 1) { addSet({ clipPath: kfs[0].value }, kfs[0].time); return; }
      for (var i = 0; i < kfs.length - 1; i++) {
        var a = kfs[i], b = kfs[i + 1];
        var dur = b.time - a.time;
        if (dur <= 0) continue;
        if (a.interpolation === "hold") {
          addSet({ clipPath: a.value }, a.time);
          addSet({ clipPath: b.value }, b.time);
        } else {
          if (i === 0) addSet({ clipPath: a.value }, a.time);
          addTween({ clipPath: b.value, duration: dur, ease: a.easingOut === "none" || a.easingOut === "linear" ? "none" : a.easingOut }, a.time);
        }
      }
    });
  }

  // splitText's unit count depends on the target's actual rendered text and
  // viewport-driven wrapping — only knowable here, in the target page's own
  // browser, not at author/export time (see timelineGenerators.ts). Absent
  // splitText, "stagger" (if set) applies to the node's own direct children
  // instead — same as the old staggerChildren:true behavior.
  function resolveTargets(el, bt) {
    if (bt.splitText && typeof SplitText !== "undefined") {
      var split = new SplitText(el, { type: bt.splitText });
      var units = bt.splitText === "chars" ? split.chars : bt.splitText === "words" ? split.words : split.lines;
      if (units && units.length > 0) return units;
    }
    if (bt.stagger) {
      var children = Array.prototype.slice.call(el.children);
      if (children.length > 0) return children;
    }
    return el;
  }

  function buildTimeline(target, bt) {
    var tl = gsap.timeline({
      paused: true,
      repeat: bt.repeat || 0,
      yoyo: bt.yoyo || false,
      repeatDelay: bt.repeatDelay || 0,
      delay: bt.delay || 0,
    });
    // stagger is a per-tween option, not a timeline-constructor one —
    // gsap.timeline() silently ignores an unrecognized stagger var, so
    // Split Text/Stagger Children never actually staggered anything even
    // though the value made it this far. It has to ride on each .to() call
    // instead, applied only to the tween (not the initial .set() below) so
    // every target still starts from its "from" value at once and only the
    // tween-in is staggered across them.
    var staggerVars = (target !== undefined && target.length !== undefined && bt.stagger) ? {
      amount: bt.stagger.amount,
      from: bt.stagger.from === "edges" ? "edges" : bt.stagger.from,
      grid: bt.stagger.grid || undefined,
      ease: bt.stagger.ease === "none" || bt.stagger.ease === "linear" ? "none" : bt.stagger.ease,
    } : undefined;
    forEachSegment(bt,
      function (vars, offset) { if (staggerVars) vars.stagger = staggerVars; tl.to(target, vars, offset); },
      function (vars, offset) { tl.set(target, vars, offset); }
    );
    return tl;
  }

  function bindTimeline(el, bt) {
    var mode = bt.trigger && bt.trigger.mode;

    if (mode === "onMount") {
      var mountTarget = resolveTargets(el, bt);
      buildTimeline(mountTarget, bt).play();
    } else if (mode === "onScroll") {
      var scrollTarget = resolveTargets(el, bt);
      var scrollTl = buildTimeline(scrollTarget, bt);
      var cfg = bt.trigger.scrollConfig || { scrub: true, start: "top 80%", end: "bottom 20%", pin: false };
      if (typeof ScrollTrigger !== "undefined") {
        ScrollTrigger.create({ trigger: el, start: cfg.start, end: cfg.end, scrub: cfg.scrub, pin: cfg.pin, animation: scrollTl });
        scrollTl.play();
      }
    } else if (mode === "onHover") {
      var hoverTl = buildTimeline(el, bt);
      el.addEventListener("mouseenter", function () { hoverTl.play(); });
      el.addEventListener("mouseleave", function () { hoverTl.reverse(); });
    } else if (mode === "onClick") {
      var clickTl = buildTimeline(el, bt);
      el.addEventListener("click", function () {
        if (clickTl.reversed() || clickTl.progress() === 0) clickTl.play(); else clickTl.reverse();
      });
    } else if (mode === "onMouseMove") {
      var strength = (bt.trigger.mouseConfig && bt.trigger.mouseConfig.strength) || 30;
      var scope = bt.trigger.mouseConfig && bt.trigger.mouseConfig.scope;
      var restX = 0, restY = 0;
      (bt.tracks || []).forEach(function (t) {
        if (t.property === "x" && t.keyframes[0]) restX = t.keyframes[0].value;
        if (t.property === "y" && t.keyframes[0]) restY = t.keyframes[0].value;
      });
      var quickX = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3" });
      var quickY = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3" });
      if (scope === "element") {
        el.addEventListener("mousemove", function (e) {
          var rect = el.getBoundingClientRect();
          var relX = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
          var relY = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
          quickX(restX + relX * strength);
          quickY(restY + relY * strength);
        });
        el.addEventListener("mouseleave", function () { quickX(restX); quickY(restY); });
      } else {
        window.addEventListener("mousemove", function (e) {
          var relX = (e.clientX / window.innerWidth - 0.5) * 2;
          var relY = (e.clientY / window.innerHeight - 0.5) * 2;
          quickX(restX + relX * strength);
          quickY(restY + relY * strength);
        });
      }
    }
  }

  __EXR_NODE_TIMELINES__.forEach(function (entry) {
    var el = document.querySelector('[data-block-id="' + entry.blockId.replace(/"/g, '\\\\"') + '"]');
    if (!el) return;
    entry.timelines.forEach(function (bt) { bindTimeline(el, bt); });
  });

  // ── ItineraryRoadmap scroll-driven MotionPath ────────────────────────────
  // No per-node data needed here (unlike the loop above) — the road path's
  // "d" and the vehicle's "href" are already baked into this static HTML by
  // the block's own React render; this just finds-and-binds. Mirrors
  // ItineraryRoadmapBlock.tsx's own useEffect exactly, so scroll behavior
  // matches whether the page is live in this app or lifted out standalone.
  // Skips any instance whose own triggerMode was "timeline" — that opts
  // out of scroll-binding, and there's nothing in the static markup to tell
  // this script apart from a "scroll" instance other than this attribute.
  // The attribute lives on the component's own root, one level inside the
  // [data-block-type] wrapper LayoutRenderer/exportPage.ts add — hence a
  // descendant check here rather than folding it into the outer selector.
  if (typeof MotionPathPlugin !== "undefined") {
    gsap.registerPlugin(MotionPathPlugin);
    document.querySelectorAll('[data-block-type="ItineraryRoadmap"]').forEach(function (root) {
      if (root.querySelector('[data-itinerary-trigger="timeline"]')) return;
      var car = root.querySelector("[data-itinerary-car]");
      var path = root.querySelector("[data-itinerary-path]");
      if (!car || !path) return;
      gsap.set(car, { motionPath: { path: path, align: path, alignOrigin: [0.5, 0.5], autoRotate: true, start: 0, end: 0 } });
      gsap.to(car, {
        motionPath: { path: path, align: path, alignOrigin: [0.5, 0.5], autoRotate: true, start: 0, end: 1 },
        ease: "none",
        scrollTrigger: {
          trigger: root,
          start: "top center",
          end: "bottom center",
          scrub: 0.5,
          onUpdate: function (self) {
            var cards = root.querySelectorAll("[data-itinerary-card]");
            if (!cards.length) return;
            var idx = Math.min(cards.length - 1, Math.floor(self.progress * cards.length));
            cards.forEach(function (card, i) {
              card.style.opacity = i === idx ? "1" : "0.55";
              card.style.boxShadow = i === idx ? "0 0 32px 6px rgba(37,99,255,0.28)" : "none";
            });
          },
        },
      });
    });
  }
});`.trim();

/**
 * Generates a standalone GSAP script from a page's persisted
 * `node.timelines` (BlockTimeline[] — the unified animation model that
 * replaced the old separate `node.animations`/`node.timeline` split; see
 * types.ts's doc comment on LayoutNode.timelines). Each BlockTimeline
 * carries its own trigger, so a single node can fire multiple independent
 * animations (e.g. an onMount entrance and a separate onHover lift).
 *
 * Output requires GSAP core + the ScrollTrigger plugin (both free); the
 * MotionPathPlugin (also free) only if the page has an ItineraryRoadmap
 * block; the SplitText plugin (a GSAP Club bonus plugin) only if any
 * BlockTimeline sets `splitText` — omit whichever doesn't apply and that
 * piece simply no-ops, everything else still runs, since the runtime guards
 * every plugin with a `typeof` check before using it.
 */
export function generateGSAPScript(nodes: LayoutNode[]): string {
  const timelineEntries = collectTimelineNodes(nodes);
  const roadmapCount = countItineraryRoadmaps(nodes);

  const header = [
    "// ─────────────────────────────────────────────────────────────",
    "// Marwa Digital — Standalone Page Animation Export",
    `// Animated blocks: ${timelineEntries.length}  •  ItineraryRoadmap blocks: ${roadmapCount}`,
    "// Requires: gsap, gsap/ScrollTrigger (both free); gsap/MotionPathPlugin only if",
    "// this page has an ItineraryRoadmap block; gsap/SplitText only if any block below",
    "// uses splitText (GSAP Club bonus plugin — safe to omit, no-ops either way).",
    "// ─────────────────────────────────────────────────────────────",
  ].join("\n");

  if (timelineEntries.length === 0 && roadmapCount === 0) {
    return `${header}\n// No animated blocks on this page.`;
  }

  const runtime = RUNTIME_SOURCE.replace("__EXR_NODE_TIMELINES__", JSON.stringify(timelineEntries));
  return `${header}\n\n${runtime}`;
}
