import type { CSSProperties } from "react";
import type { LayoutNodeStyle, ResponsiveStyleFields, StyleOverrideBag, StyleClassDefinition } from "@marwa/builder";
import { STYLE_KEYS, STRUCTURAL_STYLE_KEYS, BOX_MODEL_KEYS } from "@marwa/builder";
import { resolveImageUrl } from "@/lib/resolveImageUrl";

/**
 * Merges a node's attached StyleClass definitions (in list order — later
 * wins over earlier) underneath the node's own `style`, which always applies
 * last as the final per-instance override. Nested bags (tablet/mobile/hover/
 * css) merge key-by-key rather than wholesale-replacing, so a class's tablet
 * override and a node's own tablet override can coexist instead of one
 * clobbering the other. A node with no `classIds` gets its own `style` back
 * untouched (identity behavior for every page saved before this existed).
 */
export function resolveClassStyles(
  classIds: string[] | undefined,
  classesById: Map<string, StyleClassDefinition>,
  nodeStyle: LayoutNodeStyle | undefined
): LayoutNodeStyle | undefined {
  if (!classIds?.length) return nodeStyle;
  let merged: LayoutNodeStyle | undefined;
  for (const id of classIds) {
    const cls = classesById.get(id);
    if (!cls) continue;
    merged = mergeStyleBags(merged, cls.style);
  }
  if (nodeStyle) merged = mergeStyleBags(merged, nodeStyle);
  return merged ?? nodeStyle;
}

function mergeStyleBags(base: LayoutNodeStyle | undefined, override: LayoutNodeStyle): LayoutNodeStyle {
  return {
    ...base,
    ...override,
    tablet: { ...base?.tablet, ...override.tablet },
    mobile: { ...base?.mobile, ...override.mobile },
    hover: { ...base?.hover, ...override.hover },
    focus: { ...base?.focus, ...override.focus },
    active: { ...base?.active, ...override.active },
    visited: { ...base?.visited, ...override.visited },
    css: { ...base?.css, ...override.css },
  };
}

// Kept in sync with the identical map in blockComponents.tsx's Section —
// duplicated rather than imported from there to avoid a circular import
// (Section's own file imports helpers that end up depending on this one).
const BG_POSITION_CSS: Record<string, string> = {
  center: "center center",
  top: "top center",
  bottom: "bottom center",
  left: "center left",
  right: "center right",
  "top-left": "top left",
  "top-right": "top right",
  "bottom-left": "bottom left",
  "bottom-right": "bottom right",
};

/**
 * `backgroundImage`/`backgroundPosition` can't be minted as a raw
 * passthrough value the way every other Group-B field is: `background-image`
 * requires a real `url(...)` (a bare path is invalid CSS and — since `var()`
 * fallbacks only apply when the property is *undeclared*, not when its
 * substituted value is invalid — would silently resolve to `none` instead of
 * falling back to anything), and `backgroundPosition`'s stored value is a
 * friendly keyword ("top-left") rather than valid CSS syntax ("top left").
 * Both need the real transform baked into the custom property's own stored
 * text before a block reads it via `var()`. Every other block that happens
 * to declare a same-named `backgroundImage` prop for something else
 * entirely (e.g. DefinitionRows' decorative side image, read straight from
 * `props` as a plain `<img src>`, never via this var) is unaffected — this
 * only changes what a var *would* resolve to if read, and nothing reads it
 * except Section, which is the only place this transform matters.
 */
function transformStyleVarValue(key: string, raw: string): string {
  if (key === "backgroundImage") return raw ? `url(${resolveImageUrl(raw)})` : "none";
  if (key === "backgroundPosition") return BG_POSITION_CSS[raw] ?? raw;
  return raw;
}

export interface ResolvedNodeStyle {
  className: string;
  style: CSSProperties;
  responsiveCss: string;
  htmlId?: string;
}

// A CSS custom property is just another declaration as far as React's style
// prop is concerned — this codebase already exercises the same cast for the
// pre-existing `LayoutNodeStyle.css` escape hatch below.
type CSSVarStyle = CSSProperties & Record<string, string | number>;

/**
 * Converts a generic LayoutNodeStyle (+ the block's own parsed props) into a
 * className + inline style pair, plus a scoped `<style>` block for anything
 * inline styles can't express: tablet/mobile overrides, per-breakpoint
 * visibility, hover, and the block's own Custom CSS.
 *
 * Two independent delivery mechanisms feed the same wrapper:
 * - **Box-model fields** (`BOX_MODEL_KEYS` above) apply directly — inline at
 *   the base breakpoint, `!important` class rules inside `@media` for
 *   tablet/mobile — because they paint on the wrapper itself.
 * - **Everything else** — the ~230+ block-specific Style-tab props
 *   (`titleColor`, `cardPaddingTop`, `menuFontSize`, …) plus the generic
 *   typography fields (`color`, `fontSize`, …) — paints on a DOM node
 *   *inside* the block's own markup, often several levels deep, which a
 *   wrapper-level rule can never reach by selector. These get minted as
 *   `--exr-{key}` CSS custom properties instead: custom properties inherit
 *   through arbitrary nesting, so a block component consuming
 *   `var(--exr-key, fallback)` anywhere in its own markup picks up the
 *   right value automatically, with the desktop value coming from `props`
 *   and tablet/mobile overrides from `style.tablet`/`style.mobile` — no
 *   per-field wiring, no marker classes, no selector-depth assumptions.
 */
export function resolveNodeStyle(
  style: LayoutNodeStyle | undefined,
  props: Record<string, unknown>,
  blockClassName: string,
  parentIsFlexRow?: boolean
): ResolvedNodeStyle {
  const cssVars: CSSVarStyle = { ...(style?.css as CSSProperties | undefined) };
  if (style) applyResponsiveFields(cssVars, style);
  Object.assign(cssVars, mintDesktopBgVars(style, props));
  Object.assign(cssVars, mintVars(props));

  const className = [blockClassName, style?.className, style?.htmlClasses].filter(Boolean).join(" ");

  if (!style) return { className, style: cssVars, responsiveCss: "" };

  const responsiveCss = [
    style.blockAlign === "stretch" ? blockAlignStretchRule(blockClassName) : "",
    style.tablet ? mediaRule(`(max-width:1024px)`, blockClassName, style.tablet, "", parentIsFlexRow) : "",
    style.mobile ? mediaRule(`(max-width:640px)`, blockClassName, style.mobile, "", parentIsFlexRow) : "",
    style.hideOnDesktop ? mediaRule(`(min-width:1025px)`, blockClassName, {}, "display:none !important;") : "",
    style.hideOnTablet ? mediaRule(`(min-width:641px) and (max-width:1024px)`, blockClassName, {}, "display:none !important;") : "",
    style.hideOnMobile ? mediaRule(`(max-width:640px)`, blockClassName, {}, "display:none !important;") : "",
    hoverRule(
      blockClassName,
      style.hover,
      style.hoverAnimation,
      style.hoverTransitionDuration,
      style.hoverTransitionEasing,
      style.hoverTransitionDelay,
      parentIsFlexRow
    ),
    pseudoStateRule(blockClassName, "focus", style.focus, parentIsFlexRow),
    pseudoStateRule(blockClassName, "active", style.active, parentIsFlexRow),
    pseudoStateRule(blockClassName, "visited", style.visited, parentIsFlexRow),
    style.customCss ? style.customCss.replace(/selector/g, `.${blockClassName}`) : "",
  ]
    .filter(Boolean)
    .join("\n");

  return { className, style: cssVars, responsiveCss, htmlId: style.htmlId || undefined };
}

// CSS custom properties inherit through descendants by default — normally
// exactly what makes the var-bridge work (a value set once on a wrapper
// reaches a deeply-nested consumer with no per-field wiring), but it back-
// fires for a field like backgroundImage on a container block that can
// nest inside another instance of itself (a Section inside a Section): a
// child with no background image configured never mints its OWN
// --exr-backgroundImage, so the lookup falls through to whatever its
// ANCESTOR Section minted instead, visibly painting the outer section's
// image onto the inner one. Every other var-bridged field (colors, fonts,
// spacing, …) *wants* that fallback-through-inheritance when unset — this
// is the one narrow exception that must always mint an explicit reset
// instead of skipping, so "no image configured" reliably means no image,
// not "whatever the nearest ancestor happens to have".
const ALWAYS_MINT_KEYS = new Set(["backgroundImage"]);

// Section's own background cluster (see the admin's matching
// SECTION_RESPONSIVE_BG_KEYS in PropertyPanel.tsx) is deliberately routed
// into `node.style` at the desktop breakpoint too — same as every other
// BOX_MODEL_KEYS field — but unlike the rest of that set, these five need
// the `transformStyleVarValue` treatment (real `url(...)`, a friendly
// keyword turned into valid CSS) before a block can consume them via
// `var()`, so `mintVars`'s generic BOX_MODEL_KEYS skip (line below) doesn't
// apply to them. Minting these explicitly here — from `style`, not
// `props` — is what makes the desktop Background Image/Position/Size/
// Repeat/Attachment editor actually reach the canvas at all: without it,
// `--exr-backgroundImage` etc. were never minted for the desktop
// breakpoint from ANY source, so Section's `var(--exr-backgroundImage,
// <props fallback>)` always fell through to whatever `props.backgroundImage`
// happened to be — permanently stale once edits stopped writing there.
const DESKTOP_BG_VAR_KEYS = ["backgroundImage", "backgroundPosition", "backgroundAttachment", "backgroundRepeat", "backgroundSize"] as const;

/**
 * Mints `--exr-{key}` for Section's desktop-level background cluster (see
 * DESKTOP_BG_VAR_KEYS above) — the one BOX_MODEL_KEYS subset that still
 * needs the var-bridge treatment `mintVars` skips for every other
 * box-model field. `style[key]` (the per-breakpoint editor's own storage,
 * once an admin has touched the field there) wins when present; a page
 * saved before that migration — or one where this particular field was
 * simply never touched in the new editor — falls back to `props[key]`
 * (the pre-migration storage Section's own component still declares as its
 * prop-level default), exactly the same style-then-props precedence every
 * other field in `binding()` already uses. Only once BOTH are genuinely
 * empty does `backgroundImage` still mint an explicit `--exr-
 * backgroundImage:none` (see ALWAYS_MINT_KEYS's own comment) — that's what
 * stops a nested Section with no image of its own from visually inheriting
 * its ancestor's custom property through normal CSS inheritance.
 */
function mintDesktopBgVars(style: LayoutNodeStyle | undefined, props: Record<string, unknown>): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const key of DESKTOP_BG_VAR_KEYS) {
    const styleRaw = (style as Record<string, unknown> | undefined)?.[key];
    const raw = styleRaw !== undefined && styleRaw !== null && styleRaw !== "" ? styleRaw : props[key];
    if (raw !== undefined && raw !== null && raw !== "") {
      vars[`--exr-${key}`] = transformStyleVarValue(key, String(raw));
    } else if (ALWAYS_MINT_KEYS.has(key)) {
      vars[`--exr-${key}`] = transformStyleVarValue(key, "");
    }
  }
  return vars;
}

/** Mints `--exr-{key}` for every Style-tab prop the block actually declared, skipping the box-model fields (handled directly) and anything structural (see STRUCTURAL_STYLE_KEYS). */
function mintVars(props: Record<string, unknown>): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!STYLE_KEYS.has(key) || STRUCTURAL_STYLE_KEYS.has(key) || BOX_MODEL_KEYS.has(key)) continue;
    if (value === undefined || value === null) continue;
    if (value === "" && !ALWAYS_MINT_KEYS.has(key)) continue;
    vars[`--exr-${key}`] = transformStyleVarValue(key, String(value));
  }
  return vars;
}

function applyResponsiveFields(cssVars: CSSProperties, fields: ResponsiveStyleFields) {
  if (fields.paddingTop) cssVars.paddingTop = fields.paddingTop;
  if (fields.paddingRight) cssVars.paddingRight = fields.paddingRight;
  if (fields.paddingBottom) cssVars.paddingBottom = fields.paddingBottom;
  if (fields.paddingLeft) cssVars.paddingLeft = fields.paddingLeft;
  if (fields.marginTop) cssVars.marginTop = fields.marginTop;
  if (fields.marginRight) cssVars.marginRight = fields.marginRight;
  if (fields.marginBottom) cssVars.marginBottom = fields.marginBottom;
  if (fields.marginLeft) cssVars.marginLeft = fields.marginLeft;
  if (fields.background) cssVars.background = fields.background;
  if (fields.textAlign) cssVars.textAlign = fields.textAlign;
  if (fields.maxWidth) {
    cssVars.maxWidth = fields.maxWidth;
    cssVars.marginLeft = "auto";
    cssVars.marginRight = "auto";
  }

  if (fields.width) cssVars.width = fields.width;
  if (fields.height) cssVars.height = fields.height;
  // The Size panel's Min/Max rows. These reach the tablet/mobile and hover
  // paths through fieldsToDeclarations, but the base breakpoint is built from
  // this inline object instead — so without them here, a Min-Width/Min-Height
  // /Max-Height set at desktop rendered nothing at all and only appeared once
  // the viewport crossed into a breakpoint that had its own override.
  if (fields.minWidth) cssVars.minWidth = fields.minWidth;
  if (fields.minHeight) cssVars.minHeight = fields.minHeight;
  if (fields.maxHeight) cssVars.maxHeight = fields.maxHeight;
  if (fields.blockAlign === "center") {
    cssVars.marginLeft = "auto";
    cssVars.marginRight = "auto";
  } else if (fields.blockAlign === "left") {
    cssVars.marginRight = "auto";
  } else if (fields.blockAlign === "right") {
    cssVars.marginLeft = "auto";
  } else if (fields.blockAlign === "stretch") {
    cssVars.width = "100%";
  }
  if (fields.opacity) cssVars.opacity = Number(fields.opacity);

  const filter = buildFilter(fields);
  if (filter) cssVars.filter = filter;
  if (fields.mixBlendMode) cssVars.mixBlendMode = fields.mixBlendMode as CSSProperties["mixBlendMode"];
  if (fields.outlineStyle) cssVars.outlineStyle = fields.outlineStyle as CSSProperties["outlineStyle"];
  if (fields.outlineWidth) cssVars.outlineWidth = fields.outlineWidth;
  if (fields.outlineColor) cssVars.outlineColor = fields.outlineColor;
  if (fields.transform) cssVars.transform = fields.transform;
  if (fields.transition) cssVars.transition = fields.transition;
  if (fields.backdropFilter) cssVars.backdropFilter = fields.backdropFilter;
  if (fields.cursor) cssVars.cursor = fields.cursor;
  if (fields.pointerEvents) cssVars.pointerEvents = fields.pointerEvents as CSSProperties["pointerEvents"];

  if (fields.borderStyle && fields.borderStyle !== "none") {
    cssVars.borderStyle = fields.borderStyle;
    if (fields.borderWidth || fields.borderWidthTop) cssVars.borderTopWidth = fields.borderWidthTop || fields.borderWidth;
    if (fields.borderWidth || fields.borderWidthRight) cssVars.borderRightWidth = fields.borderWidthRight || fields.borderWidth;
    if (fields.borderWidth || fields.borderWidthBottom) cssVars.borderBottomWidth = fields.borderWidthBottom || fields.borderWidth;
    if (fields.borderWidth || fields.borderWidthLeft) cssVars.borderLeftWidth = fields.borderWidthLeft || fields.borderWidth;
    if (fields.borderColor) cssVars.borderColor = fields.borderColor;
  }
  if (fields.borderRadius || fields.borderRadiusTopLeft) cssVars.borderTopLeftRadius = fields.borderRadiusTopLeft || fields.borderRadius;
  if (fields.borderRadius || fields.borderRadiusTopRight) cssVars.borderTopRightRadius = fields.borderRadiusTopRight || fields.borderRadius;
  if (fields.borderRadius || fields.borderRadiusBottomRight) cssVars.borderBottomRightRadius = fields.borderRadiusBottomRight || fields.borderRadius;
  if (fields.borderRadius || fields.borderRadiusBottomLeft) cssVars.borderBottomLeftRadius = fields.borderRadiusBottomLeft || fields.borderRadius;
  if (fields.boxShadow) cssVars.boxShadow = fields.boxShadow;

  if (fields.position) cssVars.position = fields.position;
  if (fields.zIndex) cssVars.zIndex = fields.zIndex;
  if (fields.top) cssVars.top = fields.top;
  if (fields.right) cssVars.right = fields.right;
  if (fields.bottom) cssVars.bottom = fields.bottom;
  if (fields.left) cssVars.left = fields.left;
  if (fields.overflow) cssVars.overflow = fields.overflow;

  // Same omission as the Min/Max size fields above: `display` was wired into
  // the media-query and hover paths but not the base inline one, so the
  // Layout panel's Block/Flex/Grid/None selector did nothing at the desktop
  // breakpoint. Block and None have no equivalent block-level prop anywhere,
  // so without this they were unreachable entirely.
  if (fields.display) cssVars.display = fields.display;
  // `flexDirection` is the key the Layout panel writes; `direction` is the
  // older field name kept for layouts authored before it. The media-query
  // path already accepts either — this one only read the legacy name.
  if (fields.flexDirection || fields.direction) cssVars.flexDirection = fields.flexDirection || fields.direction;
  if (fields.textDirection) cssVars.direction = fields.textDirection;
  // Accepts either name for the same reason flexDirection does above, and
  // matching how the media-query path already reads it.
  if (fields.flexWrap || fields.wrap) cssVars.flexWrap = (fields.flexWrap || fields.wrap) as CSSProperties["flexWrap"];
  if (fields.justifyContent) cssVars.justifyContent = fields.justifyContent;
  if (fields.alignItems) cssVars.alignItems = fields.alignItems;
  if (fields.gap) cssVars.gap = fields.gap;
}

/** Composes the five filter sub-fields into one `filter` declaration — GSAP's animated version (AnimatedBox) does the same for the same reason: `filter` is a single CSS property, not five independent ones. */
function buildFilter(fields: ResponsiveStyleFields): string {
  const parts: string[] = [];
  if (fields.blur) parts.push(`blur(${sanitize(fields.blur)})`);
  if (fields.grayscale) parts.push(`grayscale(${sanitize(fields.grayscale)})`);
  if (fields.brightness) parts.push(`brightness(${sanitize(fields.brightness)})`);
  if (fields.contrast) parts.push(`contrast(${sanitize(fields.contrast)})`);
  if (fields.saturate) parts.push(`saturate(${sanitize(fields.saturate)})`);
  return parts.join(" ");
}

/** Values ultimately come from an authenticated admin's builder session, same trust boundary as the existing customCss/headTags fields — still strip characters that could break out of the rule as cheap defense in depth. */
function sanitize(value: string): string {
  return value.replace(/[{}<>]/g, "");
}

/** Same idea as `sanitize`, for values coming out of the open `StyleOverrideBag` (string | number | boolean) rather than a typed string field. */
function sanitizeBagValue(value: string | number | boolean): string {
  return sanitize(String(value));
}

/**
 * Every declaration here gets `!important`: this function's only two
 * callers (`mediaRule`, for tablet/mobile, and `hoverRule`) both need to
 * override the *same* property applied as an inline style for the base
 * breakpoint by `applyResponsiveFields` above — and inline style always
 * outranks a plain class-selector rule regardless of whether the media
 * query matches, so without `!important` a tablet/mobile/hover override
 * could never actually take effect once the base value was also set.
 * Reads from the open `StyleOverrideBag` — only the box-model subset of its
 * keys is meaningful here, everything else is handled by `varDeclarations`.
 */
function fieldsToDeclarations(fields: StyleOverrideBag, parentIsFlexRow?: boolean): string {
  const decls: string[] = [];
  const push = (decl: string) => decls.push(`${decl} !important;`);
  const str = (key: string): string | undefined => {
    const v = fields[key];
    return v === undefined || v === "" ? undefined : sanitizeBagValue(v);
  };

  if (str("paddingTop")) push(`padding-top:${str("paddingTop")}`);
  if (str("paddingRight")) push(`padding-right:${str("paddingRight")}`);
  if (str("paddingBottom")) push(`padding-bottom:${str("paddingBottom")}`);
  if (str("paddingLeft")) push(`padding-left:${str("paddingLeft")}`);
  if (str("marginTop")) push(`margin-top:${str("marginTop")}`);
  if (str("marginRight")) push(`margin-right:${str("marginRight")}`);
  if (str("marginBottom")) push(`margin-bottom:${str("marginBottom")}`);
  if (str("marginLeft")) push(`margin-left:${str("marginLeft")}`);
  if (str("background")) push(`background:${str("background")}`);
  if (str("textAlign")) push(`text-align:${str("textAlign")}`);
  if (str("maxWidth")) {
    push(`max-width:${str("maxWidth")}`);
    push(`margin-left:auto`);
    push(`margin-right:auto`);
  }

  // Section/Columns' own "Content Width" (boxed vs full) — a semantic
  // switch, not a literal CSS property, so it's translated the same way
  // blockAlign is below rather than passed straight through. Only present
  // in the bag for those two block types (see LAYOUT_KEYS in the admin), so
  // this never affects the plain unconditional `width` override every other
  // block's generic Advanced-tab Width field already relies on. `flex` is
  // set alongside width/max-width for the same reason the base (desktop)
  // style does in blockComponents.tsx's Section: a plain `width` override
  // has no effect on a flex CHILD once flex-basis is non-auto (which the
  // desktop value already set), so this breakpoint's override has to win
  // that fight too, not just set `width` and hope. An explicit width value
  // at this breakpoint always wins outright, regardless of whether
  // contentWidth was also touched here or is only inherited from desktop.
  // The `flex:` line itself is gated on `parentIsFlexRow` (only true when
  // this node's ACTUAL parent lays its children out in a row — see
  // LayoutRenderer's childIsFlexRow) — width/max-width/margin stay
  // unconditional (always safe), but flex-basis is main-axis-relative to
  // whatever the parent is flexing on, so setting it on a section whose
  // parent is a flex *column* (e.g. a page's own top-level block stack, or
  // a sticky-footer page shell) would apply a *width* value to the
  // *height* axis instead — exactly the "1280px" intended as a width
  // becoming 1280px of forced height bug this guard exists to prevent.
  // Basis is 0% with grow:1, not 100% with shrink-only — flex-wrap's line-
  // breaking decision is made from each item's *hypothetical* size (its
  // basis, before shrinking is even considered), so a basis of 100% already
  // fills an entire line by itself, forcing every "full"/"100%" sibling onto
  // its own line the instant `wrap` is active at this breakpoint, no matter
  // how much shrink capacity exists (see the matching fix + longer note in
  // blockComponents.tsx's Section — same bug, same reasoning, mirrored here
  // for the tablet/mobile override path). Grow is safe once this guard has
  // passed since the main axis is confirmed horizontal.
  // Explicit width is tested BEFORE contentWidth, matching the precedence in
  // blockComponents.tsx's Section: contentWidth is a coarse mode most
  // sections carry by default, so checking it first made a typed Width at
  // this breakpoint silently do nothing. A specific value beats a mode.
  if (str("width")) {
    const w = str("width")!;
    if (w === "100%" || w === "100vw") {
      if (parentIsFlexRow) push(`flex:1 1 0%`);
      push(`width:100%`);
      push(`max-width:100%`);
    } else {
      // shrink:1, not 0 — see the matching note in blockComponents.tsx's
      // Section: a fixed/percentage Width on a row sibling that doesn't
      // leave room for the rest of the row (e.g. this override applying a
      // wide column on tablet while another sibling is also present)
      // otherwise has nothing to give and pushes straight past the row's
      // edge instead of compressing.
      if (parentIsFlexRow) push(`flex:0 1 ${w}`);
      push(`width:${w}`);
      push(`max-width:${w}`);
      push(`margin-left:auto`);
      push(`margin-right:auto`);
    }
  } else if (fields.contentWidth === "full") {
    if (parentIsFlexRow) push(`flex:1 1 0%`);
    push(`width:100%`);
    push(`max-width:none`);
  }
  if (str("height")) push(`height:${str("height")}`);
  if (str("minHeight")) push(`min-height:${str("minHeight")}`);
  const blockAlign = fields.blockAlign;
  if (blockAlign === "center") {
    push(`margin-left:auto`);
    push(`margin-right:auto`);
  } else if (blockAlign === "left") {
    push(`margin-right:auto`);
  } else if (blockAlign === "right") {
    push(`margin-left:auto`);
  } else if (blockAlign === "stretch") {
    push(`width:100%`);
  }

  // Image's own "Image Align" (left/center/right) — same margin-auto
  // technique as blockAlign above, but as its own field name (see the
  // Image block's registry entry) rather than reusing blockAlign, and with
  // both margins always pushed explicitly (not left as "whatever the
  // desktop value already set") — this is specifically the override path
  // for a non-desktop breakpoint, so e.g. switching to "left" on Mobile has
  // to reset a desktop "center"'s margin-right:auto back to 0, not just
  // leave it unset and inherit the still-active inline value.
  const imageAlign = fields.imageAlign;
  if (imageAlign === "center") {
    push(`margin-left:auto`);
    push(`margin-right:auto`);
  } else if (imageAlign === "left") {
    push(`margin-left:0`);
    push(`margin-right:auto`);
  } else if (imageAlign === "right") {
    push(`margin-left:auto`);
    push(`margin-right:0`);
  }
  if (str("opacity")) push(`opacity:${str("opacity")}`);
  if (str("mixBlendMode")) push(`mix-blend-mode:${str("mixBlendMode")}`);
  if (str("outlineStyle")) push(`outline-style:${str("outlineStyle")}`);
  if (str("outlineWidth")) push(`outline-width:${str("outlineWidth")}`);
  if (str("outlineColor")) push(`outline-color:${str("outlineColor")}`);
  if (str("transform")) push(`transform:${str("transform")}`);
  if (str("transition")) push(`transition:${str("transition")}`);
  if (str("backdropFilter")) push(`backdrop-filter:${str("backdropFilter")}`);
  if (str("cursor")) push(`cursor:${str("cursor")}`);
  if (fields.pointerEvents) push(`pointer-events:${String(fields.pointerEvents)}`);

  const filterParts = [
    fields.blur && `blur(${str("blur")})`,
    fields.grayscale && `grayscale(${str("grayscale")})`,
    fields.brightness && `brightness(${str("brightness")})`,
    fields.contrast && `contrast(${str("contrast")})`,
    fields.saturate && `saturate(${str("saturate")})`,
    str("filter"),
  ].filter(Boolean);
  if (filterParts.length) push(`filter:${filterParts.join(" ")}`);

  // Deliberately NOT gated on THIS bag's own borderStyle: a tablet/mobile/
  // hover bag overriding only e.g. borderWidthRight (border-style already
  // set at the desktop level, unchanged for this breakpoint) needs its
  // width/color to still apply — checking this bag's own borderStyle here
  // silently dropped exactly that case (verified live while building the
  // per-side upgrade: a tablet-only borderWidthRight override rendered
  // nothing until this was split out from the style-string gate below).
  if (str("backgroundColor")) push(`background-color:${str("backgroundColor")}`);
  // Stored as a bare uploaded-file path / a friendly position keyword, same
  // as the desktop value — needs the same `url(...)`/keyword transform
  // (transformStyleVarValue) before it's valid CSS, not the raw stored
  // string `str()` returns for every other field here.
  if (str("backgroundImage")) push(`background-image:${transformStyleVarValue("backgroundImage", str("backgroundImage")!)}`);
  if (str("backgroundSize")) push(`background-size:${str("backgroundSize")}`);
  if (str("backgroundPosition")) push(`background-position:${transformStyleVarValue("backgroundPosition", str("backgroundPosition")!)}`);
  if (str("backgroundRepeat")) push(`background-repeat:${str("backgroundRepeat")}`);
  if (str("backgroundAttachment")) push(`background-attachment:${str("backgroundAttachment")}`);
  if (fields.backgroundClip) {
    push(`background-clip:${String(fields.backgroundClip)}`);
    push(`-webkit-background-clip:${String(fields.backgroundClip)}`);
  }

  if (fields.borderStyle && fields.borderStyle !== "none") {
    push(`border-style:${String(fields.borderStyle)}`);
  }
  if (str("borderTopStyle")) push(`border-top-style:${str("borderTopStyle")}`);
  if (str("borderRightStyle")) push(`border-right-style:${str("borderRightStyle")}`);
  if (str("borderBottomStyle")) push(`border-bottom-style:${str("borderBottomStyle")}`);
  if (str("borderLeftStyle")) push(`border-left-style:${str("borderLeftStyle")}`);

  const widthTop = str("borderTopWidth") || str("borderWidthTop") || str("borderWidth");
  const widthRight = str("borderRightWidth") || str("borderWidthRight") || str("borderWidth");
  const widthBottom = str("borderBottomWidth") || str("borderWidthBottom") || str("borderWidth");
  const widthLeft = str("borderLeftWidth") || str("borderWidthLeft") || str("borderWidth");
  if (widthTop) push(`border-top-width:${widthTop}`);
  if (widthRight) push(`border-right-width:${widthRight}`);
  if (widthBottom) push(`border-bottom-width:${widthBottom}`);
  if (widthLeft) push(`border-left-width:${widthLeft}`);

  const colorTop = str("borderTopColor") || str("borderColor");
  const colorRight = str("borderRightColor") || str("borderColor");
  const colorBottom = str("borderBottomColor") || str("borderColor");
  const colorLeft = str("borderLeftColor") || str("borderColor");
  if (colorTop) push(`border-top-color:${colorTop}`);
  if (colorRight) push(`border-right-color:${colorRight}`);
  if (colorBottom) push(`border-bottom-color:${colorBottom}`);
  if (colorLeft) push(`border-left-color:${colorLeft}`);

  const radiusTopLeft = str("borderRadiusTopLeft") || str("borderRadius");
  const radiusTopRight = str("borderRadiusTopRight") || str("borderRadius");
  const radiusBottomRight = str("borderRadiusBottomRight") || str("borderRadius");
  const radiusBottomLeft = str("borderRadiusBottomLeft") || str("borderRadius");
  if (radiusTopLeft) push(`border-top-left-radius:${radiusTopLeft}`);
  if (radiusTopRight) push(`border-top-right-radius:${radiusTopRight}`);
  if (radiusBottomRight) push(`border-bottom-right-radius:${radiusBottomRight}`);
  if (radiusBottomLeft) push(`border-bottom-left-radius:${radiusBottomLeft}`);
  if (str("boxShadow")) push(`box-shadow:${str("boxShadow")}`);

  if (str("fontFamily")) push(`font-family:${str("fontFamily")}`);
  if (str("textIndent")) push(`text-indent:${str("textIndent")}`);
  if (str("columnCount")) push(`column-count:${str("columnCount")}`);
  if (str("wordBreak")) push(`word-break:${str("wordBreak")}`);
  if (str("whiteSpace")) push(`white-space:${str("whiteSpace")}`);
  if (str("textWrap")) push(`text-wrap:${str("textWrap")}`);
  if (fields.textOverflow) push(`text-overflow:${String(fields.textOverflow)}`);
  if (str("webkitTextStrokeWidth")) push(`-webkit-text-stroke-width:${str("webkitTextStrokeWidth")}`);
  if (str("webkitTextStrokeColor")) push(`-webkit-text-stroke-color:${str("webkitTextStrokeColor")}`);

  if (str("minWidth")) push(`min-width:${str("minWidth")}`);
  if (str("minHeight")) push(`min-height:${str("minHeight")}`);
  if (str("maxHeight")) push(`max-height:${str("maxHeight")}`);
  if (str("aspectRatio")) push(`aspect-ratio:${str("aspectRatio")}`);
  if (fields.boxSizing) push(`box-sizing:${String(fields.boxSizing)}`);

  if (fields.position) push(`position:${String(fields.position)}`);
  if (str("zIndex")) push(`z-index:${str("zIndex")}`);
  if (str("top")) push(`top:${str("top")}`);
  if (str("right")) push(`right:${str("right")}`);
  if (str("bottom")) push(`bottom:${str("bottom")}`);
  if (str("left")) push(`left:${str("left")}`);
  if (fields.overflow) push(`overflow:${String(fields.overflow)}`);
  if (fields.float) push(`float:${String(fields.float)}`);
  if (fields.clear) push(`clear:${String(fields.clear)}`);

  // Container layout & Webflow display modes — applied directly at wrapper level
  if (fields.display) push(`display:${String(fields.display)}`);
  const flexDir = fields.flexDirection || fields.direction;
  if (flexDir) push(`flex-direction:${String(flexDir)}`);
  const flexW = fields.flexWrap || fields.wrap;
  if (flexW) push(`flex-wrap:${String(flexW)}`);
  if (fields.justifyContent) push(`justify-content:${String(fields.justifyContent)}`);
  if (fields.alignItems) push(`align-items:${String(fields.alignItems)}`);
  if (str("gap")) push(`gap:${str("gap")}`);
  if (str("rowGap")) push(`row-gap:${str("rowGap")}`);
  if (str("columnGap")) push(`column-gap:${str("columnGap")}`);

  const gridCols = str("gridTemplateColumns") || str("gridColumns");
  if (gridCols) {
    const formattedCols = /^\d+$/.test(gridCols.trim()) ? `repeat(${gridCols.trim()}, minmax(0, 1fr))` : gridCols;
    push(`grid-template-columns:${formattedCols}`);
  }

  const gridRows = str("gridTemplateRows") || str("gridRows");
  if (gridRows) {
    const formattedRows = /^\d+$/.test(gridRows.trim()) ? `repeat(${gridRows.trim()}, minmax(0, 1fr))` : gridRows;
    push(`grid-template-rows:${formattedRows}`);
  }

  const gridFlow = fields.gridAutoFlow || fields.gridDirection;
  if (gridFlow) push(`grid-auto-flow:${String(gridFlow)}`);

  return decls.join("");
}

// Root elements of the blocks that render their own typography inline (Heading's
// <h1>-<h6>/div/span/p, CTAButton's <a>, RichText's <div class="tiptap-content">) —
// still needed for the block-align stretch rule and hover-preset text-color forcing
// below, even though typography itself no longer targets these by tag name (see
// `varDeclarations`).
const TEXT_TAG_NAMES = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "div", "a", "button"];

// blockAlign:"stretch" sets width:100% on the wrapper div, but a plain block-level
// div is already 100% wide by default — the visible gap is that CTAButton's own root
// (an <a>, styled inline-block so it doesn't consume a full line by default) never
// grows to fill that wrapper. Only these two tags render as an intentionally
// content-sized inline-block box, so only they get force-stretched here; forcing it
// on h1/p/div would fight their normal block-level 100% width for no reason.
const INTERACTIVE_TAG_NAMES = ["a", "button"];

function blockAlignStretchRule(blockClassName: string): string {
  const selector = INTERACTIVE_TAG_NAMES.map((tag) => `.${blockClassName}>${tag}`).join(",");
  return `${selector}{display:block !important;width:100% !important;text-align:center !important;box-sizing:border-box !important;}`;
}

/**
 * The var-bridge counterpart to `fieldsToDeclarations`: every bag entry that
 * ISN'T a box-model field becomes `--exr-{key}:{value} !important;` on the
 * wrapper's own class selector — no tag-name targeting, no nesting-depth
 * assumption, since CSS custom properties inherit to any descendant that
 * opts in via `var(--exr-{key}, fallback)`. Structural fields (see
 * STRUCTURAL_STYLE_KEYS) are skipped: a var can supply a CSS property's
 * *value*, not choose which class/markup a component renders, so writing
 * one for a field like `dividerEnabled` would silently do nothing.
 */
function varDeclarations(bag: StyleOverrideBag): string {
  const decls: string[] = [];
  for (const [key, value] of Object.entries(bag)) {
    if (BOX_MODEL_KEYS.has(key) || STRUCTURAL_STYLE_KEYS.has(key)) continue;
    if (value === undefined || value === "") continue;
    decls.push(`--exr-${key}:${transformStyleVarValue(key, sanitizeBagValue(value))} !important;`);
  }
  return decls.join("");
}

function mediaRule(condition: string, blockClassName: string, fields: StyleOverrideBag, extraDecls = "", parentIsFlexRow?: boolean): string {
  const decls = fieldsToDeclarations(fields, parentIsFlexRow) + varDeclarations(fields) + extraDecls;

  const rules: string[] = [];
  if (decls) rules.push(`.${blockClassName}{${decls}}`);
  if (fields.blockAlign === "stretch") rules.push(blockAlignStretchRule(blockClassName));
  if (rules.length === 0) return "";
  return `@media ${condition}{${rules.join("")}}`;
}

const HOVER_PRESET_DECLS: Record<string, string> = {
  grow: "transform:scale(1.05);",
  shrink: "transform:scale(0.95);",
  "bounce-up": "transform:translateY(-8px);",
  "bounce-down": "transform:translateY(8px);",
  "zoom-in": "transform:scale(1.1);",
  "zoom-out": "transform:scale(0.95);",
  "rotate-3d": "transform:perspective(500px) rotateY(12deg) rotateX(6deg);",
  "blur-to-sharp": "filter:blur(0px);",
  "grayscale-to-color": "filter:grayscale(0%);",
  "invert-colors": "filter:invert(100%);",
};

/**
 * Presets that need pseudo-elements or their own keyframes rather than a
 * plain `:hover` declaration list — a glowing animated border, a diagonal
 * fill sweep, corner brackets that snap in, a sliding underline, a
 * "liquid" fill gauge, shimmer sweep, and 3D tilts.
 */
function complexHoverPreset(name: string, blockClassName: string): string | undefined {
  const c = blockClassName;
  switch (name) {
    case "glow-border": {
      const kf = `${c}-glow`;
      return [
        `.${c}{position:relative;display:inline-block;z-index:0;}`,
        `.${c}::before{content:"";position:absolute;inset:-3px;z-index:-1;border-radius:inherit;background:linear-gradient(45deg,#2563ff,#e8ce8c,#8a6f3b,#2563ff);background-size:400% 400%;filter:blur(6px);opacity:0;transition:opacity .3s ease-in-out;animation:${kf} 6s linear infinite;}`,
        `.${c}:hover::before{opacity:1;}`,
        `@keyframes ${kf}{0%{background-position:0% 50%;}100%{background-position:400% 50%;}}`,
      ].join("\n");
    }
    case "slide-fill":
      return [
        `.${c}{position:relative;display:inline-block;overflow:hidden;z-index:0;}`,
        `.${c}::before{content:"";position:absolute;inset:0;background:#2563ff;transform:translate(-105%,105%) rotate(12deg);transform-origin:bottom left;transition:transform .4s ease;z-index:-1;}`,
        `.${c}:hover::before{transform:translate(0,0) rotate(0deg);}`,
        `${TEXT_TAG_NAMES.map((t) => `.${c}:hover>${t}`).join(",")}{color:#0a0a0a !important;}`,
      ].join("\n");
    case "shimmer-sweep":
      return [
        `.${c}{position:relative;display:inline-block;overflow:hidden;}`,
        `.${c}::after{content:"";position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:linear-gradient(60deg,transparent,rgba(255,255,255,0.35),transparent);transform:translateX(-100%) rotate(30deg);transition:transform .6s ease;}`,
        `.${c}:hover::after{transform:translateX(100%) rotate(30deg);}`,
      ].join("\n");
    case "fill-sweep-left":
      return [
        `.${c}{position:relative;display:inline-block;overflow:hidden;z-index:0;}`,
        `.${c}::before{content:"";position:absolute;inset:0;background:#2563ff;transform:scaleX(0);transform-origin:left;transition:transform .35s ease;z-index:-1;}`,
        `.${c}:hover::before{transform:scaleX(1);}`,
        `${TEXT_TAG_NAMES.map((t) => `.${c}:hover>${t}`).join(",")}{color:#0a0a0a !important;}`,
      ].join("\n");
    case "fill-sweep-right":
      return [
        `.${c}{position:relative;display:inline-block;overflow:hidden;z-index:0;}`,
        `.${c}::before{content:"";position:absolute;inset:0;background:#2563ff;transform:scaleX(0);transform-origin:right;transition:transform .35s ease;z-index:-1;}`,
        `.${c}:hover::before{transform:scaleX(1);}`,
        `${TEXT_TAG_NAMES.map((t) => `.${c}:hover>${t}`).join(",")}{color:#0a0a0a !important;}`,
      ].join("\n");
    case "fill-sweep-top":
      return [
        `.${c}{position:relative;display:inline-block;overflow:hidden;z-index:0;}`,
        `.${c}::before{content:"";position:absolute;inset:0;background:#2563ff;transform:scaleY(0);transform-origin:top;transition:transform .35s ease;z-index:-1;}`,
        `.${c}:hover::before{transform:scaleY(1);}`,
        `${TEXT_TAG_NAMES.map((t) => `.${c}:hover>${t}`).join(",")}{color:#0a0a0a !important;}`,
      ].join("\n");
    case "fill-sweep-bottom":
      return [
        `.${c}{position:relative;display:inline-block;overflow:hidden;z-index:0;}`,
        `.${c}::before{content:"";position:absolute;inset:0;background:#2563ff;transform:scaleY(0);transform-origin:bottom;transition:transform .35s ease;z-index:-1;}`,
        `.${c}:hover::before{transform:scaleY(1);}`,
        `${TEXT_TAG_NAMES.map((t) => `.${c}:hover>${t}`).join(",")}{color:#0a0a0a !important;}`,
      ].join("\n");
    case "corner-brackets":
      return [
        `.${c}{position:relative;}`,
        `.${c}::before,.${c}::after{content:"";position:absolute;width:14px;height:14px;border-color:#2563ff;opacity:0;transition:all .3s ease;pointer-events:none;}`,
        `.${c}::before{top:-6px;left:-6px;border-top:2px solid;border-left:2px solid;transform:translate(8px,8px);}`,
        `.${c}::after{bottom:-6px;right:-6px;border-bottom:2px solid;border-right:2px solid;transform:translate(-8px,-8px);}`,
        `.${c}:hover::before,.${c}:hover::after{opacity:1;transform:translate(0,0);}`,
      ].join("\n");
    case "underline-sweep":
      return [
        `.${c}{position:relative;display:inline-block;}`,
        `.${c}::after{content:"";position:absolute;left:0;bottom:-4px;width:100%;height:2px;background:#2563ff;transform:scaleX(0);transform-origin:right;transition:transform .35s ease;}`,
        `.${c}:hover::after{transform:scaleX(1);transform-origin:left;}`,
      ].join("\n");
    case "liquid-fill":
      return [
        `.${c}{display:inline-block;background:linear-gradient(#2563ff 0 0) no-repeat 0% 100% / 100% .2em;transition:background-size .4s ease;}`,
        `.${c}:hover{background-size:100% 100%;}`,
        `${TEXT_TAG_NAMES.map((t) => `.${c}:hover>${t}`).join(",")}{color:#0a0a0a !important;}`,
      ].join("\n");
    case "shake-wobble": {
      const kf = `${c}-wobble`;
      return [
        `@keyframes ${kf}{0%,100%{transform:translateX(0);}20%{transform:translateX(-4px) rotate(-2deg);}40%{transform:translateX(4px) rotate(2deg);}60%{transform:translateX(-2px) rotate(-1deg);}80%{transform:translateX(2px) rotate(1deg);}}`,
        `.${c}:hover{animation:${kf} .5s ease-in-out;}`,
      ].join("\n");
    }
    default:
      return undefined;
  }
}

/**
 * `:hover` generator — creates dynamic `:hover` pseudo-class rules, layered
 * animation presets, and injects `transition: all [duration] [easing] [delay]`
 * onto target elements.
 */
function hoverRule(
  blockClassName: string,
  hover: StyleOverrideBag | undefined,
  hoverAnimation: string | undefined,
  transitionDuration: string | undefined,
  transitionEasing: string | undefined,
  transitionDelay: string | undefined,
  parentIsFlexRow?: boolean
): string {
  const decls: string[] = [];
  if (hover) {
    const hoverDecls = fieldsToDeclarations(hover, parentIsFlexRow) + varDeclarations(hover);
    if (hoverDecls) decls.push(hoverDecls);
  }

  const complex = hoverAnimation ? complexHoverPreset(hoverAnimation, blockClassName) : undefined;
  if (complex) {
    const extra = decls.length ? `.${blockClassName}:hover{${decls.join("")}}` : "";
    return [complex, extra].filter(Boolean).join("\n");
  }

  if (hoverAnimation === "pulse") {
    const keyframesName = `${blockClassName}-pulse`;
    return [
      `@keyframes ${keyframesName}{0%{transform:scale(1);}50%{transform:scale(1.05);}100%{transform:scale(1);}}`,
      decls.length ? `.${blockClassName}:hover{${decls.join("")}animation:${keyframesName} 1s ease-in-out infinite;}` : `.${blockClassName}:hover{animation:${keyframesName} 1s ease-in-out infinite;}`,
    ].join("\n");
  }

  const presetDecl = hoverAnimation ? HOVER_PRESET_DECLS[hoverAnimation] : undefined;
  if (presetDecl) decls.push(presetDecl);

  if (decls.length === 0) return "";

  const duration = sanitize(transitionDuration || "0.3s");
  const durStr = /^\d+(\.\d+)?$/.test(duration) ? `${duration}s` : duration;
  const easing = sanitize(transitionEasing || "ease");
  const delay = sanitize(transitionDelay || "0s");
  const delStr = /^\d+(\.\d+)?$/.test(delay) ? `${delay}s` : delay;

  return `.${blockClassName}{transition:all ${durStr} ${easing} ${delStr} !important;}\n.${blockClassName}:hover{${decls.join("")}}`;
}

/**
 * `:focus`/`:active`/`:visited` — simpler siblings of `hoverRule` above with
 * no animation-preset support (this codebase has no equivalent "pulse on
 * focus" concept), just plain `!important` declarations scoped to the
 * matching pseudo-class. Same `!important` reasoning as `hoverRule`: these
 * override the same properties already applied as an inline style for the
 * resting state.
 */
function pseudoStateRule(blockClassName: string, pseudoClass: "focus" | "active" | "visited", bag: StyleOverrideBag | undefined, parentIsFlexRow?: boolean): string {
  if (!bag) return "";
  const decls = fieldsToDeclarations(bag, parentIsFlexRow) + varDeclarations(bag);
  return decls ? `.${blockClassName}:${pseudoClass}{${decls}}` : "";
}
