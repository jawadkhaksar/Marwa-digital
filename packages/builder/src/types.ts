// Shared vocabulary for the visual page builder. This package intentionally
// has zero React/Next.js imports — it is consumed by `apps/web` (to render
// pages) and `apps/admin` (to edit them) without either pulling the other's
// component tree into its bundle.

/**
 * Generic, block-agnostic style overrides an editor can apply to any node
 * on the canvas — the "Design" tab you get on every element in
 * Elementor/Webflow, independent of what the block itself renders.
 */
/**
 * The subset of style fields that can vary per breakpoint. Kept separate
 * from `className`/`css` (which apply everywhere) since those aren't
 * meaningfully "per-screen-size" overrides.
 */
export interface ResponsiveStyleFields {
  // Deliberately raw CSS length strings ("24px", "1.5rem"), not Tailwind
  // spacing tokens: classes assembled at runtime from arbitrary
  // editor/DB-sourced values (e.g. `px-${value}`) never appear literally in
  // source, so Tailwind's JIT scanner purges them from the production
  // build. Inline styles have no such build-time dependency, which is the
  // same reason Webflow/Wix render editor-driven styling inline rather
  // than as generated utility classes.
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  background?: string; // hex, rgb(a), or a CSS color
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;
  backgroundAttachment?: string;
  backgroundClip?: string;
  textAlign?: "left" | "center" | "right" | "justify";
  maxWidth?: string; // e.g. "1200px"
  letterSpacing?: string;

  // ── Size & position (Elementor's Image "Style" tab, generalized to any block) ──
  width?: string;
  height?: string;
  minWidth?: string;
  minHeight?: string;
  maxHeight?: string;
  aspectRatio?: string;
  boxSizing?: "border-box" | "content-box" | string;
  /** Horizontal position when width is less than the container's — left/right add margin-auto on the opposite side, center adds it on both. */
  blockAlign?: "left" | "center" | "right" | "stretch";
  opacity?: string; // "0"–"1"

  // ── CSS filters — composed into one `filter` declaration (see resolveNodeStyle). ──
  blur?: string; // e.g. "4px"
  grayscale?: string; // e.g. "50%"
  brightness?: string; // e.g. "120%"
  contrast?: string; // e.g. "110%"
  saturate?: string; // e.g. "80%"
  mixBlendMode?: string;
  outlineStyle?: string;
  outlineWidth?: string;
  outlineColor?: string;
  transform?: string;
  transition?: string;
  filter?: string;
  backdropFilter?: string;
  /** Composed into `backdropFilter` above the same way blur/grayscale/etc. compose into `filter` — kept as separate sub-fields so each slider can read/display its own value independently. */
  backdropFilterBlur?: string;
  backdropFilterSaturate?: string;
  cursor?: string;
  pointerEvents?: "auto" | "none" | string;

  // ── Border & shadow (generic version of Section's own border props — see resolveNodeStyle's merge-order note). ──
  borderStyle?: "none" | "solid" | "dashed" | "dotted" | "double";
  /** The "linked" value — unset per-side/per-corner fields below fall back to this, so pages saved before those existed keep rendering identically. */
  borderWidth?: string;
  borderColor?: string;
  borderRadius?: string;
  borderWidthTop?: string;
  borderWidthRight?: string;
  borderWidthBottom?: string;
  borderWidthLeft?: string;
  borderTopStyle?: string;
  borderTopWidth?: string;
  borderTopColor?: string;
  borderRightStyle?: string;
  borderRightWidth?: string;
  borderRightColor?: string;
  borderBottomStyle?: string;
  borderBottomWidth?: string;
  borderBottomColor?: string;
  borderLeftStyle?: string;
  borderLeftWidth?: string;
  borderLeftColor?: string;
  borderRadiusTopLeft?: string;
  borderRadiusTopRight?: string;
  borderRadiusBottomRight?: string;
  borderRadiusBottomLeft?: string;
  boxShadow?: string; // raw CSS box-shadow value, e.g. "0px 4px 10px 0px rgba(0,0,0,0.3)"

  // ── Typography breakpoint overrides. A block's own color/fontSize/fontWeight/etc.
  // props (Heading, RichText, CTAButton) already cover the desktop value and render
  // as an inline style directly on that block's own root element (e.g. the <h1>) —
  // CSS inheritance can never override an element's *own* explicit value, so a plain
  // wrapper-level override here wouldn't reach it. resolveNodeStyle instead emits
  // these as an `!important` rule targeting the block's own root by tag name
  // (`.blk-x > h1` etc.), which *does* win. Meaningful at tablet/mobile only — the
  // PropertyPanel redirects a block's own Style-tab field to write here instead of
  // its prop once you're off the Desktop breakpoint, rather than exposing a second,
  // separate set of controls. ──
  /** A block's own text-alignment prop (Heading/RichText/ImageBox's `align`, which also supports "justify" unlike the wrapper-level `textAlign` above) — overridden the same way as color/fontSize below. */
  align?: "left" | "center" | "right" | "justify";
  color?: string;
  fontSize?: string;
  fontWeight?: "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | "normal" | "bold";
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  fontStyle?: "normal" | "italic" | "oblique";
  textDecoration?: "none" | "underline" | "overline" | "line-through";
  lineHeight?: string;
  fontFamily?: string;
  wordSpacing?: string;
  textIndent?: string;
  columnCount?: string;
  wordBreak?: string;
  whiteSpace?: string;
  textWrap?: string;
  textOverflow?: "clip" | "ellipsis" | string;
  textStrokeWidth?: string;
  textStrokeColor?: string;
  webkitTextStrokeWidth?: string;
  webkitTextStrokeColor?: string;
  textShadow?: string;

  // ── Position & overflow (Advanced tab) — moved in here (rather than living
  // directly on LayoutNodeStyle like className/customCss) specifically so
  // they CAN vary per breakpoint: "position:absolute pinned bottom-right" on
  // desktop very often needs to become "position:static" (or a different
  // inset) on mobile. ──
  position?: "static" | "relative" | "absolute" | "fixed" | "sticky";
  zIndex?: string;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  overflow?: "visible" | "hidden" | "scroll" | "clip" | "auto" | string;
  float?: "none" | "left" | "right" | string;
  clear?: "none" | "left" | "right" | "both" | string;

  // ── Layout breakpoint overrides & Webflow-style layout controls ──
  display?: "block" | "flex" | "grid" | "none" | "inline-block" | "inline" | "inline-flex" | string;
  // Section/Columns' "boxed" (centered, max-width) vs "full" (100%) content
  // width mode — like direction/gap above, the canonical desktop value lives
  // on node.props (see LAYOUT_KEYS in PropertyPanel.tsx), and this field only
  // carries a Tablet/Mobile override.
  contentWidth?: "boxed" | "full";
  flexDirection?: "row" | "column" | "row-reverse" | "column-reverse";
  flexWrap?: "wrap" | "nowrap" | "wrap-reverse" | string;
  wrap?: "wrap" | "nowrap" | "wrap-reverse" | string;
  // A legacy leftover — flex-direction now routes to node.props (see
  // LAYOUT_KEYS in PropertyPanel.tsx), but pages saved before that fix can
  // still carry a stale value here (see resolveNodeStyle.ts, which still
  // reads it as flexDirection for exactly that reason). Not the same field
  // as textDirection below, despite the CSS `direction` property's name
  // overlapping "direction" in English — see textDirection's own comment.
  direction?: "row" | "column" | "row-reverse" | "column-reverse";
  // The real CSS `direction` property (paragraph/inline flow direction for
  // RTL languages) — a separate field from the legacy `direction` above,
  // which already means flex-direction to resolveNodeStyle.ts.
  textDirection?: "ltr" | "rtl";
  justifyContent?: string;
  alignItems?: string;
  gap?: string;
  rowGap?: string;
  columnGap?: string;
  gridTemplateColumns?: string;
  gridColumns?: string;
  gridTemplateRows?: string;
  gridRows?: string;
  gridAutoFlow?: string;
  gridDirection?: string;
  gridAlignX?: string;
  gridAlignY?: string;
}

export type Breakpoint = "desktop" | "tablet" | "mobile";

/**
 * An open, per-node bag of breakpoint/hover style overrides — keyed by ANY
 * prop name a block exposes on its Style tab, not just the ~27 generic
 * `ResponsiveStyleFields` above. Deliberately not a closed interface: the
 * old design required every new style-tab field (of which there are
 * hundreds, one set per block type) to be hand-added here AND in schema.ts
 * AND wired into the CSS-emission code before it could vary per breakpoint,
 * which is exactly why only ~17 of ~270 style fields were actually
 * responsive. `resolveNodeStyle` now mints a `--exr-{key}` CSS custom
 * property for every entry (see its `varDeclarations`), which a block's own
 * inline style can consume via `var(--exr-{key}, {fallback})` regardless of
 * how deep that element sits in the block's own markup — custom properties
 * inherit through arbitrary nesting, unlike a plain `!important` rule
 * targeting a fixed selector depth.
 */
export type StyleOverrideBag = Record<string, string | number | boolean>;

/** A handful of curated, real CSS hover presets — a small subset of Elementor's "Hover Animation" catalog, not the full ~20-option list. */
export const HOVER_ANIMATION_VALUES = [
  "none",
  "grow",
  "shrink",
  "pulse",
  "bounce-up",
  "bounce-down",
  "glow-border",
  "slide-fill",
  "corner-brackets",
  "underline-sweep",
  "liquid-fill",
  "shimmer-sweep",
  "fill-sweep-left",
  "fill-sweep-right",
  "fill-sweep-top",
  "fill-sweep-bottom",
  "invert-colors",
  "zoom-in",
  "zoom-out",
  "rotate-3d",
  "blur-to-sharp",
  "grayscale-to-color",
  "shake-wobble",
] as const;
export type HoverAnimation = (typeof HOVER_ANIMATION_VALUES)[number];

export interface LayoutNodeStyle extends ResponsiveStyleFields {
  /** Escape hatch: static Tailwind classes an editor preset can safely add (must exist literally in source elsewhere to survive purge). */
  className?: string;
  /** Escape hatch: raw CSS custom properties, e.g. { "--gap": "24px" }. */
  css?: Record<string, string>;
  /** Overrides applied at <=1024px (styled elements below fall back to the base fields above). */
  tablet?: StyleOverrideBag;
  /** Overrides applied at <=640px (falls back to tablet, then the base fields). */
  mobile?: StyleOverrideBag;
  /** Overrides applied on `:hover`, regardless of breakpoint (not itself breakpoint-scoped — kept to one hover state to avoid a breakpoint × hover combinatorial UI). */
  hover?: StyleOverrideBag;
  /** Overrides applied on `:focus` — same shape/scoping as `hover` above. */
  focus?: StyleOverrideBag;
  /** Overrides applied on `:active` — same shape/scoping as `hover` above. */
  active?: StyleOverrideBag;
  /** Overrides applied on `:visited` — same shape/scoping as `hover` above; only meaningful on `<a>`-rendering blocks. */
  visited?: StyleOverrideBag;
  /** Seconds/ms — the transition duration applied to the base rule so the `hover` overrides above ease in rather than snap. */
  hoverTransitionDuration?: string;
  /** Transition timing function (e.g. "ease", "ease-in-out", "cubic-bezier(0.4, 0, 0.2, 1)"). */
  hoverTransitionEasing?: string;
  /** Transition delay (e.g. "0s", "0.1s"). */
  hoverTransitionDelay?: string;
  /** A named transform/keyframe preset layered on top of (or instead of) `hover`. */
  hoverAnimation?: HoverAnimation;

  // ── Advanced (Elementor's "Advanced" tab) — global, not per-breakpoint ──
  /** Rendered as the wrapper element's `id` attribute — anchor links, custom JS/CSS targeting. */
  htmlId?: string;
  /** Rendered as extra classes on the wrapper element, alongside `className` above. */
  htmlClasses?: string;
  /** Raw CSS scoped to this node's own generated class name (see LayoutRenderer) — same trust boundary as Page.customCss. */
  customCss?: string;
  /** display:none at >1024px (this block's own generated class, not a real "desktop" media query object — see resolveNodeStyle). */
  hideOnDesktop?: boolean;
  /** display:none between 641px and 1024px. */
  hideOnTablet?: boolean;
  /** display:none at <=640px. */
  hideOnMobile?: boolean;
  /** When a node is hidden (any hideOn* above), keep it in the DOM as display:none instead of omitting it entirely — off by default (today's existing behavior). */
  keepInDomWhenHidden?: boolean;
  /** Arbitrary `key="value"` HTML attributes spread onto the wrapper element (Settings tab's "Custom attributes") — same trust boundary as customCss; event-handler (`on*`) and `href`/`src` keys are rejected both here and at render time. */
  htmlAttributes?: Record<string, string>;
}

/** A reusable, site-wide, independently-editable style definition — see the
 *  `classIds` field on LayoutNode above and the `StyleClass` Prisma model.
 *  `style` uses the exact same shape a node's own `style` does, so a class
 *  carries its own tablet/mobile/hover overrides just like an element. */
export interface StyleClassDefinition {
  id: string;
  name: string;
  style: LayoutNodeStyle;
}

/** When a node's animation(s) fire. A node may have more than one — e.g. an onMount entrance plus an onHover lift. */
export const ANIMATION_TRIGGER_VALUES = [
  "onMount",
  "onScroll",
  "onHover",
  "onClick",
  "onMouseMove",
  // Phase 3 (Webflow-style Interactions engine) — gated to matching block
  // types in the admin trigger-type menu (see PropertyPanel's
  // ELEMENT_TRIGGER_GATES); no-ops on any other block.
  "onNavbarOpen",
  "onDropdownOpen",
  "onTabChange",
  "onSliderChange",
] as const;
export type AnimationTrigger = (typeof ANIMATION_TRIGGER_VALUES)[number];

// GSAP's real named-ease vocabulary: power1-3/sine/circ/expo/back/elastic/bounce,
// each in three variants, plus linear — built programmatically so the list
// stays exhaustive without hand-maintaining ~28 literals in two places (see
// the matching Zod enum in schema.ts, which imports this same array).
const EASE_FAMILIES = ["power1", "power2", "power3", "sine", "circ", "expo", "back", "elastic", "bounce"] as const;
const EASE_VARIANTS = ["in", "out", "inOut"] as const;
export const ANIMATION_EASE_VALUES = [
  "linear",
  ...EASE_FAMILIES.flatMap((family) => EASE_VARIANTS.map((variant) => `${family}.${variant}` as const)),
] as const;
export type AnimationEase = (typeof ANIMATION_EASE_VALUES)[number];

/** onMount / onScroll only, text-bearing blocks only (Heading, RichText) — splits the block's own text and staggers the tween across each unit instead of animating the whole block at once. */
export const SPLIT_TEXT_VALUES = ["none", "chars", "words", "lines"] as const;
export type SplitTextMode = (typeof SPLIT_TEXT_VALUES)[number];

/** A directional mask wipe or iris reveal — generates its own matching clip-path from/to pair (see AnimatedBox), so it isn't a plain AnimationTweenValues field. */
export const CLIP_REVEAL_VALUES = ["none", "up", "down", "left", "right", "circle"] as const;
export type ClipRevealDirection = (typeof CLIP_REVEAL_VALUES)[number];

/** How an onMouseMove animation tracks the cursor — see NodeAnimationConfig.mouseScope. */
export const MOUSE_SCOPE_VALUES = ["viewport", "element"] as const;
export type MouseScope = (typeof MOUSE_SCOPE_VALUES)[number];

/**
 * The animatable properties GSAP can tween. `opacity`/`x`/`y`/`scale*`/
 * `rotate`/`skew*` ride the GPU-accelerated transform/opacity path and
 * deliberately touch nothing layout-affecting (no width/height/padding), so
 * the wrapper this renders onto (see apps/web AnimatedBox) can never
 * reproduce the padding/background double-div bug fixed earlier in the
 * builder. `backgroundColor`/`color`/`borderColor`/`borderRadius`/`blur`/
 * `grayscale`/`brightness`/`backgroundPositionX`/`Y` are real GSAP-tweenable
 * CSS properties too, but — see AnimatedBox's doc comment — they paint onto
 * the wrapper itself, so for a *container* block (Section, Columns) they're
 * only visible where that container's own background is left transparent;
 * its own opaque background (set on its own root, not this wrapper) will
 * otherwise cover them. Same idea for `borderRadius`: it rounds the
 * wrapper's own (otherwise invisible) box, so pair it with a Background
 * Color tween or a Border to actually see it.
 */
export interface AnimationTweenValues {
  opacity?: number; // 0–1
  x?: number; // px
  y?: number; // px
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  rotate?: number; // degrees
  skewX?: number; // degrees
  skewY?: number; // degrees
  backgroundColor?: string; // hex/rgb(a)/hsl — GSAP interpolates color strings natively
  color?: string; // text color — same caveat as backgroundColor: paints onto this wrapper, so only visible if the block's own text doesn't set its own color inline (see PropertyPanel's Interactions tab note)
  borderColor?: string; // border color — only visible once the wrapper also has a border (borderWidth/borderStyle on the block's own Style tab, or paired with a Border Radius tween below)
  borderRadius?: number; // px — same wrapper-paints-not-the-block caveat as backgroundColor/blur; pair with a Background Color tween (or a block whose own root already fills this wrapper) to see the rounding
  blur?: number; // px — composed into a `filter` string alongside grayscale/brightness
  grayscale?: number; // 0–1
  brightness?: number; // 0–2, 1 = unchanged
  backgroundPositionX?: number; // 0–100 (%) — pans a block's own background-image
  backgroundPositionY?: number; // 0–100 (%)
  /** Raw CSS box-shadow value — GSAP interpolates it token-by-token, so `from`/`to` need the same shape ("h v blur spread color" on both sides), same rule as `filter`/`backgroundPosition` above. Powers a "radiating ripple" pulse: from "0px 0px 0px 0px rgba(…,.5)" to "0px 0px 0px 20px rgba(…,0)". */
  boxShadow?: string;
}

export interface NodeAnimationConfig {
  id: string;
  trigger: AnimationTrigger;
  /** `onClick` only — Webflow's "On 1st click" vs "On 2nd click" sub-states, each its own independent action+delay. Two NodeAnimationConfig entries with the same trigger:"onClick" and different clickCount model this without a new nested shape. Unset/1 behaves exactly like today's single-click-only behavior. */
  clickCount?: 1 | 2;
  /** When set, this entry starts a shared, named TimedAnimation (Webflow's "Timed Animations" library) by id instead of using its own from/to/tracks below — `from`/`to` are ignored in that case (kept on the type so existing inline animations don't need a discriminated union). */
  timedAnimationId?: string;
  /** Rest state (applied immediately, before the trigger fires) — onHover/onClick tween to `to` and back to `from`. */
  from: AnimationTweenValues;
  to: AnimationTweenValues;
  duration: number; // seconds — ignored by onScroll when scrollScrub is true (the scrollbar position *is* the timeline)
  delay: number; // seconds
  ease: AnimationEase;
  /** onMount / onHover / onClick only — continuous/looping motion (e.g. a floating icon or pulsing badge). */
  repeat?: number; // -1 = infinite, 0 = play once (default)
  yoyo?: boolean; // reverse back to `from` on alternate repeats instead of snapping
  repeatDelay?: number; // seconds paused between repeats
  /** onMount / onScroll only, container blocks only — animates each direct child individually with an increasing delay instead of the block as one unit. Mutually exclusive with `splitText` (a block is either a container or a text leaf, never both). */
  staggerChildren?: boolean;
  /** Seconds between each staggered unit — shared by `staggerChildren` and `splitText`. */
  staggerAmount?: number;
  /** onMount / onScroll only, text-bearing blocks only. */
  splitText?: SplitTextMode;
  /** onMount / onScroll only — a directional mask wipe or iris reveal (see ClipRevealDirection); generates its own clip-path from/to pair, overriding `from`/`to` on that axis. */
  clipReveal?: ClipRevealDirection;
  /** onScroll only. */
  scrollScrub?: boolean;
  scrollStart?: string; // ScrollTrigger "start" position, e.g. "top 85%"
  scrollEnd?: string; // ScrollTrigger "end" position, e.g. "top 40%"
  /** onScroll only — pins the element in place for the duration of its scroll range (ScrollTrigger's `pin`). */
  scrollPin?: boolean;
  /** onMouseMove only — "viewport" tracks the cursor anywhere on screen (background parallax); "element" only reacts while hovering this block itself, offset relative to its own center, snapping back to `from` on mouseleave (a "magnetic" button/icon). */
  mouseScope?: MouseScope;
  /** onMouseMove only — max px offset applied at the edge of the viewport ("viewport" scope) or at the block's own edge ("element" scope). */
  mouseStrength?: number;
}

/**
 * A single node in the page's block tree. `type` is a key into the
 * BlockRegistry (see registry.ts); `props` is validated at parse time
 * against that block's own Zod prop schema, not this generic shape.
 */
// ── Unified Animation Timeline (v2) ─────────────────────────────────────────
// Formerly two systems: NodeAnimationConfig (one from→to tween per trigger)
// and BlockTimeline (a full multi-keyframe timeline, no trigger richness).
// Reconciled into one: BlockTimeline now carries its own Trigger, and a
// simple "Animation tab" from/to tween is just a 2-keyframe BlockTimeline —
// same execution engine, same export path, one implementation. A node can
// have more than one independent timeline (e.g. an onMount entrance AND a
// separate onHover lift), hence `timelines: BlockTimeline[]` on LayoutNode
// below, replacing both the old `animations` and singular `timeline` fields.

/** Single source of truth for easing is the EXISTING AnimationEase above
 *  (GSAP's real 28-value named-ease vocabulary) — deliberately not a new
 *  parallel list. `TimelineEase` just adds the cubic-bezier escape hatch on
 *  top of it. A spring-physics graph editor is a UI affordance only —
 *  dragging mass/stiffness/damping sliders computes a cubic-bezier
 *  approximation and writes that string here; nothing downstream ever sees
 *  spring params directly. */
export type TimelineEase = AnimationEase | `cubic-bezier(${string})`;

/** Merged from the old TimelineProperty ∪ keys(AnimationTweenValues) — one
 *  property list for both the simple Animation-tab tween and the full
 *  Timeline drawer. CssVar and ClipPath keyframes stay their own track
 *  kinds (string values, different interpolation rules), not merged in.
 *  backgroundColor/color/borderColor/boxShadow from AnimationTweenValues
 *  are deliberately NOT included here even though they're numeric-track
 *  candidates at first glance — their values are CSS color/shadow STRINGS,
 *  which TimelineKeyframe.value (number) can't hold. They're represented
 *  as TimelineCssVarTrack entries instead, using the literal CSS property
 *  name ("backgroundColor", not "--exr-backgroundColor") as `varName` —
 *  GSAP's `.to()` doesn't care whether a vars key is a custom property or a
 *  real CSS property, so this tweens the actual property directly with no
 *  extra runtime logic needed. See animationConfigAdapter.ts. */
export type TimelineProperty =
  | "opacity" | "x" | "y" | "scale" | "scaleX" | "scaleY" | "rotate" | "skewX" | "skewY"
  | "borderRadius" | "blur" | "grayscale" | "brightness"
  | "backgroundPositionX" | "backgroundPositionY";

/** `interpolation: "hold"` is a step function — holds the previous
 *  keyframe's value until this one's time, then jumps, ignoring easing
 *  entirely. "smooth" respects `easingOut`. There's no third "linear" vs
 *  "bezier" distinction — that's already expressed by easingOut being
 *  "linear" or not. `easingOut` drives the real GSAP segment from this
 *  keyframe to the next (GSAP's `.to()` takes one ease per tween, so the
 *  segment's ease can only come from one side); `easingIn` has no export
 *  target of its own today — kept for graph-editor display symmetry and
 *  forward-compat, cosmetic only until GSAP has real split-easing. */
export interface TimelineKeyframe {
  id: string;
  time: number; // seconds
  value: number;
  easingOut: TimelineEase;
  easingIn: TimelineEase;
  interpolation: "smooth" | "hold";
}

export interface TimelinePropertyTrack {
  id: string;
  property: TimelineProperty;
  keyframes: TimelineKeyframe[];
}

/** A CSS custom property keyframed over time. `value` is the raw CSS value ("12px", "#2563ff", "rgba(0,0,0,.4)") — interpolated as a number+unit or as a color where both endpoints parse that way, otherwise snapped at each keyframe (see apps/web's timelineUtils.ts). */
export interface TimelineCssVarKeyframe {
  id: string;
  time: number;
  value: string;
  easingOut: TimelineEase;
  easingIn: TimelineEase;
  interpolation: "smooth" | "hold";
}

export interface TimelineCssVarTrack {
  id: string;
  varName: string; // e.g. "--exr-cardRadius", including the leading "--"
  keyframes: TimelineCssVarKeyframe[];
}

export type TimelineClipShape = "circle" | "inset" | "polygon";

/** `value` is a complete CSS clip-path value matching the track's own `shape` ("circle(40% at 50% 50%)", "inset(10% 20% 10% 20%)", a 4-point "polygon(...)") — every keyframe in one track shares its track's shape, so interpolation is always parametrically well-defined (see interpolateClipPathTrack in apps/web's timelineUtils.ts). */
export interface TimelineClipPathKeyframe {
  id: string;
  time: number;
  value: string;
  easingOut: TimelineEase;
  easingIn: TimelineEase;
  interpolation: "smooth" | "hold";
}

export interface TimelineClipPathTrack {
  id: string;
  shape: TimelineClipShape;
  keyframes: TimelineClipPathKeyframe[];
}

/** Canonical trigger modes — unchanged from the old NodeAnimationConfig's
 *  AnimationTrigger, no new names invented. Now valid for the full
 *  multi-keyframe timeline too, not just the old simple tween. */
export const TIMELINE_TRIGGER_MODE_VALUES = ["onMount", "onScroll", "onHover", "onClick", "onMouseMove", "onNavbarOpen", "onDropdownOpen", "onTabChange", "onSliderChange"] as const;
export type TimelineTriggerMode = (typeof TIMELINE_TRIGGER_MODE_VALUES)[number];

/** Renamed/nested version of the old scrollScrub/scrollStart/scrollEnd/scrollPin fields — same four concepts, grouped. */
export interface TimelineScrollConfig {
  scrub: boolean | number; // true, or seconds of smoothing lag — was scrollScrub
  start: string;            // e.g. "top 85%" — was scrollStart
  end: string;               // e.g. "top 40%" — was scrollEnd
  pin: boolean;              // was scrollPin
}

export interface TimelineMouseConfig {
  scope: "viewport" | "element"; // was mouseScope
  strength: number;               // was mouseStrength
}

export interface TimelineTrigger {
  mode: TimelineTriggerMode;
  scrollConfig?: TimelineScrollConfig; // present only when mode === "onScroll"
  mouseConfig?: TimelineMouseConfig;   // present only when mode === "onMouseMove"
  /** `onClick` only — Webflow's "On 1st click" vs "On 2nd click". Unset/1 = today's single-click-only behavior. */
  clickCount?: 1 | 2;
}

/** Replaces the old boolean staggerChildren + numeric staggerAmount —
 *  presence of this field on a BlockTimeline IS the "stagger children"
 *  flag, no separate boolean needed. Only meaningful when the owning node
 *  is a container with multiple children. */
export interface TimelineStaggerConfig {
  amount: number;
  from: "start" | "end" | "center" | "edges" | "random";
  grid?: [number, number];
  ease: TimelineEase;
}

/** The persisted form of one node's animation — v2 unifies the old
 *  single-tween NodeAnimationConfig and the old multi-keyframe
 *  BlockTimeline into this one shape (see LayoutNode.timelines below). A
 *  "simple" Animation-tab tween is just a 2-keyframe BlockTimeline (one
 *  keyframe per touched property at t=0, one at t=duration). */
export interface BlockTimeline {
  version: 2;
  duration: number; // seconds
  trigger: TimelineTrigger;
  /** When set, this timeline starts a shared, named TimedAnimation by id instead of using its own tracks below (which stay empty in that case) — see TimedAnimationDefinition. */
  timedAnimationId?: string;
  repeat?: number;      // -1 = infinite, 0/undefined = play once
  yoyo?: boolean;
  repeatDelay?: number; // seconds paused between repeats
  delay?: number;       // seconds before this timeline starts once triggered
  stagger?: TimelineStaggerConfig; // only meaningful when the owning node is a container
  /** Splits the node's own text into chars/words/lines at play time (real
   *  DOM nodes GSAP's SplitText plugin creates from the page's actual
   *  rendered text — the unit count depends on live text content and even
   *  viewport-driven line-wrapping, so it can't be pre-baked into fixed
   *  keyframe targets ahead of time). When set, `tracks`/`cssVarTracks`
   *  hold the single from→to pattern applied to EACH resulting unit,
   *  staggered per `stagger` above — not applied to the node's own root. */
  splitText?: "chars" | "words" | "lines";
  tracks: TimelinePropertyTrack[];
  cssVarTracks: TimelineCssVarTrack[];
  clipPathTracks: TimelineClipPathTrack[];
}

/** A reusable, site-wide, named GSAP animation — see the `TimedAnimation`
 *  Prisma model and `NodeAnimationConfig.timedAnimationId`/`BlockTimeline`
 *  above. Same shape as BlockTimeline minus `trigger`, since the trigger
 *  belongs to whichever element+event starts it, not the animation itself. */
export interface TimedAnimationDefinition {
  id: string;
  name: string;
  timeline: Omit<BlockTimeline, "trigger">;
}

export interface LayoutNode {
  id: string;
  type: string;
  /** Optional custom label shown in the admin Navigator tree instead of the block type's generic label (e.g. "home-navbar-container" instead of "Section") — purely a builder-UI convenience, never rendered on the live site. */
  name?: string;
  props: Record<string, unknown>;
  style?: LayoutNodeStyle;
  /** Ordered ids of reusable StyleClass resources attached to this node
   *  (Phase 2 of the Webflow-style inspector upgrade). Each class's style
   *  bag merges in list order (later wins over earlier) *underneath* this
   *  node's own `style` above, which always applies last as the final
   *  per-instance override — see resolveClassStyles in apps/web. No
   *  existing node has this field, so it's purely additive: nothing
   *  renders differently until an admin explicitly attaches a class. */
  classIds?: string[];
  /** Only meaningful for container-type blocks (Section, Columns, …). */
  children?: LayoutNode[];
  /** GSAP-driven animation(s) — replaces the old `animations`
   *  (NodeAnimationConfig[]) and singular `timeline` (BlockTimeline)
   *  fields; a node can have more than one independent animation with
   *  different triggers, e.g. an onMount entrance and a separate onHover
   *  lift, exactly like the old `animations` array allowed. See
   *  BlockTimeline above. */
  timelines?: BlockTimeline[];
}

/** The full JSON tree persisted in `Page.layout`. */
export interface LayoutDocument {
  version: 1;
  nodes: LayoutNode[];
}

export type BlockCategory =
  | "layout" // Section, Columns, Spacer — structural primitives
  | "content" // RichText, Image, Heading, CTAButton — generic content
  | "theme" // SiteLogo, NavMenu — Theme Builder widgets (Header/Footer templates)
  | "section" // Hero, FleetShowcase, Testimonials — existing curated sections
  | "collection"; // dynamic Collection-bound repeaters (tours, team, etc.)

/**
 * Metadata + validation for one entry in the block registry. Deliberately
 * has no `component` field — that lives in the renderer registry inside
 * `apps/web`, which is the only place allowed to import actual React
 * components. This file only describes *what a block is*, not *how it
 * looks*, so `apps/admin` can build property panels from it without ever
 * importing web's component tree.
 */
export interface BlockDefinition<Props = Record<string, unknown>> {
  type: string;
  label: string;
  category: BlockCategory;
  icon?: string;
  /** True for structural blocks that may contain child nodes (Section, Columns). */
  isContainer?: boolean;
  /** Props a freshly-inserted instance of this block starts with. */
  defaultProps: Props;
  /**
   * Legacy sections ported from the pre-builder homepage (Hero, Fleet, …)
   * are self-fetching singletons today — dropping a second instance on a
   * different page would still render the *same* global content, because
   * the underlying component reads from HomeContent/SiteSettings itself
   * rather than from `props`. Kept true until each is refactored to accept
   * data via props with a fallback fetch; see the builder README/plan.
   */
  singleton?: boolean;
}
