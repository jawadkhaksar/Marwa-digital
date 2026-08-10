// ─────────────────────────────────────────────────────────────────────────────
// timelineTypes.ts
// Shared TypeScript interfaces & constants for the Animation Timeline Editor.
//
// v2: unified with the old Animation-tab system (NodeAnimationConfig) per the
// schema reconciliation — see packages/builder/src/types.ts's matching
// BlockTimeline. Easing is now the full 28-value GSAP vocabulary (GsapEasing
// below reuses that list, not a separate curated one), keyframes carry split
// easingIn/easingOut + interpolation ("smooth"|"hold"), and a LayerTrack now
// carries its own `trigger` (mode + scroll/mouse config) instead of a bare
// `scrollTrigger: boolean`.
// ─────────────────────────────────────────────────────────────────────────────

// backgroundColor/color/borderColor/boxShadow are deliberately NOT part of
// this list even though AnimationTweenValues has them — their values are
// CSS color/shadow STRINGS, which PropertyKeyframe.value (number) can't
// hold. They're represented as CssVarTrack entries instead, using the
// literal CSS property name ("backgroundColor", not "--exr-backgroundColor")
// as `varName` — GSAP's `.to()` doesn't care whether a vars key is a custom
// property or a real CSS property, so this tweens the actual property
// directly with no extra runtime logic needed. See animationConfigAdapter.ts.
export type PropertyKey =
  | "opacity" | "x" | "y" | "scale" | "scaleX" | "scaleY" | "rotate" | "skewX" | "skewY"
  | "borderRadius" | "blur" | "grayscale" | "brightness"
  | "backgroundPositionX" | "backgroundPositionY";

// Only the 5 original numeric transform/opacity properties get a dedicated
// always-visible track row in the layer grid (ALL_PROPERTIES below) — the
// rest of PropertyKey (colors, filters, etc.) are reachable the same way
// CSS-var tracks are, via "+ Add Track", not auto-created per layer. Keeps
// the default per-layer row count from ballooning to 18.
export const ALL_PROPERTIES: PropertyKey[] = ["opacity", "x", "y", "scale", "rotate"];

export const PROPERTY_LABELS: Record<PropertyKey, string> = {
  opacity: "Opacity",
  x: "X",
  y: "Y",
  scale: "Scale",
  scaleX: "Scale X",
  scaleY: "Scale Y",
  rotate: "Rotate",
  skewX: "Skew X",
  skewY: "Skew Y",
  borderRadius: "Border Radius",
  blur: "Blur",
  grayscale: "Grayscale",
  brightness: "Brightness",
  backgroundPositionX: "Background Position X",
  backgroundPositionY: "Background Position Y",
};

export const PROPERTY_UNITS: Record<PropertyKey, string> = {
  opacity: "",
  x: "px",
  y: "px",
  scale: "×",
  scaleX: "×",
  scaleY: "×",
  rotate: "°",
  skewX: "°",
  skewY: "°",
  borderRadius: "px",
  blur: "px",
  grayscale: "",
  brightness: "",
  backgroundPositionX: "%",
  backgroundPositionY: "%",
};

export const PROPERTY_DEFAULTS: Record<PropertyKey, number> = {
  opacity: 1,
  x: 0,
  y: 0,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  rotate: 0,
  skewX: 0,
  skewY: 0,
  borderRadius: 0,
  blur: 0,
  grayscale: 0,
  brightness: 1,
  backgroundPositionX: 50,
  backgroundPositionY: 50,
};

/** GSAP's real 28-value named-ease vocabulary — the single source of truth
 *  for easing, reused (not re-curated) per the schema reconciliation. A
 *  keyframe's easing is either one of these, or a hand-typed CSS-style
 *  cubic-bezier string (GSAP's core `ease` option accepts
 *  "cubic-bezier(x1,y1,x2,y2)" natively, no CustomEase plugin needed). */
const EASE_FAMILIES = ["power1", "power2", "power3", "sine", "circ", "expo", "back", "elastic", "bounce"] as const;
const EASE_VARIANTS = ["in", "out", "inOut"] as const;
export const GSAP_EASINGS = [
  "linear",
  ...EASE_FAMILIES.flatMap((family) => EASE_VARIANTS.map((variant) => `${family}.${variant}` as const)),
] as const;
export type PresetEasing = (typeof GSAP_EASINGS)[number];
export type GsapEasing = PresetEasing | `cubic-bezier(${string})`;

// One representative SVG curve per ease FAMILY (not all 28 individual
// variants — in/out/inOut of the same family look close enough at 18-24px
// that a family-level curve reads fine in the picker grid, and hand-tracing
// 28 distinct paths wasn't a good use of the time this pass had). "linear"
// gets the plain diagonal.
const FAMILY_CURVES: Record<(typeof EASE_FAMILIES)[number], string> = {
  power1: "M 2 22 Q 4 4 22 2",
  power2: "M 2 22 C 10 22 14 2 22 2",
  power3: "M 2 22 Q 2 6 22 2",
  sine: "M 2 22 C 8 22 16 2 22 2",
  circ: "M 2 22 C 2 10 14 2 22 2",
  expo: "M 2 22 C 18 22 20 2 22 2",
  back: "M 2 22 C 20 22 26 -3 22 2",
  elastic: "M 2 22 C 4 22 5 -3 8 4 C 11 11 15 20 18 -2 L 22 2",
  bounce: "M 2 22 L 7 4 C 8 18 10 4 12 10 C 14 16 16 4 18 8 L 22 2",
};
export const EASING_CURVES: Record<PresetEasing, string> = Object.fromEntries(
  GSAP_EASINGS.map((ease) => [ease, ease === "linear" ? "M 2 22 L 22 2" : FAMILY_CURVES[ease.split(".")[0] as (typeof EASE_FAMILIES)[number]]])
) as Record<PresetEasing, string>;

/** `interpolation: "hold"` is a step function — holds the previous
 *  keyframe's value until this one's time, then jumps, ignoring easing
 *  entirely. `easingOut` drives the real GSAP segment from this keyframe to
 *  the next; `easingIn` is graph-editor display only (see the doc comment
 *  on TimelineKeyframe in packages/builder/src/types.ts for why — GSAP's
 *  `.to()` takes one ease per tween, so a segment's real ease can only come
 *  from one side). */
export interface PropertyKeyframe {
  id: string;
  time: number;
  value: number;
  easingOut: GsapEasing;
  easingIn: GsapEasing;
  interpolation: "smooth" | "hold";
}

export interface PropertyTrack {
  id: string;
  property: PropertyKey;
  keyframes: PropertyKeyframe[];
}

export interface LayerClip {
  id: string;
  start: number;
  end: number;
  label?: string;
}

// ── CSS Variable & Clip-Path sub-tracks ──────────────────────────────────────
// A parallel track kind alongside PropertyTrack above: same keyframe/easing
// shape, but the value is a raw CSS string instead of a bare number, since
// "--exr-cardBorderColor" needs a color and "--exr-cardRadius" needs a
// unit-bearing length. See interpolateCssVarTrack in timelineUtils.ts for how
// scrubbing handles both (plus a snap fallback for anything that's neither).

export interface CssVarKeyframe {
  id: string;
  time: number;
  value: string;
  easingOut: GsapEasing;
  easingIn: GsapEasing;
  interpolation: "smooth" | "hold";
}

export interface CssVarTrack {
  id: string;
  varName: string; // e.g. "--exr-cardRadius", including the leading "--"
  keyframes: CssVarKeyframe[];
}

/** Every keyframe in one track shares the track's own `shape` — interpolation is always a same-family parametric lerp (radius/x/y for circle, 4 sides for inset, N point pairs for polygon), never a cross-shape morph. See interpolateClipPathTrack. */
export type ClipShape = "circle" | "inset" | "polygon";

export interface ClipPathKeyframe {
  id: string;
  time: number;
  value: string; // a complete CSS clip-path value matching the track's shape, e.g. "circle(40% at 50% 50%)"
  easingOut: GsapEasing;
  easingIn: GsapEasing;
  interpolation: "smooth" | "hold";
}

export interface ClipPathTrack {
  id: string;
  shape: ClipShape;
  keyframes: ClipPathKeyframe[];
}

/** Canonical trigger modes — matches packages/builder's TimelineTriggerMode exactly, no new names invented. */
export const TRIGGER_MODES = ["onMount", "onScroll", "onHover", "onClick", "onMouseMove", "onNavbarOpen", "onDropdownOpen", "onTabChange", "onSliderChange"] as const;
export type TriggerMode = (typeof TRIGGER_MODES)[number];

export interface ScrollConfig {
  scrub: boolean | number;
  start: string;
  end: string;
  pin: boolean;
}

export interface MouseConfig {
  scope: "viewport" | "element";
  strength: number;
}

export interface LayerTrigger {
  mode: TriggerMode;
  scrollConfig?: ScrollConfig;
  mouseConfig?: MouseConfig;
}

export interface StaggerConfig {
  amount: number;
  from: "start" | "end" | "center" | "edges" | "random";
  grid?: [number, number];
  ease: GsapEasing;
}

export interface LayerTrack {
  id: string;
  name: string;
  color: string;
  emoji: string;
  visible: boolean;
  locked: boolean;
  expanded: boolean;
  clips: LayerClip[];
  tracks: PropertyTrack[];
  cssVarTracks: CssVarTrack[];
  clipPathTracks: ClipPathTrack[];
  /** Replaces the old bare `scrollTrigger?: boolean` — this layer's own
   *  BlockTimeline trigger (see LayerTrigger above). Defaults to
   *  `{ mode: "onMount" }` for a freshly-created layer, matching the old
   *  default (plays once on mount, playhead-authored). */
  trigger: LayerTrigger;
  repeat?: number;
  yoyo?: boolean;
  repeatDelay?: number;
  delay?: number;
  stagger?: StaggerConfig;
  splitText?: "chars" | "words" | "lines";
}
