"use client";

import { cloneElement, isValidElement, useEffect, useRef, type CSSProperties, type ReactElement, type ReactNode } from "react";
import type { BlockTimeline } from "@marwa/builder";
type SplitTextClass = typeof import("gsap/SplitText").SplitText;
type Gsap = typeof import("gsap").gsap;

/**
 * Attaches GSAP playback to a rendered block when it has one or more
 * `node.timelines` entries — see LayoutRenderer.tsx, which only reaches for
 * this when `node.timelines?.length`, so unanimated pages (the vast
 * majority of blocks) never mount this component or fetch GSAP at all.
 *
 * Does NOT introduce an extra wrapper `<div>` around its child — an earlier
 * version did, and that broke every flex/grid layout the animated node
 * participated in: LayoutRenderer already puts this node's own `flex`/
 * `grid-column`/`width`/etc styling directly onto its own root element (see
 * Section/Columns's `wrapperProps` handling in blockComponents.tsx), so a
 * plain `display:block` wrapper div sitting *around* that root — as the
 * actual flex/grid item the parent sees — silently discarded all of it,
 * collapsing/stacking whatever row the node was meant to sit in. Instead,
 * `ref` is cloned directly onto the child's own root: as a normal prop for a
 * plain host element (leaf blocks — `<div {...rootAttrs}>` in
 * LayoutRenderer), or threaded through `wrapperProps.ref` for a container
 * block (Section/Columns/etc — these read `wrapperProps` explicitly and
 * apply it to their own real DOM root, not `...rest`-spread it). GSAP then
 * animates that exact node — transform doesn't affect layout flow (it's a
 * paint-only property), so this is safe for grid/flex cells too.
 *
 * Deliberately never touches `style` itself (only `ref`, a wholly separate
 * prop key that doesn't require rebuilding the style object): an earlier
 * version merged the onMount entrance's initial opacity into a *new* style
 * object here — `cloneElement(child, { style: {...child.props.style,
 * opacity} })` — and since this is a Client Component, that merge runs a
 * second time in the browser during hydration, reconstructing its own style
 * object from `child.props.style` as deserialized off the RSC/Flight wire.
 * The *value* always matched, but React's hydration check compares the
 * reconstructed object's shape, and that reliably produced a real "server
 * HTML didn't match client properties" warning on every animated node's
 * style attribute. The fix: LayoutRenderer.tsx now bakes that same initial
 * opacity into `rootStyle` server-side, in the SAME single object
 * construction that produces the SSR HTML — so it's already present in
 * `children.props.style` by the time it reaches here, and this component
 * has nothing left to merge.
 *
 * `node.timelines` (BlockTimeline[]) is the unified animation model — each
 * entry carries its own trigger, so one node can fire more than one
 * independent animation (e.g. an onMount entrance and a separate onHover
 * lift). The actual playback logic below is a direct TypeScript port of
 * packages/builder/src/exporter/generateGSAPScript.ts's runtime string —
 * keep the two in sync; that file is what a static-exported page runs
 * instead of this component, and behavior must match exactly (that exporter
 * has no wrapper div either — see its own top-of-file comment).
 *
 * gsap/ScrollTrigger/SplitText are dynamically imported inside the effect
 * (not statically at module scope) so the animation JS is only fetched by
 * browsers that land on a page actually using it, not bundled into every
 * builder page's shared chunk.
 */
type WrapperLikeProps = { style?: CSSProperties; wrapperProps?: { style?: CSSProperties; ref?: unknown; [key: string]: unknown }; [key: string]: unknown };

export function AnimatedBox({ timelines, children }: { timelines: BlockTimeline[]; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || timelines.length === 0) return;

    let cancelled = false;
    let revert: (() => void) | undefined;
    const cleanups: Array<() => void> = [];

    (async () => {
      try {
        const [{ gsap }, { ScrollTrigger }, { SplitText }] = await Promise.all([
          import("gsap"),
          import("gsap/ScrollTrigger"),
          import("gsap/SplitText"),
        ]);
        if (cancelled) return;
        gsap.registerPlugin(ScrollTrigger, SplitText);

        const ctx = gsap.context(() => {
          for (const bt of timelines) bindTimeline(gsap, ScrollTrigger, el, bt, SplitText, cleanups);
        }, ref);

        revert = () => ctx.revert();
      } catch (err) {
        // GSAP failed to load (network/CDN failure) — never leave content
        // permanently invisible behind the SSR opacity:0 fallback above.
        console.error("[AnimatedBox] Failed to load GSAP; showing content unanimated.", err);
        if (!cancelled) el.style.opacity = "";
      }
    })();

    return () => {
      cancelled = true;
      revert?.();
      cleanups.forEach((fn) => fn());
    };
  }, [timelines]);

  if (!isValidElement(children)) return <>{children}</>;
  const childElement = children as ReactElement<WrapperLikeProps>;
  const childProps = childElement.props;

  // Container blocks (Section, Columns, CarouselContainerBlock, ...) don't
  // spread their own props onto their DOM root — they read `wrapperProps`
  // explicitly and apply IT to their root (see blockComponents.tsx). So the
  // ref handoff has to go through that same prop, not onto the container
  // component itself (which isn't a DOM node and doesn't read a top-level
  // `ref` prop at all).
  //
  // Browser extensions (Grammarly, Dark Reader, translation tools, ...) are
  // known to inject their own inline styles directly onto visible text/
  // interactive elements before React hydrates (this project already hit the
  // same class of noise once: see <body suppressHydrationWarning> in
  // app/layout.tsx, added for Grammarly's pre-hydration
  // `data-new-gr-c-s-check-loaded` attribute). React requires the flag on the
  // exact node an extension might touch, not an ancestor — applied here on
  // every animated node (the ones most likely to be visible/interactive
  // enough to draw an extension's attention) as cheap insurance alongside the
  // real fix above (LayoutRenderer no longer hands this component a `style`
  // that could itself diverge).
  if (childProps.wrapperProps) {
    // Forwarding the ref object itself (not reading .current) into the
    // child's own wrapperProps convention, per the file-level comment above
    // — the lint rule can't statically verify a "ref"-named prop it doesn't
    // control the receiving end of is actually applied via React's real ref
    // mechanism rather than read eagerly, so it flags this defensively.
    // eslint-disable-next-line react-hooks/refs
    return cloneElement(childElement, {
      wrapperProps: { ...childProps.wrapperProps, ref, suppressHydrationWarning: true },
    } as Partial<WrapperLikeProps>);
  }

  // eslint-disable-next-line react-hooks/refs -- same as above, real ref attachment via cloneElement's own `ref` prop.
  return cloneElement(childElement, { ref, suppressHydrationWarning: true } as Partial<WrapperLikeProps>);
}

type TweenVars = Record<string, unknown>;

function gsapPropName(property: string): string {
  return property === "rotate" ? "rotation" : property;
}
function gsapPropValue(property: string, value: number | string): number | string {
  return property === "borderRadius" && typeof value === "number" ? `${value}px` : value;
}
function resolvedEase(ease: string): string {
  return ease === "none" || ease === "linear" ? "none" : ease;
}

/** One .to()/.set() call per segment between consecutive keyframes on one
 *  track — "hold" interpolation emits a zero-duration .set() at the
 *  segment's start instead of a tween, producing the step-function jump at
 *  the NEXT keyframe's time rather than a gradual change. Mirrors
 *  generateGSAPScript.ts's forEachSegment exactly. */
function forEachSegment(bt: BlockTimeline, addTween: (vars: TweenVars, offset: number) => void, addSet: (vars: TweenVars, offset: number) => void) {
  for (const track of bt.tracks) {
    const kfs = [...track.keyframes].sort((a, b) => a.time - b.time);
    if (kfs.length === 1) {
      addSet({ [gsapPropName(track.property)]: gsapPropValue(track.property, kfs[0].value) }, kfs[0].time);
      continue;
    }
    for (let i = 0; i < kfs.length - 1; i++) {
      const a = kfs[i];
      const b = kfs[i + 1];
      const dur = b.time - a.time;
      if (dur <= 0) continue;
      const prop = gsapPropName(track.property);
      if (a.interpolation === "hold") {
        addSet({ [prop]: gsapPropValue(track.property, a.value) }, a.time);
        addSet({ [prop]: gsapPropValue(track.property, b.value) }, b.time);
      } else {
        // .to() only ever animates FROM whatever the element's live rendered
        // value already is — without this .set(), a track's first segment
        // (the common single "from -> to" tween every simple Interactions-tab
        // entry produces) silently ignored its own `from` value: an
        // untouched DOM node's real opacity/x/etc rarely happens to already
        // equal the authored `from`, so the "tween" ran between two
        // identical values and nothing visibly moved.
        if (i === 0) addSet({ [prop]: gsapPropValue(track.property, a.value) }, a.time);
        addTween({ duration: dur, ease: resolvedEase(a.easingOut), [prop]: gsapPropValue(track.property, b.value) }, a.time);
      }
    }
  }
  for (const track of bt.cssVarTracks) {
    const kfs = [...track.keyframes].sort((a, b) => a.time - b.time);
    for (let i = 0; i < kfs.length - 1; i++) {
      const a = kfs[i];
      const b = kfs[i + 1];
      const dur = b.time - a.time;
      if (dur <= 0) continue;
      if (a.interpolation === "hold") {
        addSet({ [track.varName]: a.value }, a.time);
        addSet({ [track.varName]: b.value }, b.time);
      } else {
        if (i === 0) addSet({ [track.varName]: a.value }, a.time);
        addTween({ duration: dur, ease: resolvedEase(a.easingOut), [track.varName]: b.value }, a.time);
      }
    }
  }
  for (const track of bt.clipPathTracks) {
    const kfs = [...track.keyframes].sort((a, b) => a.time - b.time);
    for (let i = 0; i < kfs.length - 1; i++) {
      const a = kfs[i];
      const b = kfs[i + 1];
      const dur = b.time - a.time;
      if (dur <= 0) continue;
      if (a.interpolation === "hold") {
        addSet({ clipPath: a.value }, a.time);
        addSet({ clipPath: b.value }, b.time);
      } else {
        if (i === 0) addSet({ clipPath: a.value }, a.time);
        addTween({ clipPath: b.value, duration: dur, ease: resolvedEase(a.easingOut) }, a.time);
      }
    }
  }
}

/** splitText's unit count depends on the target's actual rendered text and
 *  viewport-driven wrapping, so it's resolved here, not authored ahead of
 *  time (see packages/builder/src/timelineGenerators.ts). Absent splitText,
 *  `stagger` (if set) applies to the node's own direct children instead —
 *  same as the old staggerChildren:true behavior. `el` is the block's own
 *  real root node (no wrapper div — see AnimatedBox's top comment), so
 *  `el.children` are the real children directly, matching
 *  generateGSAPScript.ts's `el.children` exactly (that runtime never had a
 *  wrapper to begin with). */
function resolveTargets(el: HTMLElement, bt: BlockTimeline, SplitText: SplitTextClass, cleanups: Array<() => void>): HTMLElement | HTMLElement[] {
  if (bt.splitText) {
    const split = new SplitText(el, { type: bt.splitText });
    cleanups.push(() => split.revert());
    const units = (bt.splitText === "chars" ? split.chars : bt.splitText === "words" ? split.words : split.lines) as HTMLElement[];
    if (units.length > 0) {
      releaseWrapperOpacity(el);
      return units;
    }
  }
  if (bt.stagger) {
    const children = Array.from(el.children) as HTMLElement[];
    if (children.length > 0) {
      releaseWrapperOpacity(el);
      return children;
    }
  }
  return el;
}

/** Once the real animated target is a set of split/stagger children (not
 *  `el` itself), `el`'s own SSR opacity:0 fallback must be cleared — a
 *  parent stuck at opacity:0 makes every child invisible no matter what
 *  opacity GSAP later sets on them. Runs synchronously in the same tick as
 *  the children's own initial `.set()` (added by forEachSegment right
 *  after), so the browser never paints the in-between "children visible at
 *  their default opacity, before GSAP hides them again" frame. */
function releaseWrapperOpacity(el: HTMLElement) {
  el.style.opacity = "";
}

function buildTimeline(gsap: Gsap, target: HTMLElement | HTMLElement[], bt: BlockTimeline): gsap.core.Timeline {
  const tl = gsap.timeline({
    paused: true,
    repeat: bt.repeat ?? 0,
    yoyo: bt.yoyo ?? false,
    repeatDelay: bt.repeatDelay ?? 0,
    delay: bt.delay ?? 0,
  });
  // `stagger` is a per-tween option, not a timeline-constructor one — GSAP's
  // TimelineVars has no `stagger` field (its `[key: string]: any` index
  // signature just let the old `gsap.timeline({ stagger: ... })` compile
  // silently while GSAP quietly ignored it at runtime, so Split Text/Stagger
  // Children never actually staggered anything). It has to ride on each
  // `.to()` call instead, applied only to the tween (not the initial
  // `.set()` below) so every target still starts from its `from` value at
  // once and only the tween-in is staggered across them.
  const staggerVars = Array.isArray(target) && bt.stagger
    ? { amount: bt.stagger.amount, from: bt.stagger.from, grid: bt.stagger.grid, ease: resolvedEase(bt.stagger.ease) }
    : undefined;
  forEachSegment(
    bt,
    (vars, offset) => { tl.to(target, staggerVars ? { ...vars, stagger: staggerVars } : vars, offset); },
    (vars, offset) => { tl.set(target, vars, offset); }
  );
  return tl;
}

function bindTimeline(gsap: Gsap, ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger, el: HTMLElement, bt: BlockTimeline, SplitText: SplitTextClass, cleanups: Array<() => void>) {
  const mode = bt.trigger?.mode;

  if (mode === "onMount") {
    const target = resolveTargets(el, bt, SplitText, cleanups);
    buildTimeline(gsap, target, bt).play();
  } else if (mode === "onScroll") {
    const target = resolveTargets(el, bt, SplitText, cleanups);
    const tl = buildTimeline(gsap, target, bt);
    const cfg = bt.trigger.scrollConfig ?? { scrub: true, start: "top 80%", end: "bottom 20%", pin: false };
    const st = ScrollTrigger.create({ trigger: el, start: cfg.start, end: cfg.end, scrub: cfg.scrub, pin: cfg.pin, animation: tl });
    cleanups.push(() => st.kill());
    tl.play();
  } else if (mode === "onHover") {
    const tl = buildTimeline(gsap, el, bt);
    const enter = () => tl.play();
    const leave = () => tl.reverse();
    el.addEventListener("mouseenter", enter);
    el.addEventListener("mouseleave", leave);
    cleanups.push(() => {
      el.removeEventListener("mouseenter", enter);
      el.removeEventListener("mouseleave", leave);
    });
  } else if (mode === "onClick") {
    const tl = buildTimeline(gsap, el, bt);
    const click = () => { if (tl.reversed() || tl.progress() === 0) tl.play(); else tl.reverse(); };
    el.addEventListener("click", click);
    cleanups.push(() => el.removeEventListener("click", click));
  } else if (mode === "onMouseMove") {
    const strength = bt.trigger.mouseConfig?.strength ?? 30;
    const scope = bt.trigger.mouseConfig?.scope;
    let restX = 0;
    let restY = 0;
    for (const t of bt.tracks) {
      if (t.property === "x" && t.keyframes[0]) restX = t.keyframes[0].value;
      if (t.property === "y" && t.keyframes[0]) restY = t.keyframes[0].value;
    }
    const quickX = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3" });
    const quickY = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3" });

    if (scope === "element") {
      const move = (e: MouseEvent) => {
        const rect = el.getBoundingClientRect();
        const relX = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
        const relY = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
        quickX(restX + relX * strength);
        quickY(restY + relY * strength);
      };
      const leave = () => { quickX(restX); quickY(restY); };
      el.addEventListener("mousemove", move);
      el.addEventListener("mouseleave", leave);
      cleanups.push(() => {
        el.removeEventListener("mousemove", move);
        el.removeEventListener("mouseleave", leave);
      });
    } else {
      const move = (e: MouseEvent) => {
        const relX = (e.clientX / window.innerWidth - 0.5) * 2;
        const relY = (e.clientY / window.innerHeight - 0.5) * 2;
        quickX(restX + relX * strength);
        quickY(restY + relY * strength);
      };
      window.addEventListener("mousemove", move);
      cleanups.push(() => window.removeEventListener("mousemove", move));
    }
  }
}
