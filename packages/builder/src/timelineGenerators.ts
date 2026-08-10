// ─────────────────────────────────────────────────────────────────────────────
// timelineGenerators.ts
// Shared preset generators — both the admin's Animation-tab "simple mode" and
// the Timeline drawer call these instead of each reimplementing splitText/
// clipReveal/magnetic-hover config, per the schema reconciliation (point 5).
//
// A genuine constraint discovered while implementing these: not every preset
// is representable as fixed keyframes ahead of time.
//  - clipReveal is fully static (a clip-path shape animating from A to B over
//    a fixed duration) — generateClipRevealTrack emits a complete, ready-to-
//    play ClipPathTrack, nothing left for the runtime to figure out.
//  - splitText's *unit count* depends on the target's live text content and
//    even viewport-driven line-wrapping — GSAP's SplitText plugin creates
//    those DOM nodes in the target page's own browser, not here at author
//    time. generateSplitTextTracks emits only the single from→to pattern to
//    apply to EACH unit; the caller must still set BlockTimeline.splitText
//    (which unit granularity) and .stagger (the per-unit delay) — see the
//    doc comment on BlockTimeline.splitText in types.ts.
//  - Magnetic hover is continuous/event-driven (cursor position → live
//    offset), not a tween between fixed points at all. generateMagneticHoverTracks
//    returns the single "rest state" keyframe the runtime's cursor-follow
//    code snaps back to on mouseleave — real-time tracking still has to be
//    handled by the runtime's own gsap.quickTo binding (see AnimatedBox.tsx /
//    generateGSAPScript.ts), driven by BlockTimeline.trigger.mouseConfig.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  TimelineClipPathTrack,
  TimelineClipShape,
  TimelineEase,
  TimelineMouseConfig,
  TimelinePropertyTrack,
  TimelineProperty,
} from "./types";

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

/** Values touched by a from/to tween — same shape as the old AnimationTweenValues, kept loose here (not re-exported) since callers already have their own typed `from`/`to` objects to pass in. */
export type PropertyValueMap = Partial<Record<TimelineProperty, number | string>>;

/** The single from→to pattern applied to each split unit (or, called
 *  directly with a single target in mind, to any element) — one 2-keyframe
 *  TimelinePropertyTrack per touched property. `value` in `from`/`to` must
 *  be a `number` for every TimelineProperty except the four color/shadow
 *  string properties (backgroundColor/color/borderColor/boxShadow) —
 *  mismatched types for a given key are silently skipped rather than
 *  thrown, since this only ever receives already-validated tween configs. */
export function generateSplitTextTracks(from: PropertyValueMap, to: PropertyValueMap, duration: number, ease: TimelineEase = "power2.out"): TimelinePropertyTrack[] {
  const tracks: TimelinePropertyTrack[] = [];
  // Union of from ∪ to, not just keys(to) — a property set only in `from`
  // (no matching `to`, e.g. generateMagneticHoverTracks' rest x/y, which has
  // no "to" endpoint at all) is real, meaningful data and must produce a
  // single-keyframe track rather than being silently dropped. This exact bug
  // — and fix — was found once already in animationConfigAdapter.ts's own
  // from/to converter before that converter was replaced with a call to this
  // function; keeping the fix here (the shared implementation) is what makes
  // that replacement safe.
  const keys = new Set<TimelineProperty>([...Object.keys(from), ...Object.keys(to)] as TimelineProperty[]);
  for (const key of keys) {
    const toValue = to[key];
    const fromValue = from[key];
    if (typeof toValue !== "number" && typeof fromValue !== "number") continue; // color/string properties aren't representable on a numeric TimelinePropertyTrack — see CssVarTrack for those
    if (typeof toValue === "number") {
      tracks.push({
        id: uid(),
        property: key,
        keyframes: [
          { id: uid(), time: 0, value: typeof fromValue === "number" ? fromValue : toValue, easingOut: ease, easingIn: "linear", interpolation: "smooth" },
          { id: uid(), time: duration, value: toValue, easingOut: ease, easingIn: ease, interpolation: "smooth" },
        ],
      });
    } else {
      tracks.push({ id: uid(), property: key, keyframes: [{ id: uid(), time: 0, value: fromValue as number, easingOut: ease, easingIn: ease, interpolation: "smooth" }] });
    }
  }
  return tracks;
}

const CLIP_REVEAL_PAIRS: Record<"up" | "down" | "left" | "right" | "circle", { shape: TimelineClipShape; from: string; to: string }> = {
  up: { shape: "inset", from: "inset(100% 0% 0% 0%)", to: "inset(0% 0% 0% 0%)" },
  down: { shape: "inset", from: "inset(0% 0% 100% 0%)", to: "inset(0% 0% 0% 0%)" },
  left: { shape: "inset", from: "inset(0% 0% 0% 100%)", to: "inset(0% 0% 0% 0%)" },
  right: { shape: "inset", from: "inset(0% 100% 0% 0%)", to: "inset(0% 0% 0% 0%)" },
  circle: { shape: "circle", from: "circle(0% at 50% 50%)", to: "circle(75% at 50% 50%)" },
};

/** A directional mask wipe or iris reveal — fully static, ready to play as-is (no runtime specialness needed, unlike splitText/magnetic hover above). */
export function generateClipRevealTrack(direction: "up" | "down" | "left" | "right" | "circle", duration: number, ease: TimelineEase = "power2.inOut"): TimelineClipPathTrack {
  const pair = CLIP_REVEAL_PAIRS[direction];
  return {
    id: uid(),
    shape: pair.shape,
    keyframes: [
      { id: uid(), time: 0, value: pair.from, easingOut: ease, easingIn: "linear", interpolation: "smooth" },
      { id: uid(), time: duration, value: pair.to, easingOut: ease, easingIn: ease, interpolation: "smooth" },
    ],
  };
}

/** Reverse of generateClipRevealTrack — matches a track's endpoint clip-path
 *  values back to the direction that produced them, so the admin's simple
 *  Interactions-tab dropdown can round-trip a value it itself saved instead
 *  of always resetting to "none". Only exact for a track this generator
 *  produced (or one with identical from/to strings); anything else (a track
 *  hand-built in the Timeline drawer) correctly returns undefined. */
export function matchClipRevealDirection(track: TimelineClipPathTrack | undefined): "up" | "down" | "left" | "right" | "circle" | undefined {
  if (!track || track.keyframes.length < 2) return undefined;
  const sorted = [...track.keyframes].sort((a, b) => a.time - b.time);
  const from = sorted[0]?.value;
  const to = sorted[sorted.length - 1]?.value;
  for (const [direction, pair] of Object.entries(CLIP_REVEAL_PAIRS) as [keyof typeof CLIP_REVEAL_PAIRS, (typeof CLIP_REVEAL_PAIRS)[keyof typeof CLIP_REVEAL_PAIRS]][]) {
    if (pair.from === from && pair.to === to) return direction;
  }
  return undefined;
}

/** The rest-state tracks a magnetic-hover runtime snaps back to on
 *  mouseleave — NOT the continuous tracking itself, see the file-level doc
 *  comment above. Pair with `trigger: { mode: "onMouseMove", mouseConfig }`
 *  on the owning BlockTimeline. */
export function generateMagneticHoverTracks(restX: number, restY: number): TimelinePropertyTrack[] {
  return [
    { id: uid(), property: "x", keyframes: [{ id: uid(), time: 0, value: restX, easingOut: "power3.out", easingIn: "linear", interpolation: "smooth" }] },
    { id: uid(), property: "y", keyframes: [{ id: uid(), time: 0, value: restY, easingOut: "power3.out", easingIn: "linear", interpolation: "smooth" }] },
  ];
}

export function magneticHoverTrigger(config: TimelineMouseConfig) {
  return { mode: "onMouseMove" as const, mouseConfig: config };
}
