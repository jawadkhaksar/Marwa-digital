// ─────────────────────────────────────────────────────────────────────────────
// animationConfigAdapter.ts
// Boundary between the Interactions tab's simple from/to/trigger UI
// (NodeAnimationConfig — unchanged since before the schema reconciliation)
// and the unified persisted BlockTimeline[] (node.timelines). Per the
// reconciliation, a "simple" tween IS just a 2-keyframe BlockTimeline — this
// file is the two-way conversion so InteractionsPanel's existing UI/UX
// doesn't need a rewrite, while the actual saved data and execution engine
// (AnimatedBox.tsx / generateGSAPScript.ts) are unified on one shape.
// ─────────────────────────────────────────────────────────────────────────────

import {
  ANIMATION_EASE_VALUES,
  generateClipRevealTrack,
  generateSplitTextTracks,
  matchClipRevealDirection,
  type AnimationEase,
  type AnimationTweenValues,
  type BlockTimeline,
  type NodeAnimationConfig,
  type PropertyValueMap,
  type TimelineEase,
  type TimelineProperty,
} from "@marwa/builder";

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

// backgroundColor/color/borderColor/boxShadow are string-valued — routed
// through cssVarTracks using their literal CSS property name (no "--"
// prefix) as varName; see the doc comment on TimelineProperty in
// packages/builder/src/types.ts for why they can't be plain PropertyTracks.
const NUMERIC_TWEEN_PROPS: TimelineProperty[] = [
  "opacity", "x", "y", "scale", "scaleX", "scaleY", "rotate", "skewX", "skewY",
  "borderRadius", "blur", "grayscale", "brightness", "backgroundPositionX", "backgroundPositionY",
];
const STRING_TWEEN_PROPS = ["backgroundColor", "color", "borderColor", "boxShadow"] as const;

export function animationConfigToBlockTimeline(config: NodeAnimationConfig): BlockTimeline {
  const cssVarTracks: BlockTimeline["cssVarTracks"] = [];

  // Numeric properties go through the shared generateSplitTextTracks
  // (packages/builder/src/timelineGenerators.ts) rather than a from/to loop
  // hand-rolled here a second time — per the schema reconciliation, this
  // adapter and the Timeline drawer's own clip-reveal/magnetic-hover presets
  // must call the same generators, not reimplement the pattern. (The name is
  // "SplitText" from its original use case, but the function itself is just
  // a generic from/to→2-keyframe-tracks builder — its own doc comment notes
  // it's fine to call directly for any single element too.) It also already
  // handles a property present only in `from` with no `to` — e.g. onMouseMove's
  // rest position — as a single-keyframe track instead of dropping it, the
  // same from-only fix this file's own loop used to need.
  const numericFrom: PropertyValueMap = {};
  const numericTo: PropertyValueMap = {};
  for (const key of NUMERIC_TWEEN_PROPS) {
    const fromVal = config.from[key as keyof AnimationTweenValues];
    const toVal = config.to[key as keyof AnimationTweenValues];
    if (typeof fromVal === "number") numericFrom[key] = fromVal;
    if (typeof toVal === "number") numericTo[key] = toVal;
  }
  const tracks = generateSplitTextTracks(numericFrom, numericTo, config.duration, config.ease);

  for (const key of STRING_TWEEN_PROPS) {
    const toVal = config.to[key];
    const fromVal = config.from[key];
    if (typeof toVal !== "string" && typeof fromVal !== "string") continue;
    if (typeof toVal === "string") {
      cssVarTracks.push({
        id: uid(),
        varName: key,
        keyframes: [
          { id: uid(), time: 0, value: typeof fromVal === "string" ? fromVal : toVal, easingOut: config.ease, easingIn: config.ease, interpolation: "smooth" },
          { id: uid(), time: config.duration, value: toVal, easingOut: config.ease, easingIn: config.ease, interpolation: "smooth" },
        ],
      });
    } else {
      cssVarTracks.push({ id: uid(), varName: key, keyframes: [{ id: uid(), time: 0, value: fromVal as string, easingOut: config.ease, easingIn: config.ease, interpolation: "smooth" }] });
    }
  }

  return {
    version: 2,
    duration: config.duration,
    trigger: {
      mode: config.trigger,
      scrollConfig: config.trigger === "onScroll"
        ? { scrub: config.scrollScrub ?? false, start: config.scrollStart ?? "top 85%", end: config.scrollEnd ?? "top 40%", pin: config.scrollPin ?? false }
        : undefined,
      mouseConfig: config.trigger === "onMouseMove"
        ? { scope: config.mouseScope ?? "viewport", strength: config.mouseStrength ?? 30 }
        : undefined,
      clickCount: config.trigger === "onClick" ? config.clickCount : undefined,
    },
    timedAnimationId: config.timedAnimationId,
    repeat: config.repeat,
    yoyo: config.yoyo,
    repeatDelay: config.repeatDelay,
    delay: config.delay,
    stagger: config.staggerChildren || (config.splitText && config.splitText !== "none")
      ? { amount: config.staggerAmount ?? 0.1, from: "start", ease: config.ease }
      : undefined,
    splitText: config.splitText && config.splitText !== "none" ? config.splitText : undefined,
    tracks,
    cssVarTracks,
    clipPathTracks: config.clipReveal && config.clipReveal !== "none" ? [generateClipRevealTrack(config.clipReveal, config.duration, config.ease)] : [],
  };
}

const EASE_SET = new Set<string>(ANIMATION_EASE_VALUES);
function toAnimationEase(ease: TimelineEase): AnimationEase {
  return (EASE_SET.has(ease) ? ease : "power2.out") as AnimationEase;
}

/** Best-effort reverse mapping — exact for anything this adapter itself
 *  produced, via matchClipRevealDirection's from/to string match. A
 *  BlockTimeline with clipPathTracks not authored by this adapter (e.g.
 *  hand-built in the Timeline drawer with a custom clip-path pair) round-trips
 *  to `clipReveal: "none"` here — that data isn't lost (it stays in
 *  bt.clipPathTracks, still exported/played correctly), it just won't
 *  re-populate the Interactions tab's "Clip Reveal" dropdown. */
export function blockTimelineToAnimationConfig(id: string, bt: BlockTimeline): NodeAnimationConfig {
  const from: AnimationTweenValues = {};
  const to: AnimationTweenValues = {};

  for (const t of bt.tracks) {
    const sorted = [...t.keyframes].sort((a, b) => a.time - b.time);
    if (sorted[0]) (from as Record<string, number>)[t.property] = sorted[0].value;
    if (sorted.length > 1) (to as Record<string, number>)[t.property] = sorted[sorted.length - 1].value; // single-keyframe track never had a real "to" — don't fabricate one
  }
  for (const t of bt.cssVarTracks) {
    const sorted = [...t.keyframes].sort((a, b) => a.time - b.time);
    if (sorted[0]) (from as Record<string, string>)[t.varName] = sorted[0].value;
    if (sorted.length > 1) (to as Record<string, string>)[t.varName] = sorted[sorted.length - 1].value;
  }

  const firstEase = bt.tracks[0]?.keyframes[0]?.easingOut ?? bt.cssVarTracks[0]?.keyframes[0]?.easingOut ?? "power2.out";

  return {
    id,
    trigger: bt.trigger.mode,
    clickCount: bt.trigger.clickCount,
    timedAnimationId: bt.timedAnimationId,
    from,
    to,
    duration: bt.duration,
    delay: bt.delay ?? 0,
    ease: toAnimationEase(firstEase),
    repeat: bt.repeat,
    yoyo: bt.yoyo,
    repeatDelay: bt.repeatDelay,
    staggerChildren: Boolean(bt.stagger),
    staggerAmount: bt.stagger?.amount,
    splitText: bt.splitText ?? "none",
    clipReveal: matchClipRevealDirection(bt.clipPathTracks?.[0]) ?? "none",
    scrollScrub: Boolean(bt.trigger.scrollConfig?.scrub),
    scrollStart: bt.trigger.scrollConfig?.start,
    scrollEnd: bt.trigger.scrollConfig?.end,
    scrollPin: bt.trigger.scrollConfig?.pin,
    mouseScope: bt.trigger.mouseConfig?.scope,
    mouseStrength: bt.trigger.mouseConfig?.strength,
  };
}
