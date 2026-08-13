import { Fragment } from "react";
import type { ComponentType, CSSProperties, ElementType, ReactNode, Ref } from "react";
import type {
  IconListItem,
  ScrollMarqueeItem,
  IconBulletItem,
  TimelineBulletItem,
  ShapeBulletItem,
  StackedImageItem,
  SocialLink,
  PriceFeature,
  BusinessHourItem,
  MultiButtonItem,
  HotspotPoint,
  PillLinkItem,
} from "@marwa/builder";
import { FlipBoxBlock } from "@/components/builder/FlipBoxBlock";
import { BeforeAfterBlock } from "@/components/builder/BeforeAfterBlock";
import { IconAccordionBlock } from "@/components/builder/IconAccordionBlock";
import { ScrollTextAnimationBlock } from "@/components/builder/ScrollTextAnimationBlock";
import { FancyHeadingBlock } from "@/components/builder/FancyHeadingBlock";
import { FaqSchemaBlock } from "@/components/builder/FaqSchemaBlock";
import { ModalPopupBlock } from "@/components/builder/ModalPopupBlock";
import { OffCanvasBlock } from "@/components/builder/OffCanvasBlock";
import { GalleryBlock } from "@/components/builder/GalleryBlock";
import { CountdownTimerBlock } from "@/components/builder/CountdownTimerBlock";
import { TableOfContentsBlock } from "@/components/builder/TableOfContentsBlock";
import { ProgressTrackerBlock } from "@/components/builder/ProgressTrackerBlock";
import { ContentToggleBlock } from "@/components/builder/ContentToggleBlock";
import { BreadcrumbsBlock } from "@/components/builder/BreadcrumbsBlock";
import { VideoPlaylistBlock } from "@/components/builder/VideoPlaylistBlock";
import { TaxonomyFilterBlock } from "@/components/builder/TaxonomyFilterBlock";
import { TemplateBlock } from "@/components/builder/TemplateBlock";
import { PostsBlock } from "@/components/builder/PostsBlock";
import { ItineraryRoadmapBlock } from "@/components/builder/ItineraryRoadmapBlock";
import { PricingOverviewBlock } from "@/components/builder/PricingOverviewBlock";
import { FeaturedRoutesCarouselBlock } from "@/components/builder/FeaturedRoutesCarouselBlock";
import { SystemStatusWidgetBlock } from "@/components/builder/SystemStatusWidgetBlock";
import { ApiEndpointPreviewBlock } from "@/components/builder/ApiEndpointPreviewBlock";
import { TechStackGridBlock } from "@/components/builder/TechStackGridBlock";
import { StaticToursGridBlock } from "@/components/builder/StaticToursGridBlock";
import { DefinitionRowsBlock } from "@/components/builder/DefinitionRowsBlock";
import { Services } from "@/components/Services";
import { ProcessSteps } from "@/components/ProcessSteps";
import { Testimonials } from "@/components/Testimonials";
import { Faq } from "@/components/Faq";
import { SiteFooter } from "@/components/SiteFooter";
import { ContactPageContent } from "@/components/builder/legacyPages";
import { ContactForm } from "@/components/ContactForm";
import { TabsBlock } from "@/components/builder/TabsBlock";
import { SliderBlock } from "@/components/builder/SliderBlock";
import { CarouselContainerBlock } from "@/components/builder/CarouselContainerBlock";
import { TextUnfoldBlock } from "@/components/builder/TextUnfoldBlock";
import { PowerButtonBlock } from "@/components/builder/PowerButtonBlock";
import { FormBlock } from "@/components/builder/FormBlock";
import { SiteLogoBlock } from "@/components/builder/SiteLogoBlock";
import { NavMenuBlock } from "@/components/builder/NavMenuBlock";
import { LanguageSwitcherBlock } from "@/components/builder/LanguageSwitcherBlock";
import { CounterValue } from "@/components/builder/CounterValue";
import { LightboxImage } from "@/components/builder/LightboxImage";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { api, type PostContextData, type CollectionItem } from "@/lib/api";
import { formatDate } from "@/components/blog/formatDate";
import { IconGlyph } from "@/components/builder/IconGlyph";
import { GoogleFontLink } from "@/components/builder/GoogleFontLink";
import { IconStar, IconFacebook, IconInstagram, IconTwitter, IconYoutube, IconLinkedin, IconTiktok, IconWhatsapp, IconPinterest } from "@/components/home/icons";
import { buildButtonHoverStyle } from "@/components/builder/buttonHoverStyle";

// ── New, fully prop-driven primitives ──────────────────────────────────

/**
 * Passed by LayoutRenderer to container blocks (Section, Columns) instead
 * of wrapping them in a second <div> — see the comment there for why: a
 * container's own background/border needs to live on the *same* element as
 * the generic Advanced-tab padding/margin, or padding visibly insets the
 * background from the edges instead of the background filling behind it.
 */
interface WrapperProps {
  id?: string;
  className?: string;
  style?: CSSProperties;
  "data-block-id"?: string;
  "data-block-type"?: string;
  /** Set by AnimatedBox (see its own top comment) when this node has GSAP
   *  timelines — attached to this component's own DOM root, never a second
   *  wrapper, so the node's existing flex/grid-item styling stays intact. */
  ref?: Ref<HTMLElement>;
  /** Set by AnimatedBox alongside `ref` when it manages this node's initial
   *  style — see its own comment for why (browser-extension DOM injection
   *  racing hydration, same class already fixed once for <body>). */
  suppressHydrationWarning?: boolean;
}

const SECTION_HTML_TAGS = { div: "div", header: "header", footer: "footer", main: "main", article: "article", section: "section", aside: "aside", nav: "nav" } as const;

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
 * `background-image` only accepts <image> values (url()/gradient functions),
 * never a bare color — so a solid overlay color has to become a flat
 * two-stop gradient to be valid as a stacked background layer.
 */
function toColorLayer(value: string): string {
  return `linear-gradient(${value}, ${value})`;
}

interface BgLayer {
  image: string;
  position: string;
  attachment: string;
  repeat: CSSProperties["backgroundRepeat"];
  size: CSSProperties["backgroundSize"];
}

/**
 * Comma-joins N background layers into the multi-layer CSS background-*
 * properties — each property's Nth comma-separated value maps to the Nth
 * layer in backgroundImage, in list order (first listed paints on top).
 */
function combineBgLayers(layers: BgLayer[]): Pick<CSSProperties, "backgroundImage" | "backgroundPosition" | "backgroundAttachment" | "backgroundRepeat" | "backgroundSize"> | undefined {
  if (layers.length === 0) return undefined;
  return {
    backgroundImage: layers.map((l) => l.image).join(", "),
    backgroundPosition: layers.map((l) => l.position).join(", "),
    backgroundAttachment: layers.map((l) => l.attachment).join(", "),
    backgroundRepeat: layers.map((l) => l.repeat).join(", "),
    backgroundSize: layers.map((l) => l.size).join(", "),
  };
}

function Section({
  layoutMode,
  direction,
  justifyContent,
  alignItems,
  gap,
  wrap,
  contentWidth,
  width,
  minHeight,
  background,
  backgroundImage,
  backgroundPosition,
  backgroundAttachment,
  backgroundRepeat,
  backgroundSize,
  backgroundBlur,
  backgroundOverlayType,
  backgroundOverlayColor,
  backgroundOverlayImage,
  backgroundOverlayPosition,
  backgroundOverlayAttachment,
  backgroundOverlayRepeat,
  backgroundOverlaySize,
  backgroundOverlayGradientType,
  backgroundOverlayGradientAngle,
  backgroundOverlayGradientColor1,
  backgroundOverlayGradientStop1,
  backgroundOverlayGradientColor2,
  backgroundOverlayGradientStop2,
  borderStyle,
  borderWidth,
  borderWidthTop,
  borderWidthRight,
  borderWidthBottom,
  borderWidthLeft,
  borderColor,
  borderRadius,
  borderRadiusTopLeft,
  borderRadiusTopRight,
  borderRadiusBottomRight,
  borderRadiusBottomLeft,
  boxShadow,
  overflow,
  htmlTag,
  wrapperProps,
  children,
  parentIsFlexRow,
}: {
  layoutMode?: "flex" | "grid";
  direction?: "row" | "column" | "row-reverse" | "column-reverse";
  justifyContent?: CSSProperties["justifyContent"];
  alignItems?: CSSProperties["alignItems"];
  gap?: string;
  wrap?: "nowrap" | "wrap";
  contentWidth?: "boxed" | "full";
  width?: string;
  minHeight?: string;
  background?: string;
  backgroundImage?: string;
  backgroundPosition?: string;
  backgroundAttachment?: "scroll" | "fixed";
  backgroundRepeat?: CSSProperties["backgroundRepeat"];
  backgroundSize?: CSSProperties["backgroundSize"];
  backgroundBlur?: string;
  backgroundOverlayType?: "none" | "image" | "gradient" | "color";
  backgroundOverlayColor?: string;
  backgroundOverlayImage?: string;
  backgroundOverlayPosition?: string;
  backgroundOverlayAttachment?: "scroll" | "fixed";
  backgroundOverlayRepeat?: CSSProperties["backgroundRepeat"];
  backgroundOverlaySize?: CSSProperties["backgroundSize"];
  backgroundOverlayGradientType?: "linear" | "radial";
  backgroundOverlayGradientAngle?: string;
  backgroundOverlayGradientColor1?: string;
  backgroundOverlayGradientStop1?: string;
  backgroundOverlayGradientColor2?: string;
  backgroundOverlayGradientStop2?: string;
  borderStyle?: "none" | "solid" | "dashed" | "dotted";
  borderWidth?: string;
  borderWidthTop?: string;
  borderWidthRight?: string;
  borderWidthBottom?: string;
  borderWidthLeft?: string;
  borderColor?: string;
  borderRadius?: string;
  borderRadiusTopLeft?: string;
  borderRadiusTopRight?: string;
  borderRadiusBottomRight?: string;
  borderRadiusBottomLeft?: string;
  boxShadow?: string;
  overflow?: "default" | "hidden" | "auto";
  htmlTag?: keyof typeof SECTION_HTML_TAGS;
  wrapperProps?: WrapperProps;
  children?: ReactNode;
  /** True only when THIS section's actual parent lays its children out in a
   * row (see LayoutRenderer's childIsFlexRow) — gates whether it's safe to
   * turn Width/Content Width into a `flex` value on this section's own
   * root. Passed down by LayoutRenderer, not admin-editable. */
  parentIsFlexRow?: boolean;
}) {
  const Tag = (htmlTag && SECTION_HTML_TAGS[htmlTag]) || "div";
  const isGrid = layoutMode === "grid";

  // The overlay is a second layer stacked on top of the base backgroundImage
  // — each tab (Image/Gradient/Color) keeps its own fields, so switching
  // tabs in the Property Panel never loses another tab's configuration.
  const overlayLayer: BgLayer | undefined =
    backgroundOverlayType === "color" && backgroundOverlayColor
      ? { image: toColorLayer(backgroundOverlayColor), position: "center center", attachment: "scroll", repeat: "no-repeat", size: "cover" }
      : backgroundOverlayType === "gradient"
        ? {
            image:
              backgroundOverlayGradientType === "radial"
                ? `radial-gradient(${backgroundOverlayGradientColor1} ${backgroundOverlayGradientStop1}%, ${backgroundOverlayGradientColor2} ${backgroundOverlayGradientStop2}%)`
                : `linear-gradient(${backgroundOverlayGradientAngle}deg, ${backgroundOverlayGradientColor1} ${backgroundOverlayGradientStop1}%, ${backgroundOverlayGradientColor2} ${backgroundOverlayGradientStop2}%)`,
            position: "center center",
            attachment: "scroll",
            repeat: "no-repeat",
            size: "cover",
          }
        : backgroundOverlayType === "image" && backgroundOverlayImage
          ? {
              image: `url(${resolveImageUrl(backgroundOverlayImage)})`,
              position: BG_POSITION_CSS[backgroundOverlayPosition ?? "center"],
              attachment: backgroundOverlayAttachment ?? "scroll",
              repeat: backgroundOverlayRepeat ?? "no-repeat",
              size: backgroundOverlaySize ?? "cover",
            }
          : undefined;

  // Always present (not conditional on the desktop backgroundImage prop
  // being set) and read through var(--exr-key, …) rather than the raw props
  // directly — this is what lets Tablet/Mobile store their own override
  // background image/position/etc (see resolveNodeStyle.ts's
  // transformStyleVarValue, which is what makes the var's stored value real
  // CSS instead of a bare path/keyword) INCLUDING a mobile-only image where
  // desktop has none at all, which a conditional layer could never show
  // regardless of what the var resolved to.
  const baseLayer: BgLayer = {
    image: `var(--exr-backgroundImage, ${backgroundImage ? `url(${resolveImageUrl(backgroundImage)})` : "none"})`,
    position: `var(--exr-backgroundPosition, ${BG_POSITION_CSS[backgroundPosition ?? "center"]})`,
    attachment: `var(--exr-backgroundAttachment, ${backgroundAttachment ?? "scroll"})`,
    repeat: `var(--exr-backgroundRepeat, ${backgroundRepeat ?? "no-repeat"})` as CSSProperties["backgroundRepeat"],
    size: `var(--exr-backgroundSize, ${backgroundSize ?? "cover"})` as CSSProperties["backgroundSize"],
  };

  // Overlay listed first paints on top, matching the visual stacking order
  // (overlay tints/dims the base image beneath it).
  const bgLayers = [overlayLayer, baseLayer].filter((l): l is BgLayer => Boolean(l));
  const combinedBg = combineBgLayers(bgLayers);

  // blur() only accepts a <length> (px/em/rem/vw) — never a percentage, unlike
  // every other field in this Style section. The unit dropdown doesn't know
  // that, so a "%" pick here would otherwise silently invalidate the blur.
  const blurPx = backgroundBlur ? backgroundBlur.replace(/%$/, "px") : "";
  // CSS has no way to blur an element's own background-image without also
  // blurring its content (a plain `filter` blurs everything painted inside
  // the element, children included) — `backdrop-filter` doesn't apply here
  // either, since it blurs whatever is *behind* the element, not its own
  // background. So a blurred background renders on a separate absolutely-
  // positioned layer instead, oversized slightly to hide the blurred edges,
  // with real content painted on top of it as normal (non-positioned) flow.
  // Checked against the desktop backgroundImage/overlay props directly, not
  // bgLayers.length (which is now always ≥1 — baseLayer is unconditional so
  // a Tablet/Mobile-only override still has a CSS slot to land in even with
  // no desktop image — so it no longer means "a real image is configured").
  // A Tablet/Mobile-only blurred image without a desktop one is a rarer
  // combination this doesn't cover, same tradeoff as backgroundImage itself
  // only being deep-linked from the desktop prop for every other purpose below.
  const hasBlurredImage = Boolean(blurPx && (backgroundImage || overlayLayer));

  // wrapperProps.style first (generic Advanced-tab padding/margin/etc), then
  // this block's own Layout/Style-tab values — own values win on overlapping
  // keys (e.g. both have a generic "background") since they're the more
  // specific, block-aware setting.
  const style: CSSProperties = {
    ...wrapperProps?.style,
    // Each of these falls back to the block's own Layout-tab value but yields
    // to an explicit one from the generic Layout panel, for the same reason as
    // width below: both are user settings, but the panel value is only present
    // when the user actually touched that control, so it is the later and more
    // specific instruction. Written after the spread, so — as with width and
    // minWidth — the fallback has to re-supply the wrapper value rather than
    // resolve to undefined, or an untouched control would wipe the panel's.
    display: (wrapperProps?.style?.display as CSSProperties["display"]) ?? (isGrid ? "grid" : "flex"),
    flexDirection: (wrapperProps?.style?.flexDirection as CSSProperties["flexDirection"]) ?? (isGrid ? undefined : direction),
    gridAutoFlow: isGrid ? "row" : undefined,
    justifyContent: (wrapperProps?.style?.justifyContent as CSSProperties["justifyContent"]) ?? justifyContent,
    alignItems: (wrapperProps?.style?.alignItems as CSSProperties["alignItems"]) ?? alignItems,
    gap: (wrapperProps?.style?.gap as CSSProperties["gap"]) ?? (gap || undefined),
    flexWrap: (wrapperProps?.style?.flexWrap as CSSProperties["flexWrap"]) ?? (isGrid ? undefined : wrap),
    // `|| wrapperProps` rather than `|| undefined`: these keys are written
    // after the `...wrapperProps?.style` spread above, so a bare `undefined`
    // doesn't leave the spread value in place — it overwrites it with
    // nothing, silently discarding a Min-Height set on the Advanced tab.
    minHeight: minHeight || (wrapperProps?.style?.minHeight as CSSProperties["minHeight"]),
    // A blurred background layer is absolutely positioned and oversized to
    // hide its edges — needs a positioned ancestor to anchor to, and clipping
    // so it doesn't spill past this element's own bounds.
    position: hasBlurredImage ? "relative" : (wrapperProps?.style?.position as CSSProperties["position"] | undefined),
    // hasBlurredImage still forces "hidden" — the blurred layer is oversized
    // and must be clipped or it spills past the section. Otherwise the block's
    // own value, then the panel's: same after-the-spread fallback as the keys
    // above, since resolving to undefined would discard an Overflow set there.
    overflow: hasBlurredImage
      ? "hidden"
      : overflow && overflow !== "default"
        ? overflow
        : (wrapperProps?.style?.overflow as CSSProperties["overflow"]),
    // An explicit Width from the Size panel outranks contentWidth. Both are
    // deliberate settings, but contentWidth is a coarse layout mode that
    // nearly every section carries by default ("full"), whereas a typed width
    // is a specific instruction about this one element — so letting the mode
    // win means the Size field silently does nothing on most sections, which
    // is exactly how this read as broken. Same fallback shape as maxWidth
    // below, and for the same reason as minHeight above: this key is written
    // after the spread, so it must re-supply the wrapper value rather than
    // resolve to undefined.
    width: (wrapperProps?.style?.width as CSSProperties["width"]) ?? (contentWidth === "full" ? "100%" : undefined),
    maxWidth: contentWidth === "boxed" ? width : wrapperProps?.style?.maxWidth,
    marginLeft: contentWidth === "boxed" ? "auto" : (wrapperProps?.style?.marginLeft as string | undefined) ?? undefined,
    marginRight: contentWidth === "boxed" ? "auto" : (wrapperProps?.style?.marginRight as string | undefined) ?? undefined,
    // How this section sizes itself when it's a flex CHILD of a parent
    // Section/Columns (e.g. one of several columns in a row) — but ONLY
    // when `parentIsFlexRow` confirms that's actually what's happening (see
    // LayoutRenderer's childIsFlexRow, passed down as this prop). flex-basis
    // is relative to whatever axis the *parent* is flexing on, not
    // necessarily width — a plain top-level section (not intentionally a
    // "column" at all) can just as easily end up nested in a flex *column*
    // ancestor (e.g. a `body{display:flex;flex-direction:column}`
    // sticky-footer page shell), and applying a width-derived flex-basis
    // there forces that value onto the *height* instead: a "boxed" 1280px
    // section, meant to be 1280px *wide*, rendered exactly 1280px *tall*
    // and empty. Skipping `flex` entirely outside a confirmed row context
    // leaves the browser's own default (content-sized, no forced axis) in
    // effect, which is always safe. For "full", basis is 0% with grow:1
    // (not 100% with shrink-only, as an earlier version of this had it):
    // flex-wrap's line-breaking decision is made from each item's
    // *hypothetical* size — its basis, before any shrinking is even
    // considered — so a basis of 100% already fills an entire line by
    // itself, forcing every "full" sibling onto its own line the instant
    // `wrap` is on (exactly what happened inserting a 2-column structure,
    // whose own generated Section sets `wrap:"wrap"` by default — the two
    // columns stacked instead of sitting side by side). A 0% basis has
    // nothing to contribute to that hypothetical-size check, so siblings
    // pack onto one line first and only THEN grow to fill it — the classic
    // equal-flexible-columns recipe. Grow is safe here specifically because
    // the guard above already confirmed the main axis is horizontal;
    // unlike the old shrink-only version, this WOULD run away on the wrong
    // axis if that guard were ever wrong, but the guard is a direct read of
    // the immediate parent's own layout, not an inherited/guessed value.
    // "boxed" locks to an exact share via its own Width value, so setting
    // Width to e.g. 40% here is *also* this section's flex-basis when it's
    // genuinely a column — no separate "column width" concept or manual CSS
    // needed. Shrink is 1, not 0: when a row's siblings add up to exactly
    // (or under) 100%, a percentage Width already renders at its exact
    // requested size and shrink never engages — but when they don't (e.g. a
    // header row with a logo column plus a "60%" nav/language/CTA cluster,
    // where 60% plus the logo's own width plus gaps adds up to MORE than
    // 100%), shrink:0 has nothing to give and the cluster is shoved straight
    // past the container's edge instead of compressing, which is exactly
    // what caused the header to overflow horizontally site-wide. minWidth:0
    // is the standard flex-child overflow-prevention reset (a flex item's
    // default min-width is its content's intrinsic width, which silently
    // defeats flex-shrink/an explicit basis for anything with unbreakable
    // content like a long word or a fixed-size image) — also gated, for the
    // same reason: harmless on a genuine row
    // child, but no-op-vs-safe-default elsewhere isn't worth the risk of it
    // interacting with something unrelated on a plain top-level section.
    // A typed Width has to be reflected in flex-basis too. Inside a flex row
    // the basis, not the width, is what actually sizes the child, so setting
    // width alone would still lose to a `1 1 0%` grow — the value would apply
    // and then be stretched straight back out.
    flex: parentIsFlexRow
      ? wrapperProps?.style?.width
        ? `0 1 ${wrapperProps.style.width}`
        : contentWidth === "full"
          ? "1 1 0%"
          : `0 1 ${width || "1152px"}`
      : undefined,
    // An explicit Min-Width wins over the reset. The reset stays the default
    // (it is what stops unbreakable content defeating flex-shrink), but a
    // value typed into the Size panel is a deliberate instruction, and being
    // silently overwritten by 0 is indistinguishable from the field being
    // broken. Falls back to the wrapper value outside a row too, since
    // writing `undefined` here would otherwise discard the spread value.
    minWidth: (wrapperProps?.style?.minWidth as CSSProperties["minWidth"]) ?? (parentIsFlexRow ? 0 : undefined),

    background: background || wrapperProps?.style?.background,
    ...(hasBlurredImage ? undefined : combinedBg),

    // Border and shadow follow the same after-the-spread rule as the layout
    // and size keys above: the block's own Style-tab value where set, then the
    // generic panel's, and only then nothing. Resolving straight to undefined
    // discarded every Border and Box-Shadow set from the panel on a Section —
    // the panel wrote them correctly, this object then dropped them.
    borderStyle: (borderStyle && borderStyle !== "none" ? borderStyle : undefined) ?? (wrapperProps?.style?.borderStyle as CSSProperties["borderStyle"]),
    borderTopWidth: (borderStyle && borderStyle !== "none" ? borderWidthTop || borderWidth : undefined) ?? (wrapperProps?.style?.borderTopWidth as CSSProperties["borderTopWidth"]),
    borderRightWidth: (borderStyle && borderStyle !== "none" ? borderWidthRight || borderWidth : undefined) ?? (wrapperProps?.style?.borderRightWidth as CSSProperties["borderRightWidth"]),
    borderBottomWidth: (borderStyle && borderStyle !== "none" ? borderWidthBottom || borderWidth : undefined) ?? (wrapperProps?.style?.borderBottomWidth as CSSProperties["borderBottomWidth"]),
    borderLeftWidth: (borderStyle && borderStyle !== "none" ? borderWidthLeft || borderWidth : undefined) ?? (wrapperProps?.style?.borderLeftWidth as CSSProperties["borderLeftWidth"]),
    borderColor: (borderStyle && borderStyle !== "none" ? borderColor : undefined) ?? (wrapperProps?.style?.borderColor as CSSProperties["borderColor"]),
    borderTopLeftRadius: borderRadiusTopLeft || (borderRadius && borderRadius !== "0px" ? borderRadius : (wrapperProps?.style?.borderTopLeftRadius as CSSProperties["borderTopLeftRadius"])),
    borderTopRightRadius: borderRadiusTopRight || (borderRadius && borderRadius !== "0px" ? borderRadius : (wrapperProps?.style?.borderTopRightRadius as CSSProperties["borderTopRightRadius"])),
    borderBottomRightRadius: borderRadiusBottomRight || (borderRadius && borderRadius !== "0px" ? borderRadius : (wrapperProps?.style?.borderBottomRightRadius as CSSProperties["borderBottomRightRadius"])),
    borderBottomLeftRadius: borderRadiusBottomLeft || (borderRadius && borderRadius !== "0px" ? borderRadius : (wrapperProps?.style?.borderBottomLeftRadius as CSSProperties["borderBottomLeftRadius"])),
    boxShadow: boxShadow || (wrapperProps?.style?.boxShadow as CSSProperties["boxShadow"]),
  };

  return (
    <Tag
      ref={wrapperProps?.ref as Ref<HTMLDivElement>}
      suppressHydrationWarning={wrapperProps?.suppressHydrationWarning}
      id={wrapperProps?.id}
      className={["w-full", wrapperProps?.className].filter(Boolean).join(" ")}
      style={style}
      data-block-id={wrapperProps?.["data-block-id"]}
      data-block-type={wrapperProps?.["data-block-type"]}
    >
      {hasBlurredImage && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: "-20px",
            ...combinedBg,
            // "fixed" attachment conflicts with this layer's own absolute
            // positioning/oversizing — always scroll with the section
            // instead. A literal override, not a text-replace against
            // combinedBg's own value: that value can now be a var(--exr-…)
            // reference (see baseLayer above) whose *runtime*-resolved
            // attachment (e.g. a Tablet/Mobile override) a JS string
            // .replace() on the static attribute text could never reach.
            backgroundAttachment: "scroll",
            filter: `blur(${blurPx})`,
            // Negative, not 0/auto: a positioned z-index:0 element paints
            // *above* normal in-flow (non-positioned) children per CSS
            // stacking order, which would bury this section's real content
            // behind the blurred image instead of showing it on top.
            zIndex: -1,
          }}
        />
      )}
      {/* Belt-and-suspenders: the inline declarations above already resolve
          correctly on their own (an inline style beats any non-!important
          class rule regardless of specificity), but a scoped !important
          rule guarantees these 5 properties can never lose to some other
          rule targeting this exact block id, present or future, the same
          way the @media tablet/mobile overrides already have to for their
          own inline-vs-!important fight. */}
      {wrapperProps?.["data-block-id"] && (
        <style
          dangerouslySetInnerHTML={{
            __html: `.blk-${String(wrapperProps["data-block-id"]).replace(/[^a-zA-Z0-9_-]/g, "")}{background-repeat:var(--exr-backgroundRepeat, no-repeat) !important;background-size:var(--exr-backgroundSize, cover) !important;background-position:var(--exr-backgroundPosition, center center) !important;background-attachment:var(--exr-backgroundAttachment, scroll) !important;}`,
          }}
        />
      )}
      {children}
    </Tag>
  );
}

const COLUMNS_RATIO_TRACKS: Record<string, string> = {
  "33-66": "1fr 2fr",
  "66-33": "2fr 1fr",
  "25-75": "1fr 3fr",
  "75-25": "3fr 1fr",
};

function Columns({
  columnCount,
  ratio,
  gap,
  layoutMode,
  direction,
  justifyContent,
  alignItems,
  wrap,
  contentWidth,
  width,
  columnsBackground,
  columnsHoverBackground,
  columnsBackgroundBlur,
  columnsBorderStyle,
  columnsBorderWidth,
  columnsBorderWidthTop,
  columnsBorderWidthRight,
  columnsBorderWidthBottom,
  columnsBorderWidthLeft,
  columnsBorderColor,
  columnsHoverBorderColor,
  columnsBorderRadius,
  columnsBoxShadow,
  columnsHoverBoxShadow,
  wrapperProps,
  children,
}: {
  columnCount: 1 | 2 | 3 | 4 | 5 | 6;
  ratio?: "equal" | "33-66" | "66-33" | "25-75" | "75-25";
  gap?: string;
  layoutMode?: "grid" | "flex";
  direction?: "row" | "column" | "row-reverse" | "column-reverse";
  justifyContent?: CSSProperties["justifyContent"];
  alignItems?: CSSProperties["alignItems"];
  wrap?: "nowrap" | "wrap";
  contentWidth?: "boxed" | "full";
  width?: string;
  columnsBackground?: string;
  columnsHoverBackground?: string;
  columnsBackgroundBlur?: string;
  columnsBorderStyle?: "none" | "solid" | "dashed" | "dotted" | "double";
  columnsBorderWidth?: string;
  columnsBorderWidthTop?: string;
  columnsBorderWidthRight?: string;
  columnsBorderWidthBottom?: string;
  columnsBorderWidthLeft?: string;
  columnsBorderColor?: string;
  columnsHoverBorderColor?: string;
  columnsBorderRadius?: string;
  columnsBoxShadow?: string;
  columnsHoverBoxShadow?: string;
  wrapperProps?: WrapperProps;
  children?: ReactNode;
}) {
  const isGrid = layoutMode !== "flex";
  // Named ratio presets are only meaningful for exactly 2 tracks — 3+
  // columns always fall back to equal-width `1fr` tracks.
  const gridTemplateColumns = isGrid ? (columnCount === 2 && ratio && ratio !== "equal" ? COLUMNS_RATIO_TRACKS[ratio] : `repeat(${columnCount}, minmax(0, 1fr))`) : undefined;

  const hasHoverOverride = columnsHoverBackground || columnsHoverBorderColor || columnsHoverBoxShadow;
  const hoverClassName = hasHoverOverride ? `exr-columns-h${hashString(`${columnsHoverBackground ?? ""}|${columnsHoverBorderColor ?? ""}`)}` : "";
  const collapseClass = isGrid ? `col-grid-${columnCount}-${ratio || "equal"}` : "";

  return (
    <>
      {isGrid && (
        <style dangerouslySetInnerHTML={{
          __html: `.${collapseClass} { grid-template-columns: ${gridTemplateColumns}; }` +
                  `@media (max-width: 1024px) { .${collapseClass} { grid-template-columns: repeat(${Math.min(columnCount, 2)}, minmax(0, 1fr)); } }` +
                  `@media (max-width: 640px) { .${collapseClass} { grid-template-columns: 1fr; } }`
        }} />
      )}
      <div
        ref={wrapperProps?.ref as Ref<HTMLDivElement>}
        suppressHydrationWarning={wrapperProps?.suppressHydrationWarning}
        id={wrapperProps?.id}
        className={["mx-auto w-full px-6 md:px-12", hoverClassName, collapseClass, wrapperProps?.className].filter(Boolean).join(" ")}
        style={{
          ...wrapperProps?.style,
          // direction/justifyContent/alignItems/gap/wrap/width/contentWidth
          // are plain prop reads, not `--exr-*` bridged, matching Section's
          // exact same fields — see the note on LayoutNodeRenderer's
          // `wrapperProps` merge in LayoutRenderer.tsx: their Tablet/Mobile
          // responsiveness comes from the wrapper-level `!important` class
          // rule resolveNodeStyle emits (RESPONSIVE_LAYOUT_KEYS in the
          // admin), which overrides whatever plain value renders here at the
          // base breakpoint regardless.
          // Same precedence as Section's equivalent block: the generic Layout
          // panel's value wins where the user actually set one, otherwise this
          // block's own Layout-tab value, otherwise the default. All of these
          // are written after the `...wrapperProps?.style` spread above, so
          // each fallback has to re-supply the wrapper value — resolving to a
          // bare default (or to undefined) overwrites the panel's setting
          // instead of leaving it in place, which is why Display, Direction,
          // Align and Gap all appeared to do nothing on a Columns block.
          display: (wrapperProps?.style?.display as CSSProperties["display"]) ?? (isGrid ? "grid" : "flex"),
          flexDirection: (wrapperProps?.style?.flexDirection as CSSProperties["flexDirection"]) ?? (isGrid ? undefined : direction),
          justifyContent: (wrapperProps?.style?.justifyContent as CSSProperties["justifyContent"]) ?? (justifyContent || "flex-start"),
          alignItems: (wrapperProps?.style?.alignItems as CSSProperties["alignItems"]) ?? (alignItems || "stretch"),
          flexWrap: (wrapperProps?.style?.flexWrap as CSSProperties["flexWrap"]) ?? (isGrid ? undefined : wrap),
          maxWidth: contentWidth === "full" ? (wrapperProps?.style?.maxWidth as CSSProperties["maxWidth"]) : width || "1152px",
          gap: (wrapperProps?.style?.gap as CSSProperties["gap"]) ?? (gap ?? "24px"),
        // As with the layout keys above: this block's own Style-tab value
        // where set, otherwise the generic panel's. background and borderColor
        // previously produced a value unconditionally (their `--exr-` var
        // always has a literal fallback), so a panel Background or Border
        // Colour on a Columns was overwritten even when the block's own
        // control was untouched — hence the `|| transparent` guards moving
        // inside the fallback rather than sitting on the whole expression.
        background: columnsBackground
          ? `var(--exr-columnsBackground, ${columnsBackground})`
          : ((wrapperProps?.style?.background as CSSProperties["background"]) ?? "var(--exr-columnsBackground, transparent)"),
        backdropFilter: (columnsBackgroundBlur ? `blur(var(--exr-columnsBackgroundBlur, ${columnsBackgroundBlur.replace(/%$/, "px")}))` : undefined) ?? (wrapperProps?.style?.backdropFilter as CSSProperties["backdropFilter"]),
        WebkitBackdropFilter: columnsBackgroundBlur ? `blur(var(--exr-columnsBackgroundBlur, ${columnsBackgroundBlur.replace(/%$/, "px")}))` : undefined,
        borderStyle: (columnsBorderStyle && columnsBorderStyle !== "none" ? columnsBorderStyle : undefined) ?? (wrapperProps?.style?.borderStyle as CSSProperties["borderStyle"]),
        borderTopWidth: (columnsBorderStyle && columnsBorderStyle !== "none" ? `var(--exr-columnsBorderWidthTop, ${columnsBorderWidthTop || columnsBorderWidth || "1px"})` : undefined) ?? (wrapperProps?.style?.borderTopWidth as CSSProperties["borderTopWidth"]),
        borderRightWidth: (columnsBorderStyle && columnsBorderStyle !== "none" ? `var(--exr-columnsBorderWidthRight, ${columnsBorderWidthRight || columnsBorderWidth || "1px"})` : undefined) ?? (wrapperProps?.style?.borderRightWidth as CSSProperties["borderRightWidth"]),
        borderBottomWidth: (columnsBorderStyle && columnsBorderStyle !== "none" ? `var(--exr-columnsBorderWidthBottom, ${columnsBorderWidthBottom || columnsBorderWidth || "1px"})` : undefined) ?? (wrapperProps?.style?.borderBottomWidth as CSSProperties["borderBottomWidth"]),
        borderLeftWidth: (columnsBorderStyle && columnsBorderStyle !== "none" ? `var(--exr-columnsBorderWidthLeft, ${columnsBorderWidthLeft || columnsBorderWidth || "1px"})` : undefined) ?? (wrapperProps?.style?.borderLeftWidth as CSSProperties["borderLeftWidth"]),
        borderColor: columnsBorderColor
          ? `var(--exr-columnsBorderColor, ${columnsBorderColor})`
          : ((wrapperProps?.style?.borderColor as CSSProperties["borderColor"]) ?? "var(--exr-columnsBorderColor, transparent)"),
        borderRadius: columnsBorderRadius ? `var(--exr-columnsBorderRadius, ${columnsBorderRadius})` : undefined,
        boxShadow: (columnsBoxShadow ? `var(--exr-columnsBoxShadow, ${columnsBoxShadow})` : undefined) ?? (wrapperProps?.style?.boxShadow as CSSProperties["boxShadow"]),
      }}
      data-block-id={wrapperProps?.["data-block-id"]}
      data-block-type={wrapperProps?.["data-block-type"]}
    >
      {hasHoverOverride && (
        <style
          dangerouslySetInnerHTML={{
            __html: `.${hoverClassName}:hover{${[
              columnsHoverBackground && `background:var(--exr-columnsHoverBackground, ${columnsHoverBackground}) !important;`,
              columnsHoverBorderColor && `border-color:var(--exr-columnsHoverBorderColor, ${columnsHoverBorderColor}) !important;`,
              columnsHoverBoxShadow && `box-shadow:var(--exr-columnsHoverBoxShadow, ${columnsHoverBoxShadow}) !important;`,
            ]
              .filter(Boolean)
              .join("")}}`,
          }}
        />
      )}
      {children}
    </div>
    </>
  );
}

function Spacer({ height }: { height: string }) {
  return <div aria-hidden style={{ height }} />;
}

const HEADING_CLASSES: Record<string, string> = {
  h1: "text-4xl font-extrabold md:text-6xl",
  h2: "text-3xl font-bold md:text-4xl",
  h3: "text-2xl font-bold md:text-3xl",
  h4: "text-xl font-semibold md:text-2xl",
  h5: "text-lg font-semibold",
  h6: "text-base font-semibold",
  div: "text-base",
  span: "text-base",
  p: "text-base",
};

function Heading({
  text,
  level,
  href,
  openInNewTab,
  align,
  color,
  fontFamily,
  fontSize,
  fontWeight,
  textTransform,
  fontStyle,
  textDecoration,
  lineHeight,
  letterSpacing,
  wordSpacing,
  textStrokeWidth,
  textStrokeColor,
  textShadow,
  mixBlendMode,
}: {
  text: string;
  level: string;
  href?: string;
  openInNewTab?: boolean;
  align?: "left" | "center" | "right" | "justify";
  color?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  textTransform?: CSSProperties["textTransform"];
  fontStyle?: CSSProperties["fontStyle"];
  textDecoration?: string;
  lineHeight?: string;
  letterSpacing?: string;
  wordSpacing?: string;
  textStrokeWidth?: string;
  textStrokeColor?: string;
  textShadow?: string;
  mixBlendMode?: CSSProperties["mixBlendMode"];
}) {
  const tagName = level || "h2";
  const Tag = tagName as ElementType;
  const headingClassName = HEADING_CLASSES[tagName] ?? HEADING_CLASSES.h2;
  const hasStroke = textStrokeWidth && textStrokeWidth !== "0px";

  // Reads through `var(--exr-{key}, {desktop value})` rather than the raw
  // prop directly: the wrapper mints `--exr-{key}` from this same prop at
  // desktop (see resolveNodeStyle's mintVars), and overrides it inside a
  // tablet/mobile media query when the admin sets a per-breakpoint value —
  // custom properties inherit down to this element regardless of how many
  // levels of markup sit between it and the wrapper, so this is what makes
  // Align/Color/Font Size/etc actually responsive instead of desktop-only.
  const style: Record<string, string | undefined> = {
    textAlign: `var(--exr-align, ${align || "inherit"})`,
    color: `var(--exr-color, ${color || "inherit"})`,
    fontFamily: fontFamily && fontFamily !== "inherit" ? fontFamily : undefined,
    fontSize: `var(--exr-fontSize, ${fontSize || "inherit"})`,
    fontWeight: `var(--exr-fontWeight, ${fontWeight && fontWeight !== "700" ? fontWeight : "700"})`,
    textTransform: `var(--exr-textTransform, ${textTransform && textTransform !== "none" ? textTransform : "none"})`,
    fontStyle: `var(--exr-fontStyle, ${fontStyle && fontStyle !== "normal" ? fontStyle : "normal"})`,
    textDecoration: `var(--exr-textDecoration, ${textDecoration && textDecoration !== "none" ? textDecoration : "none"})`,
    lineHeight: `var(--exr-lineHeight, ${lineHeight || "inherit"})`,
    letterSpacing: `var(--exr-letterSpacing, ${letterSpacing || "inherit"})`,
    wordSpacing: `var(--exr-wordSpacing, ${wordSpacing || "inherit"})`,
    textShadow: `var(--exr-textShadow, ${textShadow || "none"})`,
    mixBlendMode: mixBlendMode && mixBlendMode !== "normal" ? mixBlendMode : undefined,
    ...(hasStroke ? { WebkitTextStroke: `${textStrokeWidth} ${textStrokeColor || "currentColor"}` } : {}),
  };

  const inner = <span dangerouslySetInnerHTML={{ __html: text }} />;

  if (href) {
    return (
      <>
        <GoogleFontLink family={fontFamily} />
        <Tag className={headingClassName} style={style as CSSProperties}>
          <a href={href} target={openInNewTab ? "_blank" : undefined} rel={openInNewTab ? "noopener noreferrer" : undefined}>
            {inner}
          </a>
        </Tag>
      </>
    );
  }

  return (
    <>
      <GoogleFontLink family={fontFamily} />
      <Tag className={headingClassName} style={style}>
        {inner}
      </Tag>
    </>
  );
}

function RichText({
  html,
  dropCap,
  columns,
  columnsGap,
  align,
  color,
  linkColor,
  fontFamily,
  fontSize,
  fontWeight,
  textTransform,
  fontStyle,
  textDecoration,
  lineHeight,
  letterSpacing,
  wordSpacing,
  paragraphSpacing,
  textShadow,
}: {
  html: string;
  dropCap?: boolean;
  columns?: "1" | "2" | "3" | "4";
  columnsGap?: string;
  align?: "left" | "center" | "right" | "justify";
  color?: string;
  linkColor?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  textTransform?: CSSProperties["textTransform"];
  fontStyle?: CSSProperties["fontStyle"];
  textDecoration?: string;
  lineHeight?: string;
  letterSpacing?: string;
  wordSpacing?: string;
  paragraphSpacing?: string;
  textShadow?: string;
}) {
  const columnCount = columns && columns !== "1" ? Number(columns) : undefined;
  // See Heading's identical note: reading through var(--exr-{key}, {desktop
  // value}) instead of the raw prop is what makes these responsive per
  // breakpoint via resolveNodeStyle's custom-property bridge.
  const style: CSSProperties & Record<string, string | number | undefined> = {
    textAlign: `var(--exr-align, ${align || "inherit"})` as CSSProperties["textAlign"],
    color: `var(--exr-color, ${color || "inherit"})`,
    fontFamily: fontFamily && fontFamily !== "inherit" ? fontFamily : undefined,
    fontSize: `var(--exr-fontSize, ${fontSize || "inherit"})`,
    fontWeight: `var(--exr-fontWeight, ${fontWeight || "400"})`,
    textTransform: `var(--exr-textTransform, ${textTransform && textTransform !== "none" ? textTransform : "none"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-fontStyle, ${fontStyle && fontStyle !== "normal" ? fontStyle : "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-textDecoration, ${textDecoration && textDecoration !== "none" ? textDecoration : "none"})`,
    lineHeight: `var(--exr-lineHeight, ${lineHeight || "inherit"})`,
    letterSpacing: `var(--exr-letterSpacing, ${letterSpacing || "inherit"})`,
    wordSpacing: `var(--exr-wordSpacing, ${wordSpacing || "inherit"})`,
    textShadow: `var(--exr-textShadow, ${textShadow || "none"})`,
    columnCount,
    columnGap: columnCount ? columnsGap : undefined,
    "--rt-link-color": linkColor || undefined,
    "--rt-p-gap": paragraphSpacing || undefined,
  };
  return (
    <>
      <GoogleFontLink family={fontFamily} />
      <div
        className={["tiptap-content", dropCap ? "drop-cap" : undefined].filter(Boolean).join(" ")}
        style={style}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}

function Image({
  src,
  alt,
  aspectRatio,
  width,
  imageAlign,
  caption,
  linkMode,
  linkUrl,
  lightbox,
  captionAlign,
  captionColor,
  captionBackground,
  captionFontSize,
  captionTextShadow,
  captionSpacing,
  imageBorderStyle,
  imageBorderWidth,
  imageBorderWidthTop,
  imageBorderWidthRight,
  imageBorderWidthBottom,
  imageBorderWidthLeft,
  imageBorderColor,
  imageHoverBorderColor,
  imageBorderRadiusTop,
  imageBorderRadiusRight,
  imageBorderRadiusBottom,
  imageBorderRadiusLeft,
  imageBoxShadow,
  imageHoverBoxShadow,
  imageHoverOpacity,
  imageHoverFilter,
}: {
  src: string;
  alt?: string;
  aspectRatio?: string;
  width?: string;
  imageAlign?: "left" | "center" | "right";
  caption?: string;
  linkMode?: "none" | "media" | "custom";
  linkUrl?: string;
  lightbox?: boolean;
  captionAlign?: "left" | "center" | "right";
  captionColor?: string;
  captionBackground?: string;
  captionFontSize?: string;
  captionTextShadow?: string;
  captionSpacing?: string;
  imageBorderStyle?: "none" | "solid" | "dashed" | "dotted" | "double";
  imageBorderWidth?: string;
  imageBorderWidthTop?: string;
  imageBorderWidthRight?: string;
  imageBorderWidthBottom?: string;
  imageBorderWidthLeft?: string;
  imageBorderColor?: string;
  imageHoverBorderColor?: string;
  imageBorderRadiusTop?: string;
  imageBorderRadiusRight?: string;
  imageBorderRadiusBottom?: string;
  imageBorderRadiusLeft?: string;
  imageBoxShadow?: string;
  imageHoverBoxShadow?: string;
  imageHoverOpacity?: string;
  imageHoverFilter?: string;
}) {
  if (!src) return null;
  const resolvedSrc = resolveImageUrl(src);
  const imgClassName = "w-full object-cover";

  const hasHoverOverride = imageHoverBorderColor || imageHoverBoxShadow || imageHoverOpacity || imageHoverFilter;
  const hoverClassName = hasHoverOverride
    ? `exr-image-h${hashString(`${imageHoverBorderColor ?? ""}|${imageHoverBoxShadow ?? ""}|${imageHoverOpacity ?? ""}|${imageHoverFilter ?? ""}`)}`
    : "";

  const frameStyle: CSSProperties = {
    overflow: "hidden",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease, filter 0.2s ease",
    // Empty width keeps the original 100%-of-container behavior; a set
    // width shrinks the frame (the <img> inside always fills it via
    // w-full), at which point imageAlign positions the now-narrower frame
    // via margin auto — the same block-centering trick as `mx-auto`.
    width: `var(--exr-width, ${width || "100%"})`,
    marginLeft: imageAlign === "center" || imageAlign === "right" ? "auto" : undefined,
    marginRight: imageAlign === "center" ? "auto" : undefined,
    borderStyle: imageBorderStyle && imageBorderStyle !== "none" ? imageBorderStyle : undefined,
    borderTopWidth: imageBorderStyle && imageBorderStyle !== "none" ? `var(--exr-imageBorderWidthTop, ${imageBorderWidthTop || imageBorderWidth || "1px"})` : undefined,
    borderRightWidth: imageBorderStyle && imageBorderStyle !== "none" ? `var(--exr-imageBorderWidthRight, ${imageBorderWidthRight || imageBorderWidth || "1px"})` : undefined,
    borderBottomWidth: imageBorderStyle && imageBorderStyle !== "none" ? `var(--exr-imageBorderWidthBottom, ${imageBorderWidthBottom || imageBorderWidth || "1px"})` : undefined,
    borderLeftWidth: imageBorderStyle && imageBorderStyle !== "none" ? `var(--exr-imageBorderWidthLeft, ${imageBorderWidthLeft || imageBorderWidth || "1px"})` : undefined,
    borderColor: `var(--exr-imageBorderColor, ${imageBorderColor || "transparent"})`,
    borderRadius: `var(--exr-imageBorderRadiusTop, ${imageBorderRadiusTop || "0px"}) var(--exr-imageBorderRadiusRight, ${imageBorderRadiusRight || "0px"}) var(--exr-imageBorderRadiusBottom, ${imageBorderRadiusBottom || "0px"}) var(--exr-imageBorderRadiusLeft, ${imageBorderRadiusLeft || "0px"})`,
    boxShadow: imageBoxShadow ? `var(--exr-imageBoxShadow, ${imageBoxShadow})` : undefined,
  };

  let picture: ReactNode;
  if (lightbox) {
    picture = <LightboxImage src={resolvedSrc} alt={alt ?? ""} aspectRatio={aspectRatio} className={imgClassName} />;
  } else {
    // eslint-disable-next-line @next/next/no-img-element
    const img = <img src={resolvedSrc} alt={alt ?? ""} className={imgClassName} style={aspectRatio ? { aspectRatio } : undefined} />;
    if (linkMode === "media") {
      picture = (
        <a href={resolvedSrc} target="_blank" rel="noopener noreferrer">
          {img}
        </a>
      );
    } else if (linkMode === "custom" && linkUrl) {
      picture = <a href={linkUrl}>{img}</a>;
    } else {
      picture = img;
    }
  }

  const frame = (
    <div className={[hoverClassName, "block"].filter(Boolean).join(" ")} style={frameStyle}>
      {hasHoverOverride && (
        <style
          dangerouslySetInnerHTML={{
            __html: `.${hoverClassName}:hover{${[
              imageHoverBorderColor && `border-color:var(--exr-imageHoverBorderColor, ${imageHoverBorderColor}) !important;`,
              imageHoverBoxShadow && `box-shadow:var(--exr-imageHoverBoxShadow, ${imageHoverBoxShadow}) !important;`,
              imageHoverOpacity && `opacity:var(--exr-imageHoverOpacity, ${imageHoverOpacity}) !important;`,
              imageHoverFilter && `filter:var(--exr-imageHoverFilter, ${imageHoverFilter}) !important;`,
            ]
              .filter(Boolean)
              .join("")}}`,
          }}
        />
      )}
      {picture}
    </div>
  );

  if (!caption) return frame;
  const captionStyle: CSSProperties = {
    textAlign: captionAlign || "center",
    color: captionColor || undefined,
    background: captionBackground || undefined,
    fontSize: captionFontSize || undefined,
    textShadow: captionTextShadow || undefined,
    marginTop: captionSpacing || "8px",
  };
  return (
    <figure className="m-0">
      {frame}
      <figcaption className="text-sm text-foreground/60" style={captionStyle}>
        {caption}
      </figcaption>
    </figure>
  );
}

const CTA_VARIANT_CLASSES: Record<"gold" | "white" | "outline", string> = {
  gold: "bg-gold text-white hover:bg-gold-dark",
  white: "bg-white text-black hover:bg-white/90",
  outline: "border border-white/30 text-white hover:border-gold hover:text-gold",
};

// ── Dynamic post-bound blocks ────────────────────────────────────────────
// `postContext` is only ever set by LayoutRenderer when rendering an active
// "blog_single" SiteTemplate for a real post (see LayoutRenderer.tsx's own
// comment) — every other render path (a normal page, Header/Footer, this
// same block previewed standalone) leaves it undefined, so each of these
// falls back to clearly-labeled placeholder content instead of rendering
// blank or throwing.

function PostTitle({
  level,
  align,
  color,
  fontFamily,
  fontSize,
  fontWeight,
  textTransform,
  fontStyle,
  textDecoration,
  lineHeight,
  letterSpacing,
  postContext,
}: {
  level?: string;
  align?: "left" | "center" | "right" | "justify";
  color?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  textTransform?: CSSProperties["textTransform"];
  fontStyle?: CSSProperties["fontStyle"];
  textDecoration?: string;
  lineHeight?: string;
  letterSpacing?: string;
  postContext?: PostContextData;
}) {
  const Tag = (level || "h1") as ElementType;
  // Same var-bridge convention as Heading/RichText above — reads through
  // var(--exr-{key}, {desktop value}) so Tablet/Mobile overrides apply.
  const style: CSSProperties = {
    textAlign: `var(--exr-align, ${align || "inherit"})` as CSSProperties["textAlign"],
    color: `var(--exr-color, ${color || "inherit"})`,
    fontFamily: fontFamily && fontFamily !== "inherit" ? fontFamily : undefined,
    fontSize: `var(--exr-fontSize, ${fontSize || "inherit"})`,
    fontWeight: `var(--exr-fontWeight, ${fontWeight || "700"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-textTransform, ${textTransform && textTransform !== "none" ? textTransform : "none"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-fontStyle, ${fontStyle && fontStyle !== "normal" ? fontStyle : "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-textDecoration, ${textDecoration && textDecoration !== "none" ? textDecoration : "none"})`,
    lineHeight: `var(--exr-lineHeight, ${lineHeight || "inherit"})`,
    letterSpacing: `var(--exr-letterSpacing, ${letterSpacing || "inherit"})`,
  };
  return (
    <>
      <GoogleFontLink family={fontFamily} />
      <Tag style={style}>{postContext?.title ?? "Post Title"}</Tag>
    </>
  );
}

function PostFeaturedImage({
  aspectRatio,
  imageObjectFit,
  postContext,
}: {
  aspectRatio?: string;
  imageObjectFit?: "cover" | "contain" | "fill";
  postContext?: PostContextData;
}) {
  const src = postContext?.featuredImage;
  if (!src) {
    return (
      <div
        style={{
          width: "100%",
          aspectRatio: aspectRatio || "16/9",
          background: "rgba(120,120,120,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(120,120,120,0.6)",
          fontSize: "13px",
        }}
      >
        Featured Image
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- same plain-<img> convention as the Image block above
    <img
      src={resolveImageUrl(src)}
      alt={postContext?.title ?? ""}
      style={{ width: "100%", aspectRatio: aspectRatio || "16/9", objectFit: imageObjectFit || "cover", display: "block" }}
    />
  );
}

function PostContent({
  color,
  fontFamily,
  fontSize,
  lineHeight,
  postContext,
}: {
  color?: string;
  fontFamily?: string;
  fontSize?: string;
  lineHeight?: string;
  postContext?: PostContextData;
}) {
  const style: CSSProperties = {
    color: `var(--exr-color, ${color || "inherit"})`,
    fontFamily: fontFamily && fontFamily !== "inherit" ? fontFamily : undefined,
    fontSize: `var(--exr-fontSize, ${fontSize || "inherit"})`,
    lineHeight: `var(--exr-lineHeight, ${lineHeight || "inherit"})`,
  };
  return (
    <>
      <GoogleFontLink family={fontFamily} />
      {/* Same trust boundary/convention as RichText above — post.content is admin-authored HTML from the Blog Engine. */}
      <div className="tiptap-content" style={style} dangerouslySetInnerHTML={{ __html: postContext?.content ?? "<p>Post content will appear here.</p>" }} />
    </>
  );
}

// Plain text, not HTML (unlike PostContent) — reads `excerpt`, which is what
// a Posts block's real per-post loop-card repetition actually has (its
// postContext only ever carries the lightweight PostCard shape, no
// `content`). `lineClamp` truncates to N lines, the standard card-excerpt
// treatment.
function PostExcerpt({
  color,
  fontFamily,
  fontSize,
  lineHeight,
  lineClamp,
  postContext,
}: {
  color?: string;
  fontFamily?: string;
  fontSize?: string;
  lineHeight?: string;
  lineClamp?: string;
  postContext?: PostContextData;
}) {
  const clamp = Number(lineClamp) || 0;
  const style: CSSProperties = {
    color: `var(--exr-color, ${color || "inherit"})`,
    fontFamily: fontFamily && fontFamily !== "inherit" ? fontFamily : undefined,
    fontSize: `var(--exr-fontSize, ${fontSize || "inherit"})`,
    lineHeight: `var(--exr-lineHeight, ${lineHeight || "inherit"})`,
    ...(clamp > 0
      ? { display: "-webkit-box", WebkitBoxOrient: "vertical" as CSSProperties["WebkitBoxOrient"], WebkitLineClamp: clamp, overflow: "hidden" }
      : {}),
  };
  return (
    <>
      <GoogleFontLink family={fontFamily} />
      <p style={style}>{postContext?.excerpt ?? "Post excerpt will appear here."}</p>
    </>
  );
}

// Cheap deterministic string hash — just enough to give buttons that share
// the same custom hover values a stable, collision-safe-in-practice class
// name, without needing the block's node id plumbed all the way down here.
function hashString(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

function CTAButton({
  label,
  href,
  variant,
  hoverLabel,
  icon,
  iconPosition,
  background,
  color,
  borderStyle,
  borderWidth,
  borderWidthTop,
  borderWidthRight,
  borderWidthBottom,
  borderWidthLeft,
  borderColor,
  borderRadius,
  borderRadiusTopLeft,
  borderRadiusTopRight,
  borderRadiusBottomRight,
  borderRadiusBottomLeft,
  boxShadow,
  fontFamily,
  fontSize,
  fontWeight,
  textTransform,
  fontStyle,
  textDecoration,
  lineHeight,
  letterSpacing,
  wordSpacing,
  textShadow,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
  hoverBackground,
  hoverColor,
  hoverBorderColor,
  hoverBoxShadow,
  hoverBackgroundSize,
  hoverBackgroundPosition,
  hoverTransitionDuration,
  postContext,
}: {
  label: string;
  href: string;
  variant: "gold" | "white" | "outline";
  /** Set by LayoutRenderer only inside a Posts block's per-post loop-card
   *  repetition (or a blog_single template) — when `href` itself is left
   *  empty, this button links to THIS post's own real permalink instead,
   *  so a "Read More" dropped into a shared card design correctly points
   *  each card at its own post rather than one static URL. Every other use
   *  of this block (postContext always undefined) is unaffected. */
  postContext?: PostContextData;
  hoverLabel?: string;
  icon?: string;
  iconPosition?: "none" | "before" | "after";
  background?: string;
  color?: string;
  borderStyle?: "none" | "solid" | "dashed" | "dotted" | "double";
  borderWidth?: string;
  borderWidthTop?: string;
  borderWidthRight?: string;
  borderWidthBottom?: string;
  borderWidthLeft?: string;
  borderColor?: string;
  borderRadius?: string;
  borderRadiusTopLeft?: string;
  borderRadiusTopRight?: string;
  borderRadiusBottomRight?: string;
  borderRadiusBottomLeft?: string;
  boxShadow?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  textTransform?: CSSProperties["textTransform"];
  fontStyle?: CSSProperties["fontStyle"];
  textDecoration?: string;
  lineHeight?: string;
  letterSpacing?: string;
  wordSpacing?: string;
  textShadow?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  hoverBackground?: string;
  hoverColor?: string;
  hoverBorderColor?: string;
  hoverBoxShadow?: string;
  hoverBackgroundSize?: string;
  hoverBackgroundPosition?: string;
  hoverTransitionDuration?: string;
}) {
  const resolvedHref = href || postContext?.href || "#";

  // No rounded-full here — border-radius is always driven by the inline
  // style below now (falling back to the pill shape for pages saved before
  // this field existed), so the Style tab's Border Radius value is the one
  // true source instead of a hardcoded class the field couldn't override.
  const baseClassName = `inline-block px-6 py-3 text-sm font-semibold ${CTA_VARIANT_CLASSES[variant]}`;
  const hasIcon = Boolean(iconPosition && iconPosition !== "none" && icon);
  const content = hasIcon ? (
    <span className="inline-flex items-center gap-2">
      {iconPosition === "before" && <IconGlyph icon={icon} className="h-4 w-4 shrink-0" />}
      <span>{label}</span>
      {iconPosition === "after" && <IconGlyph icon={icon} className="h-4 w-4 shrink-0" />}
    </span>
  ) : (
    label
  );

  // background/borderStyle/Width/Color/Radius/boxShadow/paddingTop/Right/
  // Bottom/Left are NOT var-bridged here on purpose: those exact names are
  // reserved for the wrapper's own generic Advanced-tab fields (see
  // BOX_MODEL_KEYS in packages/builder), so this button's OWN same-named
  // props stay desktop-only (raw values) rather than fighting over the same
  // `--exr-*` custom property — see the comment on that Set for the full
  // reasoning. color/fontSize/etc below have no such collision.
  const customStyle: Record<string, string | undefined> = {
    background: background || undefined,
    color: `var(--exr-color, ${color || "inherit"})`,
    borderStyle: borderStyle && borderStyle !== "none" ? borderStyle : undefined,
    borderTopWidth: borderStyle && borderStyle !== "none" ? (borderWidthTop || borderWidth || "1px") : undefined,
    borderRightWidth: borderStyle && borderStyle !== "none" ? (borderWidthRight || borderWidth || "1px") : undefined,
    borderBottomWidth: borderStyle && borderStyle !== "none" ? (borderWidthBottom || borderWidth || "1px") : undefined,
    borderLeftWidth: borderStyle && borderStyle !== "none" ? (borderWidthLeft || borderWidth || "1px") : undefined,
    borderColor: borderStyle && borderStyle !== "none" ? borderColor || undefined : undefined,
    borderTopLeftRadius: borderRadiusTopLeft || borderRadius || "9999px",
    borderTopRightRadius: borderRadiusTopRight || borderRadius || "9999px",
    borderBottomRightRadius: borderRadiusBottomRight || borderRadius || "9999px",
    borderBottomLeftRadius: borderRadiusBottomLeft || borderRadius || "9999px",
    boxShadow: boxShadow || undefined,
    fontFamily: fontFamily && fontFamily !== "inherit" ? fontFamily : undefined,
    fontSize: `var(--exr-fontSize, ${fontSize || "inherit"})`,
    fontWeight: `var(--exr-fontWeight, ${fontWeight && fontWeight !== "600" ? fontWeight : "600"})`,
    textTransform: `var(--exr-textTransform, ${textTransform && textTransform !== "none" ? textTransform : "none"})`,
    fontStyle: `var(--exr-fontStyle, ${fontStyle && fontStyle !== "normal" ? fontStyle : "normal"})`,
    textDecoration: `var(--exr-textDecoration, ${textDecoration && textDecoration !== "none" ? textDecoration : "none"})`,
    lineHeight: `var(--exr-lineHeight, ${lineHeight || "inherit"})`,
    letterSpacing: `var(--exr-letterSpacing, ${letterSpacing || "inherit"})`,
    wordSpacing: `var(--exr-wordSpacing, ${wordSpacing || "inherit"})`,
    textShadow: `var(--exr-textShadow, ${textShadow || "none"})`,
    paddingTop: paddingTop || undefined,
    paddingRight: paddingRight || undefined,
    paddingBottom: paddingBottom || undefined,
    paddingLeft: paddingLeft || undefined,
  };

  // "Gradient slide" mode: hoverBackground (which can be a gradient, not
  // just a solid color) paints on the RESTING state instead of only on
  // :hover, oversized via hoverBackgroundSize (e.g. "300% 100%") so
  // hoverBackgroundPosition (e.g. "100% 0") has somewhere to slide it to on
  // hover — a static gradient would otherwise just pop in/out with nothing
  // to animate between. Off (hoverBackgroundSize unset) reproduces the
  // original behavior exactly: hoverBackground only applies on :hover.
  const slideMode = Boolean(hoverBackgroundSize);
  if (slideMode) {
    customStyle.background = hoverBackground || customStyle.background;
    customStyle.backgroundSize = hoverBackgroundSize;
  }
  if (hoverTransitionDuration) {
    customStyle.transition = `all ${hoverTransitionDuration} ease-in-out`;
  }

  const hasHoverOverride = hoverBackground || hoverColor || hoverBorderColor || hoverBoxShadow || slideMode;
  const hoverClassName = hasHoverOverride
    ? `cta-h${hashString(`${hoverBackground ?? ""}|${hoverColor ?? ""}|${hoverBorderColor ?? ""}|${hoverBoxShadow ?? ""}|${hoverBackgroundSize ?? ""}|${hoverBackgroundPosition ?? ""}`)}`
    : "";
  // !important on every declaration: the *normal* state of these same
  // properties is set as an inline style just below (background, color,
  // etc. in `customStyle`), and inline style specificity always beats a
  // plain class-selector rule regardless of :hover state — same root cause
  // as the tablet/mobile override bug documented in resolveNodeStyle.ts.
  const hoverStyleTag = hasHoverOverride ? (
    <style
      dangerouslySetInnerHTML={{
        __html: `.${hoverClassName}:hover{${[
          // In slide mode the gradient itself is already on the resting
          // state above — hover only slides its position; re-declaring
          // `background` here would reset it back to position 0 first,
          // fighting the very slide it's supposed to animate.
          !slideMode && hoverBackground && `background:${hoverBackground} !important;`,
          slideMode && `background-position:${hoverBackgroundPosition || "100% 0"} !important;`,
          hoverColor && `color:${hoverColor} !important;`,
          hoverBorderColor && `border-color:${hoverBorderColor} !important;`,
          hoverBoxShadow && `box-shadow:${hoverBoxShadow} !important;`,
        ]
          .filter(Boolean)
          .join("")}}`,
      }}
    />
  ) : null;

  if (!hoverLabel) {
    return (
      <>
        <GoogleFontLink family={fontFamily} />
        {hoverStyleTag}
        <a href={resolvedHref} className={`${baseClassName} ${hoverClassName} transition-all hover:-translate-y-0.5`} style={customStyle}>
          {content}
        </a>
      </>
    );
  }

  // 3D flip: an outer link (perspective) wraps an inner face that rotates
  // 180° on hover; front/back are the two faces, hidden when turned away
  // from the viewer so only one is ever legible at a time.
  return (
    <>
      <GoogleFontLink family={fontFamily} />
      {hoverStyleTag}
      <a href={resolvedHref} className="inline-block group" style={{ perspective: "600px" }}>
        <span
          className={`relative block transition-transform duration-500 ${baseClassName} ${hoverClassName}`}
          style={{ ...customStyle, transformStyle: "preserve-3d" }}
        >
          <span
            className="absolute inset-0 flex items-center justify-center transition-transform duration-500 group-hover:[transform:rotateX(180deg)]"
            style={{ backfaceVisibility: "hidden" }}
          >
            {content}
          </span>
          <span
            aria-hidden={!hoverLabel}
            className="absolute inset-0 flex items-center justify-center transition-transform duration-500 [transform:rotateX(-180deg)] group-hover:[transform:rotateX(0deg)]"
            style={{ backfaceVisibility: "hidden" }}
          >
            {hoverLabel}
          </span>
          <span className="invisible">{content}</span>
        </span>
      </a>
    </>
  );
}

function Divider({
  style: lineStyle,
  width,
  alignment,
  color,
  thickness,
  addElement,
  text,
  icon,
}: {
  style?: "solid" | "double" | "dotted" | "dashed";
  width?: string;
  alignment?: "left" | "center" | "right";
  color?: string;
  thickness?: string;
  addElement?: "none" | "text" | "icon";
  text?: string;
  icon?: string;
}) {
  const lineCss: CSSProperties = {
    flex: 1,
    borderTopStyle: lineStyle ?? "solid",
    borderTopWidth: thickness ?? "1px",
    borderColor: color ?? "rgba(255,255,255,0.15)",
  };

  // "left"/"center"/"right" are all legal `justify-content` keywords as-is
  // (CSS Box Alignment L3), so the responsive `--exr-alignment` var can
  // drive this directly with no JS-side ternary to re-run per breakpoint —
  // unlike the old marginLeft/Right:auto trick, which baked the desktop
  // value into a fixed pair of CSS properties with nothing left for a
  // tablet/mobile override to act on.
  const wrapperCss: CSSProperties = { display: "flex", justifyContent: `var(--exr-alignment, ${alignment || "center"})` };

  // The outer wrapper must be full-width in its own right — a parent flex
  // container with alignItems other than "stretch" (e.g. a text column
  // that's deliberately left-aligned, like Hero's headline) shrink-wraps
  // any auto-sized flex child to its own content size, leaving zero free
  // space for the inner flex row to distribute. Wrapping in an explicit
  // width:100% flex box sidesteps that, regardless of what the parent's
  // own alignItems happens to be.
  if (addElement === "text" || addElement === "icon") {
    return (
      <div className="w-full" style={wrapperCss}>
        <div className="flex items-center gap-3" style={{ width: width || "100%", maxWidth: "100%" }}>
          <span style={lineCss} />
          {addElement === "text" ? (
            <span className="shrink-0 text-sm text-foreground/60">{text || "Divider"}</span>
          ) : (
            <span className="shrink-0" style={{ color: color ?? "currentColor" }}>
              <IconGlyph icon={icon || "star"} fallback={IconStar} className="h-4 w-4" />
            </span>
          )}
          <span style={lineCss} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full" style={wrapperCss}>
      <div
        className="max-w-full"
        style={{ width: width || "100%", borderTopStyle: lineStyle ?? "solid", borderTopWidth: thickness ?? "1px", borderColor: color ?? "rgba(255,255,255,0.15)" }}
      />
    </div>
  );
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
  return m ? m[1] : null;
}

function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

function Video({ url, aspectRatio }: { url: string; aspectRatio?: string }) {
  if (!url) return null;
  const yt = extractYouTubeId(url);
  const vimeo = extractVimeoId(url);
  const embedSrc = yt ? `https://www.youtube.com/embed/${yt}` : vimeo ? `https://player.vimeo.com/video/${vimeo}` : null;

  return (
    <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-xl" style={{ aspectRatio: aspectRatio ?? "16/9" }}>
      {embedSrc ? (
        <iframe
          src={embedSrc}
          title="Video"
          className="h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <video src={url} controls className="h-full w-full object-cover" />
      )}
    </div>
  );
}

function Icon({
  icon,
  size,
  color,
  view,
  shape,
  linkUrl,
  align,
  hoverColor,
  secondaryColor,
  hoverSecondaryColor,
  padding,
  rotate,
  borderRadiusTop,
  borderRadiusRight,
  borderRadiusBottom,
  borderRadiusLeft,
  borderWidth,
  borderWidthTop,
  borderWidthRight,
  borderWidthBottom,
  borderWidthLeft,
  boxShadow,
}: {
  icon: string;
  size?: string;
  color?: string;
  view?: "default" | "stacked" | "framed";
  shape?: "square" | "rounded" | "circle";
  linkUrl?: string;
  align?: "left" | "center" | "right";
  hoverColor?: string;
  secondaryColor?: string;
  hoverSecondaryColor?: string;
  padding?: string;
  rotate?: string;
  borderRadiusTop?: string;
  borderRadiusRight?: string;
  borderRadiusBottom?: string;
  borderRadiusLeft?: string;
  borderWidth?: string;
  borderWidthTop?: string;
  borderWidthRight?: string;
  borderWidthBottom?: string;
  borderWidthLeft?: string;
  boxShadow?: string;
}) {
  const hasCustomRadius = borderRadiusTop || borderRadiusRight || borderRadiusBottom || borderRadiusLeft;
  const shapeRadius = shape === "circle" ? "9999px" : shape === "rounded" ? "20%" : "0px";

  const hasHoverOverride = hoverColor || hoverSecondaryColor;
  const hoverClassName = hasHoverOverride ? `icon-h${hashString(`${hoverColor ?? ""}|${hoverSecondaryColor ?? ""}`)}` : "";
  const hoverStyleTag = hasHoverOverride ? (
    <style
      dangerouslySetInnerHTML={{
        __html: `.${hoverClassName}:hover{${[
          hoverColor && `color:${hoverColor} !important;`,
          view !== "default" && hoverSecondaryColor && (view === "framed" ? `border-color:${hoverSecondaryColor} !important;` : `background:${hoverSecondaryColor} !important;`),
        ]
          .filter(Boolean)
          .join("")}}`,
      }}
    />
  ) : null;

  const wrapperStyle: CSSProperties = {
    color: color || undefined,
    transform: rotate ? `rotate(${rotate})` : undefined,
    display: "inline-flex",
  };

  const glyph = (
    <IconGlyph icon={icon} fallback={IconStar} size={view === "default" ? size : undefined} style={view === "default" ? undefined : { width: "55%", height: "55%" }} />
  );

  const visual =
    view === "default" ? (
      <span className={hoverClassName} style={wrapperStyle}>
        {glyph}
      </span>
    ) : (
      <span
        className={hoverClassName}
        style={{
          ...wrapperStyle,
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
          padding: padding || undefined,
          background: view === "stacked" ? secondaryColor || "rgba(148,148,148,0.15)" : undefined,
          borderStyle: view === "framed" ? "solid" : undefined,
          borderTopWidth: view === "framed" ? (borderWidthTop || borderWidth || "2px") : undefined,
          borderRightWidth: view === "framed" ? (borderWidthRight || borderWidth || "2px") : undefined,
          borderBottomWidth: view === "framed" ? (borderWidthBottom || borderWidth || "2px") : undefined,
          borderLeftWidth: view === "framed" ? (borderWidthLeft || borderWidth || "2px") : undefined,
          borderColor: view === "framed" ? (secondaryColor || "currentColor") : undefined,
          borderRadius: hasCustomRadius
            ? `var(--exr-borderRadiusTop, ${borderRadiusTop || "0"}) var(--exr-borderRadiusRight, ${borderRadiusRight || "0"}) var(--exr-borderRadiusBottom, ${borderRadiusBottom || "0"}) var(--exr-borderRadiusLeft, ${borderRadiusLeft || "0"})`
            : shapeRadius,
          boxShadow: boxShadow || undefined,
        }}
      >
        {glyph}
      </span>
    );

  const content = <div className={`flex ${align === "left" ? "justify-start" : align === "right" ? "justify-end" : "justify-center"}`}>{visual}</div>;

  return (
    <>
      {hoverStyleTag}
      {linkUrl ? <a href={linkUrl}>{content}</a> : content}
    </>
  );
}

function IconBox({
  icon,
  view,
  title,
  description,
  linkUrl,
  titleTag,
  iconPosition,
  align,
  iconSpacing,
  contentSpacing,
  color,
  hoverColor,
  secondaryColor,
  hoverSecondaryColor,
  size,
  shape,
  rotate,
  padding,
  borderRadiusTop,
  borderRadiusRight,
  borderRadiusBottom,
  borderRadiusLeft,
  borderWidth,
  borderWidthTop,
  borderWidthRight,
  borderWidthBottom,
  borderWidthLeft,
  boxShadow,
  titleColor,
  titleHoverColor,
  titleFontFamily,
  titleFontSize,
  titleFontWeight,
  titleTextTransform,
  titleFontStyle,
  titleTextDecoration,
  titleLineHeight,
  titleLetterSpacing,
  titleWordSpacing,
  titleTextStrokeWidth,
  titleTextStrokeColor,
  titleTextShadow,
  descColor,
  descFontFamily,
  descFontSize,
  descFontWeight,
  descTextTransform,
  descFontStyle,
  descTextDecoration,
  descLineHeight,
  descLetterSpacing,
  descWordSpacing,
  descTextShadow,
}: {
  icon: string;
  view?: "default" | "stacked" | "framed";
  title: string;
  description?: string;
  linkUrl?: string;
  titleTag?: string;
  iconPosition?: "left" | "top" | "right";
  align?: "left" | "center" | "right" | "justify";
  iconSpacing?: string;
  contentSpacing?: string;
  color?: string;
  hoverColor?: string;
  secondaryColor?: string;
  hoverSecondaryColor?: string;
  size?: string;
  shape?: "square" | "rounded" | "circle";
  rotate?: string;
  padding?: string;
  borderRadiusTop?: string;
  borderRadiusRight?: string;
  borderRadiusBottom?: string;
  borderRadiusLeft?: string;
  borderWidth?: string;
  borderWidthTop?: string;
  borderWidthRight?: string;
  borderWidthBottom?: string;
  borderWidthLeft?: string;
  boxShadow?: string;
  titleColor?: string;
  titleHoverColor?: string;
  titleFontFamily?: string;
  titleFontSize?: string;
  titleFontWeight?: string;
  titleTextTransform?: CSSProperties["textTransform"];
  titleFontStyle?: CSSProperties["fontStyle"];
  titleTextDecoration?: string;
  titleLineHeight?: string;
  titleLetterSpacing?: string;
  titleWordSpacing?: string;
  titleTextStrokeWidth?: string;
  titleTextStrokeColor?: string;
  titleTextShadow?: string;
  descColor?: string;
  descFontFamily?: string;
  descFontSize?: string;
  descFontWeight?: string;
  descTextTransform?: CSSProperties["textTransform"];
  descFontStyle?: CSSProperties["fontStyle"];
  descTextDecoration?: string;
  descLineHeight?: string;
  descLetterSpacing?: string;
  descWordSpacing?: string;
  descTextShadow?: string;
}) {
  // Same glyph-composition logic as the standalone Icon block (default/
  // stacked/framed + shape + secondary color) — duplicated rather than
  // shared since Icon centers it standalone while this embeds it in a
  // flex row/column alongside title+description.
  const hasCustomRadius = borderRadiusTop || borderRadiusRight || borderRadiusBottom || borderRadiusLeft;
  const shapeRadius = shape === "circle" ? "9999px" : shape === "rounded" ? "20%" : "0px";
  const TitleTag = (titleTag || "h3") as ElementType;
  const hasStroke = titleTextStrokeWidth && titleTextStrokeWidth !== "0px";

  const iconWrapperStyle: CSSProperties = {
    color: color || undefined,
    transform: rotate ? `rotate(${rotate})` : undefined,
    display: "inline-flex",
    flexShrink: 0,
  };

  const glyph = (
    <IconGlyph icon={icon} fallback={IconStar} size={view === "default" ? size : undefined} style={view === "default" ? undefined : { width: "55%", height: "55%" }} />
  );

  const iconVisual =
    view === "default" ? (
      <span className="imgbox-icon" style={iconWrapperStyle}>
        {glyph}
      </span>
    ) : (
      <span
        className="imgbox-icon"
        style={{
          ...iconWrapperStyle,
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
          padding: padding || undefined,
          background: view === "stacked" ? secondaryColor || "rgba(148,148,148,0.15)" : undefined,
          borderStyle: view === "framed" ? "solid" : undefined,
          borderTopWidth: view === "framed" ? (borderWidthTop || borderWidth || "2px") : undefined,
          borderRightWidth: view === "framed" ? (borderWidthRight || borderWidth || "2px") : undefined,
          borderBottomWidth: view === "framed" ? (borderWidthBottom || borderWidth || "2px") : undefined,
          borderLeftWidth: view === "framed" ? (borderWidthLeft || borderWidth || "2px") : undefined,
          borderColor: view === "framed" ? (secondaryColor || "currentColor") : undefined,
          borderRadius: hasCustomRadius
            ? `var(--exr-borderRadiusTop, ${borderRadiusTop || "0"}) var(--exr-borderRadiusRight, ${borderRadiusRight || "0"}) var(--exr-borderRadiusBottom, ${borderRadiusBottom || "0"}) var(--exr-borderRadiusLeft, ${borderRadiusLeft || "0"})`
            : shapeRadius,
          boxShadow: boxShadow || undefined,
        }}
      >
        {glyph}
      </span>
    );

  const wrapperStyle: CSSProperties = {
    display: "flex",
    flexDirection: iconPosition === "top" ? "column" : iconPosition === "right" ? "row-reverse" : "row",
    alignItems: align === "center" ? "center" : align === "right" ? "flex-end" : align === "justify" ? "stretch" : "flex-start",
    textAlign: align === "justify" ? "left" : align || "left",
    gap: iconSpacing || undefined,
  };

  // Title/Description read through var(--exr-{key}, {desktop value}) so the
  // PropertyPanel's per-breakpoint override (see binding() in
  // apps/admin/.../PropertyPanel.tsx) actually reaches these elements —
  // custom properties inherit regardless of how deep in the wrapper's
  // markup they sit.
  const titleStyle: Record<string, string | undefined> = {
    color: `var(--exr-titleColor, ${titleColor || "inherit"})`,
    fontFamily: titleFontFamily && titleFontFamily !== "inherit" ? titleFontFamily : undefined,
    fontSize: `var(--exr-titleFontSize, ${titleFontSize || "inherit"})`,
    fontWeight: `var(--exr-titleFontWeight, ${titleFontWeight || "inherit"})`,
    textTransform: `var(--exr-titleTextTransform, ${titleTextTransform && titleTextTransform !== "none" ? titleTextTransform : "none"})`,
    fontStyle: `var(--exr-titleFontStyle, ${titleFontStyle && titleFontStyle !== "normal" ? titleFontStyle : "normal"})`,
    textDecoration: `var(--exr-titleTextDecoration, ${titleTextDecoration && titleTextDecoration !== "none" ? titleTextDecoration : "none"})`,
    lineHeight: `var(--exr-titleLineHeight, ${titleLineHeight || "inherit"})`,
    letterSpacing: `var(--exr-titleLetterSpacing, ${titleLetterSpacing || "inherit"})`,
    wordSpacing: `var(--exr-titleWordSpacing, ${titleWordSpacing || "inherit"})`,
    textShadow: `var(--exr-titleTextShadow, ${titleTextShadow || "none"})`,
    marginBottom: contentSpacing || undefined,
    ...(hasStroke ? { WebkitTextStroke: `${titleTextStrokeWidth} ${titleTextStrokeColor || "currentColor"}` } : {}),
  };

  const descStyle: Record<string, string | undefined> = {
    color: `var(--exr-descColor, ${descColor || "inherit"})`,
    fontFamily: descFontFamily && descFontFamily !== "inherit" ? descFontFamily : undefined,
    fontSize: `var(--exr-descFontSize, ${descFontSize || "inherit"})`,
    fontWeight: `var(--exr-descFontWeight, ${descFontWeight || "inherit"})`,
    textTransform: `var(--exr-descTextTransform, ${descTextTransform && descTextTransform !== "none" ? descTextTransform : "none"})`,
    fontStyle: `var(--exr-descFontStyle, ${descFontStyle && descFontStyle !== "normal" ? descFontStyle : "normal"})`,
    textDecoration: `var(--exr-descTextDecoration, ${descTextDecoration && descTextDecoration !== "none" ? descTextDecoration : "none"})`,
    lineHeight: `var(--exr-descLineHeight, ${descLineHeight || "inherit"})`,
    letterSpacing: `var(--exr-descLetterSpacing, ${descLetterSpacing || "inherit"})`,
    wordSpacing: `var(--exr-descWordSpacing, ${descWordSpacing || "inherit"})`,
    textShadow: `var(--exr-descTextShadow, ${descTextShadow || "none"})`,
  };

  const hasHoverOverride = titleHoverColor || hoverColor || hoverSecondaryColor;
  const hoverClassName = hasHoverOverride ? `iconbox-h${hashString(`${titleHoverColor ?? ""}|${hoverColor ?? ""}|${hoverSecondaryColor ?? ""}`)}` : "";

  const box = (
    <div className={hoverClassName} style={wrapperStyle}>
      {iconVisual}
      <div>
        <TitleTag className="imgbox-title" style={titleStyle}>
          {title}
        </TitleTag>
        {description && <p style={descStyle}>{description}</p>}
      </div>
    </div>
  );

  return (
    <>
      <GoogleFontLink family={titleFontFamily} />
      <GoogleFontLink family={descFontFamily} />
      {hasHoverOverride && (
        <style
          dangerouslySetInnerHTML={{
            __html: `.${hoverClassName}:hover .imgbox-icon{${[
              hoverColor && `color:${hoverColor} !important;`,
              view !== "default" && hoverSecondaryColor && (view === "framed" ? `border-color:${hoverSecondaryColor} !important;` : `background:${hoverSecondaryColor} !important;`),
            ]
              .filter(Boolean)
              .join("")}} .${hoverClassName}:hover .imgbox-title{${titleHoverColor ? `color:${titleHoverColor} !important;` : ""}}`,
          }}
        />
      )}
      {linkUrl ? (
        <a href={linkUrl} className="block no-underline">
          {box}
        </a>
      ) : (
        box
      )}
    </>
  );
}

function IconList({
  items,
  layout,
  applyLinkOn,
  listGap,
  listAlign,
  dividerEnabled,
  dividerStyle,
  dividerThickness,
  dividerWidth,
  dividerColor,
  iconColor,
  iconHoverColor,
  iconSize,
  iconGap,
  iconHorizontalAlign,
  iconVerticalAlign,
  iconVerticalOffset,
  textFontFamily,
  textFontSize,
  textFontWeight,
  textTextTransform,
  textFontStyle,
  textTextDecoration,
  textLineHeight,
  textLetterSpacing,
  textWordSpacing,
  textShadow,
  textColor,
  textHoverColor,
}: {
  items?: IconListItem[];
  layout?: "list" | "horizontal";
  applyLinkOn?: "full" | "text";
  listGap?: string;
  listAlign?: "flex-start" | "center" | "flex-end";
  dividerEnabled?: boolean;
  dividerStyle?: "solid" | "double" | "dotted" | "dashed";
  dividerThickness?: string;
  dividerWidth?: string;
  dividerColor?: string;
  iconColor?: string;
  iconHoverColor?: string;
  iconSize?: string;
  iconGap?: string;
  iconHorizontalAlign?: "flex-start" | "center" | "flex-end";
  iconVerticalAlign?: "flex-start" | "center" | "flex-end";
  iconVerticalOffset?: string;
  textFontFamily?: string;
  textFontSize?: string;
  textFontWeight?: string;
  textTextTransform?: CSSProperties["textTransform"];
  textFontStyle?: string;
  textTextDecoration?: string;
  textLineHeight?: string;
  textLetterSpacing?: string;
  textWordSpacing?: string;
  textShadow?: string;
  textColor?: string;
  textHoverColor?: string;
}) {
  const list = items ?? [];
  const isHorizontal = layout === "horizontal";

  const hasHoverOverride = iconHoverColor || textHoverColor;
  const hoverClassName = hasHoverOverride ? `iconlist-h${hashString(`${iconHoverColor ?? ""}|${textHoverColor ?? ""}`)}` : "";

  const rowStyle: CSSProperties = {
    display: "flex",
    alignItems: iconVerticalAlign || "center",
    gap: iconGap || undefined,
    color: "inherit",
    textDecoration: "none",
  };

  const iconWrapStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: iconVerticalAlign || "center",
    justifyContent: iconHorizontalAlign || "center",
    color: iconColor || undefined,
    width: iconSize || undefined,
    height: iconSize || undefined,
    position: "relative",
    top: iconVerticalOffset || undefined,
    flexShrink: 0,
  };

  const textStyle: CSSProperties = {
    color: textColor || undefined,
    fontFamily: textFontFamily && textFontFamily !== "inherit" ? textFontFamily : undefined,
    fontSize: textFontSize || undefined,
    fontWeight: textFontWeight || undefined,
    textTransform: textTextTransform && textTextTransform !== "none" ? textTextTransform : undefined,
    fontStyle: textFontStyle && textFontStyle !== "normal" ? textFontStyle : undefined,
    textDecoration: textTextDecoration && textTextDecoration !== "none" ? textTextDecoration : undefined,
    lineHeight: textLineHeight || undefined,
    letterSpacing: textLetterSpacing || undefined,
    wordSpacing: textWordSpacing || undefined,
    textShadow: textShadow || undefined,
  };

  const dividerStyleProps: CSSProperties = isHorizontal
    ? { alignSelf: "stretch", width: 0, borderLeft: `${dividerThickness || "1px"} ${dividerStyle || "solid"} ${dividerColor || "rgba(0,0,0,0.1)"}` }
    : { height: 0, width: dividerWidth || "100%", borderTop: `${dividerThickness || "1px"} ${dividerStyle || "solid"} ${dividerColor || "rgba(0,0,0,0.1)"}` };

  return (
    <>
      <GoogleFontLink family={textFontFamily} />
      {hasHoverOverride && (
        <style
          dangerouslySetInnerHTML={{
            __html: `.${hoverClassName}:hover .iconlist-icon{${iconHoverColor ? `color:${iconHoverColor} !important;` : ""}} .${hoverClassName}:hover .iconlist-text{${textHoverColor ? `color:${textHoverColor} !important;` : ""}}`,
          }}
        />
      )}
      <ul
        style={{
          display: "flex",
          flexDirection: isHorizontal ? "row" : "column",
          flexWrap: isHorizontal ? "wrap" : undefined,
          justifyContent: isHorizontal ? (`var(--exr-listAlign, ${listAlign || "flex-start"})` as CSSProperties["justifyContent"]) : undefined,
          alignItems: isHorizontal ? undefined : (`var(--exr-listAlign, ${listAlign || "flex-start"})` as CSSProperties["alignItems"]),
          gap: listGap || undefined,
          listStyle: "none",
          margin: 0,
          padding: 0,
        }}
      >
        {list.map((item, i) => {
          const RowTag: ElementType = applyLinkOn === "full" && item.href ? "a" : "div";
          return (
            <Fragment key={i}>
              <li style={{ margin: 0, padding: 0 }}>
                <RowTag
                  className={hoverClassName}
                  style={rowStyle}
                  {...(RowTag === "a" ? { href: item.href, target: item.openInNewTab ? "_blank" : undefined, rel: item.openInNewTab ? "noreferrer" : undefined } : {})}
                >
                  {item.icon && (
                    <span className="iconlist-icon" style={iconWrapStyle}>
                      <IconGlyph icon={item.icon} size={iconSize ? undefined : 16} style={iconSize ? { width: "100%", height: "100%" } : undefined} />
                    </span>
                  )}
                  {/* dangerouslySetInnerHTML, not plain JSX text — this
                      field is meant to accept markup like <br>/<b> (its own
                      admin field is a free-text input, not restricted to
                      plain text), same trust boundary as Faq's answer field
                      and RichText's html field elsewhere in this codebase.
                      Plain JSX text auto-escapes, which is what made typed
                      HTML show up as literal "<br><b>..." on the page
                      instead of being interpreted. */}
                  {applyLinkOn === "text" && item.href ? (
                    <a
                      href={item.href}
                      target={item.openInNewTab ? "_blank" : undefined}
                      rel={item.openInNewTab ? "noreferrer" : undefined}
                      className="iconlist-text"
                      style={{ ...textStyle, color: "inherit", textDecoration: "none" }}
                      dangerouslySetInnerHTML={{ __html: item.text || "" }}
                    />
                  ) : (
                    <span className="iconlist-text" style={textStyle} dangerouslySetInnerHTML={{ __html: item.text || "" }} />
                  )}
                </RowTag>
              </li>
              {dividerEnabled && i < list.length - 1 && <li aria-hidden style={dividerStyleProps} />}
            </Fragment>
          );
        })}
      </ul>
    </>
  );
}

function ServiceCardArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function ServiceCard({
  src,
  badgeText,
  title,
  description,
  features,
  readMoreLabel,
  readMoreUrl,
  bookNowLabel,
  bookNowUrl,
  featured,
  cardBackground,
  cardBorderColor,
  cardBorderWidth,
  cardBorderWidthTop,
  cardBorderWidthRight,
  cardBorderWidthBottom,
  cardBorderWidthLeft,
  cardBorderRadius,
  cardBoxShadow,
  cardPaddingTop,
  cardPaddingRight,
  cardPaddingBottom,
  cardPaddingLeft,
  featuredBorderColor,
  featuredBackground,
  imageHeight,
  imageBorderRadius,
  badgeBackground,
  badgeColor,
  badgeFontSize,
  titleColor,
  titleFontFamily,
  titleFontSize,
  titleFontWeight,
  titleTextTransform,
  titleFontStyle,
  titleTextDecoration,
  titleLineHeight,
  titleLetterSpacing,
  titleWordSpacing,
  descColor,
  descFontFamily,
  descFontSize,
  descFontWeight,
  descTextTransform,
  descFontStyle,
  descTextDecoration,
  descLineHeight,
  descLetterSpacing,
  descWordSpacing,
  featuresColor,
  featuresMarkerColor,
  featuresFontSize,
  featuresItemSpacing,
  footerBorderColor,
  readMoreColor,
  bookNowBackground,
  bookNowColor,
  bookNowHoverBackground,
}: {
  src?: string;
  badgeText?: string;
  title: string;
  description?: string;
  features?: string[];
  readMoreLabel?: string;
  readMoreUrl?: string;
  bookNowLabel?: string;
  bookNowUrl?: string;
  featured?: boolean;
  cardBackground?: string;
  cardBorderColor?: string;
  cardBorderWidth?: string;
  cardBorderWidthTop?: string;
  cardBorderWidthRight?: string;
  cardBorderWidthBottom?: string;
  cardBorderWidthLeft?: string;
  cardBorderRadius?: string;
  cardBoxShadow?: string;
  cardPaddingTop?: string;
  cardPaddingRight?: string;
  cardPaddingBottom?: string;
  cardPaddingLeft?: string;
  featuredBorderColor?: string;
  featuredBackground?: string;
  imageHeight?: string;
  imageBorderRadius?: string;
  badgeBackground?: string;
  badgeColor?: string;
  badgeFontSize?: string;
  titleColor?: string;
  titleFontFamily?: string;
  titleFontSize?: string;
  titleFontWeight?: string;
  titleTextTransform?: CSSProperties["textTransform"];
  titleFontStyle?: CSSProperties["fontStyle"];
  titleTextDecoration?: string;
  titleLineHeight?: string;
  titleLetterSpacing?: string;
  titleWordSpacing?: string;
  descColor?: string;
  descFontFamily?: string;
  descFontSize?: string;
  descFontWeight?: string;
  descTextTransform?: CSSProperties["textTransform"];
  descFontStyle?: CSSProperties["fontStyle"];
  descTextDecoration?: string;
  descLineHeight?: string;
  descLetterSpacing?: string;
  descWordSpacing?: string;
  featuresColor?: string;
  featuresMarkerColor?: string;
  featuresFontSize?: string;
  featuresItemSpacing?: string;
  footerBorderColor?: string;
  readMoreColor?: string;
  bookNowBackground?: string;
  bookNowColor?: string;
  bookNowHoverBackground?: string;
}) {
  const cardStyle: CSSProperties = {
    background: cardBackground || (featured ? featuredBackground : undefined) || "#ffffff",
    borderStyle: "solid",
    borderTopWidth: `var(--exr-cardBorderWidthTop, ${cardBorderWidthTop || cardBorderWidth || (featured ? "2px" : "1px")})`,
    borderRightWidth: `var(--exr-cardBorderWidthRight, ${cardBorderWidthRight || cardBorderWidth || (featured ? "2px" : "1px")})`,
    borderBottomWidth: `var(--exr-cardBorderWidthBottom, ${cardBorderWidthBottom || cardBorderWidth || (featured ? "2px" : "1px")})`,
    borderLeftWidth: `var(--exr-cardBorderWidthLeft, ${cardBorderWidthLeft || cardBorderWidth || (featured ? "2px" : "1px")})`,
    borderColor: featured ? featuredBorderColor || cardBorderColor || "#2563ff" : cardBorderColor || "#e5e5e5",
    borderRadius: `var(--exr-cardBorderRadius, ${cardBorderRadius || "16px"})`,
    boxShadow: `var(--exr-cardBoxShadow, ${cardBoxShadow || (featured ? "0 20px 40px rgba(0,0,0,0.14)" : "0 10px 24px rgba(0,0,0,0.06)")})`,
    overflow: "hidden",
    position: "relative",
  };

  // See ImageBox/IconBox's identical note: var(--exr-{key}, {desktop
  // value}) is what makes these responsive per breakpoint.
  const titleStyle: Record<string, string | undefined> = {
    color: `var(--exr-titleColor, ${titleColor || "#111111"})`,
    fontFamily: titleFontFamily && titleFontFamily !== "inherit" ? titleFontFamily : undefined,
    fontSize: `var(--exr-titleFontSize, ${titleFontSize || "16px"})`,
    fontWeight: `var(--exr-titleFontWeight, ${titleFontWeight || "inherit"})`,
    textTransform: `var(--exr-titleTextTransform, ${titleTextTransform && titleTextTransform !== "none" ? titleTextTransform : "none"})`,
    fontStyle: `var(--exr-titleFontStyle, ${titleFontStyle && titleFontStyle !== "normal" ? titleFontStyle : "normal"})`,
    textDecoration: `var(--exr-titleTextDecoration, ${titleTextDecoration && titleTextDecoration !== "none" ? titleTextDecoration : "none"})`,
    lineHeight: `var(--exr-titleLineHeight, ${titleLineHeight || "inherit"})`,
    letterSpacing: `var(--exr-titleLetterSpacing, ${titleLetterSpacing || "inherit"})`,
    wordSpacing: `var(--exr-titleWordSpacing, ${titleWordSpacing || "inherit"})`,
  };

  const descStyle: Record<string, string | undefined> = {
    marginTop: "6px",
    color: `var(--exr-descColor, ${descColor || "#6b7280"})`,
    fontFamily: descFontFamily && descFontFamily !== "inherit" ? descFontFamily : undefined,
    fontSize: `var(--exr-descFontSize, ${descFontSize || "13px"})`,
    fontWeight: `var(--exr-descFontWeight, ${descFontWeight || "inherit"})`,
    textTransform: `var(--exr-descTextTransform, ${descTextTransform && descTextTransform !== "none" ? descTextTransform : "none"})`,
    fontStyle: `var(--exr-descFontStyle, ${descFontStyle && descFontStyle !== "normal" ? descFontStyle : "normal"})`,
    textDecoration: `var(--exr-descTextDecoration, ${descTextDecoration && descTextDecoration !== "none" ? descTextDecoration : "none"})`,
    lineHeight: `var(--exr-descLineHeight, ${descLineHeight || "inherit"})`,
    letterSpacing: `var(--exr-descLetterSpacing, ${descLetterSpacing || "inherit"})`,
    wordSpacing: `var(--exr-descWordSpacing, ${descWordSpacing || "inherit"})`,
  };

  const hoverClassName = bookNowHoverBackground ? `svccard-h${hashString(bookNowHoverBackground)}` : "";

  return (
    <div style={cardStyle}>
      {bookNowHoverBackground && (
        <style dangerouslySetInnerHTML={{ __html: `.${hoverClassName}:hover{background:${bookNowHoverBackground} !important;}` }} />
      )}
      <GoogleFontLink family={titleFontFamily} />
      <GoogleFontLink family={descFontFamily} />
      {src && (
        <div style={{ position: "relative" }}>
          {/* Admin-authored, arbitrary aspect ratio — same reasoning as ImageBox's own <img>. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveImageUrl(src)}
            alt={title}
            style={{
              display: "block",
              width: "100%",
              height: imageHeight || "180px",
              objectFit: "cover",
              borderTopLeftRadius: imageBorderRadius || undefined,
              borderTopRightRadius: imageBorderRadius || undefined,
            }}
          />
          {badgeText && (
            <span
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                borderRadius: "9999px",
                padding: "4px 12px",
                fontSize: badgeFontSize || "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                background: badgeBackground || "#ffffff",
                color: badgeColor || "#111111",
              }}
            >
              {badgeText}
            </span>
          )}
        </div>
      )}
      <div style={{ padding: `${cardPaddingTop || "24px"} ${cardPaddingRight || "24px"} ${cardPaddingBottom || "24px"} ${cardPaddingLeft || "24px"}` }}>
        <h3 style={titleStyle}>{title}</h3>
        {description && <p style={descStyle}>{description}</p>}
        {features && features.length > 0 && (
          <ul style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: featuresItemSpacing || "8px" }}>
            {features.map((feature, i) => (
              <li key={i} style={{ display: "flex", alignItems: "center", gap: "8px", color: featuresColor || "#374151", fontSize: featuresFontSize || "13px", fontWeight: 600 }}>
                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: featuresMarkerColor || "#2563ff", flexShrink: 0 }} />
                {feature}
              </li>
            ))}
          </ul>
        )}
        <div
          style={{
            marginTop: "18px",
            paddingTop: "14px",
            borderTop: `1px solid ${footerBorderColor || "#e5e5e5"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {readMoreUrl ? (
            <a href={readMoreUrl} style={{ fontSize: "13px", fontWeight: 600, color: readMoreColor || "#9ca3af" }}>
              {readMoreLabel}
            </a>
          ) : (
            <span style={{ fontSize: "13px", fontWeight: 600, color: readMoreColor || "#9ca3af" }}>{readMoreLabel}</span>
          )}
          <a
            href={bookNowUrl || "#"}
            className={hoverClassName}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              borderRadius: "9999px",
              padding: "8px 8px 8px 16px",
              fontSize: "13px",
              fontWeight: 600,
              background: bookNowBackground || (featured ? "#2563ff" : "#e5e7eb"),
              color: bookNowColor || (featured ? "#ffffff" : "#4b5563"),
              transition: "background-color 0.15s ease",
            }}
          >
            {bookNowLabel}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "26px",
                height: "26px",
                borderRadius: "9999px",
                background: featured ? "rgba(255,255,255,0.25)" : "#ffffff",
              }}
            >
              <ServiceCardArrowIcon />
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}

const COUNTER_VALUE_PATTERN = /^(\D*)([\d,]+(?:\.\d+)?)(\D*)$/;

function Counter({
  value,
  label,
  countUp,
  countDuration,
  valueColor,
  valueFontFamily,
  valueFontSize,
  valueFontWeight,
  valueLineHeight,
  valueLetterSpacing,
  valueTextTransform,
  labelColor,
  labelFontFamily,
  labelFontSize,
  labelFontWeight,
  labelLineHeight,
  labelLetterSpacing,
  labelTextTransform,
  counterBackground,
  counterBorderStyle,
  counterBorderWidth,
  counterBorderWidthTop,
  counterBorderWidthRight,
  counterBorderWidthBottom,
  counterBorderWidthLeft,
  counterBorderColor,
  counterBorderRadius,
  counterBoxShadow,
  counterPaddingTop,
  counterPaddingRight,
  counterPaddingBottom,
  counterPaddingLeft,
}: {
  value: string;
  label: string;
  countUp?: boolean;
  countDuration?: number;
  valueColor?: string;
  valueFontFamily?: string;
  valueFontSize?: string;
  valueFontWeight?: string;
  valueLineHeight?: string;
  valueLetterSpacing?: string;
  valueTextTransform?: CSSProperties["textTransform"];
  labelColor?: string;
  labelFontFamily?: string;
  labelFontSize?: string;
  labelFontWeight?: string;
  labelLineHeight?: string;
  labelLetterSpacing?: string;
  labelTextTransform?: CSSProperties["textTransform"];
  counterBackground?: string;
  counterBorderStyle?: "none" | "solid" | "dashed" | "dotted" | "double";
  counterBorderWidth?: string;
  counterBorderWidthTop?: string;
  counterBorderWidthRight?: string;
  counterBorderWidthBottom?: string;
  counterBorderWidthLeft?: string;
  counterBorderColor?: string;
  counterBorderRadius?: string;
  counterBoxShadow?: string;
  counterPaddingTop?: string;
  counterPaddingRight?: string;
  counterPaddingBottom?: string;
  counterPaddingLeft?: string;
}) {
  const match = countUp ? value.match(COUNTER_VALUE_PATTERN) : null;
  const valueStyle: CSSProperties = {
    fontFamily: valueFontFamily && valueFontFamily !== "inherit" ? valueFontFamily : undefined,
    fontSize: `var(--exr-valueFontSize, ${valueFontSize || "2.25rem"})`,
    fontWeight: `var(--exr-valueFontWeight, ${valueFontWeight || "800"})` as CSSProperties["fontWeight"],
    lineHeight: valueLineHeight ? `var(--exr-valueLineHeight, ${valueLineHeight})` : undefined,
    letterSpacing: valueLetterSpacing ? `var(--exr-valueLetterSpacing, ${valueLetterSpacing})` : undefined,
    textTransform: `var(--exr-valueTextTransform, ${valueTextTransform || "none"})` as CSSProperties["textTransform"],
    color: `var(--exr-valueColor, ${valueColor || "#2563FF"})`,
  };
  return (
    <div
      className="text-center"
      style={{
        background: `var(--exr-counterBackground, ${counterBackground || "transparent"})`,
        borderStyle: counterBorderStyle && counterBorderStyle !== "none" ? counterBorderStyle : undefined,
        borderTopWidth: counterBorderStyle && counterBorderStyle !== "none" ? `var(--exr-counterBorderWidthTop, ${counterBorderWidthTop || counterBorderWidth || "1px"})` : undefined,
        borderRightWidth: counterBorderStyle && counterBorderStyle !== "none" ? `var(--exr-counterBorderWidthRight, ${counterBorderWidthRight || counterBorderWidth || "1px"})` : undefined,
        borderBottomWidth: counterBorderStyle && counterBorderStyle !== "none" ? `var(--exr-counterBorderWidthBottom, ${counterBorderWidthBottom || counterBorderWidth || "1px"})` : undefined,
        borderLeftWidth: counterBorderStyle && counterBorderStyle !== "none" ? `var(--exr-counterBorderWidthLeft, ${counterBorderWidthLeft || counterBorderWidth || "1px"})` : undefined,
        borderColor: `var(--exr-counterBorderColor, ${counterBorderColor || "transparent"})`,
        borderRadius: counterBorderRadius ? `var(--exr-counterBorderRadius, ${counterBorderRadius})` : undefined,
        boxShadow: counterBoxShadow ? `var(--exr-counterBoxShadow, ${counterBoxShadow})` : undefined,
        paddingTop: counterPaddingTop ? `var(--exr-counterPaddingTop, ${counterPaddingTop})` : undefined,
        paddingRight: counterPaddingRight ? `var(--exr-counterPaddingRight, ${counterPaddingRight})` : undefined,
        paddingBottom: counterPaddingBottom ? `var(--exr-counterPaddingBottom, ${counterPaddingBottom})` : undefined,
        paddingLeft: counterPaddingLeft ? `var(--exr-counterPaddingLeft, ${counterPaddingLeft})` : undefined,
      }}
    >
      {match ? (
        <CounterValue prefix={match[1]} target={Number(match[2].replace(/,/g, ""))} suffix={match[3]} duration={countDuration ?? 1.5} style={valueStyle} />
      ) : (
        <div style={valueStyle}>{value}</div>
      )}
      <div
        className="mt-1"
        style={{
          fontFamily: labelFontFamily && labelFontFamily !== "inherit" ? labelFontFamily : undefined,
          fontSize: `var(--exr-labelFontSize, ${labelFontSize || "14px"})`,
          fontWeight: `var(--exr-labelFontWeight, ${labelFontWeight || "400"})` as CSSProperties["fontWeight"],
          lineHeight: labelLineHeight ? `var(--exr-labelLineHeight, ${labelLineHeight})` : undefined,
          letterSpacing: labelLetterSpacing ? `var(--exr-labelLetterSpacing, ${labelLetterSpacing})` : undefined,
          textTransform: `var(--exr-labelTextTransform, ${labelTextTransform || "none"})` as CSSProperties["textTransform"],
          color: `var(--exr-labelColor, ${labelColor || "rgba(255,255,255,0.6)"})`,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function Testimonial({
  quote,
  name,
  rating,
  quoteColor,
  quoteFontFamily,
  quoteFontSize,
  quoteFontWeight,
  quoteLineHeight,
  quoteLetterSpacing,
  quoteTextTransform,
  authorNameColor,
  authorNameFontFamily,
  authorNameFontSize,
  authorNameFontWeight,
  ratingColor,
  ratingInactiveColor,
  cardBackground,
  cardBorderStyle,
  cardBorderWidth,
  cardBorderWidthTop,
  cardBorderWidthRight,
  cardBorderWidthBottom,
  cardBorderWidthLeft,
  cardBorderColor,
  cardBorderRadius,
  cardBoxShadow,
  cardPaddingTop,
  cardPaddingRight,
  cardPaddingBottom,
  cardPaddingLeft,
}: {
  quote: string;
  name: string;
  rating: number;
  quoteColor?: string;
  quoteFontFamily?: string;
  quoteFontSize?: string;
  quoteFontWeight?: string;
  quoteLineHeight?: string;
  quoteLetterSpacing?: string;
  quoteTextTransform?: CSSProperties["textTransform"];
  authorNameColor?: string;
  authorNameFontFamily?: string;
  authorNameFontSize?: string;
  authorNameFontWeight?: string;
  ratingColor?: string;
  ratingInactiveColor?: string;
  cardBackground?: string;
  cardBorderStyle?: "none" | "solid" | "dashed" | "dotted" | "double";
  cardBorderWidth?: string;
  cardBorderWidthTop?: string;
  cardBorderWidthRight?: string;
  cardBorderWidthBottom?: string;
  cardBorderWidthLeft?: string;
  cardBorderColor?: string;
  cardBorderRadius?: string;
  cardBoxShadow?: string;
  cardPaddingTop?: string;
  cardPaddingRight?: string;
  cardPaddingBottom?: string;
  cardPaddingLeft?: string;
}) {
  return (
    <div
      className="mx-auto max-w-xl text-center"
      style={{
        background: `var(--exr-cardBackground, ${cardBackground || "#161616"})`,
        borderStyle: cardBorderStyle && cardBorderStyle !== "none" ? cardBorderStyle : undefined,
        borderTopWidth: cardBorderStyle && cardBorderStyle !== "none" ? `var(--exr-cardBorderWidthTop, ${cardBorderWidthTop || cardBorderWidth || "1px"})` : undefined,
        borderRightWidth: cardBorderStyle && cardBorderStyle !== "none" ? `var(--exr-cardBorderWidthRight, ${cardBorderWidthRight || cardBorderWidth || "1px"})` : undefined,
        borderBottomWidth: cardBorderStyle && cardBorderStyle !== "none" ? `var(--exr-cardBorderWidthBottom, ${cardBorderWidthBottom || cardBorderWidth || "1px"})` : undefined,
        borderLeftWidth: cardBorderStyle && cardBorderStyle !== "none" ? `var(--exr-cardBorderWidthLeft, ${cardBorderWidthLeft || cardBorderWidth || "1px"})` : undefined,
        borderColor: `var(--exr-cardBorderColor, ${cardBorderColor || "transparent"})`,
        borderRadius: `var(--exr-cardBorderRadius, ${cardBorderRadius || "16px"})`,
        boxShadow: cardBoxShadow ? `var(--exr-cardBoxShadow, ${cardBoxShadow})` : undefined,
        paddingTop: `var(--exr-cardPaddingTop, ${cardPaddingTop || "24px"})`,
        paddingRight: `var(--exr-cardPaddingRight, ${cardPaddingRight || "24px"})`,
        paddingBottom: `var(--exr-cardPaddingBottom, ${cardPaddingBottom || "24px"})`,
        paddingLeft: `var(--exr-cardPaddingLeft, ${cardPaddingLeft || "24px"})`,
      }}
    >
      <div className="flex justify-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            style={{ color: i < rating ? `var(--exr-ratingColor, ${ratingColor || "#2563FF"})` : `var(--exr-ratingInactiveColor, ${ratingInactiveColor || "rgba(255,255,255,0.15)"})` }}
          >
            <IconStar className="h-4 w-4" />
          </span>
        ))}
      </div>
      <p
        className="mt-4"
        style={{
          fontFamily: quoteFontFamily && quoteFontFamily !== "inherit" ? quoteFontFamily : undefined,
          fontSize: `var(--exr-quoteFontSize, ${quoteFontSize || "16px"})`,
          fontWeight: `var(--exr-quoteFontWeight, ${quoteFontWeight || "400"})` as CSSProperties["fontWeight"],
          lineHeight: quoteLineHeight ? `var(--exr-quoteLineHeight, ${quoteLineHeight})` : undefined,
          letterSpacing: quoteLetterSpacing ? `var(--exr-quoteLetterSpacing, ${quoteLetterSpacing})` : undefined,
          textTransform: `var(--exr-quoteTextTransform, ${quoteTextTransform || "none"})` as CSSProperties["textTransform"],
          color: `var(--exr-quoteColor, ${quoteColor || "rgba(255,255,255,0.8)"})`,
        }}
      >
        &ldquo;{quote}&rdquo;
      </p>
      <p
        className="mt-3"
        style={{
          fontFamily: authorNameFontFamily && authorNameFontFamily !== "inherit" ? authorNameFontFamily : undefined,
          fontSize: `var(--exr-authorNameFontSize, ${authorNameFontSize || "14px"})`,
          fontWeight: `var(--exr-authorNameFontWeight, ${authorNameFontWeight || "600"})` as CSSProperties["fontWeight"],
          color: `var(--exr-authorNameColor, ${authorNameColor || "inherit"})`,
        }}
      >
        {name}
      </p>
    </div>
  );
}

function ImageBox({
  src,
  title,
  description,
  linkUrl,
  titleTag,
  imagePosition,
  align,
  imageSpacing,
  contentSpacing,
  imageWidth,
  imageHeight,
  borderStyle,
  borderWidth,
  borderWidthTop,
  borderWidthRight,
  borderWidthBottom,
  borderWidthLeft,
  borderColor,
  borderRadius,
  borderRadiusTopLeft,
  borderRadiusTopRight,
  borderRadiusBottomRight,
  borderRadiusBottomLeft,
  boxShadow,
  imageFilter,
  imageOpacity,
  titleColor,
  titleHoverColor,
  titleFontFamily,
  titleFontSize,
  titleFontWeight,
  titleTextTransform,
  titleFontStyle,
  titleTextDecoration,
  titleLineHeight,
  titleLetterSpacing,
  titleWordSpacing,
  titleTextStrokeWidth,
  titleTextStrokeColor,
  titleTextShadow,
  descColor,
  descFontFamily,
  descFontSize,
  descFontWeight,
  descTextTransform,
  descFontStyle,
  descTextDecoration,
  descLineHeight,
  descLetterSpacing,
  descWordSpacing,
  descTextShadow,
}: {
  src?: string;
  title: string;
  description?: string;
  linkUrl?: string;
  titleTag?: string;
  imagePosition?: "left" | "top" | "right";
  align?: "left" | "center" | "right" | "justify";
  imageSpacing?: string;
  contentSpacing?: string;
  imageWidth?: string;
  imageHeight?: string;
  borderStyle?: "none" | "solid" | "dashed" | "dotted";
  borderWidth?: string;
  borderWidthTop?: string;
  borderWidthRight?: string;
  borderWidthBottom?: string;
  borderWidthLeft?: string;
  borderColor?: string;
  borderRadius?: string;
  borderRadiusTopLeft?: string;
  borderRadiusTopRight?: string;
  borderRadiusBottomRight?: string;
  borderRadiusBottomLeft?: string;
  boxShadow?: string;
  imageFilter?: string;
  imageOpacity?: string;
  titleColor?: string;
  titleHoverColor?: string;
  titleFontFamily?: string;
  titleFontSize?: string;
  titleFontWeight?: string;
  titleTextTransform?: CSSProperties["textTransform"];
  titleFontStyle?: CSSProperties["fontStyle"];
  titleTextDecoration?: string;
  titleLineHeight?: string;
  titleLetterSpacing?: string;
  titleWordSpacing?: string;
  titleTextStrokeWidth?: string;
  titleTextStrokeColor?: string;
  titleTextShadow?: string;
  descColor?: string;
  descFontFamily?: string;
  descFontSize?: string;
  descFontWeight?: string;
  descTextTransform?: CSSProperties["textTransform"];
  descFontStyle?: CSSProperties["fontStyle"];
  descTextDecoration?: string;
  descLineHeight?: string;
  descLetterSpacing?: string;
  descWordSpacing?: string;
  descTextShadow?: string;
}) {
  const TitleTag = (titleTag || "h3") as ElementType;
  const hasStroke = titleTextStrokeWidth && titleTextStrokeWidth !== "0px";

  const wrapperStyle: CSSProperties = {
    display: "flex",
    flexDirection: imagePosition === "top" ? "column" : imagePosition === "right" ? "row-reverse" : "row",
    alignItems: align === "center" ? "center" : align === "right" ? "flex-end" : align === "justify" ? "stretch" : "flex-start",
    textAlign: align === "justify" ? "left" : align || "left",
    gap: imageSpacing || undefined,
  };

  const imageStyle: CSSProperties = {
    width: imageWidth || undefined,
    height: imageHeight || undefined,
    objectFit: "cover",
    flexShrink: 0,
    borderStyle: borderStyle && borderStyle !== "none" ? borderStyle : undefined,
    borderTopWidth: borderStyle && borderStyle !== "none" ? (borderWidthTop || borderWidth || "1px") : undefined,
    borderRightWidth: borderStyle && borderStyle !== "none" ? (borderWidthRight || borderWidth || "1px") : undefined,
    borderBottomWidth: borderStyle && borderStyle !== "none" ? (borderWidthBottom || borderWidth || "1px") : undefined,
    borderLeftWidth: borderStyle && borderStyle !== "none" ? (borderWidthLeft || borderWidth || "1px") : undefined,
    borderColor: borderStyle && borderStyle !== "none" ? borderColor || undefined : undefined,
    borderTopLeftRadius: borderRadiusTopLeft || borderRadius || undefined,
    borderTopRightRadius: borderRadiusTopRight || borderRadius || undefined,
    borderBottomRightRadius: borderRadiusBottomRight || borderRadius || undefined,
    borderBottomLeftRadius: borderRadiusBottomLeft || borderRadius || undefined,
    boxShadow: boxShadow || undefined,
    filter: imageFilter || undefined,
    opacity: imageOpacity || undefined,
  };

  // Title/Description read through var(--exr-{key}, {desktop value}) so the
  // PropertyPanel's per-breakpoint override (see binding() in
  // apps/admin/.../PropertyPanel.tsx) actually reaches these elements —
  // custom properties inherit regardless of how deep in the wrapper's
  // markup they sit.
  const titleStyle: Record<string, string | undefined> = {
    color: `var(--exr-titleColor, ${titleColor || "inherit"})`,
    fontFamily: titleFontFamily && titleFontFamily !== "inherit" ? titleFontFamily : undefined,
    fontSize: `var(--exr-titleFontSize, ${titleFontSize || "inherit"})`,
    fontWeight: `var(--exr-titleFontWeight, ${titleFontWeight || "inherit"})`,
    textTransform: `var(--exr-titleTextTransform, ${titleTextTransform && titleTextTransform !== "none" ? titleTextTransform : "none"})`,
    fontStyle: `var(--exr-titleFontStyle, ${titleFontStyle && titleFontStyle !== "normal" ? titleFontStyle : "normal"})`,
    textDecoration: `var(--exr-titleTextDecoration, ${titleTextDecoration && titleTextDecoration !== "none" ? titleTextDecoration : "none"})`,
    lineHeight: `var(--exr-titleLineHeight, ${titleLineHeight || "inherit"})`,
    letterSpacing: `var(--exr-titleLetterSpacing, ${titleLetterSpacing || "inherit"})`,
    wordSpacing: `var(--exr-titleWordSpacing, ${titleWordSpacing || "inherit"})`,
    textShadow: `var(--exr-titleTextShadow, ${titleTextShadow || "none"})`,
    marginBottom: contentSpacing || undefined,
    ...(hasStroke ? { WebkitTextStroke: `${titleTextStrokeWidth} ${titleTextStrokeColor || "currentColor"}` } : {}),
  };

  const descStyle: Record<string, string | undefined> = {
    color: `var(--exr-descColor, ${descColor || "inherit"})`,
    fontFamily: descFontFamily && descFontFamily !== "inherit" ? descFontFamily : undefined,
    fontSize: `var(--exr-descFontSize, ${descFontSize || "inherit"})`,
    fontWeight: `var(--exr-descFontWeight, ${descFontWeight || "inherit"})`,
    textTransform: `var(--exr-descTextTransform, ${descTextTransform && descTextTransform !== "none" ? descTextTransform : "none"})`,
    fontStyle: `var(--exr-descFontStyle, ${descFontStyle && descFontStyle !== "normal" ? descFontStyle : "normal"})`,
    textDecoration: `var(--exr-descTextDecoration, ${descTextDecoration && descTextDecoration !== "none" ? descTextDecoration : "none"})`,
    lineHeight: `var(--exr-descLineHeight, ${descLineHeight || "inherit"})`,
    letterSpacing: `var(--exr-descLetterSpacing, ${descLetterSpacing || "inherit"})`,
    wordSpacing: `var(--exr-descWordSpacing, ${descWordSpacing || "inherit"})`,
    textShadow: `var(--exr-descTextShadow, ${descTextShadow || "none"})`,
  };

  const hoverClassName = titleHoverColor ? `imgbox-h${hashString(titleHoverColor)}` : "";

  const box = (
    <div className={hoverClassName} style={wrapperStyle}>
      {src && (
        // Admin-authored, arbitrary aspect ratio (imageWidth/imageHeight are
        // free-form Style-tab values) — same reasoning as SliderBlock/Image's
        // own <img>, next/image needs a fixed intrinsic size this can't promise.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={resolveImageUrl(src)} alt={title || ""} style={imageStyle} />
      )}
      <div>
        <TitleTag className="imgbox-title" style={titleStyle}>
          {title}
        </TitleTag>
        {description && <p style={descStyle}>{description}</p>}
      </div>
    </div>
  );

  return (
    <>
      <GoogleFontLink family={titleFontFamily} />
      <GoogleFontLink family={descFontFamily} />
      {titleHoverColor && (
        <style dangerouslySetInnerHTML={{ __html: `.${hoverClassName}:hover .imgbox-title{color:${titleHoverColor} !important;}` }} />
      )}
      {linkUrl ? (
        <a href={linkUrl} className="block no-underline">
          {box}
        </a>
      ) : (
        box
      )}
    </>
  );
}

function AccordionItem({
  question,
  answer,
  questionColor,
  questionHoverColor,
  questionFontFamily,
  questionFontSize,
  questionFontWeight,
  questionLineHeight,
  questionLetterSpacing,
  questionTextTransform,
  answerColor,
  answerFontFamily,
  answerFontSize,
  answerFontWeight,
  answerLineHeight,
  answerLetterSpacing,
  answerTextTransform,
  cardBackground,
  cardBorderStyle,
  cardBorderWidth,
  cardBorderWidthTop,
  cardBorderWidthRight,
  cardBorderWidthBottom,
  cardBorderWidthLeft,
  cardBorderColor,
  cardBorderRadius,
  cardBoxShadow,
  cardPaddingTop,
  cardPaddingRight,
  cardPaddingBottom,
  cardPaddingLeft,
}: {
  question: string;
  answer: string;
  questionColor?: string;
  questionHoverColor?: string;
  questionFontFamily?: string;
  questionFontSize?: string;
  questionFontWeight?: string;
  questionLineHeight?: string;
  questionLetterSpacing?: string;
  questionTextTransform?: CSSProperties["textTransform"];
  answerColor?: string;
  answerFontFamily?: string;
  answerFontSize?: string;
  answerFontWeight?: string;
  answerLineHeight?: string;
  answerLetterSpacing?: string;
  answerTextTransform?: CSSProperties["textTransform"];
  cardBackground?: string;
  cardBorderStyle?: "none" | "solid" | "dashed" | "dotted" | "double";
  cardBorderWidth?: string;
  cardBorderWidthTop?: string;
  cardBorderWidthRight?: string;
  cardBorderWidthBottom?: string;
  cardBorderWidthLeft?: string;
  cardBorderColor?: string;
  cardBorderRadius?: string;
  cardBoxShadow?: string;
  cardPaddingTop?: string;
  cardPaddingRight?: string;
  cardPaddingBottom?: string;
  cardPaddingLeft?: string;
}) {
  const hoverClassName = questionHoverColor ? `exr-accitem-h${hashString(questionHoverColor)}` : "";
  return (
    <details
      className={`group mx-auto max-w-3xl cursor-pointer ${hoverClassName}`}
      style={{
        background: `var(--exr-cardBackground, ${cardBackground || "#161616"})`,
        borderStyle: cardBorderStyle && cardBorderStyle !== "none" ? cardBorderStyle : undefined,
        borderTopWidth: cardBorderStyle && cardBorderStyle !== "none" ? `var(--exr-cardBorderWidthTop, ${cardBorderWidthTop || cardBorderWidth || "1px"})` : undefined,
        borderRightWidth: cardBorderStyle && cardBorderStyle !== "none" ? `var(--exr-cardBorderWidthRight, ${cardBorderWidthRight || cardBorderWidth || "1px"})` : undefined,
        borderBottomWidth: cardBorderStyle && cardBorderStyle !== "none" ? `var(--exr-cardBorderWidthBottom, ${cardBorderWidthBottom || cardBorderWidth || "1px"})` : undefined,
        borderLeftWidth: cardBorderStyle && cardBorderStyle !== "none" ? `var(--exr-cardBorderWidthLeft, ${cardBorderWidthLeft || cardBorderWidth || "1px"})` : undefined,
        borderColor: cardBorderStyle && cardBorderStyle !== "none" ? cardBorderColor : undefined,
        borderRadius: `var(--exr-cardBorderRadius, ${cardBorderRadius || "12px"})`,
        boxShadow: cardBoxShadow ? `var(--exr-cardBoxShadow, ${cardBoxShadow})` : undefined,
        paddingTop: `var(--exr-cardPaddingTop, ${cardPaddingTop || "16px"})`,
        paddingRight: `var(--exr-cardPaddingRight, ${cardPaddingRight || "24px"})`,
        paddingBottom: `var(--exr-cardPaddingBottom, ${cardPaddingBottom || "16px"})`,
        paddingLeft: `var(--exr-cardPaddingLeft, ${cardPaddingLeft || "24px"})`,
      }}
    >
      {hoverClassName && (
        <style dangerouslySetInnerHTML={{ __html: `.${hoverClassName} summary:hover{color:var(--exr-questionHoverColor, ${questionHoverColor}) !important;}` }} />
      )}
      <summary
        className="list-none focus:outline-none"
        style={{
          fontFamily: questionFontFamily && questionFontFamily !== "inherit" ? questionFontFamily : undefined,
          fontSize: `var(--exr-questionFontSize, ${questionFontSize || "14px"})`,
          fontWeight: `var(--exr-questionFontWeight, ${questionFontWeight || "600"})` as CSSProperties["fontWeight"],
          lineHeight: questionLineHeight ? `var(--exr-questionLineHeight, ${questionLineHeight})` : undefined,
          letterSpacing: questionLetterSpacing ? `var(--exr-questionLetterSpacing, ${questionLetterSpacing})` : undefined,
          textTransform: `var(--exr-questionTextTransform, ${questionTextTransform || "none"})` as CSSProperties["textTransform"],
          color: `var(--exr-questionColor, ${questionColor || "inherit"})`,
        }}
      >
        {question}
      </summary>
      <p
        className="mt-3"
        style={{
          fontFamily: answerFontFamily && answerFontFamily !== "inherit" ? answerFontFamily : undefined,
          fontSize: `var(--exr-answerFontSize, ${answerFontSize || "14px"})`,
          fontWeight: `var(--exr-answerFontWeight, ${answerFontWeight || "400"})` as CSSProperties["fontWeight"],
          lineHeight: answerLineHeight ? `var(--exr-answerLineHeight, ${answerLineHeight})` : undefined,
          letterSpacing: answerLetterSpacing ? `var(--exr-answerLetterSpacing, ${answerLetterSpacing})` : undefined,
          textTransform: `var(--exr-answerTextTransform, ${answerTextTransform || "none"})` as CSSProperties["textTransform"],
          color: `var(--exr-answerColor, ${answerColor || "rgba(255,255,255,0.7)"})`,
        }}
      >
        {answer}
      </p>
    </details>
  );
}

function GoogleMaps({
  address,
  height,
  zoom,
  grayscale,
  borderRadius,
  borderRadiusTopLeft,
  borderRadiusTopRight,
  borderRadiusBottomRight,
  borderRadiusBottomLeft,
}: {
  address: string;
  height?: string;
  zoom?: string;
  grayscale?: boolean;
  borderRadius?: string;
  borderRadiusTopLeft?: string;
  borderRadiusTopRight?: string;
  borderRadiusBottomRight?: string;
  borderRadiusBottomLeft?: string;
}) {
  return (
    <div
      className="mx-auto w-full max-w-4xl overflow-hidden"
      style={{
        height: height ?? "400px",
        borderTopLeftRadius: borderRadiusTopLeft || borderRadius || "12px",
        borderTopRightRadius: borderRadiusTopRight || borderRadius || "12px",
        borderBottomRightRadius: borderRadiusBottomRight || borderRadius || "12px",
        borderBottomLeftRadius: borderRadiusBottomLeft || borderRadius || "12px",
        filter: grayscale ? "grayscale(1)" : undefined,
      }}
    >
      <iframe
        title="Map"
        src={`https://www.google.com/maps?q=${encodeURIComponent(address)}&z=${zoom || "14"}&output=embed`}
        className="h-full w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

// Every named platform maps to a hand-drawn icon component in ./home/icons —
// "custom" has no entry here on purpose; it's rendered from the item's own
// customIcon SVG markup instead (see the `links` computation below).
const SOCIAL_ICON_COMPONENTS: Partial<Record<SocialLink["platform"], (props: { className?: string }) => React.JSX.Element>> = {
  facebook: IconFacebook,
  instagram: IconInstagram,
  twitter: IconTwitter,
  youtube: IconYoutube,
  linkedin: IconLinkedin,
  tiktok: IconTiktok,
  whatsapp: IconWhatsapp,
  pinterest: IconPinterest,
};

function SocialIcons({
  socials,
  facebookUrl,
  instagramUrl,
  twitterUrl,
  youtubeUrl,
  iconColor,
  iconHoverColor,
  iconBackground,
  iconHoverBackground,
  iconSize,
  iconGap,
  iconBorderStyle,
  iconBorderWidth,
  iconBorderWidthTop,
  iconBorderWidthRight,
  iconBorderWidthBottom,
  iconBorderWidthLeft,
  iconBorderColor,
  iconHoverBorderColor,
  iconBorderRadius,
  iconBoxShadow,
}: {
  socials?: SocialLink[];
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  youtubeUrl?: string;
  iconColor?: string;
  iconHoverColor?: string;
  iconBackground?: string;
  iconHoverBackground?: string;
  iconSize?: string;
  iconGap?: string;
  iconBorderStyle?: "none" | "solid" | "dashed" | "dotted" | "double";
  iconBorderWidth?: string;
  iconBorderWidthTop?: string;
  iconBorderWidthRight?: string;
  iconBorderWidthBottom?: string;
  iconBorderWidthLeft?: string;
  iconBorderColor?: string;
  iconHoverBorderColor?: string;
  iconBorderRadius?: string;
  iconBoxShadow?: string;
}) {
  // `socials` (the dynamic list) supersedes the 4 legacy fixed fields the
  // moment it has anything in it — those stay only as a fallback so a page
  // saved before `socials` existed still shows its original 4 icons with no
  // migration step required.
  const legacySocials: SocialLink[] = [];
  if (facebookUrl) legacySocials.push({ platform: "facebook", url: facebookUrl });
  if (instagramUrl) legacySocials.push({ platform: "instagram", url: instagramUrl });
  if (twitterUrl) legacySocials.push({ platform: "twitter", url: twitterUrl });
  if (youtubeUrl) legacySocials.push({ platform: "youtube", url: youtubeUrl });
  const effectiveSocials: SocialLink[] = socials && socials.length > 0 ? socials : legacySocials;

  const links = effectiveSocials
    .map((item) => ({
      url: item.url,
      label: item.platform,
      Icon: SOCIAL_ICON_COMPONENTS[item.platform],
      customIcon: item.platform === "custom" ? item.customIcon : undefined,
    }))
    // Only a real, resolvable icon (a named platform's component, or actual
    // custom SVG markup) AND a non-empty URL make it a real, clickable link —
    // an item mid-setup (e.g. platform picked, URL not typed yet) just
    // doesn't render rather than showing a broken/empty icon.
    .filter((l): l is typeof l & { url: string } => Boolean(l.url) && Boolean(l.Icon || l.customIcon));

  if (links.length === 0) return null;

  const hasHoverOverride = iconHoverColor || iconHoverBackground || iconHoverBorderColor;
  const hoverClassName = hasHoverOverride ? `exr-social-h${hashString(`${iconHoverColor ?? ""}|${iconHoverBackground ?? ""}|${iconHoverBorderColor ?? ""}`)}` : "";
  const size = iconSize || "36px";

  return (
    <div className="flex justify-center" style={{ gap: `var(--exr-iconGap, ${iconGap || "12px"})` }}>
      {hasHoverOverride && (
        <style
          dangerouslySetInnerHTML={{
            __html: `.${hoverClassName}:hover{${[
              iconHoverColor && `color:var(--exr-iconHoverColor, ${iconHoverColor}) !important;`,
              iconHoverBackground && `background:var(--exr-iconHoverBackground, ${iconHoverBackground}) !important;`,
              iconHoverBorderColor && `border-color:var(--exr-iconHoverBorderColor, ${iconHoverBorderColor}) !important;`,
            ]
              .filter(Boolean)
              .join("")}}`,
          }}
        />
      )}
      {links.map(({ url, Icon: IconCmp, label, customIcon }, i) => (
        <a
          key={`${label}-${i}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className={["flex items-center justify-center transition-colors", hoverClassName].filter(Boolean).join(" ")}
          style={{
            width: `var(--exr-iconSize, ${size})`,
            height: `var(--exr-iconSize, ${size})`,
            color: `var(--exr-iconColor, ${iconColor || "rgba(255,255,255,0.7)"})`,
            background: `var(--exr-iconBackground, ${iconBackground || "transparent"})`,
            borderStyle: iconBorderStyle && iconBorderStyle !== "none" ? iconBorderStyle : undefined,
            borderTopWidth: iconBorderStyle && iconBorderStyle !== "none" ? `var(--exr-iconBorderWidthTop, ${iconBorderWidthTop || iconBorderWidth || "1px"})` : undefined,
            borderRightWidth: iconBorderStyle && iconBorderStyle !== "none" ? `var(--exr-iconBorderWidthRight, ${iconBorderWidthRight || iconBorderWidth || "1px"})` : undefined,
            borderBottomWidth: iconBorderStyle && iconBorderStyle !== "none" ? `var(--exr-iconBorderWidthBottom, ${iconBorderWidthBottom || iconBorderWidth || "1px"})` : undefined,
            borderLeftWidth: iconBorderStyle && iconBorderStyle !== "none" ? `var(--exr-iconBorderWidthLeft, ${iconBorderWidthLeft || iconBorderWidth || "1px"})` : undefined,
            borderColor: `var(--exr-iconBorderColor, ${iconBorderColor || "rgba(255,255,255,0.2)"})`,
            borderRadius: `var(--exr-iconBorderRadius, ${iconBorderRadius || "9999px"})`,
            boxShadow: iconBoxShadow ? `var(--exr-iconBoxShadow, ${iconBoxShadow})` : undefined,
          }}
        >
          {/* customIcon is raw admin-authored SVG markup (platform === "custom",
              no named-icon component exists for it) — same trust boundary as
              customCss/RichText elsewhere; IconCmp covers every named platform. */}
          {IconCmp ? <IconCmp className="h-4 w-4" /> : customIcon ? <span className="flex h-4 w-4 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: customIcon }} /> : null}
        </a>
      ))}
    </div>
  );
}

async function CollectionList({ collectionKey, layout, limit, columns }: { collectionKey: string; layout?: "grid" | "list"; limit?: number; columns?: number }) {
  const items = await fetchCollectionItems(collectionKey, limit ? String(limit) : undefined);
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10 text-center text-sm text-foreground/40 md:px-12">
        {collectionKey ? `Collection "${collectionKey}" has no published items yet.` : "Connect a Collection in the Content tab to show real items here."}
      </div>
    );
  }

  return (
    <div
      className="mx-auto max-w-6xl px-6 py-10 md:px-12"
      style={{ display: "grid", gridTemplateColumns: layout === "list" ? "1fr" : `repeat(${columns || 3}, minmax(0, 1fr))`, gap: "20px" }}
    >
      {items.map((item) => {
        const display = resolveCollectionItemDisplay(item, collectionKey);
        return (
          <a key={item.id} href={display.href || undefined} className="block overflow-hidden rounded-xl bg-black/5" style={layout === "list" ? { display: "flex", gap: "16px" } : undefined}>
            {display.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resolveImageUrl(display.image)} alt="" className="aspect-video w-full object-cover" style={layout === "list" ? { width: "200px", aspectRatio: "4/3", flexShrink: 0 } : undefined} />
            )}
            <div className="p-5">
              <div className="font-bold">{display.title}</div>
              {display.description && <p className="mt-2 text-sm opacity-75">{display.description}</p>}
            </div>
          </a>
        );
      })}
    </div>
  );
}

/**
 * Maps BLOCK_REGISTRY keys to their actual React implementation. This is
 * the one place allowed to import both `@marwa/builder` (via the
 * caller) and the real component tree — kept inside `apps/web` so
 * `apps/admin` never needs to pull these components into its own bundle.
 */
// ── Creative widgets / Content boxes ────────────────────────────────────
// Each reads its style props through var(--exr-{key}, {desktop value}) —
// see the note on Heading/Services earlier in this file — except fields
// that share a name with the wrapper's own generic Advanced-tab fields
// (background/borderColor/borderRadius/boxShadow — see BOX_MODEL_KEYS in
// packages/builder), which stay literal since those never get var-bridged.

function ScrollMarquee({
  items,
  direction,
  speed,
  itemGap,
  itemHeight,
  pauseOnHover,
  background,
  textColor,
  textFontFamily,
  textFontSize,
  textFontWeight,
}: {
  items: ScrollMarqueeItem[];
  direction?: "left" | "right";
  speed?: string;
  itemGap?: string;
  itemHeight?: string;
  pauseOnHover?: boolean;
  background?: string;
  textColor?: string;
  textFontFamily?: string;
  textFontSize?: string;
  textFontWeight?: string;
}) {
  if (!items || items.length === 0) return null;
  const track = [...items, ...items];
  const animName = direction === "right" ? "exr-marquee-right" : "exr-marquee-left";
  return (
    <>
      <GoogleFontLink family={textFontFamily} />
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes exr-marquee-left{from{transform:translateX(0);}to{transform:translateX(-50%);}}@keyframes exr-marquee-right{from{transform:translateX(-50%);}to{transform:translateX(0);}}`,
        }}
      />
      <div style={{ overflow: "hidden", background }} className="group">
        <div
          style={{
            display: "flex",
            width: "max-content",
            gap: itemGap || "48px",
            animation: `${animName} ${speed || "30"}s linear infinite`,
            animationPlayState: pauseOnHover ? undefined : "running",
          }}
          className={pauseOnHover ? "group-hover:[animation-play-state:paused]" : undefined}
        >
          {track.map((item, i) => (
            <a
              key={i}
              href={item.link || undefined}
              style={{
                display: "flex",
                alignItems: "center",
                height: itemHeight || "60px",
                whiteSpace: "nowrap",
                color: `var(--exr-textColor, ${textColor || "inherit"})`,
                fontFamily: textFontFamily && textFontFamily !== "inherit" ? textFontFamily : undefined,
                fontSize: `var(--exr-textFontSize, ${textFontSize || "inherit"})`,
                fontWeight: `var(--exr-textFontWeight, ${textFontWeight || "600"})`,
              }}
            >
              {item.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolveImageUrl(item.image)} alt="" style={{ height: "100%", width: "auto", objectFit: "contain" }} />
              )}
              {item.text}
            </a>
          ))}
        </div>
      </div>
    </>
  );
}

// items cycles end-to-end to fill the scrolling strip; odd/even index
// alternates the pill/plain look, matching the original design (see the
// file-level comment on marqueeStripBlock in registry.ts).
function MarqueeStripBlock({
  items,
  showIcon,
  speedSeconds,
  gap,
  background,
  color,
  pillBackground,
  pillColor,
  fontSize,
  fontWeight,
}: {
  items?: string[];
  showIcon?: boolean;
  speedSeconds?: number;
  gap?: string;
  background?: string;
  color?: string;
  pillBackground?: string;
  pillColor?: string;
  fontSize?: string;
  fontWeight?: string;
}) {
  if (!items || items.length === 0) return null;
  const track = [...items, ...items];
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes exr-marquee-strip{from{transform:translateX(0);}to{transform:translateX(-50%);}}`,
        }}
      />
      <div style={{ overflow: "hidden", background }}>
        <div
          style={{
            display: "flex",
            width: "max-content",
            alignItems: "center",
            gap: `var(--exr-gap, ${gap || "1.5rem"})`,
            animation: `exr-marquee-strip ${speedSeconds || 22}s linear infinite`,
          }}
        >
          {track.map((text, i) => {
            const isPill = i % 2 === 0;
            return (
              <span
                key={i}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5em",
                  whiteSpace: "nowrap",
                  padding: isPill ? "0.4em 1.1em" : undefined,
                  borderRadius: isPill ? "9999px" : undefined,
                  background: isPill ? `var(--exr-pillBackground, ${pillBackground || "rgba(255,255,255,0.08)"})` : undefined,
                  color: isPill
                    ? `var(--exr-pillColor, ${pillColor || color || "inherit"})`
                    : `var(--exr-color, ${color || "inherit"})`,
                  fontSize: `var(--exr-fontSize, ${fontSize || "inherit"})`,
                  fontWeight: `var(--exr-fontWeight, ${fontWeight || "600"})`,
                }}
              >
                {showIcon && (
                  <svg viewBox="0 0 24 24" width="0.9em" height="0.9em" fill="currentColor" aria-hidden="true">
                    <circle cx="12" cy="12" r="5" />
                  </svg>
                )}
                {text}
              </span>
            );
          })}
        </div>
      </div>
    </>
  );
}

function IconBullets({
  items,
  layout,
  itemGap,
  iconColor,
  iconBackground,
  iconSize,
  textColor,
  textFontFamily,
  textFontSize,
  textFontWeight,
}: {
  items: IconBulletItem[];
  layout?: "vertical" | "horizontal";
  itemGap?: string;
  iconColor?: string;
  iconBackground?: string;
  iconSize?: string;
  textColor?: string;
  textFontFamily?: string;
  textFontSize?: string;
  textFontWeight?: string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <>
      <GoogleFontLink family={textFontFamily} />
      <ul style={{ display: "flex", flexDirection: layout === "horizontal" ? "row" : "column", flexWrap: "wrap", gap: itemGap || "12px", listStyle: "none", padding: 0, margin: 0 }}>
        {items.map((item, i) => {
          return (
            <li key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: `var(--exr-iconSize, ${iconSize || "16px"})`,
                  height: `var(--exr-iconSize, ${iconSize || "16px"})`,
                  color: `var(--exr-iconColor, ${iconColor || "currentColor"})`,
                  background: iconBackground || undefined,
                  borderRadius: iconBackground ? "9999px" : undefined,
                  flexShrink: 0,
                }}
              >
                <IconGlyph icon={item.icon} style={{ width: "70%", height: "70%" }} />
              </span>
              <span
                style={{
                  color: `var(--exr-textColor, ${textColor || "inherit"})`,
                  fontFamily: textFontFamily && textFontFamily !== "inherit" ? textFontFamily : undefined,
                  fontSize: `var(--exr-textFontSize, ${textFontSize || "inherit"})`,
                  fontWeight: `var(--exr-textFontWeight, ${textFontWeight || "600"})`,
                }}
              >
                {item.text}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function NumberBox({
  number,
  title,
  description,
  numberColor,
  numberBackground,
  numberFontSize,
  numberSize,
  titleColor,
  titleFontFamily,
  titleFontSize,
  titleFontWeight,
  titleTextTransform,
  titleFontStyle,
  titleTextDecoration,
  titleLineHeight,
  titleLetterSpacing,
  titleWordSpacing,
  descColor,
  descFontFamily,
  descFontSize,
  descFontWeight,
  descTextTransform,
  descFontStyle,
  descTextDecoration,
  descLineHeight,
  descLetterSpacing,
  descWordSpacing,
  accentColor,
}: {
  number: string;
  title: string;
  description?: string;
  numberColor?: string;
  numberBackground?: string;
  numberFontSize?: string;
  numberSize?: string;
  titleColor?: string;
  titleFontFamily?: string;
  titleFontSize?: string;
  titleFontWeight?: string;
  titleTextTransform?: CSSProperties["textTransform"];
  titleFontStyle?: CSSProperties["fontStyle"];
  titleTextDecoration?: string;
  titleLineHeight?: string;
  titleLetterSpacing?: string;
  titleWordSpacing?: string;
  descColor?: string;
  descFontFamily?: string;
  descFontSize?: string;
  descFontWeight?: string;
  descTextTransform?: CSSProperties["textTransform"];
  descFontStyle?: CSSProperties["fontStyle"];
  descTextDecoration?: string;
  descLineHeight?: string;
  descLetterSpacing?: string;
  descWordSpacing?: string;
  accentColor?: string;
}) {
  const accent = accentColor || "#2563FF";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: `var(--exr-numberSize, ${numberSize || "56px"})`,
          height: `var(--exr-numberSize, ${numberSize || "56px"})`,
          borderRadius: "9999px",
          background: `var(--exr-numberBackground, ${numberBackground || accent})`,
          color: `var(--exr-numberColor, ${numberColor || "#fff"})`,
          fontSize: `var(--exr-numberFontSize, ${numberFontSize || "24px"})`,
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        {number}
      </span>
      <h3
        style={{
          color: `var(--exr-titleColor, ${titleColor || "inherit"})`,
          fontFamily: titleFontFamily && titleFontFamily !== "inherit" ? titleFontFamily : undefined,
          fontSize: `var(--exr-titleFontSize, ${titleFontSize || "inherit"})`,
          fontWeight: `var(--exr-titleFontWeight, ${titleFontWeight || "700"})` as CSSProperties["fontWeight"],
          textTransform: `var(--exr-titleTextTransform, ${titleTextTransform || "none"})` as CSSProperties["textTransform"],
          fontStyle: `var(--exr-titleFontStyle, ${titleFontStyle || "normal"})` as CSSProperties["fontStyle"],
          textDecoration: `var(--exr-titleTextDecoration, ${titleTextDecoration || "none"})`,
          lineHeight: titleLineHeight ? `var(--exr-titleLineHeight, ${titleLineHeight})` : undefined,
          letterSpacing: titleLetterSpacing ? `var(--exr-titleLetterSpacing, ${titleLetterSpacing})` : undefined,
          wordSpacing: titleWordSpacing ? `var(--exr-titleWordSpacing, ${titleWordSpacing})` : undefined,
          margin: 0,
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            color: `var(--exr-descColor, ${descColor || "inherit"})`,
            fontFamily: descFontFamily && descFontFamily !== "inherit" ? descFontFamily : undefined,
            fontSize: `var(--exr-descFontSize, ${descFontSize || "inherit"})`,
            fontWeight: `var(--exr-descFontWeight, ${descFontWeight || "400"})` as CSSProperties["fontWeight"],
            textTransform: `var(--exr-descTextTransform, ${descTextTransform || "none"})` as CSSProperties["textTransform"],
            fontStyle: `var(--exr-descFontStyle, ${descFontStyle || "normal"})` as CSSProperties["fontStyle"],
            textDecoration: `var(--exr-descTextDecoration, ${descTextDecoration || "none"})`,
            lineHeight: descLineHeight ? `var(--exr-descLineHeight, ${descLineHeight})` : undefined,
            letterSpacing: descLetterSpacing ? `var(--exr-descLetterSpacing, ${descLetterSpacing})` : undefined,
            wordSpacing: descWordSpacing ? `var(--exr-descWordSpacing, ${descWordSpacing})` : undefined,
            margin: 0,
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
}

function TimelineBullets({
  items,
  orientation,
  lineColor,
  nodeColor,
  nodeBackground,
  dateColor,
  dateFontSize,
  titleColor,
  titleFontSize,
  descColor,
  descFontSize,
}: {
  items: TimelineBulletItem[];
  orientation?: "vertical" | "horizontal";
  lineColor?: string;
  nodeColor?: string;
  nodeBackground?: string;
  dateColor?: string;
  dateFontSize?: string;
  titleColor?: string;
  titleFontSize?: string;
  descColor?: string;
  descFontSize?: string;
}) {
  if (!items || items.length === 0) return null;
  const isHorizontal = orientation === "horizontal";
  return (
    <ul
      style={{
        display: "flex",
        flexDirection: isHorizontal ? "row" : "column",
        listStyle: "none",
        padding: 0,
        margin: 0,
      }}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <li key={i} style={{ display: "flex", flexDirection: isHorizontal ? "column" : "row", flex: isHorizontal ? 1 : undefined, gap: "14px" }}>
            <div style={{ display: "flex", flexDirection: isHorizontal ? "row" : "column", alignItems: "center", flexShrink: 0 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "36px",
                  height: "36px",
                  borderRadius: "9999px",
                  background: `var(--exr-nodeBackground, ${nodeBackground || "#2563FF"})`,
                  color: `var(--exr-nodeColor, ${nodeColor || "#fff"})`,
                  flexShrink: 0,
                }}
              >
                <IconGlyph icon={item.icon} style={{ width: "50%", height: "50%" }} />
              </span>
              {!isLast && (
                <span
                  style={{
                    background: `var(--exr-lineColor, ${lineColor || "rgba(0,0,0,0.12)"})`,
                    flex: 1,
                    width: isHorizontal ? undefined : "2px",
                    height: isHorizontal ? "2px" : undefined,
                    minWidth: isHorizontal ? "24px" : undefined,
                    minHeight: isHorizontal ? undefined : "24px",
                  }}
                />
              )}
            </div>
            <div style={{ paddingBottom: isHorizontal ? undefined : "24px" }}>
              {item.date && (
                <div style={{ color: `var(--exr-dateColor, ${dateColor || "#2563FF"})`, fontSize: `var(--exr-dateFontSize, ${dateFontSize || "12px"})`, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {item.date}
                </div>
              )}
              <div style={{ color: `var(--exr-titleColor, ${titleColor || "inherit"})`, fontSize: `var(--exr-titleFontSize, ${titleFontSize || "inherit"})`, fontWeight: 700 }}>{item.title}</div>
              {item.description && (
                <p style={{ color: `var(--exr-descColor, ${descColor || "inherit"})`, fontSize: `var(--exr-descFontSize, ${descFontSize || "inherit"})`, margin: "4px 0 0" }}>{item.description}</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ShapeBulletIcon({ shape, size, color }: { shape: string; size: string; color: string }) {
  const style: CSSProperties = { width: size, height: size, background: color, flexShrink: 0 };
  switch (shape) {
    case "square":
      return <span style={style} />;
    case "diamond":
      return <span style={{ ...style, transform: "rotate(45deg)" }} />;
    case "hexagon":
      return <span style={{ ...style, clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" }} />;
    case "triangle":
      return <span style={{ width: 0, height: 0, borderLeft: `calc(${size} / 2) solid transparent`, borderRight: `calc(${size} / 2) solid transparent`, borderBottom: `${size} solid ${color}`, flexShrink: 0 }} />;
    default:
      return <span style={{ ...style, borderRadius: "9999px" }} />;
  }
}

function ShapeBullets({
  items,
  shapeColor,
  shapeSize,
  textColor,
  textFontSize,
  itemGap,
}: {
  items: ShapeBulletItem[];
  shapeColor?: string;
  shapeSize?: string;
  textColor?: string;
  textFontSize?: string;
  itemGap?: string;
}) {
  if (!items || items.length === 0) return null;
  const color = shapeColor || "#2563FF";
  const size = shapeSize || "10px";
  return (
    <ul style={{ display: "flex", flexDirection: "column", gap: itemGap || "10px", listStyle: "none", padding: 0, margin: 0 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <ShapeBulletIcon shape={item.shape} size={size} color={color} />
          <span style={{ color: `var(--exr-textColor, ${textColor || "inherit"})`, fontSize: `var(--exr-textFontSize, ${textFontSize || "inherit"})` }}>{item.text}</span>
        </li>
      ))}
    </ul>
  );
}

function StackedImages({
  images,
  hoverExpand,
  imageWidth,
  imageHeight,
  borderRadius,
  borderRadiusTopLeft,
  borderRadiusTopRight,
  borderRadiusBottomRight,
  borderRadiusBottomLeft,
  borderColor,
  boxShadow,
}: {
  images: StackedImageItem[];
  hoverExpand?: boolean;
  imageWidth?: string;
  imageHeight?: string;
  borderRadius?: string;
  borderRadiusTopLeft?: string;
  borderRadiusTopRight?: string;
  borderRadiusBottomRight?: string;
  borderRadiusBottomLeft?: string;
  borderColor?: string;
  boxShadow?: string;
}) {
  if (!images || images.length === 0) return null;
  return (
    <div className="group/stack" style={{ position: "relative", height: imageHeight || "280px", width: `calc(${imageWidth || "220px"} + ${images.length * 40}px)` }}>
      {images.map((item, i) => (
        <div
          key={i}
          className="transition-transform duration-300 group-hover/stack:!translate-x-[var(--hover-x)]"
          style={
            {
              position: "absolute",
              left: item.offsetX || `${i * 40}px`,
              top: item.offsetY || "0px",
              width: imageWidth || "220px",
              height: imageHeight || "280px",
              transform: `rotate(${item.rotate || "0deg"})`,
              zIndex: i,
              borderTopLeftRadius: borderRadiusTopLeft || borderRadius || "16px",
              borderTopRightRadius: borderRadiusTopRight || borderRadius || "16px",
              borderBottomRightRadius: borderRadiusBottomRight || borderRadius || "16px",
              borderBottomLeftRadius: borderRadiusBottomLeft || borderRadius || "16px",
              overflow: "hidden",
              borderWidth: borderColor ? "4px" : undefined,
              borderStyle: borderColor ? "solid" : undefined,
              borderColor: borderColor || undefined,
              boxShadow: boxShadow || "0 10px 30px rgba(0,0,0,0.2)",
              "--hover-x": hoverExpand ? `${(i - (images.length - 1) / 2) * 24}px` : "0px",
            } as CSSProperties
          }
        >
          {item.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolveImageUrl(item.image)} alt={item.alt || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          )}
        </div>
      ))}
    </div>
  );
}

function GlowingCard({
  icon,
  title,
  description,
  ctaLabel,
  ctaUrl,
  cardBackground,
  glowColor,
  glowIntensity,
  borderRadius,
  borderRadiusTopLeft,
  borderRadiusTopRight,
  borderRadiusBottomRight,
  borderRadiusBottomLeft,
  cardBorderStyle,
  cardBorderWidth,
  cardBorderWidthTop,
  cardBorderWidthRight,
  cardBorderWidthBottom,
  cardBorderWidthLeft,
  cardBorderColor,
  cardBoxShadow,
  iconColor,
  titleColor,
  titleFontFamily,
  titleFontSize,
  titleFontWeight,
  titleTextTransform,
  titleFontStyle,
  titleTextDecoration,
  titleLineHeight,
  titleLetterSpacing,
  titleWordSpacing,
  descColor,
  descFontFamily,
  descFontSize,
  descFontWeight,
  descTextTransform,
  descFontStyle,
  descTextDecoration,
  descLineHeight,
  descLetterSpacing,
  descWordSpacing,
}: {
  icon?: string;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  cardBackground?: string;
  glowColor?: string;
  glowIntensity?: string;
  borderRadius?: string;
  borderRadiusTopLeft?: string;
  borderRadiusTopRight?: string;
  borderRadiusBottomRight?: string;
  borderRadiusBottomLeft?: string;
  cardBorderStyle?: "none" | "solid" | "dashed" | "dotted";
  cardBorderWidth?: string;
  cardBorderWidthTop?: string;
  cardBorderWidthRight?: string;
  cardBorderWidthBottom?: string;
  cardBorderWidthLeft?: string;
  cardBorderColor?: string;
  cardBoxShadow?: string;
  iconColor?: string;
  titleColor?: string;
  titleFontFamily?: string;
  titleFontSize?: string;
  titleFontWeight?: string;
  titleTextTransform?: CSSProperties["textTransform"];
  titleFontStyle?: CSSProperties["fontStyle"];
  titleTextDecoration?: string;
  titleLineHeight?: string;
  titleLetterSpacing?: string;
  titleWordSpacing?: string;
  descColor?: string;
  descFontFamily?: string;
  descFontSize?: string;
  descFontWeight?: string;
  descTextTransform?: CSSProperties["textTransform"];
  descFontStyle?: CSSProperties["fontStyle"];
  descTextDecoration?: string;
  descLineHeight?: string;
  descLetterSpacing?: string;
  descWordSpacing?: string;
}) {
  const glow = glowColor || "#2563FF";
  const className = `exr-glow-${hashString(`${glow}${glowIntensity ?? ""}`)}`;
  return (
    <div
      className={`relative ${className}`}
      style={{
        borderTopLeftRadius: borderRadiusTopLeft || borderRadius || "16px",
        borderTopRightRadius: borderRadiusTopRight || borderRadius || "16px",
        borderBottomRightRadius: borderRadiusBottomRight || borderRadius || "16px",
        borderBottomLeftRadius: borderRadiusBottomLeft || borderRadius || "16px",
        background: cardBackground || "#111",
        borderStyle: cardBorderStyle && cardBorderStyle !== "none" ? cardBorderStyle : undefined,
        borderTopWidth: cardBorderStyle && cardBorderStyle !== "none" ? `var(--exr-cardBorderWidthTop, ${cardBorderWidthTop || cardBorderWidth || "1px"})` : undefined,
        borderRightWidth: cardBorderStyle && cardBorderStyle !== "none" ? `var(--exr-cardBorderWidthRight, ${cardBorderWidthRight || cardBorderWidth || "1px"})` : undefined,
        borderBottomWidth: cardBorderStyle && cardBorderStyle !== "none" ? `var(--exr-cardBorderWidthBottom, ${cardBorderWidthBottom || cardBorderWidth || "1px"})` : undefined,
        borderLeftWidth: cardBorderStyle && cardBorderStyle !== "none" ? `var(--exr-cardBorderWidthLeft, ${cardBorderWidthLeft || cardBorderWidth || "1px"})` : undefined,
        borderColor: cardBorderStyle && cardBorderStyle !== "none" ? cardBorderColor || undefined : undefined,
        boxShadow: cardBoxShadow ? `var(--exr-cardBoxShadow, ${cardBoxShadow})` : undefined,
        padding: "28px",
        overflow: "hidden",
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `.${className}::before{content:"";position:absolute;inset:-2px;z-index:0;border-radius:inherit;background:linear-gradient(135deg,${glow},transparent 60%);filter:blur(${glowIntensity || "30px"});opacity:0.55;transition:opacity .3s ease;}.${className}:hover::before{opacity:0.9;}`,
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>
        {icon && (
          <span style={{ display: "inline-flex", marginBottom: "14px", color: `var(--exr-iconColor, ${iconColor || glow})`, fontSize: "28px" }}>
            <IconGlyph icon={icon} />
          </span>
        )}
        <h3
          style={{
            color: `var(--exr-titleColor, ${titleColor || "#fff"})`,
            fontFamily: titleFontFamily && titleFontFamily !== "inherit" ? titleFontFamily : undefined,
            fontSize: `var(--exr-titleFontSize, ${titleFontSize || "20px"})`,
            fontWeight: `var(--exr-titleFontWeight, ${titleFontWeight || "700"})` as CSSProperties["fontWeight"],
            textTransform: `var(--exr-titleTextTransform, ${titleTextTransform || "none"})` as CSSProperties["textTransform"],
            fontStyle: `var(--exr-titleFontStyle, ${titleFontStyle || "normal"})` as CSSProperties["fontStyle"],
            textDecoration: `var(--exr-titleTextDecoration, ${titleTextDecoration || "none"})`,
            lineHeight: titleLineHeight ? `var(--exr-titleLineHeight, ${titleLineHeight})` : undefined,
            letterSpacing: titleLetterSpacing ? `var(--exr-titleLetterSpacing, ${titleLetterSpacing})` : undefined,
            wordSpacing: titleWordSpacing ? `var(--exr-titleWordSpacing, ${titleWordSpacing})` : undefined,
            margin: "0 0 8px",
          }}
        >
          {title}
        </h3>
        {description && (
          <p
            style={{
              color: `var(--exr-descColor, ${descColor || "rgba(255,255,255,0.7)"})`,
              fontFamily: descFontFamily && descFontFamily !== "inherit" ? descFontFamily : undefined,
              fontSize: `var(--exr-descFontSize, ${descFontSize || "inherit"})`,
              fontWeight: `var(--exr-descFontWeight, ${descFontWeight || "400"})` as CSSProperties["fontWeight"],
              textTransform: `var(--exr-descTextTransform, ${descTextTransform || "none"})` as CSSProperties["textTransform"],
              fontStyle: `var(--exr-descFontStyle, ${descFontStyle || "normal"})` as CSSProperties["fontStyle"],
              textDecoration: `var(--exr-descTextDecoration, ${descTextDecoration || "none"})`,
              lineHeight: descLineHeight ? `var(--exr-descLineHeight, ${descLineHeight})` : undefined,
              letterSpacing: descLetterSpacing ? `var(--exr-descLetterSpacing, ${descLetterSpacing})` : undefined,
              wordSpacing: descWordSpacing ? `var(--exr-descWordSpacing, ${descWordSpacing})` : undefined,
              margin: 0,
            }}
          >
            {description}
          </p>
        )}
        {ctaLabel && ctaUrl && (
          <a href={ctaUrl} style={{ display: "inline-block", marginTop: "16px", color: glow, fontWeight: 600, fontSize: "14px" }}>
            {ctaLabel} →
          </a>
        )}
      </div>
    </div>
  );
}

// ── Ultimate Addons Core (self-contained batch) ─────────────────────────

function AdvancedHeading({
  subtitle,
  title,
  highlightText,
  dividerEnabled,
  align,
  subtitleColor,
  subtitleFontFamily,
  subtitleFontSize,
  subtitleFontWeight,
  subtitleTextTransform,
  subtitleFontStyle,
  subtitleTextDecoration,
  subtitleLineHeight,
  subtitleLetterSpacing,
  subtitleWordSpacing,
  titleColor,
  titleFontFamily,
  titleFontSize,
  titleFontWeight,
  titleTextTransform,
  titleFontStyle,
  titleTextDecoration,
  titleLineHeight,
  titleLetterSpacing,
  titleWordSpacing,
  highlightColor,
  dividerColor,
}: {
  subtitle?: string;
  title: string;
  highlightText?: string;
  dividerEnabled?: boolean;
  align?: "left" | "center" | "right";
  subtitleColor?: string;
  subtitleFontFamily?: string;
  subtitleFontSize?: string;
  subtitleFontWeight?: string;
  subtitleTextTransform?: CSSProperties["textTransform"];
  subtitleFontStyle?: CSSProperties["fontStyle"];
  subtitleTextDecoration?: string;
  subtitleLineHeight?: string;
  subtitleLetterSpacing?: string;
  subtitleWordSpacing?: string;
  titleColor?: string;
  titleFontFamily?: string;
  titleFontSize?: string;
  titleFontWeight?: string;
  titleTextTransform?: CSSProperties["textTransform"];
  titleFontStyle?: CSSProperties["fontStyle"];
  titleTextDecoration?: string;
  titleLineHeight?: string;
  titleLetterSpacing?: string;
  titleWordSpacing?: string;
  highlightColor?: string;
  dividerColor?: string;
}) {
  const titleParts = highlightText && title.includes(highlightText) ? title.split(highlightText) : [title];
  return (
    <div style={{ textAlign: align || "left" }}>
      {subtitle && (
        <div
          style={{
            color: `var(--exr-subtitleColor, ${subtitleColor || "#2563FF"})`,
            fontFamily: subtitleFontFamily && subtitleFontFamily !== "inherit" ? subtitleFontFamily : undefined,
            fontSize: `var(--exr-subtitleFontSize, ${subtitleFontSize || "14px"})`,
            fontWeight: `var(--exr-subtitleFontWeight, ${subtitleFontWeight || "600"})`,
            textTransform: `var(--exr-subtitleTextTransform, ${subtitleTextTransform || "uppercase"})` as CSSProperties["textTransform"],
            fontStyle: `var(--exr-subtitleFontStyle, ${subtitleFontStyle || "normal"})` as CSSProperties["fontStyle"],
            textDecoration: `var(--exr-subtitleTextDecoration, ${subtitleTextDecoration || "none"})`,
            lineHeight: subtitleLineHeight ? `var(--exr-subtitleLineHeight, ${subtitleLineHeight})` : undefined,
            letterSpacing: `var(--exr-subtitleLetterSpacing, ${subtitleLetterSpacing || "0.08em"})`,
            wordSpacing: subtitleWordSpacing ? `var(--exr-subtitleWordSpacing, ${subtitleWordSpacing})` : undefined,
            marginBottom: "6px",
          }}
        >
          {subtitle}
        </div>
      )}
      <h2
        style={{
          color: `var(--exr-titleColor, ${titleColor || "inherit"})`,
          fontFamily: titleFontFamily && titleFontFamily !== "inherit" ? titleFontFamily : undefined,
          fontSize: `var(--exr-titleFontSize, ${titleFontSize || "clamp(2rem, 5vw, 3.5rem)"})`,
          fontWeight: `var(--exr-titleFontWeight, ${titleFontWeight || "800"})`,
          textTransform: `var(--exr-titleTextTransform, ${titleTextTransform || "none"})` as CSSProperties["textTransform"],
          fontStyle: `var(--exr-titleFontStyle, ${titleFontStyle || "normal"})` as CSSProperties["fontStyle"],
          textDecoration: `var(--exr-titleTextDecoration, ${titleTextDecoration || "none"})`,
          letterSpacing: titleLetterSpacing ? `var(--exr-titleLetterSpacing, ${titleLetterSpacing})` : undefined,
          wordSpacing: titleWordSpacing ? `var(--exr-titleWordSpacing, ${titleWordSpacing})` : undefined,
          margin: 0,
          lineHeight: titleLineHeight ? `var(--exr-titleLineHeight, ${titleLineHeight})` : 1.1,
        }}
      >
        {titleParts.length === 2 ? (
          <>
            {titleParts[0]}
            <span style={{ color: highlightColor || "#2563FF" }}>{highlightText}</span>
            {titleParts[1]}
          </>
        ) : (
          title
        )}
      </h2>
      {dividerEnabled && (
        <span style={{ display: "block", width: "64px", height: "3px", marginTop: "16px", marginLeft: align === "center" ? "auto" : undefined, marginRight: align === "center" ? "auto" : undefined, background: dividerColor || highlightColor || "#2563FF" }} />
      )}
    </div>
  );
}

function InfoBox({
  icon,
  title,
  description,
  badge,
  ctaLabel,
  ctaUrl,
  iconColor,
  iconBackground,
  iconSize,
  titleColor,
  titleFontFamily,
  titleFontSize,
  titleFontWeight,
  titleTextTransform,
  titleFontStyle,
  titleTextDecoration,
  titleLineHeight,
  titleLetterSpacing,
  titleWordSpacing,
  descColor,
  descFontFamily,
  descFontSize,
  descFontWeight,
  descTextTransform,
  descFontStyle,
  descTextDecoration,
  descLineHeight,
  descLetterSpacing,
  descWordSpacing,
  badgeBackground,
  badgeColor,
  ctaColor,
  cardBackground,
  borderRadius,
  borderRadiusTopLeft,
  borderRadiusTopRight,
  borderRadiusBottomRight,
  borderRadiusBottomLeft,
  cardBorderStyle,
  cardBorderWidth,
  cardBorderWidthTop,
  cardBorderWidthRight,
  cardBorderWidthBottom,
  cardBorderWidthLeft,
  cardBorderColor,
  cardBoxShadow,
}: {
  icon?: string;
  title: string;
  description?: string;
  badge?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  iconColor?: string;
  iconBackground?: string;
  iconSize?: string;
  titleColor?: string;
  titleFontFamily?: string;
  titleFontSize?: string;
  titleFontWeight?: string;
  titleTextTransform?: CSSProperties["textTransform"];
  titleFontStyle?: CSSProperties["fontStyle"];
  titleTextDecoration?: string;
  titleLineHeight?: string;
  titleLetterSpacing?: string;
  titleWordSpacing?: string;
  descColor?: string;
  descFontFamily?: string;
  descFontSize?: string;
  descFontWeight?: string;
  descTextTransform?: CSSProperties["textTransform"];
  descFontStyle?: CSSProperties["fontStyle"];
  descTextDecoration?: string;
  descLineHeight?: string;
  descLetterSpacing?: string;
  descWordSpacing?: string;
  badgeBackground?: string;
  badgeColor?: string;
  ctaColor?: string;
  cardBackground?: string;
  borderRadius?: string;
  borderRadiusTopLeft?: string;
  borderRadiusTopRight?: string;
  borderRadiusBottomRight?: string;
  borderRadiusBottomLeft?: string;
  cardBorderStyle?: "none" | "solid" | "dashed" | "dotted";
  cardBorderWidth?: string;
  cardBorderWidthTop?: string;
  cardBorderWidthRight?: string;
  cardBorderWidthBottom?: string;
  cardBorderWidthLeft?: string;
  cardBorderColor?: string;
  cardBoxShadow?: string;
}) {
  return (
    <div
      style={{
        position: "relative",
        background: cardBackground || undefined,
        borderTopLeftRadius: borderRadiusTopLeft || borderRadius || "16px",
        borderTopRightRadius: borderRadiusTopRight || borderRadius || "16px",
        borderBottomRightRadius: borderRadiusBottomRight || borderRadius || "16px",
        borderBottomLeftRadius: borderRadiusBottomLeft || borderRadius || "16px",
        borderStyle: cardBorderStyle && cardBorderStyle !== "none" ? cardBorderStyle : undefined,
        borderTopWidth: cardBorderStyle && cardBorderStyle !== "none" ? `var(--exr-cardBorderWidthTop, ${cardBorderWidthTop || cardBorderWidth || "1px"})` : undefined,
        borderRightWidth: cardBorderStyle && cardBorderStyle !== "none" ? `var(--exr-cardBorderWidthRight, ${cardBorderWidthRight || cardBorderWidth || "1px"})` : undefined,
        borderBottomWidth: cardBorderStyle && cardBorderStyle !== "none" ? `var(--exr-cardBorderWidthBottom, ${cardBorderWidthBottom || cardBorderWidth || "1px"})` : undefined,
        borderLeftWidth: cardBorderStyle && cardBorderStyle !== "none" ? `var(--exr-cardBorderWidthLeft, ${cardBorderWidthLeft || cardBorderWidth || "1px"})` : undefined,
        borderColor: cardBorderStyle && cardBorderStyle !== "none" ? cardBorderColor || undefined : undefined,
        boxShadow: cardBoxShadow ? `var(--exr-cardBoxShadow, ${cardBoxShadow})` : undefined,
        padding: cardBackground ? "24px" : undefined,
      }}
    >
      {badge && (
        <span
          style={{
            position: "absolute",
            top: cardBackground ? "16px" : "0px",
            right: cardBackground ? "16px" : "0px",
            borderRadius: "9999px",
            padding: "3px 10px",
            fontSize: "10px",
            fontWeight: 700,
            textTransform: "uppercase",
            background: `var(--exr-badgeBackground, ${badgeBackground || "#2563FF"})`,
            color: `var(--exr-badgeColor, ${badgeColor || "#fff"})`,
          }}
        >
          {badge}
        </span>
      )}
      {icon && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: `var(--exr-iconSize, ${iconSize || "40px"})`,
            height: `var(--exr-iconSize, ${iconSize || "40px"})`,
            borderRadius: "9999px",
            background: iconBackground || "rgba(37,99,255,0.12)",
            color: `var(--exr-iconColor, ${iconColor || "#2563FF"})`,
            marginBottom: "14px",
          }}
        >
          <IconGlyph icon={icon} style={{ width: "50%", height: "50%" }} />
        </span>
      )}
      <h3
        style={{
          color: `var(--exr-titleColor, ${titleColor || "inherit"})`,
          fontFamily: titleFontFamily && titleFontFamily !== "inherit" ? titleFontFamily : undefined,
          fontSize: `var(--exr-titleFontSize, ${titleFontSize || "inherit"})`,
          fontWeight: `var(--exr-titleFontWeight, ${titleFontWeight || "700"})` as CSSProperties["fontWeight"],
          textTransform: `var(--exr-titleTextTransform, ${titleTextTransform || "none"})` as CSSProperties["textTransform"],
          fontStyle: `var(--exr-titleFontStyle, ${titleFontStyle || "normal"})` as CSSProperties["fontStyle"],
          textDecoration: `var(--exr-titleTextDecoration, ${titleTextDecoration || "none"})`,
          lineHeight: titleLineHeight ? `var(--exr-titleLineHeight, ${titleLineHeight})` : undefined,
          letterSpacing: titleLetterSpacing ? `var(--exr-titleLetterSpacing, ${titleLetterSpacing})` : undefined,
          wordSpacing: titleWordSpacing ? `var(--exr-titleWordSpacing, ${titleWordSpacing})` : undefined,
          margin: 0,
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            color: `var(--exr-descColor, ${descColor || "inherit"})`,
            fontFamily: descFontFamily && descFontFamily !== "inherit" ? descFontFamily : undefined,
            fontSize: `var(--exr-descFontSize, ${descFontSize || "inherit"})`,
            fontWeight: `var(--exr-descFontWeight, ${descFontWeight || "400"})` as CSSProperties["fontWeight"],
            textTransform: `var(--exr-descTextTransform, ${descTextTransform || "none"})` as CSSProperties["textTransform"],
            fontStyle: `var(--exr-descFontStyle, ${descFontStyle || "normal"})` as CSSProperties["fontStyle"],
            textDecoration: `var(--exr-descTextDecoration, ${descTextDecoration || "none"})`,
            lineHeight: descLineHeight ? `var(--exr-descLineHeight, ${descLineHeight})` : undefined,
            letterSpacing: descLetterSpacing ? `var(--exr-descLetterSpacing, ${descLetterSpacing})` : undefined,
            wordSpacing: descWordSpacing ? `var(--exr-descWordSpacing, ${descWordSpacing})` : undefined,
            marginTop: "8px",
          }}
        >
          {description}
        </p>
      )}
      {ctaLabel && ctaUrl && (
        <a href={ctaUrl} style={{ display: "inline-block", marginTop: "14px", color: `var(--exr-ctaColor, ${ctaColor || "#2563FF"})`, fontWeight: 600, fontSize: "14px" }}>
          {ctaLabel} →
        </a>
      )}
    </div>
  );
}

const SOCIAL_ICON_GLYPH: Record<string, string> = {
  facebook: "M13.5 9H15V6.5h-1.5C11.6 6.5 10.5 7.6 10.5 9v2H9v2.5h1.5V19H13v-5.5h1.8l.4-2.5H13V9c0-.3.2-.5.5-.5Z",
  twitter: "M21 5.9c-.6.3-1.3.5-2 .6.7-.4 1.3-1.2 1.6-2-.7.4-1.4.7-2.2.9A3.4 3.4 0 0 0 12.8 8.5c0 .3 0 .5.1.8-2.8-.2-5.3-1.5-7-3.6-.3.5-.4 1-.4 1.6 0 1.1.6 2 1.4 2.6-.5 0-1-.2-1.5-.4v.1c0 1.5 1.1 2.8 2.5 3.1-.3.1-.6.1-.9.1-.2 0-.4 0-.6-.1.4 1.3 1.6 2.2 3 2.2A6.8 6.8 0 0 1 3 16.6a9.6 9.6 0 0 0 5.2 1.5c6.2 0 9.6-5.1 9.6-9.6v-.4c.7-.5 1.2-1.1 1.7-1.8Z",
  instagram: "M12 2c-2.7 0-3.1 0-4.1.1-1.1 0-1.8.2-2.4.4a5 5 0 0 0-1.8 1.2A5 5 0 0 0 2.5 5.5c-.2.6-.4 1.3-.4 2.4C2 8.9 2 9.3 2 12s0 3.1.1 4.1c0 1.1.2 1.8.4 2.4.3.7.6 1.2 1.2 1.8.5.6 1.1.9 1.8 1.2.6.2 1.3.4 2.4.4C8.9 22 9.3 22 12 22s3.1 0 4.1-.1c1.1 0 1.8-.2 2.4-.4a5 5 0 0 0 1.8-1.2c.6-.5.9-1.1 1.2-1.8.2-.6.4-1.3.4-2.4.1-1 .1-1.4.1-4.1s0-3.1-.1-4.1c0-1.1-.2-1.8-.4-2.4a5 5 0 0 0-1.2-1.8 5 5 0 0 0-1.8-1.2c-.6-.2-1.3-.4-2.4-.4C15.1 2 14.7 2 12 2Zm0 1.8c2.6 0 3 0 4 .1.9 0 1.5.2 1.8.3.4.2.8.4 1.1.7.3.3.5.7.7 1.1.1.3.3.9.3 1.8.1 1 .1 1.4.1 4s0 3-.1 4c0 .9-.2 1.5-.3 1.8-.2.4-.4.8-.7 1.1-.3.3-.7.5-1.1.7-.3.1-.9.3-1.8.3-1 .1-1.4.1-4 .1s-3 0-4-.1c-.9 0-1.5-.2-1.8-.3-.4-.2-.8-.4-1.1-.7a2.9 2.9 0 0 1-.7-1.1c-.1-.3-.3-.9-.3-1.8-.1-1-.1-1.4-.1-4s0-3 .1-4c0-.9.2-1.5.3-1.8.2-.4.4-.8.7-1.1.3-.3.7-.5 1.1-.7.3-.1.9-.3 1.8-.3 1-.1 1.4-.1 4-.1Zm0 3.2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4Zm5.2-8.4a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0Z",
  linkedin: "M6.9 8.4H3.6V20h3.3V8.4ZM5.3 3.5a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8ZM20.4 20h-3.3v-6c0-1.4 0-3.2-2-3.2s-2.3 1.6-2.3 3.1V20H9.5V8.4h3.2v1.6h.1c.4-.8 1.5-1.7 3.1-1.7 3.3 0 3.9 2.2 3.9 5V20Z",
  website: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.9 8H16a15 15 0 0 0-1.3-5.4A8 8 0 0 1 18.9 10ZM12 4c.9 1.3 1.7 3.4 1.9 6h-3.8c.2-2.6 1-4.7 1.9-6ZM4 12a8 8 0 0 1 .1-2h3a17 17 0 0 0 0 4h-3A8 8 0 0 1 4 12Zm1.1 4H8a15 15 0 0 0 1.3 5.4A8 8 0 0 1 5.1 16ZM8 8H5.1a8 8 0 0 1 4.2-5.4A15 15 0 0 0 8 8Zm4 12c-.9-1.3-1.7-3.4-1.9-6h3.8c-.2 2.6-1 4.7-1.9 6Zm2.7-.6A15 15 0 0 0 16 16h2.9a8 8 0 0 1-4.2 5.4ZM16.9 14a17 17 0 0 0 0-4h3a8 8 0 0 1 0 4h-3Z",
};

function TeamMember({
  photo,
  name,
  role,
  bio,
  socialLinks,
  photoSize,
  photoShape,
  nameColor,
  nameFontFamily,
  nameFontSize,
  nameFontWeight,
  nameTextTransform,
  nameFontStyle,
  nameTextDecoration,
  nameLineHeight,
  nameLetterSpacing,
  nameWordSpacing,
  roleColor,
  roleFontFamily,
  roleFontSize,
  roleFontWeight,
  roleTextTransform,
  roleFontStyle,
  roleTextDecoration,
  roleLineHeight,
  roleLetterSpacing,
  roleWordSpacing,
  bioColor,
  bioFontFamily,
  bioFontSize,
  bioFontWeight,
  bioTextTransform,
  bioFontStyle,
  bioTextDecoration,
  bioLineHeight,
  bioLetterSpacing,
  bioWordSpacing,
  accentColor,
  cardBackground,
  borderRadius,
  borderRadiusTopLeft,
  borderRadiusTopRight,
  borderRadiusBottomRight,
  borderRadiusBottomLeft,
  cardBorderStyle,
  cardBorderWidth,
  cardBorderWidthTop,
  cardBorderWidthRight,
  cardBorderWidthBottom,
  cardBorderWidthLeft,
  cardBorderColor,
  cardBoxShadow,
}: {
  photo?: string;
  name: string;
  role?: string;
  bio?: string;
  socialLinks?: SocialLink[];
  photoSize?: string;
  photoShape?: "circle" | "square" | "rounded";
  nameColor?: string;
  nameFontFamily?: string;
  nameFontSize?: string;
  nameFontWeight?: string;
  nameTextTransform?: CSSProperties["textTransform"];
  nameFontStyle?: CSSProperties["fontStyle"];
  nameTextDecoration?: string;
  nameLineHeight?: string;
  nameLetterSpacing?: string;
  nameWordSpacing?: string;
  roleColor?: string;
  roleFontFamily?: string;
  roleFontSize?: string;
  roleFontWeight?: string;
  roleTextTransform?: CSSProperties["textTransform"];
  roleFontStyle?: CSSProperties["fontStyle"];
  roleTextDecoration?: string;
  roleLineHeight?: string;
  roleLetterSpacing?: string;
  roleWordSpacing?: string;
  bioColor?: string;
  bioFontFamily?: string;
  bioFontSize?: string;
  bioFontWeight?: string;
  bioTextTransform?: CSSProperties["textTransform"];
  bioFontStyle?: CSSProperties["fontStyle"];
  bioTextDecoration?: string;
  bioLineHeight?: string;
  bioLetterSpacing?: string;
  bioWordSpacing?: string;
  accentColor?: string;
  cardBackground?: string;
  borderRadius?: string;
  borderRadiusTopLeft?: string;
  borderRadiusTopRight?: string;
  borderRadiusBottomRight?: string;
  borderRadiusBottomLeft?: string;
  cardBorderStyle?: "none" | "solid" | "dashed" | "dotted";
  cardBorderWidth?: string;
  cardBorderWidthTop?: string;
  cardBorderWidthRight?: string;
  cardBorderWidthBottom?: string;
  cardBorderWidthLeft?: string;
  cardBorderColor?: string;
  cardBoxShadow?: string;
}) {
  const accent = accentColor || "#2563FF";
  const radius = photoShape === "square" ? "0px" : photoShape === "rounded" ? "16px" : "9999px";
  return (
    <div
      style={{
        textAlign: "center",
        background: cardBackground || undefined,
        borderTopLeftRadius: borderRadiusTopLeft || borderRadius || "16px",
        borderTopRightRadius: borderRadiusTopRight || borderRadius || "16px",
        borderBottomRightRadius: borderRadiusBottomRight || borderRadius || "16px",
        borderBottomLeftRadius: borderRadiusBottomLeft || borderRadius || "16px",
        borderStyle: cardBorderStyle && cardBorderStyle !== "none" ? cardBorderStyle : undefined,
        borderTopWidth: cardBorderStyle && cardBorderStyle !== "none" ? `var(--exr-cardBorderWidthTop, ${cardBorderWidthTop || cardBorderWidth || "1px"})` : undefined,
        borderRightWidth: cardBorderStyle && cardBorderStyle !== "none" ? `var(--exr-cardBorderWidthRight, ${cardBorderWidthRight || cardBorderWidth || "1px"})` : undefined,
        borderBottomWidth: cardBorderStyle && cardBorderStyle !== "none" ? `var(--exr-cardBorderWidthBottom, ${cardBorderWidthBottom || cardBorderWidth || "1px"})` : undefined,
        borderLeftWidth: cardBorderStyle && cardBorderStyle !== "none" ? `var(--exr-cardBorderWidthLeft, ${cardBorderWidthLeft || cardBorderWidth || "1px"})` : undefined,
        borderColor: cardBorderStyle && cardBorderStyle !== "none" ? cardBorderColor || undefined : undefined,
        boxShadow: cardBoxShadow ? `var(--exr-cardBoxShadow, ${cardBoxShadow})` : undefined,
        padding: cardBackground ? "24px" : undefined,
      }}
    >
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolveImageUrl(photo)}
          alt={name}
          style={{ width: `var(--exr-photoSize, ${photoSize || "140px"})`, height: `var(--exr-photoSize, ${photoSize || "140px"})`, objectFit: "cover", borderRadius: radius, margin: "0 auto 16px" }}
        />
      )}
      <h3
        style={{
          color: `var(--exr-nameColor, ${nameColor || "inherit"})`,
          fontFamily: nameFontFamily && nameFontFamily !== "inherit" ? nameFontFamily : undefined,
          fontSize: `var(--exr-nameFontSize, ${nameFontSize || "18px"})`,
          fontWeight: `var(--exr-nameFontWeight, ${nameFontWeight || "700"})` as CSSProperties["fontWeight"],
          textTransform: `var(--exr-nameTextTransform, ${nameTextTransform || "none"})` as CSSProperties["textTransform"],
          fontStyle: `var(--exr-nameFontStyle, ${nameFontStyle || "normal"})` as CSSProperties["fontStyle"],
          textDecoration: `var(--exr-nameTextDecoration, ${nameTextDecoration || "none"})`,
          lineHeight: nameLineHeight ? `var(--exr-nameLineHeight, ${nameLineHeight})` : undefined,
          letterSpacing: nameLetterSpacing ? `var(--exr-nameLetterSpacing, ${nameLetterSpacing})` : undefined,
          wordSpacing: nameWordSpacing ? `var(--exr-nameWordSpacing, ${nameWordSpacing})` : undefined,
          margin: 0,
        }}
      >
        {name}
      </h3>
      {role && (
        <div
          style={{
            color: `var(--exr-roleColor, ${roleColor || accent})`,
            fontFamily: roleFontFamily && roleFontFamily !== "inherit" ? roleFontFamily : undefined,
            fontSize: `var(--exr-roleFontSize, ${roleFontSize || "13px"})`,
            fontWeight: `var(--exr-roleFontWeight, ${roleFontWeight || "600"})` as CSSProperties["fontWeight"],
            textTransform: `var(--exr-roleTextTransform, ${roleTextTransform || "none"})` as CSSProperties["textTransform"],
            fontStyle: `var(--exr-roleFontStyle, ${roleFontStyle || "normal"})` as CSSProperties["fontStyle"],
            textDecoration: `var(--exr-roleTextDecoration, ${roleTextDecoration || "none"})`,
            lineHeight: roleLineHeight ? `var(--exr-roleLineHeight, ${roleLineHeight})` : undefined,
            letterSpacing: roleLetterSpacing ? `var(--exr-roleLetterSpacing, ${roleLetterSpacing})` : undefined,
            wordSpacing: roleWordSpacing ? `var(--exr-roleWordSpacing, ${roleWordSpacing})` : undefined,
            marginTop: "2px",
          }}
        >
          {role}
        </div>
      )}
      {bio && (
        <p
          style={{
            color: `var(--exr-bioColor, ${bioColor || "inherit"})`,
            fontFamily: bioFontFamily && bioFontFamily !== "inherit" ? bioFontFamily : undefined,
            fontSize: `var(--exr-bioFontSize, ${bioFontSize || "inherit"})`,
            fontWeight: `var(--exr-bioFontWeight, ${bioFontWeight || "400"})` as CSSProperties["fontWeight"],
            textTransform: `var(--exr-bioTextTransform, ${bioTextTransform || "none"})` as CSSProperties["textTransform"],
            fontStyle: `var(--exr-bioFontStyle, ${bioFontStyle || "normal"})` as CSSProperties["fontStyle"],
            textDecoration: `var(--exr-bioTextDecoration, ${bioTextDecoration || "none"})`,
            lineHeight: bioLineHeight ? `var(--exr-bioLineHeight, ${bioLineHeight})` : undefined,
            letterSpacing: bioLetterSpacing ? `var(--exr-bioLetterSpacing, ${bioLetterSpacing})` : undefined,
            wordSpacing: bioWordSpacing ? `var(--exr-bioWordSpacing, ${bioWordSpacing})` : undefined,
            marginTop: "10px",
          }}
        >
          {bio}
        </p>
      )}
      {socialLinks && socialLinks.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "14px" }}>
          {socialLinks.map((link, i) => (
            <a key={i} href={link.url} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "9999px", background: "rgba(0,0,0,0.06)", color: accent }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d={SOCIAL_ICON_GLYPH[link.platform] || SOCIAL_ICON_GLYPH.website} />
              </svg>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function PriceTable({
  planName,
  price,
  period,
  description,
  features,
  ctaLabel,
  ctaUrl,
  badge,
  featured,
  cardBackground,
  featuredBackground,
  accentColor,
  planNameColor,
  priceColor,
  priceFontSize,
  featureColor,
  featureFontSize,
  borderRadius,
  borderRadiusTopLeft,
  borderRadiusTopRight,
  borderRadiusBottomRight,
  borderRadiusBottomLeft,
  cardBorderStyle,
  cardBorderWidth,
  cardBorderWidthTop,
  cardBorderWidthRight,
  cardBorderWidthBottom,
  cardBorderWidthLeft,
  cardBorderColor,
  cardBoxShadow,
  ctaBackground,
  ctaColor,
  ctaHoverBackground,
  ctaHoverColor,
  ctaBorderRadius,
  ctaFontFamily,
  ctaFontSize,
  ctaFontWeight,
}: {
  planName: string;
  price: string;
  period?: string;
  description?: string;
  features?: PriceFeature[];
  ctaLabel?: string;
  ctaUrl?: string;
  badge?: string;
  featured?: boolean;
  cardBackground?: string;
  featuredBackground?: string;
  accentColor?: string;
  planNameColor?: string;
  priceColor?: string;
  priceFontSize?: string;
  featureColor?: string;
  featureFontSize?: string;
  borderRadius?: string;
  borderRadiusTopLeft?: string;
  borderRadiusTopRight?: string;
  borderRadiusBottomRight?: string;
  borderRadiusBottomLeft?: string;
  cardBorderStyle?: "none" | "solid" | "dashed" | "dotted";
  cardBorderWidth?: string;
  cardBorderWidthTop?: string;
  cardBorderWidthRight?: string;
  cardBorderWidthBottom?: string;
  cardBorderWidthLeft?: string;
  cardBorderColor?: string;
  cardBoxShadow?: string;
  ctaBackground?: string;
  ctaColor?: string;
  ctaHoverBackground?: string;
  ctaHoverColor?: string;
  ctaBorderRadius?: string;
  ctaFontFamily?: string;
  ctaFontSize?: string;
  ctaFontWeight?: string;
}) {
  const accent = accentColor || "#2563FF";
  const bg = featured ? featuredBackground || accent : cardBackground || "#fff";
  const textOnAccent = featured && !featuredBackground;
  const hasCtaHover = ctaHoverBackground || ctaHoverColor;
  const ctaHoverClass = hasCtaHover ? `pt-cta-h${hashString(`${ctaHoverBackground ?? ""}|${ctaHoverColor ?? ""}`)}` : "";
  const ctaBg = ctaBackground || (textOnAccent ? "rgba(255,255,255,0.2)" : accent);
  const ctaFg = ctaColor || "#fff";
  return (
    <div
      style={{
        position: "relative",
        background: bg,
        borderTopLeftRadius: borderRadiusTopLeft || borderRadius || "16px",
        borderTopRightRadius: borderRadiusTopRight || borderRadius || "16px",
        borderBottomRightRadius: borderRadiusBottomRight || borderRadius || "16px",
        borderBottomLeftRadius: borderRadiusBottomLeft || borderRadius || "16px",
        padding: "32px 28px",
        borderStyle: cardBorderStyle && cardBorderStyle !== "none" ? cardBorderStyle : undefined,
        borderTopWidth: cardBorderStyle && cardBorderStyle !== "none" ? `var(--exr-cardBorderWidthTop, ${cardBorderWidthTop || cardBorderWidth || "1px"})` : undefined,
        borderRightWidth: cardBorderStyle && cardBorderStyle !== "none" ? `var(--exr-cardBorderWidthRight, ${cardBorderWidthRight || cardBorderWidth || "1px"})` : undefined,
        borderBottomWidth: cardBorderStyle && cardBorderStyle !== "none" ? `var(--exr-cardBorderWidthBottom, ${cardBorderWidthBottom || cardBorderWidth || "1px"})` : undefined,
        borderLeftWidth: cardBorderStyle && cardBorderStyle !== "none" ? `var(--exr-cardBorderWidthLeft, ${cardBorderWidthLeft || cardBorderWidth || "1px"})` : undefined,
        borderColor: cardBorderStyle && cardBorderStyle !== "none" ? cardBorderColor || undefined : undefined,
        boxShadow: `var(--exr-cardBoxShadow, ${cardBoxShadow || (featured ? "0 20px 40px rgba(0,0,0,0.14)" : "0 10px 24px rgba(0,0,0,0.06)")})`,
      }}
    >
      {badge && (
        <span style={{ position: "absolute", top: "-12px", right: "24px", borderRadius: "9999px", padding: "4px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", background: accent, color: "#fff" }}>{badge}</span>
      )}
      <div style={{ color: textOnAccent ? "rgba(255,255,255,0.85)" : `var(--exr-planNameColor, ${planNameColor || "inherit"})`, fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{planName}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "10px" }}>
        <span style={{ color: textOnAccent ? "#fff" : `var(--exr-priceColor, ${priceColor || "inherit"})`, fontSize: `var(--exr-priceFontSize, ${priceFontSize || "40px"})`, fontWeight: 800 }}>{price}</span>
        {period && <span style={{ color: textOnAccent ? "rgba(255,255,255,0.7)" : "#999", fontSize: "13px" }}>{period}</span>}
      </div>
      {description && <p style={{ color: textOnAccent ? "rgba(255,255,255,0.85)" : "#666", marginTop: "8px", fontSize: "13px" }}>{description}</p>}
      {features && features.length > 0 && (
        <ul style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "10px", listStyle: "none", padding: 0 }}>
          {features.map((f, i) => (
            <li key={i} style={{ display: "flex", alignItems: "center", gap: "8px", opacity: f.included ? 1 : 0.4, color: textOnAccent ? "#fff" : `var(--exr-featureColor, ${featureColor || "inherit"})`, fontSize: `var(--exr-featureFontSize, ${featureFontSize || "14px"})` }}>
              <span style={{ color: textOnAccent ? "#fff" : accent }}>{f.included ? "✓" : "✕"}</span>
              {f.text}
            </li>
          ))}
        </ul>
      )}
      {ctaLabel && ctaUrl && (
        <>
          {hasCtaHover && (
            <style
              dangerouslySetInnerHTML={{
                __html: `.${ctaHoverClass}:hover{${[
                  `background:${ctaHoverBackground || ctaBg} !important;`,
                  `color:${ctaHoverColor || ctaFg} !important;`,
                ].join("")}}`,
              }}
            />
          )}
          <a
            href={ctaUrl}
            className={ctaHoverClass}
            style={{
              display: "block",
              textAlign: "center",
              marginTop: "24px",
              padding: "12px",
              borderRadius: `var(--exr-ctaBorderRadius, ${ctaBorderRadius || "9999px"})`,
              fontFamily: ctaFontFamily && ctaFontFamily !== "inherit" ? ctaFontFamily : undefined,
              fontSize: ctaFontSize || "14px",
              fontWeight: (ctaFontWeight || "600") as CSSProperties["fontWeight"],
              background: ctaBg,
              color: ctaFg,
              transition: "background 0.2s ease, color 0.2s ease",
            }}
          >
            {ctaLabel}
          </a>
        </>
      )}
    </div>
  );
}

function BusinessHours({
  items,
  dayColor,
  dayFontSize,
  dayFontWeight,
  hoursColor,
  hoursFontSize,
  closedColor,
  closedLabel,
  dividerColor,
}: {
  items: BusinessHourItem[];
  dayColor?: string;
  dayFontSize?: string;
  dayFontWeight?: string;
  hoursColor?: string;
  hoursFontSize?: string;
  closedColor?: string;
  closedLabel?: string;
  dividerColor?: string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {items.map((item, i) => (
        <li
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "10px 0",
            borderBottom: i < items.length - 1 ? `1px solid var(--exr-dividerColor, ${dividerColor || "rgba(0,0,0,0.08)"})` : undefined,
          }}
        >
          <span style={{ color: `var(--exr-dayColor, ${dayColor || "inherit"})`, fontSize: dayFontSize ? `var(--exr-dayFontSize, ${dayFontSize})` : undefined, fontWeight: `var(--exr-dayFontWeight, ${dayFontWeight || "600"})` }}>{item.day}</span>
          <span style={{ color: item.closed ? closedColor || "#ef4444" : `var(--exr-hoursColor, ${hoursColor || "inherit"})`, fontSize: hoursFontSize ? `var(--exr-hoursFontSize, ${hoursFontSize})` : undefined }}>
            {item.closed ? closedLabel || "Closed" : item.hours}
          </span>
        </li>
      ))}
    </ul>
  );
}

function DualColorHeading({
  part1,
  part2,
  level,
  align,
  part1Color,
  part2Color,
  fontFamily,
  fontSize,
  fontWeight,
}: {
  part1: string;
  part2: string;
  level?: string;
  align?: "left" | "center" | "right";
  part1Color?: string;
  part2Color?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
}) {
  const Tag = (level || "h2") as ElementType;
  return (
    <>
      <GoogleFontLink family={fontFamily} />
      <Tag
        style={{
          textAlign: `var(--exr-align, ${align || "left"})` as CSSProperties["textAlign"],
          fontFamily: fontFamily && fontFamily !== "inherit" ? fontFamily : undefined,
          fontSize: `var(--exr-fontSize, ${fontSize || "inherit"})`,
          fontWeight: `var(--exr-fontWeight, ${fontWeight || "800"})`,
          margin: 0,
          lineHeight: 1.15,
        }}
      >
        <span style={{ color: `var(--exr-part1Color, ${part1Color || "inherit"})` }}>{part1} </span>
        <span style={{ color: `var(--exr-part2Color, ${part2Color || "#2563FF"})` }}>{part2}</span>
      </Tag>
    </>
  );
}

function MarketingButton({
  icon,
  title,
  subtitle,
  url,
  openInNewTab,
  background,
  color,
  subtitleColor,
  iconColor,
  borderRadius,
  borderRadiusTopLeft,
  borderRadiusTopRight,
  borderRadiusBottomRight,
  borderRadiusBottomLeft,
  borderStyle,
  borderWidth,
  borderWidthTop,
  borderWidthRight,
  borderWidthBottom,
  borderWidthLeft,
  borderColor,
  boxShadow,
  hoverBackground,
  hoverColor,
  hoverBorderColor,
  hoverBoxShadow,
}: {
  icon?: string;
  title: string;
  subtitle?: string;
  url: string;
  openInNewTab?: boolean;
  background?: string;
  color?: string;
  subtitleColor?: string;
  iconColor?: string;
  borderRadius?: string;
  borderRadiusTopLeft?: string;
  borderRadiusTopRight?: string;
  borderRadiusBottomRight?: string;
  borderRadiusBottomLeft?: string;
  borderStyle?: "none" | "solid" | "dashed" | "dotted";
  borderWidth?: string;
  borderWidthTop?: string;
  borderWidthRight?: string;
  borderWidthBottom?: string;
  borderWidthLeft?: string;
  borderColor?: string;
  boxShadow?: string;
  hoverBackground?: string;
  hoverColor?: string;
  hoverBorderColor?: string;
  hoverBoxShadow?: string;
}) {
  // background/border*/boxShadow are desktop-only bare BOX_MODEL_KEYS names —
  // same collision tradeoff CTAButton already accepts (see styleKeys.ts).
  const hasHoverOverride = hoverBackground || hoverColor || hoverBorderColor || hoverBoxShadow;
  const hoverClassName = hasHoverOverride
    ? `mkt-btn-h${hashString(`${hoverBackground ?? ""}|${hoverColor ?? ""}|${hoverBorderColor ?? ""}|${hoverBoxShadow ?? ""}`)}`
    : "";
  return (
    <>
      {hasHoverOverride && (
        <style
          dangerouslySetInnerHTML={{
            __html: `.${hoverClassName}:hover{${[
              hoverBackground && `background:${hoverBackground} !important;`,
              hoverColor && `color:${hoverColor} !important;`,
              hoverBorderColor && `border-color:${hoverBorderColor} !important;`,
              hoverBoxShadow && `box-shadow:${hoverBoxShadow} !important;`,
            ]
              .filter(Boolean)
              .join("")}}`,
          }}
        />
      )}
      <a
        href={url}
        target={openInNewTab ? "_blank" : undefined}
        rel={openInNewTab ? "noopener noreferrer" : undefined}
        className={hoverClassName}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "14px",
          padding: "14px 24px",
          borderTopLeftRadius: borderRadiusTopLeft || borderRadius || "12px",
          borderTopRightRadius: borderRadiusTopRight || borderRadius || "12px",
          borderBottomRightRadius: borderRadiusBottomRight || borderRadius || "12px",
          borderBottomLeftRadius: borderRadiusBottomLeft || borderRadius || "12px",
          background: background || "#2563FF",
          borderStyle: borderStyle && borderStyle !== "none" ? borderStyle : undefined,
          borderTopWidth: borderStyle && borderStyle !== "none" ? (borderWidthTop || borderWidth || "1px") : undefined,
          borderRightWidth: borderStyle && borderStyle !== "none" ? (borderWidthRight || borderWidth || "1px") : undefined,
          borderBottomWidth: borderStyle && borderStyle !== "none" ? (borderWidthBottom || borderWidth || "1px") : undefined,
          borderLeftWidth: borderStyle && borderStyle !== "none" ? (borderWidthLeft || borderWidth || "1px") : undefined,
          borderColor: borderStyle && borderStyle !== "none" ? borderColor || undefined : undefined,
          boxShadow: boxShadow || undefined,
          textDecoration: "none",
          transition: "background 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
        }}
      >
        {icon && (
          <span style={{ color: `var(--exr-iconColor, ${iconColor || "#fff"})`, fontSize: "22px" }}>
            <IconGlyph icon={icon} />
          </span>
        )}
        <span style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ color: `var(--exr-color, ${color || "#fff"})`, fontWeight: 700, fontSize: "15px" }}>{title}</span>
          {subtitle && <span style={{ color: `var(--exr-subtitleColor, ${subtitleColor || "rgba(255,255,255,0.75)"})`, fontSize: "12px" }}>{subtitle}</span>}
        </span>
      </a>
    </>
  );
}

// Longhand (not shorthand `border`) so these compose cleanly with the
// block-level buttonBorder* Style-tab fields below — mixing a `border`
// shorthand and longhand `borderColor` in the same style object leaves the
// browser's cascade, not this code, deciding which one wins.
const MULTI_BUTTON_VARIANT_DEFAULTS: Record<string, { background: string; color: string; borderColor?: string; borderWidth?: string; borderStyle?: string }> = {
  gold: { background: "#2563FF", color: "#fff" },
  white: { background: "#fff", color: "#111" },
  outline: { background: "transparent", color: "#2563FF", borderColor: "#2563FF", borderWidth: "1.5px", borderStyle: "solid" },
};

function MultiButtons({
  buttons,
  layout,
  gap,
  align,
  buttonFontFamily,
  buttonFontSize,
  buttonFontWeight,
  buttonLineHeight,
  buttonLetterSpacing,
  buttonTextTransform,
  buttonBackground,
  buttonColor,
  buttonHoverBackground,
  buttonHoverColor,
  buttonBorderStyle,
  buttonBorderWidth,
  buttonBorderWidthTop,
  buttonBorderWidthRight,
  buttonBorderWidthBottom,
  buttonBorderWidthLeft,
  buttonBorderColor,
  buttonHoverBorderColor,
  buttonBorderRadiusTop,
  buttonBorderRadiusRight,
  buttonBorderRadiusBottom,
  buttonBorderRadiusLeft,
  buttonPaddingTop,
  buttonPaddingRight,
  buttonPaddingBottom,
  buttonPaddingLeft,
  buttonMarginTop,
  buttonMarginRight,
  buttonMarginBottom,
  buttonMarginLeft,
  buttonBoxShadow,
  buttonHoverBoxShadow,
}: {
  buttons: MultiButtonItem[];
  layout?: "row" | "column";
  gap?: string;
  align?: "flex-start" | "center" | "flex-end";
  buttonFontFamily?: string;
  buttonFontSize?: string;
  buttonFontWeight?: string;
  buttonLineHeight?: string;
  buttonLetterSpacing?: string;
  buttonTextTransform?: CSSProperties["textTransform"];
  buttonBackground?: string;
  buttonColor?: string;
  buttonHoverBackground?: string;
  buttonHoverColor?: string;
  buttonBorderStyle?: "none" | "solid" | "dashed" | "dotted" | "double";
  buttonBorderWidth?: string;
  buttonBorderWidthTop?: string;
  buttonBorderWidthRight?: string;
  buttonBorderWidthBottom?: string;
  buttonBorderWidthLeft?: string;
  buttonBorderColor?: string;
  buttonHoverBorderColor?: string;
  buttonBorderRadiusTop?: string;
  buttonBorderRadiusRight?: string;
  buttonBorderRadiusBottom?: string;
  buttonBorderRadiusLeft?: string;
  buttonPaddingTop?: string;
  buttonPaddingRight?: string;
  buttonPaddingBottom?: string;
  buttonPaddingLeft?: string;
  buttonMarginTop?: string;
  buttonMarginRight?: string;
  buttonMarginBottom?: string;
  buttonMarginLeft?: string;
  buttonBoxShadow?: string;
  buttonHoverBoxShadow?: string;
}) {
  if (!buttons || buttons.length === 0) return null;

  const hasBlockHover = buttonHoverBackground || buttonHoverColor || buttonHoverBorderColor || buttonHoverBoxShadow;

  return (
    <div style={{ display: "flex", flexDirection: layout === "column" ? "column" : "row", flexWrap: "wrap", gap: gap || "12px", alignItems: align || "flex-start" }}>
      {buttons.map((btn, i) => {
        const preset = MULTI_BUTTON_VARIANT_DEFAULTS[btn.variant] ?? MULTI_BUTTON_VARIANT_DEFAULTS.gold;
        // Fallback chain per field: this button's own override > the
        // block-level Style-tab default (applies to every button) > the
        // variant preset (gold/white/outline).
        const background = btn.background || buttonBackground || preset.background;
        const color = btn.color || buttonColor || preset.color;
        const hasHoverOverride = btn.hoverBackground || btn.hoverColor || hasBlockHover;
        const hoverClassName = hasHoverOverride ? `mb-btn-h${hashString(`${i}|${btn.hoverBackground ?? ""}|${btn.hoverColor ?? ""}`)}` : "";
        const IconCmp = btn.icon ? <IconGlyph icon={btn.icon} /> : null;

        return (
          <Fragment key={i}>
            {hasHoverOverride && (
              <style
                dangerouslySetInnerHTML={{
                  __html: `.${hoverClassName}:hover{${[
                    `background:${btn.hoverBackground || buttonHoverBackground || background} !important;`,
                    `color:${btn.hoverColor || buttonHoverColor || color} !important;`,
                    buttonHoverBorderColor && `border-color:${buttonHoverBorderColor} !important;`,
                    buttonHoverBoxShadow && `box-shadow:${buttonHoverBoxShadow} !important;`,
                  ]
                    .filter(Boolean)
                    .join("")}}`,
                }}
              />
            )}
            <a
              href={btn.url}
              target={btn.openInNewTab ? "_blank" : undefined}
              rel={btn.openInNewTab ? "noopener noreferrer" : undefined}
              className={hoverClassName}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                textDecoration: "none",
                transition: "background 0.2s ease, color 0.2s ease, border-color 0.2s ease",
                fontFamily: buttonFontFamily && buttonFontFamily !== "inherit" ? buttonFontFamily : undefined,
                fontSize: `var(--exr-buttonFontSize, ${buttonFontSize || "14px"})`,
                fontWeight: `var(--exr-buttonFontWeight, ${buttonFontWeight || "600"})` as CSSProperties["fontWeight"],
                lineHeight: buttonLineHeight ? `var(--exr-buttonLineHeight, ${buttonLineHeight})` : undefined,
                letterSpacing: buttonLetterSpacing ? `var(--exr-buttonLetterSpacing, ${buttonLetterSpacing})` : undefined,
                textTransform: `var(--exr-buttonTextTransform, ${buttonTextTransform || "none"})` as CSSProperties["textTransform"],
                background: `var(--exr-buttonBackground, ${background})`,
                color: `var(--exr-buttonColor, ${color})`,
                borderStyle: (buttonBorderStyle && buttonBorderStyle !== "none" ? buttonBorderStyle : preset.borderStyle) as CSSProperties["borderStyle"],
                borderTopWidth: `var(--exr-buttonBorderWidthTop, ${buttonBorderWidthTop || buttonBorderWidth || preset.borderWidth || "0px"})`,
                borderRightWidth: `var(--exr-buttonBorderWidthRight, ${buttonBorderWidthRight || buttonBorderWidth || preset.borderWidth || "0px"})`,
                borderBottomWidth: `var(--exr-buttonBorderWidthBottom, ${buttonBorderWidthBottom || buttonBorderWidth || preset.borderWidth || "0px"})`,
                borderLeftWidth: `var(--exr-buttonBorderWidthLeft, ${buttonBorderWidthLeft || buttonBorderWidth || preset.borderWidth || "0px"})`,
                borderColor: `var(--exr-buttonBorderColor, ${buttonBorderColor || preset.borderColor || "transparent"})`,
                borderRadius: btn.borderRadius
                  ? btn.borderRadius
                  : `var(--exr-buttonBorderRadiusTop, ${buttonBorderRadiusTop || "9999px"}) var(--exr-buttonBorderRadiusRight, ${buttonBorderRadiusRight || "9999px"}) var(--exr-buttonBorderRadiusBottom, ${buttonBorderRadiusBottom || "9999px"}) var(--exr-buttonBorderRadiusLeft, ${buttonBorderRadiusLeft || "9999px"})`,
                paddingTop: `var(--exr-buttonPaddingTop, ${buttonPaddingTop || "12px"})`,
                paddingRight: `var(--exr-buttonPaddingRight, ${buttonPaddingRight || "24px"})`,
                paddingBottom: `var(--exr-buttonPaddingBottom, ${buttonPaddingBottom || "12px"})`,
                paddingLeft: `var(--exr-buttonPaddingLeft, ${buttonPaddingLeft || "24px"})`,
                marginTop: buttonMarginTop ? `var(--exr-buttonMarginTop, ${buttonMarginTop})` : undefined,
                marginRight: buttonMarginRight ? `var(--exr-buttonMarginRight, ${buttonMarginRight})` : undefined,
                marginBottom: buttonMarginBottom ? `var(--exr-buttonMarginBottom, ${buttonMarginBottom})` : undefined,
                marginLeft: buttonMarginLeft ? `var(--exr-buttonMarginLeft, ${buttonMarginLeft})` : undefined,
                boxShadow: buttonBoxShadow ? `var(--exr-buttonBoxShadow, ${buttonBoxShadow})` : undefined,
              }}
            >
              {btn.iconPosition === "before" && IconCmp}
              {btn.label}
              {btn.iconPosition === "after" && IconCmp}
            </a>
          </Fragment>
        );
      })}
    </div>
  );
}

// ── Self-Contained Interactive & Layout Modules ──────────────────────────

function Blockquote({
  quote,
  authorName,
  authorRole,
  authorAvatar,
  quoteColor,
  quoteFontFamily,
  quoteFontSize,
  quoteFontWeight,
  quoteTextTransform,
  quoteFontStyle,
  quoteTextDecoration,
  quoteLineHeight,
  quoteLetterSpacing,
  quoteWordSpacing,
  authorNameColor,
  authorNameFontFamily,
  authorNameFontSize,
  authorNameFontWeight,
  authorNameTextTransform,
  authorNameFontStyle,
  authorNameTextDecoration,
  authorNameLineHeight,
  authorNameLetterSpacing,
  authorNameWordSpacing,
  authorRoleColor,
  authorRoleFontSize,
  accentColor,
  cardBackground,
  borderRadius,
  borderRadiusTopLeft,
  borderRadiusTopRight,
  borderRadiusBottomRight,
  borderRadiusBottomLeft,
  cardBorderStyle,
  cardBorderWidth,
  cardBorderWidthTop,
  cardBorderWidthRight,
  cardBorderWidthBottom,
  cardBorderWidthLeft,
  cardBorderColor,
  cardBoxShadow,
}: {
  quote: string;
  authorName?: string;
  authorRole?: string;
  authorAvatar?: string;
  quoteColor?: string;
  quoteFontFamily?: string;
  quoteFontSize?: string;
  quoteFontWeight?: string;
  quoteTextTransform?: CSSProperties["textTransform"];
  quoteFontStyle?: CSSProperties["fontStyle"];
  quoteTextDecoration?: string;
  quoteLineHeight?: string;
  quoteLetterSpacing?: string;
  quoteWordSpacing?: string;
  authorNameColor?: string;
  authorNameFontFamily?: string;
  authorNameFontSize?: string;
  authorNameFontWeight?: string;
  authorNameTextTransform?: CSSProperties["textTransform"];
  authorNameFontStyle?: CSSProperties["fontStyle"];
  authorNameTextDecoration?: string;
  authorNameLineHeight?: string;
  authorNameLetterSpacing?: string;
  authorNameWordSpacing?: string;
  authorRoleColor?: string;
  authorRoleFontSize?: string;
  accentColor?: string;
  cardBackground?: string;
  borderRadius?: string;
  borderRadiusTopLeft?: string;
  borderRadiusTopRight?: string;
  borderRadiusBottomRight?: string;
  borderRadiusBottomLeft?: string;
  cardBorderStyle?: "none" | "solid" | "dashed" | "dotted";
  cardBorderWidth?: string;
  cardBorderWidthTop?: string;
  cardBorderWidthRight?: string;
  cardBorderWidthBottom?: string;
  cardBorderWidthLeft?: string;
  cardBorderColor?: string;
  cardBoxShadow?: string;
}) {
  const accent = accentColor || "#2563FF";
  return (
    <blockquote
      style={{
        position: "relative",
        background: cardBackground || undefined,
        borderTopLeftRadius: borderRadiusTopLeft || borderRadius || "16px",
        borderTopRightRadius: borderRadiusTopRight || borderRadius || "16px",
        borderBottomRightRadius: borderRadiusBottomRight || borderRadius || "16px",
        borderBottomLeftRadius: borderRadiusBottomLeft || borderRadius || "16px",
        padding: cardBackground ? "32px" : "0 0 0 24px",
        // Full border/shadow apply first, then the signature accent-colored
        // left bar overrides that one edge — preserves the classic
        // blockquote look by default, and still composes if a full border
        // is set (see MultiButtons for the same shorthand/longhand ordering).
        borderStyle: cardBorderStyle && cardBorderStyle !== "none" ? cardBorderStyle : undefined,
        borderTopWidth: cardBorderStyle && cardBorderStyle !== "none" ? `var(--exr-cardBorderWidthTop, ${cardBorderWidthTop || cardBorderWidth || "1px"})` : undefined,
        borderRightWidth: cardBorderStyle && cardBorderStyle !== "none" ? `var(--exr-cardBorderWidthRight, ${cardBorderWidthRight || cardBorderWidth || "1px"})` : undefined,
        borderBottomWidth: cardBorderStyle && cardBorderStyle !== "none" ? `var(--exr-cardBorderWidthBottom, ${cardBorderWidthBottom || cardBorderWidth || "1px"})` : undefined,
        borderLeftWidth: cardBorderStyle && cardBorderStyle !== "none" ? `var(--exr-cardBorderWidthLeft, ${cardBorderWidthLeft || cardBorderWidth || "1px"})` : undefined,
        borderColor: cardBorderStyle && cardBorderStyle !== "none" ? cardBorderColor || undefined : undefined,
        boxShadow: cardBoxShadow ? `var(--exr-cardBoxShadow, ${cardBoxShadow})` : undefined,
        borderLeft: `4px solid ${accent}`,
        margin: 0,
      }}
    >
      <svg width="28" height="22" viewBox="0 0 32 24" fill={accent} style={{ marginBottom: "12px", opacity: 0.5 }}>
        <path d="M0 24V14.4Q0 8 3.2 4T12 0l1.6 3.6Q9.6 5.2 7.6 8T5.2 14.4H12V24H0Zm18.4 0V14.4Q18.4 8 21.6 4T30.4 0L32 3.6Q28 5.2 26 8t-2.4 6.4h6.8V24H18.4Z" />
      </svg>
      <p
        style={{
          color: `var(--exr-quoteColor, ${quoteColor || "inherit"})`,
          fontFamily: quoteFontFamily && quoteFontFamily !== "inherit" ? quoteFontFamily : undefined,
          fontSize: `var(--exr-quoteFontSize, ${quoteFontSize || "18px"})`,
          fontWeight: `var(--exr-quoteFontWeight, ${quoteFontWeight || "400"})` as CSSProperties["fontWeight"],
          textTransform: `var(--exr-quoteTextTransform, ${quoteTextTransform || "none"})` as CSSProperties["textTransform"],
          fontStyle: `var(--exr-quoteFontStyle, ${quoteFontStyle || "italic"})` as CSSProperties["fontStyle"],
          textDecoration: `var(--exr-quoteTextDecoration, ${quoteTextDecoration || "none"})`,
          letterSpacing: quoteLetterSpacing ? `var(--exr-quoteLetterSpacing, ${quoteLetterSpacing})` : undefined,
          wordSpacing: quoteWordSpacing ? `var(--exr-quoteWordSpacing, ${quoteWordSpacing})` : undefined,
          margin: 0,
          lineHeight: quoteLineHeight ? `var(--exr-quoteLineHeight, ${quoteLineHeight})` : 1.5,
        }}
      >
        {quote}
      </p>
      {(authorName || authorRole) && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "16px" }}>
          {authorAvatar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolveImageUrl(authorAvatar)} alt={authorName || ""} style={{ width: "40px", height: "40px", borderRadius: "9999px", objectFit: "cover" }} />
          )}
          <div>
            {authorName && (
              <div
                style={{
                  color: `var(--exr-authorNameColor, ${authorNameColor || "inherit"})`,
                  fontFamily: authorNameFontFamily && authorNameFontFamily !== "inherit" ? authorNameFontFamily : undefined,
                  fontWeight: `var(--exr-authorNameFontWeight, ${authorNameFontWeight || "700"})` as CSSProperties["fontWeight"],
                  fontSize: `var(--exr-authorNameFontSize, ${authorNameFontSize || "14px"})`,
                  textTransform: `var(--exr-authorNameTextTransform, ${authorNameTextTransform || "none"})` as CSSProperties["textTransform"],
                  fontStyle: `var(--exr-authorNameFontStyle, ${authorNameFontStyle || "normal"})` as CSSProperties["fontStyle"],
                  textDecoration: `var(--exr-authorNameTextDecoration, ${authorNameTextDecoration || "none"})`,
                  lineHeight: authorNameLineHeight ? `var(--exr-authorNameLineHeight, ${authorNameLineHeight})` : undefined,
                  letterSpacing: authorNameLetterSpacing ? `var(--exr-authorNameLetterSpacing, ${authorNameLetterSpacing})` : undefined,
                  wordSpacing: authorNameWordSpacing ? `var(--exr-authorNameWordSpacing, ${authorNameWordSpacing})` : undefined,
                }}
              >
                {authorName}
              </div>
            )}
            {authorRole && (
              <div style={{ color: `var(--exr-authorRoleColor, ${authorRoleColor || "#888"})`, fontSize: `var(--exr-authorRoleFontSize, ${authorRoleFontSize || "12px"})` }}>{authorRole}</div>
            )}
          </div>
        </div>
      )}
    </blockquote>
  );
}

const CODE_KEYWORDS = new Set([
  "const", "let", "var", "function", "return", "if", "else", "for", "while", "class", "extends", "import", "export", "from", "default",
  "async", "await", "new", "this", "true", "false", "null", "undefined", "typeof", "interface", "type", "def", "print", "self", "None", "True", "False",
]);

function highlightCode(code: string): string {
  const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const tokenPattern = /(\/\/[^\n]*|#[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_]\w*\b)/g;
  return escaped.replace(tokenPattern, (match, comment, str, num, word) => {
    if (comment) return `<span style="color:#6a9955">${comment}</span>`;
    if (str) return `<span style="color:#ce9178">${str}</span>`;
    if (num) return `<span style="color:#b5cea8">${num}</span>`;
    if (word && CODE_KEYWORDS.has(word)) return `<span style="color:#c586c0">${word}</span>`;
    return match;
  });
}

function CodeHighlight({ code, language, showLineNumbers, theme, fontSize }: { code: string; language?: string; showLineNumbers?: boolean; theme?: "dark" | "light"; fontSize?: string }) {
  if (!code) return null;
  const lines = code.split("\n");
  const isDark = theme !== "light";
  return (
    <div style={{ background: isDark ? "#1e1e1e" : "#f5f5f5", borderRadius: "10px", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", borderBottom: `1px solid ${isDark ? "#333" : "#ddd"}` }}>
        <span style={{ color: isDark ? "#888" : "#666", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{language || "code"}</span>
      </div>
      <pre style={{ margin: 0, padding: "16px", overflowX: "auto", fontSize: `var(--exr-fontSize, ${fontSize || "13px"})`, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", lineHeight: 1.6 }}>
        <code>
          {lines.map((line, i) => (
            <div key={i} style={{ display: "flex" }}>
              {showLineNumbers && <span style={{ color: isDark ? "#555" : "#aaa", userSelect: "none", width: "2em", flexShrink: 0, textAlign: "right", marginRight: "16px" }}>{i + 1}</span>}
              <span style={{ color: isDark ? "#d4d4d4" : "#111", whiteSpace: "pre" }} dangerouslySetInnerHTML={{ __html: highlightCode(line) || "&nbsp;" }} />
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}

function Table({
  headers,
  rows,
  striped,
  headerBackground,
  headerColor,
  cellColor,
  borderColor,
}: {
  headers: string[];
  rows: string[][];
  striped?: boolean;
  headerBackground?: string;
  headerColor?: string;
  cellColor?: string;
  borderColor?: string;
}) {
  if ((!headers || headers.length === 0) && (!rows || rows.length === 0)) return null;
  const border = `1px solid var(--exr-borderColor, ${borderColor || "rgba(0,0,0,0.1)"})`;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        {headers && headers.length > 0 && (
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} style={{ textAlign: "left", padding: "12px 16px", background: `var(--exr-headerBackground, ${headerBackground || "#f5f5f5"})`, color: `var(--exr-headerColor, ${headerColor || "inherit"})`, fontWeight: 700, borderBottom: border }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ background: striped && ri % 2 === 1 ? "rgba(0,0,0,0.02)" : undefined }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: "12px 16px", color: `var(--exr-cellColor, ${cellColor || "inherit"})`, borderBottom: border }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Hotspot({
  image,
  points,
  pinColor,
  pinSize,
  tooltipBackground,
  tooltipColor,
  borderRadius,
  borderRadiusTopLeft,
  borderRadiusTopRight,
  borderRadiusBottomRight,
  borderRadiusBottomLeft,
}: {
  image?: string;
  points: HotspotPoint[];
  pinColor?: string;
  pinSize?: string;
  tooltipBackground?: string;
  tooltipColor?: string;
  borderRadius?: string;
  borderRadiusTopLeft?: string;
  borderRadiusTopRight?: string;
  borderRadiusBottomRight?: string;
  borderRadiusBottomLeft?: string;
}) {
  if (!image) return null;
  return (
    <div
      style={{
        position: "relative",
        borderTopLeftRadius: borderRadiusTopLeft || borderRadius || "16px",
        borderTopRightRadius: borderRadiusTopRight || borderRadius || "16px",
        borderBottomRightRadius: borderRadiusBottomRight || borderRadius || "16px",
        borderBottomLeftRadius: borderRadiusBottomLeft || borderRadius || "16px",
        overflow: "hidden",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `@keyframes exr-hotspot-pulse{0%{box-shadow:0 0 0 0 rgba(37,99,255,0.5);}100%{box-shadow:0 0 0 14px rgba(37,99,255,0);}}` }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={resolveImageUrl(image)} alt="" className="block w-full" />
      {(points || []).map((point, i) => (
        <div key={i} className="group" style={{ position: "absolute", left: `${point.x}%`, top: `${point.y}%`, transform: "translate(-50%,-50%)" }}>
          <span
            style={{
              display: "block",
              width: `var(--exr-pinSize, ${pinSize || "16px"})`,
              height: `var(--exr-pinSize, ${pinSize || "16px"})`,
              borderRadius: "9999px",
              background: `var(--exr-pinColor, ${pinColor || "#2563FF"})`,
              border: "2px solid #fff",
              animation: "exr-hotspot-pulse 2s ease-out infinite",
              cursor: "pointer",
            }}
          />
          <div
            className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-max max-w-[220px] -translate-x-1/2 rounded-lg px-3 py-2 text-xs opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
            style={{ background: tooltipBackground || "#111", color: tooltipColor || "#fff" }}
          >
            <div style={{ fontWeight: 700 }}>{point.title}</div>
            {point.description && <div style={{ opacity: 0.8, marginTop: "2px" }}>{point.description}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Site Utilities ────────────────────────────────────────────────────────

function Search({
  placeholder,
  buttonLabel,
  actionUrl,
  layout,
  inputBackground,
  inputColor,
  borderColor,
  buttonBackground,
  buttonColor,
  borderRadius,
  borderRadiusTopLeft,
  borderRadiusTopRight,
  borderRadiusBottomRight,
  borderRadiusBottomLeft,
}: {
  placeholder?: string;
  buttonLabel?: string;
  actionUrl?: string;
  layout?: "inline" | "expandable";
  inputBackground?: string;
  inputColor?: string;
  borderColor?: string;
  buttonBackground?: string;
  buttonColor?: string;
  borderRadius?: string;
  borderRadiusTopLeft?: string;
  borderRadiusTopRight?: string;
  borderRadiusBottomRight?: string;
  borderRadiusBottomLeft?: string;
}) {
  // A plain GET <form> — works with zero client JS: submitting sends the
  // browser to `${actionUrl}?q=...`, same as any classic HTML search box.
  return (
    <form
      action={actionUrl || "/search"}
      method="get"
      className={layout === "expandable" ? "group flex items-center" : "flex items-center"}
      style={{ gap: "8px" }}
    >
      <input
        type="search"
        name="q"
        placeholder={placeholder || "Search..."}
        className={layout === "expandable" ? "w-10 min-w-0 transition-all focus:w-48 group-focus-within:w-48" : "w-full"}
        style={{
          padding: "10px 16px",
          borderTopLeftRadius: borderRadiusTopLeft || borderRadius || "9999px",
          borderTopRightRadius: borderRadiusTopRight || borderRadius || "9999px",
          borderBottomRightRadius: borderRadiusBottomRight || borderRadius || "9999px",
          borderBottomLeftRadius: borderRadiusBottomLeft || borderRadius || "9999px",
          background: `var(--exr-inputBackground, ${inputBackground || "rgba(0,0,0,0.05)"})`,
          color: `var(--exr-inputColor, ${inputColor || "inherit"})`,
          border: `1px solid ${borderColor || "rgba(0,0,0,0.1)"}`,
        }}
      />
      <button
        type="submit"
        aria-label="Search"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: buttonLabel ? "10px 18px" : "10px",
          borderTopLeftRadius: borderRadiusTopLeft || borderRadius || "9999px",
          borderTopRightRadius: borderRadiusTopRight || borderRadius || "9999px",
          borderBottomRightRadius: borderRadiusBottomRight || borderRadius || "9999px",
          borderBottomLeftRadius: borderRadiusBottomLeft || borderRadius || "9999px",
          background: `var(--exr-buttonBackground, ${buttonBackground || "#2563FF"})`,
          color: `var(--exr-buttonColor, ${buttonColor || "#fff"})`,
          border: "none",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        {buttonLabel || (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
        )}
      </button>
    </form>
  );
}

function PostInfo({
  authorName,
  publishedDate,
  category,
  readTime,
  showAuthor,
  showDate,
  showCategory,
  showReadTime,
  separator,
  iconColor,
  textColor,
  fontSize,
  postContext,
}: {
  authorName?: string;
  publishedDate?: string;
  category?: string;
  readTime?: string;
  showAuthor?: boolean;
  showDate?: boolean;
  showCategory?: boolean;
  showReadTime?: boolean;
  separator?: string;
  iconColor?: string;
  textColor?: string;
  fontSize?: string;
  postContext?: PostContextData;
}) {
  // Inside an active "blog_single" template, real post data always wins
  // over these static fields — they exist for this block's other use (any
  // admin manually typing an info line elsewhere), not as a per-post
  // override an admin would otherwise have to re-type identically on every
  // single post.
  const resolvedAuthor = postContext ? postContext.author?.name || "" : authorName;
  const resolvedDate = postContext ? formatDate(postContext.publishedAt) : publishedDate;
  const resolvedCategory = postContext ? postContext.categories.map((c) => c.name).join(", ") : category;
  const resolvedReadTime = postContext ? (postContext.readingTime ? `${postContext.readingTime} min read` : "") : readTime;

  const parts = [
    showAuthor && resolvedAuthor,
    showDate && resolvedDate,
    showCategory && resolvedCategory,
    showReadTime && resolvedReadTime,
  ].filter(Boolean) as string[];
  if (parts.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", color: `var(--exr-textColor, ${textColor || "inherit"})`, fontSize: `var(--exr-fontSize, ${fontSize || "13px"})` }}>
      {parts.map((part, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {i > 0 && <span style={{ color: iconColor || "#999" }}>{separator || "•"}</span>}
          {part}
        </span>
      ))}
    </div>
  );
}

function Lottie({ animationUrl, height, placeholderBackground, placeholderColor }: { animationUrl?: string; height?: string; placeholderBackground?: string; placeholderColor?: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        height: height || "300px",
        borderRadius: "12px",
        background: `var(--exr-placeholderBackground, ${placeholderBackground || "rgba(0,0,0,0.04)"})`,
        color: `var(--exr-placeholderColor, ${placeholderColor || "#999"})`,
      }}
    >
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="9" />
        <path d="M10 8l6 4-6 4V8Z" fill="currentColor" stroke="none" />
      </svg>
      <span style={{ fontSize: "12px" }}>{animationUrl ? "Lottie animation configured" : "No animation URL set"}</span>
    </div>
  );
}

function FormEmbedStyler({
  label,
  embedCode,
  formBackground,
  borderRadius,
  borderRadiusTopLeft,
  borderRadiusTopRight,
  borderRadiusBottomRight,
  borderRadiusBottomLeft,
  padding,
  inputBorderColor,
  inputBackground,
  buttonBackground,
  buttonColor,
}: {
  label?: string;
  embedCode?: string;
  formBackground?: string;
  borderRadius?: string;
  borderRadiusTopLeft?: string;
  borderRadiusTopRight?: string;
  borderRadiusBottomRight?: string;
  borderRadiusBottomLeft?: string;
  padding?: string;
  inputBorderColor?: string;
  inputBackground?: string;
  buttonBackground?: string;
  buttonColor?: string;
}) {
  const scopeClass = `exr-form-embed-${hashString(`${inputBorderColor ?? ""}${inputBackground ?? ""}${buttonBackground ?? ""}${buttonColor ?? ""}`)}`;
  return (
    <div
      className={scopeClass}
      style={{
        background: formBackground || undefined,
        borderTopLeftRadius: borderRadiusTopLeft || borderRadius || "12px",
        borderTopRightRadius: borderRadiusTopRight || borderRadius || "12px",
        borderBottomRightRadius: borderRadiusBottomRight || borderRadius || "12px",
        borderBottomLeftRadius: borderRadiusBottomLeft || borderRadius || "12px",
        padding: padding || "24px",
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `.${scopeClass} input,.${scopeClass} select,.${scopeClass} textarea{${inputBackground ? `background:${inputBackground} !important;` : ""}${inputBorderColor ? `border-color:${inputBorderColor} !important;` : ""}}.${scopeClass} button,.${scopeClass} input[type=submit]{${buttonBackground ? `background:${buttonBackground} !important;` : ""}${buttonColor ? `color:${buttonColor} !important;` : ""}}`,
        }}
      />
      {embedCode ? (
        <div dangerouslySetInnerHTML={{ __html: embedCode }} />
      ) : (
        <p style={{ color: "#999", fontSize: "13px", margin: 0 }}>{label || "Third-party form"} — paste embed code in the Content tab.</p>
      )}
    </div>
  );
}

function PayPalButton({
  label,
  amount,
  currency,
  paymentLink,
  background,
  color,
}: {
  label?: string;
  amount?: string;
  currency?: string;
  paymentLink?: string;
  background?: string;
  color?: string;
}) {
  return (
    <a
      href={paymentLink || undefined}
      target={paymentLink ? "_blank" : undefined}
      rel={paymentLink ? "noopener noreferrer" : undefined}
      aria-disabled={!paymentLink}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px 28px",
        borderRadius: "9999px",
        cursor: paymentLink ? "pointer" : "not-allowed",
        opacity: paymentLink ? 1 : 0.6,
        fontWeight: 700,
        background: background || "#FFC439",
        color: color || "#111",
      }}
    >
      {label || "Pay with PayPal"}
      {amount && (
        <span style={{ opacity: 0.7 }}>
          {amount} {currency}
        </span>
      )}
    </a>
  );
}

function StripeButton({
  label,
  amount,
  currency,
  paymentLink,
  background,
  color,
}: {
  label?: string;
  amount?: string;
  currency?: string;
  paymentLink?: string;
  background?: string;
  color?: string;
}) {
  return (
    <a
      href={paymentLink || undefined}
      target={paymentLink ? "_blank" : undefined}
      rel={paymentLink ? "noopener noreferrer" : undefined}
      aria-disabled={!paymentLink}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px 28px",
        borderRadius: "9999px",
        cursor: paymentLink ? "pointer" : "not-allowed",
        opacity: paymentLink ? 1 : 0.6,
        fontWeight: 700,
        background: background || "#635BFF",
        color: color || "#fff",
      }}
    >
      {label || "Pay with Card"}
      {amount && (
        <span style={{ opacity: 0.7 }}>
          {amount} {currency}
        </span>
      )}
    </a>
  );
}

function InstagramFeed({ username, postCount, columns, placeholderBackground }: { username?: string; postCount?: string; columns?: string; placeholderBackground?: string }) {
  const count = Number(postCount) || 6;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Number(columns) || 3}, minmax(0, 1fr))`, gap: "8px" }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ aspectRatio: "1", borderRadius: "8px", background: `var(--exr-placeholderBackground, ${placeholderBackground || "rgba(0,0,0,0.05)"})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
            </svg>
          </div>
        ))}
      </div>
      <p style={{ marginTop: "10px", fontSize: "12px", color: "#999" }}>{username ? `@${username}` : "Instagram feed"} — connect an account to show real posts.</p>
    </div>
  );
}

function TwitterFeed({ username, postCount, cardBackground }: { username?: string; postCount?: string; cardBackground?: string }) {
  const count = Number(postCount) || 3;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ padding: "16px", borderRadius: "12px", background: cardBackground || "rgba(0,0,0,0.03)" }}>
          <div style={{ fontWeight: 700, fontSize: "13px" }}>{username ? `@${username}` : "Twitter / X"}</div>
          <div style={{ marginTop: "6px", height: "10px", width: "80%", borderRadius: "4px", background: "rgba(0,0,0,0.08)" }} />
        </div>
      ))}
      <p style={{ fontSize: "12px", color: "#999" }}>Connect an account to show real posts.</p>
    </div>
  );
}

function FacebookEmbed({ pageUrl, height, cardBackground }: { pageUrl?: string; height?: string; cardBackground?: string }) {
  return (
    <div style={{ height: height || "300px", borderRadius: "12px", background: cardBackground || "rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", color: "#999" }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.5 9H15V6.5h-1.5C11.6 6.5 10.5 7.6 10.5 9v2H9v2.5h1.5V19H13v-5.5h1.8l.4-2.5H13V9c0-.3.2-.5.5-.5Z" />
      </svg>
      <span style={{ fontSize: "12px" }}>{pageUrl || "Facebook Page"} — connect an account to embed the live page.</span>
    </div>
  );
}

// A Collection's fields are admin-defined (see packages/db's CollectionField
// model) — there's no fixed schema to render against, so display falls back
// through the common conventional keys a "card" needs (title/image/
// description/link) rather than requiring every collection to use exact
// field names. `item.slug` (not a `data` key) is the last-resort link target
// so a Collection with zero explicit link field still produces real hrefs.
function resolveCollectionItemDisplay(item: CollectionItem, collectionKey: string) {
  const data = item.data ?? {};
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const value = data[key];
      if (typeof value === "string" && value) return value;
    }
    return undefined;
  };
  return {
    title: pick("title", "name", "heading") ?? item.slug ?? "Untitled",
    image: pick("image", "thumbnail", "photo", "coverImage"),
    description: pick("description", "excerpt", "summary"),
    href: pick("href", "link", "url") ?? (item.slug ? `/${collectionKey}/${item.slug}` : undefined),
  };
}

function CollectionEmptyState({ collectionKey }: { collectionKey?: string }) {
  return (
    <div style={{ borderRadius: "12px", border: "1px dashed rgba(0,0,0,0.15)", padding: "32px", textAlign: "center", fontSize: "13px", color: "#999" }}>
      {collectionKey ? `Collection "${collectionKey}" has no published items yet.` : "Connect a Collection in the Content tab to show real items here."}
    </div>
  );
}

async function fetchCollectionItems(collectionKey: string | undefined, itemCount: string | undefined) {
  if (!collectionKey) return [];
  try {
    const result = await api.getCollectionItems(collectionKey, { limit: Number(itemCount) || 24 });
    return result.items;
  } catch {
    return [];
  }
}

async function LoopGrid({
  collectionKey,
  columns,
  itemCount,
  cardBackground,
  titleColor,
}: {
  collectionKey?: string;
  columns?: string;
  itemCount?: string;
  cardBackground?: string;
  titleColor?: string;
}) {
  const items = await fetchCollectionItems(collectionKey, itemCount);
  if (items.length === 0) return <CollectionEmptyState collectionKey={collectionKey} />;

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${Number(columns) || 3}, minmax(0, 1fr))`, gap: "16px" }}>
      {items.map((item) => {
        const display = resolveCollectionItemDisplay(item, collectionKey!);
        return (
          <a
            key={item.id}
            href={display.href || undefined}
            style={{ display: "block", borderRadius: "12px", overflow: "hidden", background: `var(--exr-cardBackground, ${cardBackground || "rgba(0,0,0,0.04)"})`, minHeight: "120px" }}
          >
            {display.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resolveImageUrl(display.image)} alt="" style={{ width: "100%", aspectRatio: "16/10", objectFit: "cover" }} />
            )}
            <div style={{ padding: "20px" }}>
              <div style={{ color: `var(--exr-titleColor, ${titleColor || "inherit"})`, fontWeight: 700 }}>{display.title}</div>
              {display.description && <div style={{ marginTop: "8px", fontSize: "13px", opacity: 0.75 }}>{display.description}</div>}
            </div>
          </a>
        );
      })}
    </div>
  );
}

async function LoopCarousel({
  collectionKey,
  itemCount,
  cardBackground,
  titleColor,
}: {
  collectionKey?: string;
  itemCount?: string;
  cardBackground?: string;
  titleColor?: string;
}) {
  const items = await fetchCollectionItems(collectionKey, itemCount);
  if (items.length === 0) return <CollectionEmptyState collectionKey={collectionKey} />;

  return (
    <div style={{ display: "flex", gap: "16px", overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: "8px" }}>
      {items.map((item) => {
        const display = resolveCollectionItemDisplay(item, collectionKey!);
        return (
          <a
            key={item.id}
            href={display.href || undefined}
            style={{ scrollSnapAlign: "start", flexShrink: 0, width: "220px", display: "block", borderRadius: "12px", overflow: "hidden", background: `var(--exr-cardBackground, ${cardBackground || "rgba(0,0,0,0.04)"})`, minHeight: "120px" }}
          >
            {display.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resolveImageUrl(display.image)} alt="" style={{ width: "100%", aspectRatio: "16/10", objectFit: "cover" }} />
            )}
            <div style={{ padding: "20px" }}>
              <div style={{ color: `var(--exr-titleColor, ${titleColor || "inherit"})`, fontWeight: 700 }}>{display.title}</div>
            </div>
          </a>
        );
      })}
    </div>
  );
}

async function Portfolio({
  collectionKey,
  columns,
  itemCount,
  showFilters,
  cardBackground,
  titleColor,
}: {
  collectionKey?: string;
  columns?: string;
  itemCount?: string;
  showFilters?: boolean;
  cardBackground?: string;
  titleColor?: string;
}) {
  const items = await fetchCollectionItems(collectionKey, itemCount);
  if (items.length === 0) return <CollectionEmptyState collectionKey={collectionKey} />;

  // Categories aren't a first-class Collection concept — a `category`/`tag`
  // data key (if the collection happens to define one) drives the filter
  // pills; collections without one simply render without filters, same as
  // showFilters=false.
  const categories = Array.from(
    new Set(items.map((item) => (typeof item.data?.category === "string" ? item.data.category : null)).filter((c): c is string => Boolean(c)))
  );

  return (
    <div>
      {showFilters && categories.length > 0 && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
          {["All", ...categories].map((cat) => (
            <span key={cat} style={{ padding: "6px 14px", borderRadius: "9999px", background: "rgba(0,0,0,0.05)", fontSize: "12px" }}>
              {cat}
            </span>
          ))}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Number(columns) || 3}, minmax(0, 1fr))`, gap: "16px" }}>
        {items.map((item) => {
          const display = resolveCollectionItemDisplay(item, collectionKey!);
          return (
            <a
              key={item.id}
              href={display.href || undefined}
              style={{
                position: "relative",
                borderRadius: "12px",
                overflow: "hidden",
                background: display.image ? `url(${resolveImageUrl(display.image)}) center/cover` : `var(--exr-cardBackground, ${cardBackground || "rgba(0,0,0,0.04)"})`,
                aspectRatio: "4/3",
                display: "flex",
                alignItems: "flex-end",
                padding: "16px",
              }}
            >
              <div style={{ color: `var(--exr-titleColor, ${titleColor || "inherit"})`, fontWeight: 700, position: "relative", zIndex: 1 }}>{display.title}</div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

// Real implementation lives in PostsBlock.tsx (registered as `Posts:
// PostsBlock` in BLOCK_COMPONENTS below) — needs to recurse LayoutRenderer
// for its loop-template path, which would be a circular import from this
// file, same reason TemplateBlock.tsx is its own file too.

// ── Tour Info Section Block ──────────────────────────────────────────────
// Renders the "how we work" section — heading, description, facts row
// (icon+label+value) and CTA buttons. All style props flow through CSS
// custom properties so the builder's Advanced/Style responsive overrides
// work automatically.
function TourInfoSectionBlock({
  eyebrow,
  heading,
  description,
  image,
  facts,
  primaryCtaLabel,
  primaryCtaHref,
  secondaryCtaLabel,
  secondaryCtaHref,
  showSecondaryCta,
  eyebrowColor,
  eyebrowFontFamily,
  eyebrowFontSize,
  eyebrowFontWeight,
  eyebrowTextTransform,
  eyebrowFontStyle,
  eyebrowTextDecoration,
  eyebrowLineHeight,
  eyebrowLetterSpacing,
  eyebrowWordSpacing,
  imageBorderRadius,
  imageHeight,
  columnsGap,
  contentColumnWidth,
  imageColumnWidth,
  factsColumnWidth,
  sectionBackground,
  sectionBorderRadius,
  sectionBoxShadow,
  sectionPaddingTop,
  sectionPaddingRight,
  sectionPaddingBottom,
  sectionPaddingLeft,
  containerMaxWidth,
  headingColor,
  headingFontFamily,
  headingFontSize,
  headingFontSizeMobile,
  headingFontWeight,
  headingTextTransform,
  headingFontStyle,
  headingTextDecoration,
  headingLineHeight,
  headingLetterSpacing,
  headingTextAlign,
  descriptionColor,
  descriptionFontFamily,
  descriptionFontSize,
  descriptionFontSizeMobile,
  descriptionFontWeight,
  descriptionTextTransform,
  descriptionFontStyle,
  descriptionTextDecoration,
  descriptionLineHeight,
  descriptionLetterSpacing,
  descriptionTextAlign,
  descriptionMaxWidth,
  descriptionMarginTop,
  factsMarginTop,
  factsGap,
  factsGapMobile,
  factItemWidth,
  factItemWidthMobile,
  iconSize,
  iconColor,
  factLabelColor,
  factLabelFontFamily,
  factLabelFontSize,
  factLabelFontWeight,
  factLabelTextTransform,
  factLabelLetterSpacing,
  factValueColor,
  factValueFontFamily,
  factValueFontSize,
  factValueFontWeight,
  factValueLineHeight,
  buttonsMarginTop,
  buttonsGap,
  primaryCtaPaddingV,
  primaryCtaPaddingH,
  primaryCtaFontFamily,
  primaryCtaFontSize,
  primaryCtaFontWeight,
  primaryCtaTextTransform,
  primaryCtaFontStyle,
  primaryCtaTextDecoration,
  primaryCtaLineHeight,
  primaryCtaLetterSpacing,
  primaryCtaWordSpacing,
  primaryCtaBackground,
  primaryCtaColor,
  primaryCtaHoverBackground,
  primaryCtaHoverColor,
  primaryCtaBorderRadius,
  primaryCtaBorderStyle,
  primaryCtaBorderWidth,
  primaryCtaBorderColor,
  primaryCtaBoxShadow,
  primaryCtaHoverBoxShadow,
  primaryCtaHoverBackgroundSize,
  primaryCtaHoverBackgroundPosition,
  primaryCtaHoverTransitionDuration,
  primaryCtaPaddingTop,
  primaryCtaPaddingRight,
  primaryCtaPaddingBottom,
  primaryCtaPaddingLeft,
  primaryCtaMarginTop,
  primaryCtaMarginRight,
  primaryCtaMarginBottom,
  primaryCtaMarginLeft,
  secondaryCtaPaddingV,
  secondaryCtaPaddingH,
  secondaryCtaFontFamily,
  secondaryCtaFontSize,
  secondaryCtaFontWeight,
  secondaryCtaTextTransform,
  secondaryCtaFontStyle,
  secondaryCtaTextDecoration,
  secondaryCtaLineHeight,
  secondaryCtaLetterSpacing,
  secondaryCtaWordSpacing,
  secondaryCtaBorderColor,
  secondaryCtaBorderWidth,
  secondaryCtaColor,
  secondaryCtaHoverBackground,
  secondaryCtaHoverColor,
  secondaryCtaBorderRadius,
  secondaryCtaBackground,
  secondaryCtaBorderStyle,
  secondaryCtaBoxShadow,
  secondaryCtaHoverBoxShadow,
  secondaryCtaHoverBackgroundSize,
  secondaryCtaHoverBackgroundPosition,
  secondaryCtaHoverTransitionDuration,
  secondaryCtaPaddingTop,
  secondaryCtaPaddingRight,
  secondaryCtaPaddingBottom,
  secondaryCtaPaddingLeft,
  secondaryCtaMarginTop,
  secondaryCtaMarginRight,
  secondaryCtaMarginBottom,
  secondaryCtaMarginLeft,
}: {
  eyebrow?: string;
  heading?: string;
  description?: string;
  image?: string;
  facts?: { icon: string; label: string; value: string }[];
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  showSecondaryCta?: boolean;
  eyebrowColor?: string;
  eyebrowFontFamily?: string;
  eyebrowFontSize?: string;
  eyebrowFontWeight?: string;
  eyebrowTextTransform?: string;
  eyebrowFontStyle?: string;
  eyebrowTextDecoration?: string;
  eyebrowLineHeight?: string;
  eyebrowLetterSpacing?: string;
  eyebrowWordSpacing?: string;
  imageBorderRadius?: string;
  imageHeight?: string;
  columnsGap?: string;
  contentColumnWidth?: string;
  imageColumnWidth?: string;
  factsColumnWidth?: string;
  sectionBackground?: string;
  sectionBorderRadius?: string;
  sectionBoxShadow?: string;
  sectionPaddingTop?: string;
  sectionPaddingRight?: string;
  sectionPaddingBottom?: string;
  sectionPaddingLeft?: string;
  containerMaxWidth?: string;
  headingColor?: string;
  headingFontFamily?: string;
  headingFontSize?: string;
  headingFontSizeMobile?: string;
  headingFontWeight?: string;
  headingTextTransform?: string;
  headingFontStyle?: string;
  headingTextDecoration?: string;
  headingLineHeight?: string;
  headingLetterSpacing?: string;
  headingTextAlign?: string;
  descriptionColor?: string;
  descriptionFontFamily?: string;
  descriptionFontSize?: string;
  descriptionFontSizeMobile?: string;
  descriptionFontWeight?: string;
  descriptionTextTransform?: string;
  descriptionFontStyle?: string;
  descriptionTextDecoration?: string;
  descriptionLineHeight?: string;
  descriptionLetterSpacing?: string;
  descriptionTextAlign?: string;
  descriptionMaxWidth?: string;
  descriptionMarginTop?: string;
  factsMarginTop?: string;
  factsGap?: string;
  factsGapMobile?: string;
  factItemWidth?: string;
  factItemWidthMobile?: string;
  iconSize?: string;
  iconColor?: string;
  factLabelColor?: string;
  factLabelFontFamily?: string;
  factLabelFontSize?: string;
  factLabelFontWeight?: string;
  factLabelTextTransform?: string;
  factLabelLetterSpacing?: string;
  factValueColor?: string;
  factValueFontFamily?: string;
  factValueFontSize?: string;
  factValueFontWeight?: string;
  factValueLineHeight?: string;
  buttonsMarginTop?: string;
  buttonsGap?: string;
  primaryCtaPaddingV?: string;
  primaryCtaPaddingH?: string;
  primaryCtaFontFamily?: string;
  primaryCtaFontSize?: string;
  primaryCtaFontWeight?: string;
  primaryCtaTextTransform?: string;
  primaryCtaFontStyle?: string;
  primaryCtaTextDecoration?: string;
  primaryCtaLineHeight?: string;
  primaryCtaLetterSpacing?: string;
  primaryCtaWordSpacing?: string;
  primaryCtaBackground?: string;
  primaryCtaColor?: string;
  primaryCtaHoverBackground?: string;
  primaryCtaHoverColor?: string;
  primaryCtaBorderRadius?: string;
  primaryCtaBorderStyle?: string;
  primaryCtaBorderWidth?: string;
  primaryCtaBorderColor?: string;
  primaryCtaBoxShadow?: string;
  primaryCtaHoverBoxShadow?: string;
  primaryCtaHoverBackgroundSize?: string;
  primaryCtaHoverBackgroundPosition?: string;
  primaryCtaHoverTransitionDuration?: string;
  primaryCtaPaddingTop?: string;
  primaryCtaPaddingRight?: string;
  primaryCtaPaddingBottom?: string;
  primaryCtaPaddingLeft?: string;
  primaryCtaMarginTop?: string;
  primaryCtaMarginRight?: string;
  primaryCtaMarginBottom?: string;
  primaryCtaMarginLeft?: string;
  secondaryCtaPaddingV?: string;
  secondaryCtaPaddingH?: string;
  secondaryCtaFontFamily?: string;
  secondaryCtaFontSize?: string;
  secondaryCtaFontWeight?: string;
  secondaryCtaTextTransform?: string;
  secondaryCtaFontStyle?: string;
  secondaryCtaTextDecoration?: string;
  secondaryCtaLineHeight?: string;
  secondaryCtaLetterSpacing?: string;
  secondaryCtaWordSpacing?: string;
  secondaryCtaBorderColor?: string;
  secondaryCtaBorderWidth?: string;
  secondaryCtaColor?: string;
  secondaryCtaHoverBackground?: string;
  secondaryCtaHoverColor?: string;
  secondaryCtaBorderRadius?: string;
  secondaryCtaBackground?: string;
  secondaryCtaBorderStyle?: string;
  secondaryCtaBoxShadow?: string;
  secondaryCtaHoverBoxShadow?: string;
  secondaryCtaHoverBackgroundSize?: string;
  secondaryCtaHoverBackgroundPosition?: string;
  secondaryCtaHoverTransitionDuration?: string;
  secondaryCtaPaddingTop?: string;
  secondaryCtaPaddingRight?: string;
  secondaryCtaPaddingBottom?: string;
  secondaryCtaPaddingLeft?: string;
  secondaryCtaMarginTop?: string;
  secondaryCtaMarginRight?: string;
  secondaryCtaMarginBottom?: string;
  secondaryCtaMarginLeft?: string;
}) {
  // Fallback only — reached when `fact.icon` is empty or unresolvable
  // through IconGlyph/resolveIconValue (a react-icons/fa6 name, one of the
  // legacy hand-drawn keys — which already covers "person"/"clock"/"pin"/
  // "car" — pasted <svg> markup, or an uploaded file). "dollar" was this
  // block's own pre-migration key (now defaults to "FaDollarSign"), kept
  // here so any fact saved before that migration still renders a $ glyph
  // instead of falling all the way through to the car icon.
  function FactIconFallback({ size, color, className, style }: { size?: number | string; color?: string; className?: string; style?: CSSProperties }) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} color={color} className={className} style={style} fill="none">
        <path
          d="M12 3v18M8.5 7.5A3.5 3.5 0 0 1 12 6h1a3 3 0 0 1 0 6h-2a3 3 0 0 0 0 6h1.5A3.5 3.5 0 0 0 16 16"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  const factsArr = facts ?? [];

  const eyebrowStyle: CSSProperties = {
    color: `var(--exr-eyebrowColor, ${eyebrowColor || "#2563ff"})`,
    fontFamily: eyebrowFontFamily && eyebrowFontFamily !== "inherit" ? eyebrowFontFamily : undefined,
    fontSize: `var(--exr-eyebrowFontSize, ${eyebrowFontSize || "12px"})`,
    fontWeight: `var(--exr-eyebrowFontWeight, ${eyebrowFontWeight || "700"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-eyebrowTextTransform, ${eyebrowTextTransform || "uppercase"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-eyebrowFontStyle, ${eyebrowFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-eyebrowTextDecoration, ${eyebrowTextDecoration || "none"})`,
    lineHeight: `var(--exr-eyebrowLineHeight, ${eyebrowLineHeight || "normal"})`,
    letterSpacing: `var(--exr-eyebrowLetterSpacing, ${eyebrowLetterSpacing || "0.15em"})`,
    wordSpacing: `var(--exr-eyebrowWordSpacing, ${eyebrowWordSpacing || "normal"})`,
    margin: "0 0 12px",
  };

  const headingStyle: CSSProperties = {
    color: `var(--exr-headingColor, ${headingColor || "#000"})`,
    fontFamily: headingFontFamily && headingFontFamily !== "inherit" ? headingFontFamily : undefined,
    fontSize: `var(--exr-headingFontSize, ${headingFontSize || "32px"})`,
    fontWeight: `var(--exr-headingFontWeight, ${headingFontWeight || "900"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-headingTextTransform, ${headingTextTransform || "uppercase"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-headingFontStyle, ${headingFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-headingTextDecoration, ${headingTextDecoration || "none"})`,
    lineHeight: `var(--exr-headingLineHeight, ${headingLineHeight || "1.15"})`,
    letterSpacing: `var(--exr-headingLetterSpacing, ${headingLetterSpacing || "-0.02em"})`,
    textAlign: `var(--exr-headingTextAlign, ${headingTextAlign || "left"})` as CSSProperties["textAlign"],
    margin: 0,
  };

  const descriptionStyle: CSSProperties = {
    color: `var(--exr-descriptionColor, ${descriptionColor || "#555"})`,
    fontFamily: descriptionFontFamily && descriptionFontFamily !== "inherit" ? descriptionFontFamily : undefined,
    fontSize: `var(--exr-descriptionFontSize, ${descriptionFontSize || "15px"})`,
    fontWeight: `var(--exr-descriptionFontWeight, ${descriptionFontWeight || "400"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-descriptionTextTransform, ${descriptionTextTransform || "none"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-descriptionFontStyle, ${descriptionFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-descriptionTextDecoration, ${descriptionTextDecoration || "none"})`,
    lineHeight: `var(--exr-descriptionLineHeight, ${descriptionLineHeight || "1.7"})`,
    letterSpacing: `var(--exr-descriptionLetterSpacing, ${descriptionLetterSpacing || "normal"})`,
    textAlign: `var(--exr-descriptionTextAlign, ${descriptionTextAlign || "left"})` as CSSProperties["textAlign"],
    maxWidth: descriptionMaxWidth ? `var(--exr-descriptionMaxWidth, ${descriptionMaxWidth})` : undefined,
    margin: `var(--exr-descriptionMarginTop, ${descriptionMarginTop || "16px"}) 0 0`,
  };

  const factLabelStyle: CSSProperties = {
    color: `var(--exr-factLabelColor, ${factLabelColor || "#1f2937"})`,
    fontFamily: factLabelFontFamily && factLabelFontFamily !== "inherit" ? factLabelFontFamily : undefined,
    fontSize: `var(--exr-factLabelFontSize, ${factLabelFontSize || "14px"})`,
    fontWeight: `var(--exr-factLabelFontWeight, ${factLabelFontWeight || "700"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-factLabelTextTransform, ${factLabelTextTransform || "none"})` as CSSProperties["textTransform"],
    letterSpacing: `var(--exr-factLabelLetterSpacing, ${factLabelLetterSpacing || "normal"})`,
    margin: 0,
  };

  const factValueStyle: CSSProperties = {
    color: `var(--exr-factValueColor, ${factValueColor || "#4b5563"})`,
    fontFamily: factValueFontFamily && factValueFontFamily !== "inherit" ? factValueFontFamily : undefined,
    fontSize: `var(--exr-factValueFontSize, ${factValueFontSize || "14px"})`,
    fontWeight: `var(--exr-factValueFontWeight, ${factValueFontWeight || "400"})` as CSSProperties["fontWeight"],
    lineHeight: `var(--exr-factValueLineHeight, ${factValueLineHeight || "1.4"})`,
    margin: "2px 0 0",
  };

  // Shared hover mechanism (gradient-slide + box-shadow-glow) — see
  // buttonHoverStyle.ts. Replaces the old single-field (background-only)
  // hash-class approach this block used before the button-parity pass.
  const primaryHover = buildButtonHoverStyle("tis-primary", {
    background: primaryCtaBackground,
    hoverBackground: primaryCtaHoverBackground,
    hoverColor: primaryCtaHoverColor,
    hoverBoxShadow: primaryCtaHoverBoxShadow,
    hoverBackgroundSize: primaryCtaHoverBackgroundSize,
    hoverBackgroundPosition: primaryCtaHoverBackgroundPosition,
    hoverTransitionDuration: primaryCtaHoverTransitionDuration,
  });
  const secondaryHover = buildButtonHoverStyle("tis-secondary", {
    background: secondaryCtaBackground || "transparent",
    hoverBackground: secondaryCtaHoverBackground,
    hoverColor: secondaryCtaHoverColor,
    hoverBoxShadow: secondaryCtaHoverBoxShadow,
    hoverBackgroundSize: secondaryCtaHoverBackgroundSize,
    hoverBackgroundPosition: secondaryCtaHoverBackgroundPosition,
    hoverTransitionDuration: secondaryCtaHoverTransitionDuration,
  });

  return (
    <>
      <GoogleFontLink family={eyebrowFontFamily} />
      <GoogleFontLink family={headingFontFamily} />
      <GoogleFontLink family={descriptionFontFamily} />
      <GoogleFontLink family={factLabelFontFamily} />
      <GoogleFontLink family={factValueFontFamily} />
      <GoogleFontLink family={primaryCtaFontFamily} />
      <GoogleFontLink family={secondaryCtaFontFamily} />
      <style dangerouslySetInnerHTML={{ __html: `
        .exr-tis-grid  { display: grid; grid-template-columns: var(--exr-contentColumnWidth, ${contentColumnWidth || "1fr"}) var(--exr-imageColumnWidth, ${imageColumnWidth || "1fr"}) var(--exr-factsColumnWidth, ${factsColumnWidth || "1fr"}); gap: var(--exr-columnsGap, ${columnsGap || "40px"}); align-items: stretch; }
        .exr-tis-content { display: flex; flex-direction: column; height: 100%; }
        .exr-tis-buttons { margin-top: auto; }
        .exr-tis-facts { display: flex; flex-direction: column; gap: var(--exr-factsGap, ${factsGap || "28px"}); }
        .exr-tis-fact  { display: flex; align-items: flex-start; gap: 14px; width: var(--exr-factItemWidth, ${factItemWidth || "auto"}); }
        @media (max-width: 900px) {
          .exr-tis-grid    { grid-template-columns: 1fr !important; }
          .exr-tis-content { height: auto; }
          .exr-tis-buttons { margin-top: var(--exr-buttonsMarginTop, ${buttonsMarginTop || "48px"}); }
          .exr-tis-facts   { gap: var(--exr-factsGapMobile, ${factsGapMobile || "20px"}); }
          .exr-tis-fact    { width: var(--exr-factItemWidthMobile, ${factItemWidthMobile || factItemWidth || "auto"}); }
          .exr-tis-heading { font-size: var(--exr-headingFontSizeMobile, ${headingFontSizeMobile || "26px"}) !important; }
          .exr-tis-desc    { font-size: var(--exr-descriptionFontSizeMobile, ${descriptionFontSizeMobile || "13px"}) !important; }
        }
      ` }} />
      <section style={{
        background: `var(--exr-sectionBackground, ${sectionBackground || "#ffffff"})`,
        borderRadius: `var(--exr-sectionBorderRadius, ${sectionBorderRadius || "24px"})`,
        boxShadow: sectionBoxShadow ? `var(--exr-sectionBoxShadow, ${sectionBoxShadow})` : undefined,
        paddingTop: `var(--exr-sectionPaddingTop, ${sectionPaddingTop || "56px"})`,
        paddingRight: `var(--exr-sectionPaddingRight, ${sectionPaddingRight || "48px"})`,
        paddingBottom: `var(--exr-sectionPaddingBottom, ${sectionPaddingBottom || "56px"})`,
        paddingLeft: `var(--exr-sectionPaddingLeft, ${sectionPaddingLeft || "48px"})`,
      }}>
        <div style={{ margin: "0 auto", maxWidth: `var(--exr-containerMaxWidth, ${containerMaxWidth || "1200px"})` }}>
          <div className="exr-tis-grid">

            {/* Column 1 — eyebrow, heading, description, buttons pinned to bottom */}
            <div className="exr-tis-content">
              {eyebrow && <div style={eyebrowStyle}>{eyebrow}</div>}
              <h2 className="exr-tis-heading" style={headingStyle}>
                {heading || "A Partnership Built Around Your Goals"}
              </h2>
              {description && (
                <p className="exr-tis-desc" style={descriptionStyle}>
                  {description}
                </p>
              )}

              {/* CTA Buttons */}
              <div className="exr-tis-buttons" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: `var(--exr-buttonsGap, ${buttonsGap || "16px"})` }}>
                {/* Primary — gold with sonar pulse */}
                <div style={{ position: "relative", display: "inline-flex" }}>
                  <a
                    href={primaryCtaHref || "/contact"}
                    className={`transition-all ${primaryHover.hoverClassName}`}
                    style={{
                      display: "inline-block",
                      paddingTop: primaryCtaPaddingTop || primaryCtaPaddingV || "12px",
                      paddingRight: primaryCtaPaddingRight || primaryCtaPaddingH || "28px",
                      paddingBottom: primaryCtaPaddingBottom || primaryCtaPaddingV || "12px",
                      paddingLeft: primaryCtaPaddingLeft || primaryCtaPaddingH || "28px",
                      marginTop: primaryCtaMarginTop || undefined,
                      marginRight: primaryCtaMarginRight || undefined,
                      marginBottom: primaryCtaMarginBottom || undefined,
                      marginLeft: primaryCtaMarginLeft || undefined,
                      fontFamily: primaryCtaFontFamily && primaryCtaFontFamily !== "inherit" ? primaryCtaFontFamily : undefined,
                      fontSize: `var(--exr-primaryCtaFontSize, ${primaryCtaFontSize || "14px"})`,
                      fontWeight: `var(--exr-primaryCtaFontWeight, ${primaryCtaFontWeight || "600"})` as CSSProperties["fontWeight"],
                      textTransform: `var(--exr-primaryCtaTextTransform, ${primaryCtaTextTransform || "none"})` as CSSProperties["textTransform"],
                      fontStyle: `var(--exr-primaryCtaFontStyle, ${primaryCtaFontStyle || "normal"})` as CSSProperties["fontStyle"],
                      textDecoration: `var(--exr-primaryCtaTextDecoration, ${primaryCtaTextDecoration || "none"})`,
                      lineHeight: `var(--exr-primaryCtaLineHeight, ${primaryCtaLineHeight || "normal"})`,
                      letterSpacing: `var(--exr-primaryCtaLetterSpacing, ${primaryCtaLetterSpacing || "normal"})`,
                      wordSpacing: `var(--exr-primaryCtaWordSpacing, ${primaryCtaWordSpacing || "normal"})`,
                      background: `var(--exr-primaryCtaBackground, ${primaryCtaBackground || "#2563ff"})`,
                      color: `var(--exr-primaryCtaColor, ${primaryCtaColor || "#000"})`,
                      borderStyle: primaryCtaBorderStyle && primaryCtaBorderStyle !== "none" ? (primaryCtaBorderStyle as CSSProperties["borderStyle"]) : undefined,
                      borderWidth: primaryCtaBorderStyle && primaryCtaBorderStyle !== "none" ? primaryCtaBorderWidth || "1px" : undefined,
                      borderColor: primaryCtaBorderStyle && primaryCtaBorderStyle !== "none" ? primaryCtaBorderColor : undefined,
                      borderRadius: `var(--exr-primaryCtaBorderRadius, ${primaryCtaBorderRadius || "9999px"})`,
                      boxShadow: primaryCtaBoxShadow || undefined,
                      position: "relative",
                      zIndex: 1,
                      ...primaryHover.restingStyle,
                    }}
                  >
                    {primaryCtaLabel || "Start a Project"}
                  </a>
                </div>
                {/* Secondary — ghost border */}
                {showSecondaryCta !== false && (
                  <a
                    href={secondaryCtaHref || "/contact"}
                    className={`transition-all ${secondaryHover.hoverClassName}`}
                    style={{
                      display: "inline-block",
                      paddingTop: secondaryCtaPaddingTop || secondaryCtaPaddingV || "12px",
                      paddingRight: secondaryCtaPaddingRight || secondaryCtaPaddingH || "28px",
                      paddingBottom: secondaryCtaPaddingBottom || secondaryCtaPaddingV || "12px",
                      paddingLeft: secondaryCtaPaddingLeft || secondaryCtaPaddingH || "28px",
                      marginTop: secondaryCtaMarginTop || undefined,
                      marginRight: secondaryCtaMarginRight || undefined,
                      marginBottom: secondaryCtaMarginBottom || undefined,
                      marginLeft: secondaryCtaMarginLeft || undefined,
                      fontFamily: secondaryCtaFontFamily && secondaryCtaFontFamily !== "inherit" ? secondaryCtaFontFamily : undefined,
                      fontSize: `var(--exr-secondaryCtaFontSize, ${secondaryCtaFontSize || "14px"})`,
                      fontWeight: `var(--exr-secondaryCtaFontWeight, ${secondaryCtaFontWeight || "600"})` as CSSProperties["fontWeight"],
                      textTransform: `var(--exr-secondaryCtaTextTransform, ${secondaryCtaTextTransform || "none"})` as CSSProperties["textTransform"],
                      fontStyle: `var(--exr-secondaryCtaFontStyle, ${secondaryCtaFontStyle || "normal"})` as CSSProperties["fontStyle"],
                      textDecoration: `var(--exr-secondaryCtaTextDecoration, ${secondaryCtaTextDecoration || "none"})`,
                      lineHeight: `var(--exr-secondaryCtaLineHeight, ${secondaryCtaLineHeight || "normal"})`,
                      letterSpacing: `var(--exr-secondaryCtaLetterSpacing, ${secondaryCtaLetterSpacing || "normal"})`,
                      wordSpacing: `var(--exr-secondaryCtaWordSpacing, ${secondaryCtaWordSpacing || "normal"})`,
                      color: `var(--exr-secondaryCtaColor, ${secondaryCtaColor || "#374151"})`,
                      borderStyle: (secondaryCtaBorderStyle || "solid") !== "none" ? ((secondaryCtaBorderStyle || "solid") as CSSProperties["borderStyle"]) : undefined,
                      borderWidth: (secondaryCtaBorderStyle || "solid") !== "none" ? secondaryCtaBorderWidth || "1px" : undefined,
                      borderColor: (secondaryCtaBorderStyle || "solid") !== "none" ? `var(--exr-secondaryCtaBorderColor, ${secondaryCtaBorderColor || "#d1d5db"})` : undefined,
                      borderRadius: `var(--exr-secondaryCtaBorderRadius, ${secondaryCtaBorderRadius || "9999px"})`,
                      background: `var(--exr-secondaryCtaBackground, ${secondaryCtaBackground || "transparent"})`,
                      boxShadow: secondaryCtaBoxShadow || undefined,
                      ...secondaryHover.restingStyle,
                    }}
                  >
                    {secondaryCtaLabel || "Request a Quote"}
                  </a>
                )}
              </div>
            </div>

            {/* Column 2 — image */}
            {image && (
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded content, see ImageBox for the same fix */}
                <img
                  src={resolveImageUrl(image)}
                  alt=""
                  style={{
                    display: "block",
                    width: "100%",
                    height: `var(--exr-imageHeight, ${imageHeight || "340px"})`,
                    objectFit: "cover",
                    borderRadius: `var(--exr-imageBorderRadius, ${imageBorderRadius || "12px"})`,
                  }}
                />
              </div>
            )}

            {/* Column 3 — facts list */}
            {factsArr.length > 0 && (
              <div className="exr-tis-facts" style={{ marginTop: factsMarginTop && factsMarginTop !== "0px" ? `var(--exr-factsMarginTop, ${factsMarginTop})` : undefined }}>
                {factsArr.map((fact, i) => (
                  <div key={i} className="exr-tis-fact">
                    <IconGlyph
                      icon={fact.icon}
                      fallback={FactIconFallback}
                      size={`var(--exr-iconSize, ${iconSize || "32px"})`}
                      color={`var(--exr-iconColor, ${iconColor || "#2563ff"})`}
                      style={{ flexShrink: 0 }}
                    />
                    <div>
                      <p style={factLabelStyle}>{fact.label}</p>
                      <p style={factValueStyle}>{fact.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </section>
      {primaryHover.hoverCss && <style dangerouslySetInnerHTML={{ __html: primaryHover.hoverCss }} />}
      {secondaryHover.hoverCss && <style dangerouslySetInnerHTML={{ __html: secondaryHover.hoverCss }} />}
    </>
  );
}

/**
 * "Inclusions & Exclusions" checklist card — eyebrow + title header, two
 * columns (Included / Excluded) each with a pill-style label and a
 * checkmark/cross bullet list, and a centered CTA. Each column's items are
 * plain strings (same shape as ServiceCard's "Features" list) — every item
 * in a column shares that column's fixed icon, so there's no per-item
 * sub-field beyond the text itself.
 */
function ChecklistColumn({
  label,
  items,
  Icon,
  pillStyle,
  itemStyle,
  itemGap,
  iconSize,
  iconColor,
}: {
  label?: string;
  items: string[];
  Icon: (props: { style: CSSProperties }) => ReactNode;
  pillStyle: CSSProperties;
  itemStyle: CSSProperties;
  itemGap?: string;
  iconSize?: string;
  iconColor?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div style={pillStyle}>{label}</div>
      <ul style={{ listStyle: "none", padding: 0, margin: "20px 0 0", display: "flex", flexDirection: "column", gap: `var(--exr-itemGap, ${itemGap || "20px"})` }}>
        {items.map((text, i) => (
          <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
            <Icon style={{ width: `var(--exr-iconSize, ${iconSize || "18px"})`, height: `var(--exr-iconSize, ${iconSize || "18px"})`, color: `var(--exr-iconColor, ${iconColor || "#2563ff"})`, flexShrink: 0, marginTop: "2px" }} />
            <span style={itemStyle}>{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChecklistBlock({
  eyebrow,
  title,
  includedLabel,
  includedItems,
  excludedLabel,
  excludedItems,
  ctaLabel,
  ctaHref,
  containerBackground,
  containerBorderColor,
  containerBorderWidth,
  containerBorderRadius,
  containerMaxWidth,
  containerPaddingTop,
  containerPaddingRight,
  containerPaddingBottom,
  containerPaddingLeft,
  headerMarginBottom,
  eyebrowColor,
  eyebrowFontFamily,
  eyebrowFontSize,
  eyebrowFontWeight,
  eyebrowTextTransform,
  eyebrowFontStyle,
  eyebrowTextDecoration,
  eyebrowLineHeight,
  eyebrowLetterSpacing,
  eyebrowWordSpacing,
  titleColor,
  titleFontFamily,
  titleFontSize,
  titleFontWeight,
  titleTextTransform,
  titleFontStyle,
  titleTextDecoration,
  titleLineHeight,
  titleLetterSpacing,
  pillBackground,
  pillColor,
  pillFontFamily,
  pillFontSize,
  pillFontWeight,
  pillBorderRadius,
  pillPaddingV,
  pillPaddingH,
  itemColor,
  itemFontFamily,
  itemFontSize,
  itemFontWeight,
  itemLineHeight,
  iconSize,
  iconColor,
  columnsGap,
  itemGap,
  ctaMarginTop,
  ctaPaddingV,
  ctaPaddingH,
  ctaFontFamily,
  ctaFontSize,
  ctaFontWeight,
  ctaTextTransform,
  ctaFontStyle,
  ctaTextDecoration,
  ctaLineHeight,
  ctaLetterSpacing,
  ctaWordSpacing,
  ctaBackground,
  ctaColor,
  ctaHoverBackground,
  ctaBorderRadius,
  ctaHoverColor,
  ctaBorderStyle,
  ctaBorderWidth,
  ctaBorderColor,
  ctaBoxShadow,
  ctaHoverBoxShadow,
  ctaHoverBackgroundSize,
  ctaHoverBackgroundPosition,
  ctaHoverTransitionDuration,
  ctaPaddingTop,
  ctaPaddingRight,
  ctaPaddingBottom,
  ctaPaddingLeft,
  ctaMarginRight,
  ctaMarginBottom,
  ctaMarginLeft,
}: {
  eyebrow?: string;
  title?: string;
  includedLabel?: string;
  includedItems?: string[];
  excludedLabel?: string;
  excludedItems?: string[];
  ctaLabel?: string;
  ctaHref?: string;
  containerBackground?: string;
  containerBorderColor?: string;
  containerBorderWidth?: string;
  containerBorderRadius?: string;
  containerMaxWidth?: string;
  containerPaddingTop?: string;
  containerPaddingRight?: string;
  containerPaddingBottom?: string;
  containerPaddingLeft?: string;
  headerMarginBottom?: string;
  eyebrowColor?: string;
  eyebrowFontFamily?: string;
  eyebrowFontSize?: string;
  eyebrowFontWeight?: string;
  eyebrowTextTransform?: string;
  eyebrowFontStyle?: string;
  eyebrowTextDecoration?: string;
  eyebrowLineHeight?: string;
  eyebrowLetterSpacing?: string;
  eyebrowWordSpacing?: string;
  titleColor?: string;
  titleFontFamily?: string;
  titleFontSize?: string;
  titleFontWeight?: string;
  titleTextTransform?: string;
  titleFontStyle?: string;
  titleTextDecoration?: string;
  titleLineHeight?: string;
  titleLetterSpacing?: string;
  pillBackground?: string;
  pillColor?: string;
  pillFontFamily?: string;
  pillFontSize?: string;
  pillFontWeight?: string;
  pillBorderRadius?: string;
  pillPaddingV?: string;
  pillPaddingH?: string;
  itemColor?: string;
  itemFontFamily?: string;
  itemFontSize?: string;
  itemFontWeight?: string;
  itemLineHeight?: string;
  iconSize?: string;
  iconColor?: string;
  columnsGap?: string;
  itemGap?: string;
  ctaMarginTop?: string;
  ctaPaddingV?: string;
  ctaPaddingH?: string;
  ctaFontFamily?: string;
  ctaFontSize?: string;
  ctaFontWeight?: string;
  ctaTextTransform?: string;
  ctaFontStyle?: string;
  ctaTextDecoration?: string;
  ctaLineHeight?: string;
  ctaLetterSpacing?: string;
  ctaWordSpacing?: string;
  ctaBackground?: string;
  ctaColor?: string;
  ctaHoverBackground?: string;
  ctaBorderRadius?: string;
  ctaHoverColor?: string;
  ctaBorderStyle?: "none" | "solid" | "dashed" | "dotted" | "double";
  ctaBorderWidth?: string;
  ctaBorderColor?: string;
  ctaBoxShadow?: string;
  ctaHoverBoxShadow?: string;
  ctaHoverBackgroundSize?: string;
  ctaHoverBackgroundPosition?: string;
  ctaHoverTransitionDuration?: string;
  ctaPaddingTop?: string;
  ctaPaddingRight?: string;
  ctaPaddingBottom?: string;
  ctaPaddingLeft?: string;
  ctaMarginRight?: string;
  ctaMarginBottom?: string;
  ctaMarginLeft?: string;
}) {
  const included = includedItems ?? [];
  const excluded = excludedItems ?? [];

  function CheckIcon({ style }: { style: CSSProperties }) {
    return (
      <svg viewBox="0 0 24 24" style={style} fill="none">
        <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M7.5 12.5l2.8 2.8 6.2-6.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  function CrossIcon({ style }: { style: CSSProperties }) {
    return (
      <svg viewBox="0 0 24 24" style={style} fill="none">
        <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  const eyebrowStyle: CSSProperties = {
    color: `var(--exr-eyebrowColor, ${eyebrowColor || "#2563ff"})`,
    fontFamily: eyebrowFontFamily && eyebrowFontFamily !== "inherit" ? eyebrowFontFamily : undefined,
    fontSize: `var(--exr-eyebrowFontSize, ${eyebrowFontSize || "12px"})`,
    fontWeight: `var(--exr-eyebrowFontWeight, ${eyebrowFontWeight || "700"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-eyebrowTextTransform, ${eyebrowTextTransform || "uppercase"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-eyebrowFontStyle, ${eyebrowFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-eyebrowTextDecoration, ${eyebrowTextDecoration || "none"})`,
    lineHeight: `var(--exr-eyebrowLineHeight, ${eyebrowLineHeight || "normal"})`,
    letterSpacing: `var(--exr-eyebrowLetterSpacing, ${eyebrowLetterSpacing || "0.25em"})`,
    wordSpacing: `var(--exr-eyebrowWordSpacing, ${eyebrowWordSpacing || "normal"})`,
    margin: "0 0 10px",
  };

  const titleStyle: CSSProperties = {
    color: `var(--exr-titleColor, ${titleColor || "#fff"})`,
    fontFamily: titleFontFamily && titleFontFamily !== "inherit" ? titleFontFamily : undefined,
    fontSize: `var(--exr-titleFontSize, ${titleFontSize || "40px"})`,
    fontWeight: `var(--exr-titleFontWeight, ${titleFontWeight || "900"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-titleTextTransform, ${titleTextTransform || "uppercase"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-titleFontStyle, ${titleFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-titleTextDecoration, ${titleTextDecoration || "none"})`,
    lineHeight: `var(--exr-titleLineHeight, ${titleLineHeight || "1.1"})`,
    letterSpacing: `var(--exr-titleLetterSpacing, ${titleLetterSpacing || "normal"})`,
    margin: 0,
  };

  const pillStyle: CSSProperties = {
    background: `var(--exr-pillBackground, ${pillBackground || "rgba(255,255,255,0.05)"})`,
    color: `var(--exr-pillColor, ${pillColor || "#2563ff"})`,
    fontFamily: pillFontFamily && pillFontFamily !== "inherit" ? pillFontFamily : undefined,
    fontSize: `var(--exr-pillFontSize, ${pillFontSize || "15px"})`,
    fontWeight: `var(--exr-pillFontWeight, ${pillFontWeight || "700"})` as CSSProperties["fontWeight"],
    borderRadius: `var(--exr-pillBorderRadius, ${pillBorderRadius || "10px"})`,
    paddingBlock: `var(--exr-pillPaddingV, ${pillPaddingV || "14px"})`,
    paddingInline: `var(--exr-pillPaddingH, ${pillPaddingH || "20px"})`,
  };

  const itemStyle: CSSProperties = {
    color: `var(--exr-itemColor, ${itemColor || "#f5f5f5"})`,
    fontFamily: itemFontFamily && itemFontFamily !== "inherit" ? itemFontFamily : undefined,
    fontSize: `var(--exr-itemFontSize, ${itemFontSize || "14px"})`,
    fontWeight: `var(--exr-itemFontWeight, ${itemFontWeight || "500"})` as CSSProperties["fontWeight"],
    lineHeight: `var(--exr-itemLineHeight, ${itemLineHeight || "1.5"})`,
  };

  const ctaHover = buildButtonHoverStyle("checklist-cta", {
    background: ctaBackground,
    hoverBackground: ctaHoverBackground,
    hoverColor: ctaHoverColor,
    hoverBoxShadow: ctaHoverBoxShadow,
    hoverBackgroundSize: ctaHoverBackgroundSize,
    hoverBackgroundPosition: ctaHoverBackgroundPosition,
    hoverTransitionDuration: ctaHoverTransitionDuration,
  });

  return (
    <>
      <GoogleFontLink family={eyebrowFontFamily} />
      <GoogleFontLink family={titleFontFamily} />
      <GoogleFontLink family={pillFontFamily} />
      <GoogleFontLink family={itemFontFamily} />
      <GoogleFontLink family={ctaFontFamily} />
      <style dangerouslySetInnerHTML={{ __html: `
        .exr-checklist-columns { display: grid; grid-template-columns: 1fr 1fr; gap: var(--exr-columnsGap, ${columnsGap || "32px"}); }
        @media (max-width: 640px) {
          .exr-checklist-columns { grid-template-columns: 1fr !important; }
        }
      ` }} />
      <section style={{
        background: `var(--exr-containerBackground, ${containerBackground || "#111111"})`,
        borderStyle: "solid",
        borderWidth: `var(--exr-containerBorderWidth, ${containerBorderWidth || "1px"})`,
        borderColor: `var(--exr-containerBorderColor, ${containerBorderColor || "rgba(255,255,255,0.12)"})`,
        borderRadius: `var(--exr-containerBorderRadius, ${containerBorderRadius || "24px"})`,
        maxWidth: `var(--exr-containerMaxWidth, ${containerMaxWidth || "1200px"})`,
        margin: "0 auto",
        paddingTop: `var(--exr-containerPaddingTop, ${containerPaddingTop || "48px"})`,
        paddingRight: `var(--exr-containerPaddingRight, ${containerPaddingRight || "48px"})`,
        paddingBottom: `var(--exr-containerPaddingBottom, ${containerPaddingBottom || "48px"})`,
        paddingLeft: `var(--exr-containerPaddingLeft, ${containerPaddingLeft || "48px"})`,
      }}>
        <div style={{ textAlign: "center", marginBottom: `var(--exr-headerMarginBottom, ${headerMarginBottom || "40px"})` }}>
          {eyebrow && <div style={eyebrowStyle}>{eyebrow}</div>}
          <h2 style={titleStyle}>{title || "Checklist"}</h2>
        </div>

        <div className="exr-checklist-columns">
          <ChecklistColumn label={includedLabel || "Included:"} items={included} Icon={CheckIcon} pillStyle={pillStyle} itemStyle={itemStyle} itemGap={itemGap} iconSize={iconSize} iconColor={iconColor} />
          <ChecklistColumn label={excludedLabel || "Excluded:"} items={excluded} Icon={CrossIcon} pillStyle={pillStyle} itemStyle={itemStyle} itemGap={itemGap} iconSize={iconSize} iconColor={iconColor} />
        </div>

        <div style={{ textAlign: "center", marginTop: `var(--exr-ctaMarginTop, ${ctaMarginTop || "40px"})` }}>
          <a
            href={ctaHref || "/contact"}
            className={ctaHover.hoverClassName}
            style={{
              display: "inline-block",
              paddingTop: ctaPaddingTop || `var(--exr-ctaPaddingV, ${ctaPaddingV || "12px"})`,
              paddingRight: ctaPaddingRight || `var(--exr-ctaPaddingH, ${ctaPaddingH || "32px"})`,
              paddingBottom: ctaPaddingBottom || `var(--exr-ctaPaddingV, ${ctaPaddingV || "12px"})`,
              paddingLeft: ctaPaddingLeft || `var(--exr-ctaPaddingH, ${ctaPaddingH || "32px"})`,
              // marginTop is NOT set here — ctaMarginTop already drives the
              // outer wrapper div's marginTop below; this new per-side
              // Right/Bottom/Left set is additive on the <a> itself only.
              marginRight: ctaMarginRight || undefined,
              marginBottom: ctaMarginBottom || undefined,
              marginLeft: ctaMarginLeft || undefined,
              fontFamily: ctaFontFamily && ctaFontFamily !== "inherit" ? ctaFontFamily : undefined,
              fontSize: `var(--exr-ctaFontSize, ${ctaFontSize || "14px"})`,
              fontWeight: `var(--exr-ctaFontWeight, ${ctaFontWeight || "700"})` as CSSProperties["fontWeight"],
              textTransform: `var(--exr-ctaTextTransform, ${ctaTextTransform || "none"})` as CSSProperties["textTransform"],
              fontStyle: `var(--exr-ctaFontStyle, ${ctaFontStyle || "normal"})` as CSSProperties["fontStyle"],
              textDecoration: `var(--exr-ctaTextDecoration, ${ctaTextDecoration || "none"})`,
              lineHeight: `var(--exr-ctaLineHeight, ${ctaLineHeight || "normal"})`,
              letterSpacing: `var(--exr-ctaLetterSpacing, ${ctaLetterSpacing || "normal"})`,
              wordSpacing: `var(--exr-ctaWordSpacing, ${ctaWordSpacing || "normal"})`,
              background: `var(--exr-ctaBackground, ${ctaBackground || "#2563ff"})`,
              color: `var(--exr-ctaColor, ${ctaColor || "#171717"})`,
              borderStyle: ctaBorderStyle && ctaBorderStyle !== "none" ? ctaBorderStyle : undefined,
              borderWidth: ctaBorderStyle && ctaBorderStyle !== "none" ? ctaBorderWidth || "1px" : undefined,
              borderColor: ctaBorderStyle && ctaBorderStyle !== "none" ? ctaBorderColor : undefined,
              borderRadius: `var(--exr-ctaBorderRadius, ${ctaBorderRadius || "9999px"})`,
              boxShadow: ctaBoxShadow || undefined,
              ...ctaHover.restingStyle,
            }}
          >
            {ctaLabel || "Get Started"}
          </a>
        </div>
      </section>
      {ctaHover.hoverCss && <style dangerouslySetInnerHTML={{ __html: ctaHover.hoverCss }} />}
    </>
  );
}

// ── Trust Highlights Block ────────────────────────────────────────────────
// Eyebrow + title + description + a checkmark-badge list + CTA, all inside
// a bordered/blurred card — same var-bridging + button-hover-style
// conventions as TourInfoSectionBlock/ChecklistBlock above.
function TrustHighlightsBlock({
  eyebrow,
  title,
  description,
  badges,
  ctaLabel,
  ctaHref,
  sectionBackground,
  cardBackground,
  cardBorderColor,
  cardBorderWidth,
  cardBorderWidthTop,
  cardBorderWidthRight,
  cardBorderWidthBottom,
  cardBorderWidthLeft,
  cardBorderRadius,
  cardBoxShadow,
  cardBackdropBlur,
  eyebrowColor,
  eyebrowFontFamily,
  eyebrowFontSize,
  eyebrowFontWeight,
  eyebrowTextTransform,
  eyebrowFontStyle,
  eyebrowTextDecoration,
  eyebrowLineHeight,
  eyebrowLetterSpacing,
  eyebrowWordSpacing,
  titleColor,
  titleFontFamily,
  titleFontSize,
  titleFontWeight,
  titleTextTransform,
  titleFontStyle,
  titleTextDecoration,
  titleLineHeight,
  titleLetterSpacing,
  titleWordSpacing,
  descColor,
  descFontFamily,
  descFontSize,
  descFontWeight,
  descTextTransform,
  descFontStyle,
  descTextDecoration,
  descLineHeight,
  descLetterSpacing,
  descWordSpacing,
  badgeBackground,
  badgeBorderColor,
  badgeBorderRadius,
  badgeBoxShadow,
  badgeBackdropBlur,
  badgeCheckColor,
  badgeColor,
  badgeFontFamily,
  badgeFontSize,
  badgeFontWeight,
  badgeTextTransform,
  badgeFontStyle,
  badgeTextDecoration,
  badgeLineHeight,
  badgeLetterSpacing,
  badgeWordSpacing,
  ctaBackground,
  ctaColor,
  ctaHoverBackground,
  ctaBorderRadius,
  ctaFontFamily,
  ctaFontSize,
  ctaFontWeight,
  ctaTextTransform,
  ctaFontStyle,
  ctaTextDecoration,
  ctaLineHeight,
  ctaLetterSpacing,
  ctaWordSpacing,
  ctaHoverColor,
  ctaBorderStyle,
  ctaBorderWidth,
  ctaBorderColor,
  ctaBoxShadow,
  ctaHoverBoxShadow,
  ctaHoverBackgroundSize,
  ctaHoverBackgroundPosition,
  ctaHoverTransitionDuration,
  ctaPaddingTop,
  ctaPaddingRight,
  ctaPaddingBottom,
  ctaPaddingLeft,
  ctaMarginTop,
  ctaMarginRight,
  ctaMarginBottom,
  ctaMarginLeft,
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  badges?: string[];
  ctaLabel?: string;
  ctaHref?: string;
  sectionBackground?: string;
  cardBackground?: string;
  cardBorderColor?: string;
  cardBorderWidth?: string;
  cardBorderWidthTop?: string;
  cardBorderWidthRight?: string;
  cardBorderWidthBottom?: string;
  cardBorderWidthLeft?: string;
  cardBorderRadius?: string;
  cardBoxShadow?: string;
  cardBackdropBlur?: string;
  eyebrowColor?: string;
  eyebrowFontFamily?: string;
  eyebrowFontSize?: string;
  eyebrowFontWeight?: string;
  eyebrowTextTransform?: string;
  eyebrowFontStyle?: string;
  eyebrowTextDecoration?: string;
  eyebrowLineHeight?: string;
  eyebrowLetterSpacing?: string;
  eyebrowWordSpacing?: string;
  titleColor?: string;
  titleFontFamily?: string;
  titleFontSize?: string;
  titleFontWeight?: string;
  titleTextTransform?: string;
  titleFontStyle?: string;
  titleTextDecoration?: string;
  titleLineHeight?: string;
  titleLetterSpacing?: string;
  titleWordSpacing?: string;
  descColor?: string;
  descFontFamily?: string;
  descFontSize?: string;
  descFontWeight?: string;
  descTextTransform?: string;
  descFontStyle?: string;
  descTextDecoration?: string;
  descLineHeight?: string;
  descLetterSpacing?: string;
  descWordSpacing?: string;
  badgeBackground?: string;
  badgeBorderColor?: string;
  badgeBorderRadius?: string;
  badgeBoxShadow?: string;
  badgeBackdropBlur?: string;
  badgeCheckColor?: string;
  badgeColor?: string;
  badgeFontFamily?: string;
  badgeFontSize?: string;
  badgeFontWeight?: string;
  badgeTextTransform?: string;
  badgeFontStyle?: string;
  badgeTextDecoration?: string;
  badgeLineHeight?: string;
  badgeLetterSpacing?: string;
  badgeWordSpacing?: string;
  ctaBackground?: string;
  ctaColor?: string;
  ctaHoverBackground?: string;
  ctaBorderRadius?: string;
  ctaFontFamily?: string;
  ctaFontSize?: string;
  ctaFontWeight?: string;
  ctaTextTransform?: string;
  ctaFontStyle?: string;
  ctaTextDecoration?: string;
  ctaLineHeight?: string;
  ctaLetterSpacing?: string;
  ctaWordSpacing?: string;
  ctaHoverColor?: string;
  ctaBorderStyle?: "none" | "solid" | "dashed" | "dotted" | "double";
  ctaBorderWidth?: string;
  ctaBorderColor?: string;
  ctaBoxShadow?: string;
  ctaHoverBoxShadow?: string;
  ctaHoverBackgroundSize?: string;
  ctaHoverBackgroundPosition?: string;
  ctaHoverTransitionDuration?: string;
  ctaPaddingTop?: string;
  ctaPaddingRight?: string;
  ctaPaddingBottom?: string;
  ctaPaddingLeft?: string;
  ctaMarginTop?: string;
  ctaMarginRight?: string;
  ctaMarginBottom?: string;
  ctaMarginLeft?: string;
}) {
  const items = badges ?? [];

  function CheckIcon({ style }: { style: CSSProperties }) {
    return (
      <svg viewBox="0 0 24 24" style={style} fill="none">
        <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M7.5 12.5l2.8 2.8 6.2-6.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  const eyebrowStyle: CSSProperties = {
    color: `var(--exr-eyebrowColor, ${eyebrowColor || "#2563ff"})`,
    fontFamily: eyebrowFontFamily && eyebrowFontFamily !== "inherit" ? eyebrowFontFamily : undefined,
    fontSize: `var(--exr-eyebrowFontSize, ${eyebrowFontSize || "12px"})`,
    fontWeight: `var(--exr-eyebrowFontWeight, ${eyebrowFontWeight || "700"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-eyebrowTextTransform, ${eyebrowTextTransform || "uppercase"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-eyebrowFontStyle, ${eyebrowFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-eyebrowTextDecoration, ${eyebrowTextDecoration || "none"})`,
    lineHeight: `var(--exr-eyebrowLineHeight, ${eyebrowLineHeight || "normal"})`,
    letterSpacing: `var(--exr-eyebrowLetterSpacing, ${eyebrowLetterSpacing || "0.3em"})`,
    wordSpacing: `var(--exr-eyebrowWordSpacing, ${eyebrowWordSpacing || "normal"})`,
    margin: "0 0 10px",
  };

  const titleStyle: CSSProperties = {
    color: `var(--exr-titleColor, ${titleColor || "#fff"})`,
    fontFamily: titleFontFamily && titleFontFamily !== "inherit" ? titleFontFamily : undefined,
    fontSize: `var(--exr-titleFontSize, ${titleFontSize || "36px"})`,
    fontWeight: `var(--exr-titleFontWeight, ${titleFontWeight || "800"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-titleTextTransform, ${titleTextTransform || "none"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-titleFontStyle, ${titleFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-titleTextDecoration, ${titleTextDecoration || "none"})`,
    lineHeight: `var(--exr-titleLineHeight, ${titleLineHeight || "1.15"})`,
    letterSpacing: `var(--exr-titleLetterSpacing, ${titleLetterSpacing || "normal"})`,
    wordSpacing: `var(--exr-titleWordSpacing, ${titleWordSpacing || "normal"})`,
    margin: "0 0 16px",
  };

  const descStyle: CSSProperties = {
    color: `var(--exr-descColor, ${descColor || "rgba(255,255,255,0.7)"})`,
    fontFamily: descFontFamily && descFontFamily !== "inherit" ? descFontFamily : undefined,
    fontSize: `var(--exr-descFontSize, ${descFontSize || "15px"})`,
    fontWeight: `var(--exr-descFontWeight, ${descFontWeight || "400"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-descTextTransform, ${descTextTransform || "none"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-descFontStyle, ${descFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-descTextDecoration, ${descTextDecoration || "none"})`,
    lineHeight: `var(--exr-descLineHeight, ${descLineHeight || "1.7"})`,
    letterSpacing: `var(--exr-descLetterSpacing, ${descLetterSpacing || "normal"})`,
    wordSpacing: `var(--exr-descWordSpacing, ${descWordSpacing || "normal"})`,
    margin: "0 0 28px",
    maxWidth: "620px",
  };

  const badgeStyle: CSSProperties = {
    background: `var(--exr-badgeBackground, ${badgeBackground || "rgba(255,255,255,0.05)"})`,
    borderStyle: badgeBorderColor ? "solid" : undefined,
    borderWidth: badgeBorderColor ? "1px" : undefined,
    borderColor: badgeBorderColor,
    borderRadius: `var(--exr-badgeBorderRadius, ${badgeBorderRadius || "15px"})`,
    boxShadow: badgeBoxShadow || undefined,
    backdropFilter: badgeBackdropBlur ? `blur(${badgeBackdropBlur}px)` : undefined,
    color: `var(--exr-badgeColor, ${badgeColor || "#f5f5f5"})`,
    fontFamily: badgeFontFamily && badgeFontFamily !== "inherit" ? badgeFontFamily : undefined,
    fontSize: `var(--exr-badgeFontSize, ${badgeFontSize || "14px"})`,
    fontWeight: `var(--exr-badgeFontWeight, ${badgeFontWeight || "400"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-badgeTextTransform, ${badgeTextTransform || "none"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-badgeFontStyle, ${badgeFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-badgeTextDecoration, ${badgeTextDecoration || "none"})`,
    lineHeight: `var(--exr-badgeLineHeight, ${badgeLineHeight || "1.4"})`,
    letterSpacing: `var(--exr-badgeLetterSpacing, ${badgeLetterSpacing || "normal"})`,
    wordSpacing: `var(--exr-badgeWordSpacing, ${badgeWordSpacing || "normal"})`,
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    padding: "14px 16px",
  };

  const ctaHover = buildButtonHoverStyle("trust-highlights-cta", {
    background: ctaBackground,
    hoverBackground: ctaHoverBackground,
    hoverColor: ctaHoverColor,
    hoverBoxShadow: ctaHoverBoxShadow,
    hoverBackgroundSize: ctaHoverBackgroundSize,
    hoverBackgroundPosition: ctaHoverBackgroundPosition,
    hoverTransitionDuration: ctaHoverTransitionDuration,
  });

  return (
    <>
      <GoogleFontLink family={eyebrowFontFamily} />
      <GoogleFontLink family={titleFontFamily} />
      <GoogleFontLink family={descFontFamily} />
      <GoogleFontLink family={badgeFontFamily} />
      <GoogleFontLink family={ctaFontFamily} />
      <style
        dangerouslySetInnerHTML={{
          __html: `.exr-trust-badges { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }`,
        }}
      />
      <section style={{ background: sectionBackground || undefined }}>
        <div
          style={{
            background: `var(--exr-cardBackground, ${cardBackground || "transparent"})`,
            borderStyle: cardBorderColor ? "solid" : undefined,
            borderTopWidth: cardBorderWidthTop || cardBorderWidth || "1px",
            borderRightWidth: cardBorderWidthRight || cardBorderWidth || "1px",
            borderBottomWidth: cardBorderWidthBottom || cardBorderWidth || "1px",
            borderLeftWidth: cardBorderWidthLeft || cardBorderWidth || "1px",
            borderColor: cardBorderColor,
            borderRadius: `var(--exr-cardBorderRadius, ${cardBorderRadius || "25px"})`,
            boxShadow: cardBoxShadow || undefined,
            backdropFilter: cardBackdropBlur ? `blur(${cardBackdropBlur}px)` : undefined,
            padding: "48px",
          }}
        >
          {eyebrow && <div style={eyebrowStyle}>{eyebrow}</div>}
          <h2 style={titleStyle}>{title || "Built On Trust"}</h2>
          {description && <p style={descStyle}>{description}</p>}
          {items.length > 0 && (
            <div className="exr-trust-badges">
              {items.map((text, i) => (
                <div key={i} style={badgeStyle}>
                  <CheckIcon
                    style={{
                      width: "20px",
                      height: "20px",
                      flexShrink: 0,
                      marginTop: "1px",
                      color: `var(--exr-badgeCheckColor, ${badgeCheckColor || "#2563ff"})`,
                    }}
                  />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          )}
          {ctaLabel && (
            <div style={{ marginTop: "32px" }}>
              <a
                href={ctaHref || "/contact"}
                className={ctaHover.hoverClassName}
                style={{
                  display: "inline-block",
                  paddingTop: ctaPaddingTop || undefined,
                  paddingRight: ctaPaddingRight || undefined,
                  paddingBottom: ctaPaddingBottom || undefined,
                  paddingLeft: ctaPaddingLeft || undefined,
                  padding: ctaPaddingTop || ctaPaddingRight || ctaPaddingBottom || ctaPaddingLeft ? undefined : "14px 32px",
                  marginTop: ctaMarginTop || undefined,
                  marginRight: ctaMarginRight || undefined,
                  marginBottom: ctaMarginBottom || undefined,
                  marginLeft: ctaMarginLeft || undefined,
                  fontFamily: ctaFontFamily && ctaFontFamily !== "inherit" ? ctaFontFamily : undefined,
                  fontSize: `var(--exr-ctaFontSize, ${ctaFontSize || "12px"})`,
                  fontWeight: `var(--exr-ctaFontWeight, ${ctaFontWeight || "400"})` as CSSProperties["fontWeight"],
                  textTransform: `var(--exr-ctaTextTransform, ${ctaTextTransform || "none"})` as CSSProperties["textTransform"],
                  fontStyle: `var(--exr-ctaFontStyle, ${ctaFontStyle || "normal"})` as CSSProperties["fontStyle"],
                  textDecoration: `var(--exr-ctaTextDecoration, ${ctaTextDecoration || "none"})`,
                  lineHeight: `var(--exr-ctaLineHeight, ${ctaLineHeight || "100%"})`,
                  letterSpacing: `var(--exr-ctaLetterSpacing, ${ctaLetterSpacing || "normal"})`,
                  wordSpacing: `var(--exr-ctaWordSpacing, ${ctaWordSpacing || "normal"})`,
                  background: `var(--exr-ctaBackground, ${ctaBackground || "#ffffff"})`,
                  color: `var(--exr-ctaColor, ${ctaColor || "#000000"})`,
                  borderStyle: ctaBorderStyle && ctaBorderStyle !== "none" ? ctaBorderStyle : undefined,
                  borderWidth: ctaBorderStyle && ctaBorderStyle !== "none" ? ctaBorderWidth || "1px" : undefined,
                  borderColor: ctaBorderStyle && ctaBorderStyle !== "none" ? ctaBorderColor : undefined,
                  borderRadius: `var(--exr-ctaBorderRadius, ${ctaBorderRadius || "9999px"})`,
                  boxShadow: ctaBoxShadow || undefined,
                  ...ctaHover.restingStyle,
                }}
              >
                {ctaLabel}
              </a>
            </div>
          )}
        </div>
      </section>
      {ctaHover.hoverCss && <style dangerouslySetInnerHTML={{ __html: ctaHover.hoverCss }} />}
    </>
  );
}

// ── Pill Links Block ──────────────────────────────────────────────────────
// A title plus a repeatable row of pill-shaped links, inside a bordered
// card, with a centered CTA button — see the file-level comment on
// pillLinksBlock in registry.ts.
function PillLinksBlock({
  title,
  areas,
  ctaLabel,
  ctaHref,
  sectionBackgroundImage,
  cardBackground,
  cardBorderColor,
  cardBorderWidth,
  cardBorderWidthTop,
  cardBorderWidthRight,
  cardBorderWidthBottom,
  cardBorderWidthLeft,
  cardBorderRadius,
  cardBoxShadow,
  titleColor,
  titleFontFamily,
  titleFontSize,
  titleFontWeight,
  titleTextTransform,
  titleFontStyle,
  titleTextDecoration,
  titleLineHeight,
  titleLetterSpacing,
  titleWordSpacing,
  badgeBackground,
  badgeHoverBackground,
  badgeBorderColor,
  badgeBorderRadius,
  badgeBoxShadow,
  badgeBackdropBlur,
  badgeColor,
  badgeFontFamily,
  badgeFontSize,
  badgeFontWeight,
  badgeTextTransform,
  badgeFontStyle,
  badgeTextDecoration,
  badgeLineHeight,
  badgeLetterSpacing,
  badgeWordSpacing,
  ctaBackground,
  ctaColor,
  ctaHoverBackground,
  ctaBorderRadius,
  ctaFontFamily,
  ctaFontSize,
  ctaFontWeight,
  ctaTextTransform,
  ctaFontStyle,
  ctaTextDecoration,
  ctaLineHeight,
  ctaLetterSpacing,
  ctaWordSpacing,
  ctaHoverColor,
  ctaBorderStyle,
  ctaBorderWidth,
  ctaBorderColor,
  ctaBoxShadow,
  ctaHoverBoxShadow,
  ctaHoverBackgroundSize,
  ctaHoverBackgroundPosition,
  ctaHoverTransitionDuration,
  ctaPaddingTop,
  ctaPaddingRight,
  ctaPaddingBottom,
  ctaPaddingLeft,
  ctaMarginTop,
  ctaMarginRight,
  ctaMarginBottom,
  ctaMarginLeft,
}: {
  title?: string;
  areas?: PillLinkItem[];
  ctaLabel?: string;
  ctaHref?: string;
  sectionBackgroundImage?: string;
  cardBackground?: string;
  cardBorderColor?: string;
  cardBorderWidth?: string;
  cardBorderWidthTop?: string;
  cardBorderWidthRight?: string;
  cardBorderWidthBottom?: string;
  cardBorderWidthLeft?: string;
  cardBorderRadius?: string;
  cardBoxShadow?: string;
  titleColor?: string;
  titleFontFamily?: string;
  titleFontSize?: string;
  titleFontWeight?: string;
  titleTextTransform?: string;
  titleFontStyle?: string;
  titleTextDecoration?: string;
  titleLineHeight?: string;
  titleLetterSpacing?: string;
  titleWordSpacing?: string;
  badgeBackground?: string;
  badgeHoverBackground?: string;
  badgeBorderColor?: string;
  badgeBorderRadius?: string;
  badgeBoxShadow?: string;
  badgeBackdropBlur?: string;
  badgeColor?: string;
  badgeFontFamily?: string;
  badgeFontSize?: string;
  badgeFontWeight?: string;
  badgeTextTransform?: string;
  badgeFontStyle?: string;
  badgeTextDecoration?: string;
  badgeLineHeight?: string;
  badgeLetterSpacing?: string;
  badgeWordSpacing?: string;
  ctaBackground?: string;
  ctaColor?: string;
  ctaHoverBackground?: string;
  ctaBorderRadius?: string;
  ctaFontFamily?: string;
  ctaFontSize?: string;
  ctaFontWeight?: string;
  ctaTextTransform?: string;
  ctaFontStyle?: string;
  ctaTextDecoration?: string;
  ctaLineHeight?: string;
  ctaLetterSpacing?: string;
  ctaWordSpacing?: string;
  ctaHoverColor?: string;
  ctaBorderStyle?: "none" | "solid" | "dashed" | "dotted" | "double";
  ctaBorderWidth?: string;
  ctaBorderColor?: string;
  ctaBoxShadow?: string;
  ctaHoverBoxShadow?: string;
  ctaHoverBackgroundSize?: string;
  ctaHoverBackgroundPosition?: string;
  ctaHoverTransitionDuration?: string;
  ctaPaddingTop?: string;
  ctaPaddingRight?: string;
  ctaPaddingBottom?: string;
  ctaPaddingLeft?: string;
  ctaMarginTop?: string;
  ctaMarginRight?: string;
  ctaMarginBottom?: string;
  ctaMarginLeft?: string;
}) {
  const items = areas ?? [];

  const titleStyle: CSSProperties = {
    color: `var(--exr-titleColor, ${titleColor || "#ffffff"})`,
    fontFamily: titleFontFamily && titleFontFamily !== "inherit" ? titleFontFamily : undefined,
    fontSize: `var(--exr-titleFontSize, ${titleFontSize || "32px"})`,
    fontWeight: `var(--exr-titleFontWeight, ${titleFontWeight || "900"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-titleTextTransform, ${titleTextTransform || "uppercase"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-titleFontStyle, ${titleFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-titleTextDecoration, ${titleTextDecoration || "none"})`,
    lineHeight: `var(--exr-titleLineHeight, ${titleLineHeight || "1.15"})`,
    letterSpacing: `var(--exr-titleLetterSpacing, ${titleLetterSpacing || "0.02em"})`,
    wordSpacing: `var(--exr-titleWordSpacing, ${titleWordSpacing || "normal"})`,
    margin: "0 0 24px",
    textAlign: "center",
  };

  const badgeClass = "exr-pill-link-badge";

  const ctaHover = buildButtonHoverStyle("pill-links-cta", {
    background: ctaBackground,
    hoverBackground: ctaHoverBackground,
    hoverColor: ctaHoverColor,
    hoverBoxShadow: ctaHoverBoxShadow,
    hoverBackgroundSize: ctaHoverBackgroundSize,
    hoverBackgroundPosition: ctaHoverBackgroundPosition,
    hoverTransitionDuration: ctaHoverTransitionDuration,
  });

  return (
    <>
      <GoogleFontLink family={titleFontFamily} />
      <GoogleFontLink family={badgeFontFamily} />
      <GoogleFontLink family={ctaFontFamily} />
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .exr-pill-links-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }
            .${badgeClass} { background: var(--exr-badgeBackground, ${badgeBackground || "transparent"}); transition: background 0.2s ease-in-out; }
            .${badgeClass}:hover { background: ${badgeHoverBackground || "rgba(37,99,255,0.35)"} !important; }
          `,
        }}
      />
      <section
        style={{
          backgroundImage: sectionBackgroundImage ? `url(${resolveImageUrl(sectionBackgroundImage)})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div
          style={{
            background: `var(--exr-cardBackground, ${cardBackground || "#151515"})`,
            borderStyle: cardBorderColor ? "solid" : undefined,
            borderTopWidth: cardBorderWidthTop || cardBorderWidth || "0.5px",
            borderRightWidth: cardBorderWidthRight || cardBorderWidth || "0.5px",
            borderBottomWidth: cardBorderWidthBottom || cardBorderWidth || "0.5px",
            borderLeftWidth: cardBorderWidthLeft || cardBorderWidth || "0.5px",
            borderColor: cardBorderColor,
            borderRadius: `var(--exr-cardBorderRadius, ${cardBorderRadius || "25px"})`,
            boxShadow: cardBoxShadow || undefined,
            padding: "48px",
          }}
        >
          <h2 style={titleStyle}>{title || "What We Do"}</h2>
          {items.length > 0 && (
            <div className="exr-pill-links-row">
              {items.map((item, i) => (
                <a
                  key={i}
                  href={item.href || "/contact"}
                  className={badgeClass}
                  style={{
                    display: "inline-block",
                    borderStyle: badgeBorderColor ? "solid" : undefined,
                    borderWidth: badgeBorderColor ? "1px" : undefined,
                    borderColor: badgeBorderColor,
                    borderRadius: `var(--exr-badgeBorderRadius, ${badgeBorderRadius || "25px"})`,
                    boxShadow: badgeBoxShadow || undefined,
                    backdropFilter: badgeBackdropBlur ? `blur(${badgeBackdropBlur}px)` : undefined,
                    color: `var(--exr-badgeColor, ${badgeColor || "rgba(255,255,255,0.8)"})`,
                    fontFamily: badgeFontFamily && badgeFontFamily !== "inherit" ? badgeFontFamily : undefined,
                    fontSize: `var(--exr-badgeFontSize, ${badgeFontSize || "14px"})`,
                    fontWeight: `var(--exr-badgeFontWeight, ${badgeFontWeight || "500"})` as CSSProperties["fontWeight"],
                    textTransform: `var(--exr-badgeTextTransform, ${badgeTextTransform || "none"})` as CSSProperties["textTransform"],
                    fontStyle: `var(--exr-badgeFontStyle, ${badgeFontStyle || "normal"})` as CSSProperties["fontStyle"],
                    textDecoration: `var(--exr-badgeTextDecoration, ${badgeTextDecoration || "none"})`,
                    lineHeight: `var(--exr-badgeLineHeight, ${badgeLineHeight || "normal"})`,
                    letterSpacing: `var(--exr-badgeLetterSpacing, ${badgeLetterSpacing || "normal"})`,
                    wordSpacing: `var(--exr-badgeWordSpacing, ${badgeWordSpacing || "normal"})`,
                    padding: "10px 22px",
                  }}
                >
                  {item.label}
                </a>
              ))}
            </div>
          )}
          {ctaLabel && (
            <div style={{ marginTop: "32px", textAlign: "center" }}>
              <a
                href={ctaHref || "/contact"}
                className={ctaHover.hoverClassName}
                style={{
                  display: "inline-block",
                  paddingTop: ctaPaddingTop || undefined,
                  paddingRight: ctaPaddingRight || undefined,
                  paddingBottom: ctaPaddingBottom || undefined,
                  paddingLeft: ctaPaddingLeft || undefined,
                  padding: ctaPaddingTop || ctaPaddingRight || ctaPaddingBottom || ctaPaddingLeft ? undefined : "14px 32px",
                  marginTop: ctaMarginTop || undefined,
                  marginRight: ctaMarginRight || undefined,
                  marginBottom: ctaMarginBottom || undefined,
                  marginLeft: ctaMarginLeft || undefined,
                  fontFamily: ctaFontFamily && ctaFontFamily !== "inherit" ? ctaFontFamily : undefined,
                  fontSize: `var(--exr-ctaFontSize, ${ctaFontSize || "12px"})`,
                  fontWeight: `var(--exr-ctaFontWeight, ${ctaFontWeight || "400"})` as CSSProperties["fontWeight"],
                  textTransform: `var(--exr-ctaTextTransform, ${ctaTextTransform || "none"})` as CSSProperties["textTransform"],
                  fontStyle: `var(--exr-ctaFontStyle, ${ctaFontStyle || "normal"})` as CSSProperties["fontStyle"],
                  textDecoration: `var(--exr-ctaTextDecoration, ${ctaTextDecoration || "none"})`,
                  lineHeight: `var(--exr-ctaLineHeight, ${ctaLineHeight || "normal"})`,
                  letterSpacing: `var(--exr-ctaLetterSpacing, ${ctaLetterSpacing || "normal"})`,
                  wordSpacing: `var(--exr-ctaWordSpacing, ${ctaWordSpacing || "normal"})`,
                  background: `var(--exr-ctaBackground, ${ctaBackground || "#ffffff"})`,
                  color: `var(--exr-ctaColor, ${ctaColor || "#000000"})`,
                  borderStyle: ctaBorderStyle && ctaBorderStyle !== "none" ? ctaBorderStyle : undefined,
                  borderWidth: ctaBorderStyle && ctaBorderStyle !== "none" ? ctaBorderWidth || "1px" : undefined,
                  borderColor: ctaBorderStyle && ctaBorderStyle !== "none" ? ctaBorderColor : undefined,
                  borderRadius: `var(--exr-ctaBorderRadius, ${ctaBorderRadius || "9999px"})`,
                  boxShadow: ctaBoxShadow || undefined,
                  ...ctaHover.restingStyle,
                }}
              >
                {ctaLabel}
              </a>
            </div>
          )}
        </div>
      </section>
      {ctaHover.hoverCss && <style dangerouslySetInnerHTML={{ __html: ctaHover.hoverCss }} />}
    </>
  );
}

// Every block has its own distinct props interface (Heading's `text` has
// nothing in common with Slider's `slides`) — this map is looked up
// dynamically by the block's `type` string at render time (see
// LayoutRenderer.tsx), with props spread in from that node's own
// `Record<string, unknown>`, so there is no single non-`any` prop type that
// legitimately describes every value in this map at once.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const BLOCK_COMPONENTS: Record<string, ComponentType<any>> = {
  // Layout primitives
  Section,
  Columns,
  CarouselContainer: CarouselContainerBlock,
  Spacer,
  Divider,
  // Content primitives
  Heading,
  RichText,
  Image,
  PostTitle,
  PostFeaturedImage,
  PostContent,
  PostExcerpt,
  CTAButton,
  PowerButton: PowerButtonBlock,
  Video,
  Icon,
  Counter,
  Testimonial,
  ImageBox,
  IconBox,
  IconList,
  ServiceCard,
  TextUnfold: TextUnfoldBlock,
  Form: FormBlock,
  SiteLogo: SiteLogoBlock,
  NavMenu: NavMenuBlock,
  LanguageSwitcher: LanguageSwitcherBlock,
  AccordionItem,
  GoogleMaps,
  SocialIcons,
  Gallery: GalleryBlock,
  Tabs: TabsBlock,
  ItineraryRoadmap: ItineraryRoadmapBlock,
  PricingOverview: PricingOverviewBlock,
  FeaturedRoutesCarousel: FeaturedRoutesCarouselBlock,
  StaticToursGrid: StaticToursGridBlock,
  DefinitionRows: DefinitionRowsBlock,
  TourInfoSection: TourInfoSectionBlock,
  Checklist: ChecklistBlock,
  Slider: SliderBlock,
  Services,
  ProcessSteps,
  TrustHighlights: TrustHighlightsBlock,
  PillLinks: PillLinksBlock,
  MarqueeStrip: MarqueeStripBlock,
  // Creative widgets / Content boxes
  ScrollMarquee,
  FlipBox: FlipBoxBlock,
  BeforeAfter: BeforeAfterBlock,
  IconBullets,
  NumberBox,
  TimelineBullets,
  ShapeBullets,
  ScrollTextAnimation: ScrollTextAnimationBlock,
  IconAccordion: IconAccordionBlock,
  StackedImages,
  GlowingCard,
  // Ultimate Addons Core
  AdvancedHeading,
  InfoBox,
  TeamMember,
  PriceTable,
  BusinessHours,
  DualColorHeading,
  FancyHeading: FancyHeadingBlock,
  MarketingButton,
  MultiButtons,
  FAQSchema: FaqSchemaBlock,
  ModalPopup: ModalPopupBlock,
  OffCanvas: OffCanvasBlock,
  // Self-Contained Interactive & Layout Modules
  CountdownTimer: CountdownTimerBlock,
  Hotspot,
  Table,
  TableOfContents: TableOfContentsBlock,
  Blockquote,
  CodeHighlight,
  ProgressTracker: ProgressTrackerBlock,
  ContentToggle: ContentToggleBlock,
  // Site Utilities
  Search,
  Breadcrumbs: BreadcrumbsBlock,
  PostInfo,
  VideoPlaylist: VideoPlaylistBlock,
  Lottie,
  Template: TemplateBlock,
  // Third-Party Form Stylers
  ThirdPartyFormEmbed: FormEmbedStyler,
  // Payments & Integrations (shells)
  PayPalButton,
  StripeButton,
  InstagramFeed,
  TwitterFeed,
  FacebookEmbed,
  // Dynamic Data & Loop Containers (shells)
  LoopGrid,
  LoopCarousel,
  Portfolio,
  TaxonomyFilter: TaxonomyFilterBlock,
  Posts: PostsBlock,
  // Dynamic collections
  CollectionList,
  // Legacy singleton sections (self-fetching — see `singleton` in the registry)
  Testimonials,
  Faq,
  SiteFooter,
  ContactPageLegacy: ContactPageContent,
  ContactFormBlock: ContactForm,
  // IT & Technology
  SystemStatusWidget: SystemStatusWidgetBlock,
  ApiEndpointPreview: ApiEndpointPreviewBlock,
  TechStackGrid: TechStackGridBlock,
};
