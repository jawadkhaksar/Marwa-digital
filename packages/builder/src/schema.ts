import { z } from "zod";
import type { LayoutDocument, LayoutNode, TimelineEase } from "./types";
import { ANIMATION_EASE_VALUES, ANIMATION_TRIGGER_VALUES, SPLIT_TEXT_VALUES, CLIP_REVEAL_VALUES, MOUSE_SCOPE_VALUES, HOVER_ANIMATION_VALUES, TIMELINE_TRIGGER_MODE_VALUES } from "./types";

const responsiveStyleFieldsSchema = z
  .object({
    paddingTop: z.string().optional(),
    paddingRight: z.string().optional(),
    paddingBottom: z.string().optional(),
    paddingLeft: z.string().optional(),
    marginTop: z.string().optional(),
    marginRight: z.string().optional(),
    marginBottom: z.string().optional(),
    marginLeft: z.string().optional(),
    background: z.string().optional(),
    textAlign: z.enum(["left", "center", "right"]).optional(),
    maxWidth: z.string().optional(),

    width: z.string().optional(),
    height: z.string().optional(),
    minWidth: z.string().optional(),
    minHeight: z.string().optional(),
    maxHeight: z.string().optional(),
    aspectRatio: z.string().optional(),
    boxSizing: z.string().optional(),
    blockAlign: z.enum(["left", "center", "right", "stretch"]).optional(),
    opacity: z.string().optional(),

    blur: z.string().optional(),
    grayscale: z.string().optional(),
    brightness: z.string().optional(),
    contrast: z.string().optional(),
    saturate: z.string().optional(),
    mixBlendMode: z.string().optional(),
    outlineStyle: z.string().optional(),
    outlineWidth: z.string().optional(),
    outlineColor: z.string().optional(),
    transform: z.string().optional(),
    transition: z.string().optional(),
    filter: z.string().optional(),
    backdropFilter: z.string().optional(),
    backdropFilterBlur: z.string().optional(),
    backdropFilterSaturate: z.string().optional(),
    cursor: z.string().optional(),
    pointerEvents: z.string().optional(),

    backgroundColor: z.string().optional(),
    backgroundImage: z.string().optional(),
    backgroundSize: z.string().optional(),
    backgroundPosition: z.string().optional(),
    backgroundRepeat: z.string().optional(),
    backgroundAttachment: z.string().optional(),
    backgroundClip: z.string().optional(),

    borderStyle: z.enum(["none", "solid", "dashed", "dotted", "double"]).optional(),
    borderWidth: z.string().optional(),
    borderColor: z.string().optional(),
    borderRadius: z.string().optional(),
    borderWidthTop: z.string().optional(),
    borderWidthRight: z.string().optional(),
    borderWidthBottom: z.string().optional(),
    borderWidthLeft: z.string().optional(),
    borderTopStyle: z.string().optional(),
    borderTopWidth: z.string().optional(),
    borderTopColor: z.string().optional(),
    borderRightStyle: z.string().optional(),
    borderRightWidth: z.string().optional(),
    borderRightColor: z.string().optional(),
    borderBottomStyle: z.string().optional(),
    borderBottomWidth: z.string().optional(),
    borderBottomColor: z.string().optional(),
    borderLeftStyle: z.string().optional(),
    borderLeftWidth: z.string().optional(),
    borderLeftColor: z.string().optional(),
    borderRadiusTopLeft: z.string().optional(),
    borderRadiusTopRight: z.string().optional(),
    borderRadiusBottomRight: z.string().optional(),
    borderRadiusBottomLeft: z.string().optional(),
    boxShadow: z.string().optional(),

    align: z.enum(["left", "center", "right", "justify"]).optional(),
    color: z.string().optional(),
    fontSize: z.string().optional(),
    fontWeight: z.enum(["100", "200", "300", "400", "500", "600", "700", "800", "900", "normal", "bold"]).optional(),
    textTransform: z.enum(["none", "uppercase", "lowercase", "capitalize"]).optional(),
    fontStyle: z.enum(["normal", "italic", "oblique"]).optional(),
    textDecoration: z.enum(["none", "underline", "overline", "line-through"]).optional(),
    lineHeight: z.string().optional(),
    fontFamily: z.string().optional(),
    letterSpacing: z.string().optional(),
    wordSpacing: z.string().optional(),
    textIndent: z.string().optional(),
    columnCount: z.string().optional(),
    wordBreak: z.string().optional(),
    whiteSpace: z.string().optional(),
    textWrap: z.string().optional(),
    textOverflow: z.string().optional(),
    textStrokeWidth: z.string().optional(),
    textStrokeColor: z.string().optional(),
    webkitTextStrokeWidth: z.string().optional(),
    webkitTextStrokeColor: z.string().optional(),
    textShadow: z.string().optional(),

    position: z.enum(["static", "relative", "absolute", "fixed", "sticky"]).optional(),
    zIndex: z.string().optional(),
    top: z.string().optional(),
    right: z.string().optional(),
    bottom: z.string().optional(),
    left: z.string().optional(),
    overflow: z.string().optional(),
    float: z.string().optional(),
    clear: z.string().optional(),

    display: z.string().optional(),
    flexDirection: z.enum(["row", "column", "row-reverse", "column-reverse"]).optional(),
    flexWrap: z.string().optional(),
    wrap: z.string().optional(),
    direction: z.enum(["row", "column", "row-reverse", "column-reverse"]).optional(),
    justifyContent: z.string().optional(),
    alignItems: z.string().optional(),
    gap: z.string().optional(),
    rowGap: z.string().optional(),
    columnGap: z.string().optional(),
    gridTemplateColumns: z.string().optional(),
    gridColumns: z.string().optional(),
    gridTemplateRows: z.string().optional(),
    gridRows: z.string().optional(),
    gridAutoFlow: z.string().optional(),
    gridDirection: z.string().optional(),
    gridAlignX: z.string().optional(),
    gridAlignY: z.string().optional(),
  })
  .strict();

// Open bag, not `.strict()`: any prop name a block declares on its Style
// tab can appear here (see StyleOverrideBag in ./types) — a closed schema
// would need every one of ~270 style-tab field names enumerated a second
// time in this file, the exact dual-maintenance trap that caused a past
// `Unrecognized key(s) in object` save failure when a field was added to
// types.ts but not here.
const styleOverrideBagSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]));

export const layoutNodeStyleSchema = responsiveStyleFieldsSchema.extend({
  className: z.string().optional(),
  css: z.record(z.string(), z.string()).optional(),
  tablet: styleOverrideBagSchema.optional(),
  mobile: styleOverrideBagSchema.optional(),
  hover: styleOverrideBagSchema.optional(),
  focus: styleOverrideBagSchema.optional(),
  active: styleOverrideBagSchema.optional(),
  visited: styleOverrideBagSchema.optional(),
  hoverTransitionDuration: z.string().optional(),
  hoverTransitionEasing: z.string().optional(),
  hoverTransitionDelay: z.string().optional(),
  hoverAnimation: z.enum(HOVER_ANIMATION_VALUES).optional(),

  htmlId: z.string().optional(),
  htmlClasses: z.string().optional(),
  customCss: z.string().optional(),
  hideOnDesktop: z.boolean().optional(),
  hideOnTablet: z.boolean().optional(),
  hideOnMobile: z.boolean().optional(),
  keepInDomWhenHidden: z.boolean().optional(),
  htmlAttributes: z.record(z.string(), z.string()).optional(),
});

const animationTweenValuesSchema = z
  .object({
    opacity: z.number().min(0).max(1).optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    scale: z.number().min(0).optional(),
    scaleX: z.number().min(0).optional(),
    scaleY: z.number().min(0).optional(),
    rotate: z.number().optional(),
    skewX: z.number().optional(),
    skewY: z.number().optional(),
    backgroundColor: z.string().optional(),
    color: z.string().optional(),
    borderColor: z.string().optional(),
    borderRadius: z.number().optional(),
    blur: z.number().min(0).optional(),
    grayscale: z.number().min(0).max(1).optional(),
    brightness: z.number().min(0).optional(),
    backgroundPositionX: z.number().min(0).max(100).optional(),
    backgroundPositionY: z.number().min(0).max(100).optional(),
    boxShadow: z.string().optional(),
  })
  .strict();

// Same 28-value AnimationEase enum as animationTweenValuesSchema's sibling
// below — single source of truth per the schema reconciliation, not a
// separate curated list.
const timelineEaseSchema: z.ZodType<TimelineEase> = z.union([
  z.enum(ANIMATION_EASE_VALUES),
  z.custom<`cubic-bezier(${string})`>((val) => typeof val === "string" && /^cubic-bezier\(.*\)$/.test(val)),
]);

const timelineInterpolationSchema = z.enum(["smooth", "hold"]);

const timelinePropertySchema = z.enum([
  "opacity", "x", "y", "scale", "scaleX", "scaleY", "rotate", "skewX", "skewY",
  "borderRadius", "blur", "grayscale", "brightness",
  "backgroundPositionX", "backgroundPositionY",
]);

const timelinePropertyTrackSchema = z.object({
  id: z.string().min(1),
  property: timelinePropertySchema,
  keyframes: z.array(z.object({
    id: z.string().min(1),
    time: z.number().min(0),
    value: z.number(),
    easingOut: timelineEaseSchema,
    easingIn: timelineEaseSchema,
    interpolation: timelineInterpolationSchema,
  })),
});

const timelineCssVarTrackSchema = z.object({
  id: z.string().min(1),
  varName: z.string().min(1),
  keyframes: z.array(z.object({
    id: z.string().min(1),
    time: z.number().min(0),
    value: z.string(),
    easingOut: timelineEaseSchema,
    easingIn: timelineEaseSchema,
    interpolation: timelineInterpolationSchema,
  })),
});

const timelineClipPathTrackSchema = z.object({
  id: z.string().min(1),
  shape: z.enum(["circle", "inset", "polygon"]),
  keyframes: z.array(z.object({
    id: z.string().min(1),
    time: z.number().min(0),
    value: z.string(),
    easingOut: timelineEaseSchema,
    easingIn: timelineEaseSchema,
    interpolation: timelineInterpolationSchema,
  })),
});

const timelineScrollConfigSchema = z.object({
  scrub: z.union([z.boolean(), z.number()]),
  start: z.string(),
  end: z.string(),
  pin: z.boolean(),
});

const timelineMouseConfigSchema = z.object({
  scope: z.enum(MOUSE_SCOPE_VALUES),
  strength: z.number(),
});

const timelineTriggerSchema = z.object({
  mode: z.enum(TIMELINE_TRIGGER_MODE_VALUES),
  scrollConfig: timelineScrollConfigSchema.optional(),
  mouseConfig: timelineMouseConfigSchema.optional(),
  clickCount: z.union([z.literal(1), z.literal(2)]).optional(),
});

const timelineStaggerConfigSchema = z.object({
  amount: z.number().min(0),
  from: z.enum(["start", "end", "center", "edges", "random"]),
  grid: z.tuple([z.number(), z.number()]).optional(),
  ease: timelineEaseSchema,
});

export const blockTimelineSchema = z.object({
  version: z.literal(2),
  duration: z.number().min(0),
  trigger: timelineTriggerSchema,
  timedAnimationId: z.string().optional(),
  repeat: z.number().optional(),
  yoyo: z.boolean().optional(),
  repeatDelay: z.number().min(0).optional(),
  delay: z.number().min(0).optional(),
  stagger: timelineStaggerConfigSchema.optional(),
  splitText: z.enum(["chars", "words", "lines"]).optional(),
  tracks: z.array(timelinePropertyTrackSchema),
  cssVarTracks: z.array(timelineCssVarTrackSchema),
  clipPathTracks: z.array(timelineClipPathTrackSchema),
});

// Legacy v1 shapes — no longer part of the live layoutNodeSchema below, kept
// exported so the migration script (packages/builder/src/migrateTimelines.ts)
// can validate/parse old saved data before converting it.
const legacyTimelineEasingSchema = z.union([
  z.enum(["none", "power1.out", "power2.inOut", "power3.out", "back.out(1.7)", "bounce.out", "elastic.out(1,0.3)"]),
  z.custom<`cubic-bezier(${string})`>((val) => typeof val === "string" && /^cubic-bezier\(.*\)$/.test(val)),
]);
const legacyTimelinePropertyTrackSchema = z.object({
  id: z.string().min(1),
  property: z.enum(["opacity", "x", "y", "scale", "rotate"]),
  keyframes: z.array(z.object({ id: z.string().min(1), time: z.number().min(0), value: z.number(), easing: legacyTimelineEasingSchema })),
});
const legacyTimelineCssVarTrackSchema = z.object({
  id: z.string().min(1),
  varName: z.string().min(1),
  keyframes: z.array(z.object({ id: z.string().min(1), time: z.number().min(0), value: z.string(), easing: legacyTimelineEasingSchema })),
});
const legacyTimelineClipPathTrackSchema = z.object({
  id: z.string().min(1),
  shape: z.enum(["circle", "inset", "polygon"]),
  keyframes: z.array(z.object({ id: z.string().min(1), time: z.number().min(0), value: z.string(), easing: legacyTimelineEasingSchema })),
});
export const legacyBlockTimelineSchema = z.object({
  version: z.literal(1),
  duration: z.number().min(0),
  scrollTrigger: z.boolean().optional(),
  tracks: z.array(legacyTimelinePropertyTrackSchema),
  cssVarTracks: z.array(legacyTimelineCssVarTrackSchema),
  clipPathTracks: z.array(legacyTimelineClipPathTrackSchema),
});

export const nodeAnimationConfigSchema = z.object({
  id: z.string().min(1),
  trigger: z.enum(ANIMATION_TRIGGER_VALUES),
  clickCount: z.union([z.literal(1), z.literal(2)]).optional(),
  timedAnimationId: z.string().optional(),
  from: animationTweenValuesSchema,
  to: animationTweenValuesSchema,
  duration: z.number().min(0),
  delay: z.number().min(0),
  ease: z.enum(ANIMATION_EASE_VALUES),
  repeat: z.number().optional(),
  yoyo: z.boolean().optional(),
  repeatDelay: z.number().min(0).optional(),
  staggerChildren: z.boolean().optional(),
  staggerAmount: z.number().min(0).optional(),
  splitText: z.enum(SPLIT_TEXT_VALUES).optional(),
  clipReveal: z.enum(CLIP_REVEAL_VALUES).optional(),
  scrollScrub: z.boolean().optional(),
  scrollStart: z.string().optional(),
  scrollEnd: z.string().optional(),
  scrollPin: z.boolean().optional(),
  mouseScope: z.enum(MOUSE_SCOPE_VALUES).optional(),
  mouseStrength: z.number().optional(),
});

// `LayoutNode` is self-referential via `children`, so the Zod schema has to
// be built with z.lazy() — casting through z.ZodType<LayoutNode> is the
// standard escape hatch for recursive types since Zod can't infer them.
export const layoutNodeSchema: z.ZodType<LayoutNode> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    name: z.string().optional(),
    props: z.record(z.string(), z.unknown()),
    style: layoutNodeStyleSchema.optional(),
    classIds: z.array(z.string()).optional(),
    children: z.array(layoutNodeSchema).optional(),
    timelines: z.array(blockTimelineSchema).optional(),
  })
);

export const layoutDocumentSchema: z.ZodType<LayoutDocument> = z.object({
  version: z.literal(1),
  nodes: z.array(layoutNodeSchema),
});

export class LayoutValidationError extends Error {
  constructor(public readonly issues: z.ZodIssue[]) {
    super(`Invalid layout document: ${issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
    this.name = "LayoutValidationError";
  }
}

/** Throws LayoutValidationError on malformed input — use at API write boundaries. */
export function parseLayoutDocument(value: unknown): LayoutDocument {
  const result = layoutDocumentSchema.safeParse(value);
  if (!result.success) throw new LayoutValidationError(result.error.issues);
  return result.data;
}

/** Never throws — returns an empty document on malformed input. Use at render boundaries (a bad row in the DB should never 500 the page). */
export function parseLayoutDocumentSafe(value: unknown): LayoutDocument {
  const result = layoutDocumentSchema.safeParse(value);
  return result.success ? result.data : { version: 1, nodes: [] };
}

/**
 * Validates a single node's `props` against its block's own prop schema
 * (from the registry). Call this when a node's `type` is already known to
 * exist in the registry — see `registry.ts` for how block prop schemas are
 * declared.
 */
export function parseBlockProps<Props>(propsSchema: z.ZodType<Props>, props: unknown): Props {
  return propsSchema.parse(props);
}
