import type { CSSProperties } from "react";
import { GoogleFontLink } from "@/components/builder/GoogleFontLink";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { buildButtonHoverStyle } from "./buttonHoverStyle";
import { IconPerson, IconClock } from "@/components/home/icons";

export interface RouteCardItem {
  image?: string;
  badge?: string;
  title?: string;
  description?: string;
  readMoreUrl?: string;
  bookNowUrl?: string;
  /** Meta/price row — a typical listing-card shape (Max N / duration +
   *  "From €price"), free-text like every other field here. */
  maxPeople?: string;
  durationLabel?: string;
  price?: string;
}

/**
 * Eyebrow + heading + description header, a sub-label line, prev/next
 * scroll arrows, and a horizontally-scrollable row of route cards (image +
 * badge + title + description + Read More/Book Now footer). The CENTER
 * card is fixed as visually "active" (border + slightly larger image),
 * independent of scroll position — scrolling the row never moves which
 * card is highlighted (there's nothing conceptually "current" about a
 * scroll position in a row where every card is equally reachable, unlike
 * a single-focus carousel).
 *
 * Prev/Next just scrolls the row by one card width via native
 * `scrollBy` on a ref, not a custom paging/translateX state machine — all
 * cards already live in normal DOM flow inside an `overflow-x-auto`
 * container, so there's nothing to keep in sync.
 *
 * Every Style-tab field reads through `var(--exr-{key}, {desktop value})`
 * — the same var-bridge convention every block in this codebase uses (see
 * resolveNodeStyle.ts's mintVars) — so Tablet/Mobile overrides actually
 * take effect instead of silently doing nothing.
 */
export function FeaturedRoutesCarouselBlock({
  eyebrow,
  heading,
  description,
  subLabel,
  // showNavArrows/arrowColor+Background+Size/cardImagePadding/activeCardBorderColor+Width+Scale below: reserved for a prev/next-arrows + "active card" highlight treatment described in this block's file comment but never actually built (no scroll ref, no arrow buttons, no center-card detection exist in this file) — kept as real schema/PropertyPanel fields rather than removed since deleting them would be a breaking change to already-saved page data, but there's nothing here yet to plug them into.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  showNavArrows,
  routes,
  readMoreLabel,
  accentColor,
  showBottomCta,
  bottomCtaText,
  bottomCtaLink,
  background,
  sectionPaddingTop,
  sectionPaddingBottom,
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
  headingColor,
  headingFontFamily,
  headingFontSize,
  headingFontWeight,
  headingTextTransform,
  headingFontStyle,
  headingTextDecoration,
  headingLineHeight,
  headingLetterSpacing,
  headingWordSpacing,
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
  subLabelColor,
  subLabelFontFamily,
  subLabelFontSize,
  subLabelFontWeight,
  subLabelTextTransform,
  subLabelFontStyle,
  subLabelTextDecoration,
  subLabelLineHeight,
  subLabelLetterSpacing,
  subLabelWordSpacing,
  // showNavArrows/arrowColor+Background+Size/cardImagePadding/activeCardBorderColor+Width+Scale below: reserved for a prev/next-arrows + "active card" highlight treatment described in this block's file comment but never actually built (no scroll ref, no arrow buttons, no center-card detection exist in this file) — kept as real schema/PropertyPanel fields rather than removed since deleting them would be a breaking change to already-saved page data, but there's nothing here yet to plug them into.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  arrowColor,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  arrowBackground,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  arrowSize,
  cardBackground,
  cardRadius,
  cardBorderColor,
  cardBorderWidth,
  cardBoxShadow,
  cardHoverBackground,
  cardHoverBorderColor,
  cardHoverBoxShadow,
  cardHoverScale,
  cardPadding,
  cardImageHeight,
  // showNavArrows/arrowColor+Background+Size/cardImagePadding/activeCardBorderColor+Width+Scale below: reserved for a prev/next-arrows + "active card" highlight treatment described in this block's file comment but never actually built (no scroll ref, no arrow buttons, no center-card detection exist in this file) — kept as real schema/PropertyPanel fields rather than removed since deleting them would be a breaking change to already-saved page data, but there's nothing here yet to plug them into.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  cardImagePadding,
  cardImageRadius,
  cardTitleColor,
  cardTitleFontFamily,
  cardTitleFontSize,
  cardTitleFontWeight,
  cardTitleTextTransform,
  cardTitleFontStyle,
  cardTitleTextDecoration,
  cardTitleLineHeight,
  cardTitleLetterSpacing,
  cardTitleWordSpacing,
  cardDescColor,
  cardDescFontFamily,
  cardDescFontSize,
  cardDescFontWeight,
  cardDescTextTransform,
  cardDescFontStyle,
  cardDescTextDecoration,
  cardDescLineHeight,
  cardDescLetterSpacing,
  cardDescWordSpacing,
  badgeBgColor,
  badgeTextColor,
  viewDetailsLabel,
  metaColor,
  metaFontFamily,
  metaFontSize,
  metaFontWeight,
  metaTextTransform,
  metaFontStyle,
  metaTextDecoration,
  metaLineHeight,
  metaLetterSpacing,
  metaWordSpacing,
  priceColor,
  priceFontFamily,
  priceFontSize,
  priceFontWeight,
  priceTextTransform,
  priceFontStyle,
  priceTextDecoration,
  priceLineHeight,
  priceLetterSpacing,
  priceWordSpacing,
  readMoreColor,
  bookNowColor,
  bookNowBackground,
  bookNowHoverBackground,
  bookNowHoverColor,
  bookNowHoverBorderColor,
  bookNowGlow,
  // showNavArrows/arrowColor+Background+Size/cardImagePadding/activeCardBorderColor+Width+Scale below: reserved for a prev/next-arrows + "active card" highlight treatment described in this block's file comment but never actually built (no scroll ref, no arrow buttons, no center-card detection exist in this file) — kept as real schema/PropertyPanel fields rather than removed since deleting them would be a breaking change to already-saved page data, but there's nothing here yet to plug them into.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  activeCardBorderColor,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  activeCardBorderWidth,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  activeCardScale,
  ctaBackground,
  ctaColor,
  ctaHoverBackground,
  ctaHoverColor,
  ctaHoverBorderColor,
  ctaBorderRadius,
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
  ctaGlow,
}: {
  eyebrow?: string;
  heading?: string;
  description?: string;
  subLabel?: string;
  showNavArrows?: boolean;
  routes?: RouteCardItem[];
  readMoreLabel?: string;
  accentColor?: string;
  showBottomCta?: boolean;
  bottomCtaText?: string;
  bottomCtaLink?: string;
  background?: string;
  sectionPaddingTop?: string;
  sectionPaddingBottom?: string;
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
  headingColor?: string;
  headingFontFamily?: string;
  headingFontSize?: string;
  headingFontWeight?: string;
  headingTextTransform?: string;
  headingFontStyle?: string;
  headingTextDecoration?: string;
  headingLineHeight?: string;
  headingLetterSpacing?: string;
  headingWordSpacing?: string;
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
  subLabelColor?: string;
  subLabelFontFamily?: string;
  subLabelFontSize?: string;
  subLabelFontWeight?: string;
  subLabelTextTransform?: string;
  subLabelFontStyle?: string;
  subLabelTextDecoration?: string;
  subLabelLineHeight?: string;
  subLabelLetterSpacing?: string;
  subLabelWordSpacing?: string;
  arrowColor?: string;
  arrowBackground?: string;
  arrowSize?: string;
  cardBackground?: string;
  cardRadius?: string;
  cardBorderColor?: string;
  cardBorderWidth?: string;
  cardBoxShadow?: string;
  cardHoverBackground?: string;
  cardHoverBorderColor?: string;
  cardHoverBoxShadow?: string;
  cardHoverScale?: string;
  cardPadding?: string;
  cardImageHeight?: string;
  cardImagePadding?: string;
  cardImageRadius?: string;
  cardTitleColor?: string;
  cardTitleFontFamily?: string;
  cardTitleFontSize?: string;
  cardTitleFontWeight?: string;
  cardTitleTextTransform?: string;
  cardTitleFontStyle?: string;
  cardTitleTextDecoration?: string;
  cardTitleLineHeight?: string;
  cardTitleLetterSpacing?: string;
  cardTitleWordSpacing?: string;
  cardDescColor?: string;
  cardDescFontFamily?: string;
  cardDescFontSize?: string;
  cardDescFontWeight?: string;
  cardDescTextTransform?: string;
  cardDescFontStyle?: string;
  cardDescTextDecoration?: string;
  cardDescLineHeight?: string;
  cardDescLetterSpacing?: string;
  cardDescWordSpacing?: string;
  badgeBgColor?: string;
  badgeTextColor?: string;
  viewDetailsLabel?: string;
  metaColor?: string;
  metaFontFamily?: string;
  metaFontSize?: string;
  metaFontWeight?: string;
  metaTextTransform?: string;
  metaFontStyle?: string;
  metaTextDecoration?: string;
  metaLineHeight?: string;
  metaLetterSpacing?: string;
  metaWordSpacing?: string;
  priceColor?: string;
  priceFontFamily?: string;
  priceFontSize?: string;
  priceFontWeight?: string;
  priceTextTransform?: string;
  priceFontStyle?: string;
  priceTextDecoration?: string;
  priceLineHeight?: string;
  priceLetterSpacing?: string;
  priceWordSpacing?: string;
  readMoreColor?: string;
  bookNowColor?: string;
  bookNowBackground?: string;
  bookNowHoverBackground?: string;
  bookNowHoverColor?: string;
  bookNowHoverBorderColor?: string;
  bookNowGlow?: boolean;
  activeCardBorderColor?: string;
  activeCardBorderWidth?: string;
  activeCardScale?: string;
  ctaBackground?: string;
  ctaColor?: string;
  ctaHoverBackground?: string;
  ctaHoverColor?: string;
  ctaHoverBorderColor?: string;
  ctaBorderRadius?: string;
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
  ctaGlow?: boolean;
}) {
  const cards = (routes ?? []).filter((r) => r.title || r.image);
  const accent = accentColor || "#2563ff";

  const cardTitleStyle: CSSProperties = {
    color: `var(--exr-cardTitleColor, ${cardTitleColor || "#111111"})`,
    fontFamily: cardTitleFontFamily && cardTitleFontFamily !== "inherit" ? cardTitleFontFamily : undefined,
    fontSize: `var(--exr-cardTitleFontSize, ${cardTitleFontSize || "13px"})`,
    fontWeight: `var(--exr-cardTitleFontWeight, ${cardTitleFontWeight || "700"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-cardTitleTextTransform, ${cardTitleTextTransform || "none"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-cardTitleFontStyle, ${cardTitleFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-cardTitleTextDecoration, ${cardTitleTextDecoration || "none"})`,
    lineHeight: `var(--exr-cardTitleLineHeight, ${cardTitleLineHeight || "1.4"})`,
    letterSpacing: `var(--exr-cardTitleLetterSpacing, ${cardTitleLetterSpacing || "normal"})`,
    wordSpacing: `var(--exr-cardTitleWordSpacing, ${cardTitleWordSpacing || "normal"})`,
  };

  const cardDescStyle: CSSProperties = {
    color: `var(--exr-cardDescColor, ${cardDescColor || "#71717a"})`,
    fontFamily: cardDescFontFamily && cardDescFontFamily !== "inherit" ? cardDescFontFamily : undefined,
    fontSize: `var(--exr-cardDescFontSize, ${cardDescFontSize || "12px"})`,
    fontWeight: `var(--exr-cardDescFontWeight, ${cardDescFontWeight || "400"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-cardDescTextTransform, ${cardDescTextTransform || "none"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-cardDescFontStyle, ${cardDescFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-cardDescTextDecoration, ${cardDescTextDecoration || "none"})`,
    lineHeight: `var(--exr-cardDescLineHeight, ${cardDescLineHeight || "1.5"})`,
    letterSpacing: `var(--exr-cardDescLetterSpacing, ${cardDescLetterSpacing || "normal"})`,
    wordSpacing: `var(--exr-cardDescWordSpacing, ${cardDescWordSpacing || "normal"})`,
  };

  const metaStyle: CSSProperties = {
    color: `var(--exr-metaColor, ${metaColor || "#52525b"})`,
    fontFamily: metaFontFamily && metaFontFamily !== "inherit" ? metaFontFamily : undefined,
    fontSize: `var(--exr-metaFontSize, ${metaFontSize || "11px"})`,
    fontWeight: `var(--exr-metaFontWeight, ${metaFontWeight || "400"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-metaTextTransform, ${metaTextTransform || "none"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-metaFontStyle, ${metaFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-metaTextDecoration, ${metaTextDecoration || "none"})`,
    lineHeight: `var(--exr-metaLineHeight, ${metaLineHeight || "normal"})`,
    letterSpacing: `var(--exr-metaLetterSpacing, ${metaLetterSpacing || "normal"})`,
    wordSpacing: `var(--exr-metaWordSpacing, ${metaWordSpacing || "normal"})`,
  };

  const priceStyle: CSSProperties = {
    color: `var(--exr-priceColor, ${priceColor || "#111111"})`,
    fontFamily: priceFontFamily && priceFontFamily !== "inherit" ? priceFontFamily : undefined,
    fontSize: `var(--exr-priceFontSize, ${priceFontSize || "13px"})`,
    fontWeight: `var(--exr-priceFontWeight, ${priceFontWeight || "800"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-priceTextTransform, ${priceTextTransform || "none"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-priceFontStyle, ${priceFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-priceTextDecoration, ${priceTextDecoration || "none"})`,
    lineHeight: `var(--exr-priceLineHeight, ${priceLineHeight || "normal"})`,
    letterSpacing: `var(--exr-priceLetterSpacing, ${priceLetterSpacing || "normal"})`,
    wordSpacing: `var(--exr-priceWordSpacing, ${priceWordSpacing || "normal"})`,
  };

  return (
    <section
      // No overflow-hidden here — this block's horizontal clipping is
      // scoped entirely to the scroll track below via its own
      // overflow-x-auto, and the active card's transform:scale()
      // legitimately needs to paint past its own (unscaled) layout box
      // vertically. An overflow-hidden here would clip exactly that.
      className="w-full px-4 md:px-8"
      style={{ background: background || "#ffffff", paddingTop: sectionPaddingTop || "80px", paddingBottom: sectionPaddingBottom || "80px" }}
    >
      <GoogleFontLink family={eyebrowFontFamily} />
      <GoogleFontLink family={headingFontFamily} />
      <GoogleFontLink family={descFontFamily} />
      <GoogleFontLink family={subLabelFontFamily} />
      <GoogleFontLink family={cardTitleFontFamily} />
      <GoogleFontLink family={cardDescFontFamily} />
      <GoogleFontLink family={ctaFontFamily} />

      <div className="max-w-6xl mx-auto flex flex-col items-center text-center">
        {eyebrow && (
          <p
            style={{
              margin: 0,
              color: `var(--exr-eyebrowColor, ${eyebrowColor || accent})`,
              fontFamily: eyebrowFontFamily && eyebrowFontFamily !== "inherit" ? eyebrowFontFamily : undefined,
              fontSize: `var(--exr-eyebrowFontSize, ${eyebrowFontSize || "13px"})`,
              fontWeight: `var(--exr-eyebrowFontWeight, ${eyebrowFontWeight || "700"})` as CSSProperties["fontWeight"],
              textTransform: `var(--exr-eyebrowTextTransform, ${eyebrowTextTransform || "uppercase"})` as CSSProperties["textTransform"],
              fontStyle: `var(--exr-eyebrowFontStyle, ${eyebrowFontStyle || "normal"})` as CSSProperties["fontStyle"],
              textDecoration: `var(--exr-eyebrowTextDecoration, ${eyebrowTextDecoration || "none"})`,
              lineHeight: `var(--exr-eyebrowLineHeight, ${eyebrowLineHeight || "normal"})`,
              letterSpacing: `var(--exr-eyebrowLetterSpacing, ${eyebrowLetterSpacing || "0.35em"})`,
              wordSpacing: `var(--exr-eyebrowWordSpacing, ${eyebrowWordSpacing || "normal"})`,
            }}
          >
            {eyebrow}
          </p>
        )}
        {heading && (
          <h2
            style={{
              margin: "8px 0 0",
              color: `var(--exr-headingColor, ${headingColor || "#111111"})`,
              fontFamily: headingFontFamily && headingFontFamily !== "inherit" ? headingFontFamily : undefined,
              fontSize: `var(--exr-headingFontSize, ${headingFontSize || "clamp(28px,4vw,44px)"})`,
              fontWeight: `var(--exr-headingFontWeight, ${headingFontWeight || "900"})` as CSSProperties["fontWeight"],
              textTransform: `var(--exr-headingTextTransform, ${headingTextTransform || "uppercase"})` as CSSProperties["textTransform"],
              fontStyle: `var(--exr-headingFontStyle, ${headingFontStyle || "normal"})` as CSSProperties["fontStyle"],
              textDecoration: `var(--exr-headingTextDecoration, ${headingTextDecoration || "none"})`,
              lineHeight: `var(--exr-headingLineHeight, ${headingLineHeight || "1.15"})`,
              letterSpacing: `var(--exr-headingLetterSpacing, ${headingLetterSpacing || "normal"})`,
              wordSpacing: `var(--exr-headingWordSpacing, ${headingWordSpacing || "normal"})`,
            }}
          >
            {heading}
          </h2>
        )}
        {description && (
          <p
            className="max-w-2xl"
            style={{
              marginTop: "12px",
              color: `var(--exr-descColor, ${descColor || "#52525b"})`,
              fontFamily: descFontFamily && descFontFamily !== "inherit" ? descFontFamily : undefined,
              fontSize: `var(--exr-descFontSize, ${descFontSize || "15px"})`,
              fontWeight: `var(--exr-descFontWeight, ${descFontWeight || "400"})` as CSSProperties["fontWeight"],
              textTransform: `var(--exr-descTextTransform, ${descTextTransform || "none"})` as CSSProperties["textTransform"],
              fontStyle: `var(--exr-descFontStyle, ${descFontStyle || "normal"})` as CSSProperties["fontStyle"],
              textDecoration: `var(--exr-descTextDecoration, ${descTextDecoration || "none"})`,
              lineHeight: `var(--exr-descLineHeight, ${descLineHeight || "1.6"})`,
              letterSpacing: `var(--exr-descLetterSpacing, ${descLetterSpacing || "normal"})`,
              wordSpacing: `var(--exr-descWordSpacing, ${descWordSpacing || "normal"})`,
            }}
          >
            {description}
          </p>
        )}
        {subLabel && (
          <p
            style={{
              marginTop: "20px",
              color: `var(--exr-subLabelColor, ${subLabelColor || "#111111"})`,
              fontFamily: subLabelFontFamily && subLabelFontFamily !== "inherit" ? subLabelFontFamily : undefined,
              fontSize: `var(--exr-subLabelFontSize, ${subLabelFontSize || "16px"})`,
              fontWeight: `var(--exr-subLabelFontWeight, ${subLabelFontWeight || "700"})` as CSSProperties["fontWeight"],
              textTransform: `var(--exr-subLabelTextTransform, ${subLabelTextTransform || "none"})` as CSSProperties["textTransform"],
              fontStyle: `var(--exr-subLabelFontStyle, ${subLabelFontStyle || "normal"})` as CSSProperties["fontStyle"],
              textDecoration: `var(--exr-subLabelTextDecoration, ${subLabelTextDecoration || "none"})`,
              lineHeight: `var(--exr-subLabelLineHeight, ${subLabelLineHeight || "normal"})`,
              letterSpacing: `var(--exr-subLabelLetterSpacing, ${subLabelLetterSpacing || "normal"})`,
              wordSpacing: `var(--exr-subLabelWordSpacing, ${subLabelWordSpacing || "normal"})`,
            }}
          >
            {subLabel}
          </p>
        )}

        {/* Static responsive grid — 3 columns desktop, 2 tablet, 1 mobile.
            Was a horizontally-wrapping flex row with decorative (non-
            functional) prev/next arrows and a permanently-scaled "active"
            center card; both removed per explicit request — a grid of
            equal-weight cards has no scroll position to page through or
            center card to highlight. Same breakpoint convention as
            ToursIndexContent's own grid (legacyPages.tsx) for visual
            consistency between the two card sections. */}
        <div className="mt-8 grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, idx) => {
            const cardHover = buildButtonHoverStyle(`frc-card-${idx}`, {
              background: cardBackground,
              hoverBackground: cardHoverBackground,
              hoverBorderColor: cardHoverBorderColor,
              hoverBoxShadow: cardHoverBoxShadow,
              hoverTransform: cardHoverScale ? `scale(${cardHoverScale})` : undefined,
            });
            return (
              <div
                key={idx}
                className={`flex flex-col text-left overflow-hidden transition-transform duration-300 ${cardHover.hoverClassName}`}
                style={{
                  background: `var(--exr-cardBackground, ${cardBackground || "#ffffff"})`,
                  borderRadius: `var(--exr-cardRadius, ${cardRadius || "16px"})`,
                  borderStyle: "solid",
                  borderWidth: `var(--exr-cardBorderWidth, ${cardBorderWidth || "1px"})`,
                  borderColor: `var(--exr-cardBorderColor, ${cardBorderColor || "rgba(0,0,0,0.08)"})`,
                  boxShadow: cardBoxShadow ? `var(--exr-cardBoxShadow, ${cardBoxShadow})` : undefined,
                }}
              >
                {cardHover.hoverCss && <style dangerouslySetInnerHTML={{ __html: cardHover.hoverCss }} />}
                {/* Flush with the card's own top edge — no padding of its
                    own, clipped to the card's rounded top corners by the
                    parent's overflow-hidden — matching Tours Listing's
                    "full image top half" card structure exactly. */}
                {card.image && (
                  <div
                    className="relative w-full shrink-0 overflow-hidden"
                    style={{
                      height: `var(--exr-cardImageHeight, ${cardImageHeight || "150px"})`,
                      borderRadius: `var(--exr-cardImageRadius, ${cardImageRadius || "12px"}) var(--exr-cardImageRadius, ${cardImageRadius || "12px"}) 0 0`,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded content, see ImageBox for the same fix */}
                    <img
                      src={resolveImageUrl(card.image)}
                      alt={card.title || "Ski route"}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    {card.badge && (
                      <span
                        className="absolute right-2 top-2 whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide shadow-sm"
                        style={{
                          background: `var(--exr-badgeBgColor, ${badgeBgColor || "rgba(255,255,255,0.95)"})`,
                          color: `var(--exr-badgeTextColor, ${badgeTextColor || "#18181b"})`,
                        }}
                      >
                        {card.badge}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex flex-1 flex-col" style={{ padding: `var(--exr-cardPadding, ${cardPadding || "16px"})` }}>
                  {card.title && (
                    <h3 style={cardTitleStyle}>
                      {card.title}
                    </h3>
                  )}
                  {card.description && (
                    <p className="mt-1 flex-1" style={cardDescStyle}>
                      {card.description}
                    </p>
                  )}

                  {(card.maxPeople || card.durationLabel) && (
                    <div className="mt-3 flex items-center gap-4 border-t pt-3" style={{ ...metaStyle, borderColor: "rgba(0,0,0,0.08)" }}>
                      {card.maxPeople && (
                        <span className="flex items-center gap-1.5">
                          <IconPerson className="h-4 w-4" /> Max {card.maxPeople}
                        </span>
                      )}
                      {card.durationLabel && (
                        <span className="flex items-center gap-1.5">
                          <IconClock className="h-4 w-4" /> {card.durationLabel}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Read More stays available as a small secondary link
                      (some already-configured cards only ever set this one) —
                      Tours Listing has no equivalent, but dropping it here
                      would silently orphan that field's data on existing pages. */}
                  {card.readMoreUrl && (
                    <a
                      href={card.readMoreUrl}
                      className="mt-2 text-[11px] font-semibold"
                      style={{ color: `var(--exr-readMoreColor, ${readMoreColor || "#a1a1aa"})` }}
                    >
                      {readMoreLabel || "Read More"}
                    </a>
                  )}

                  <div className="mt-auto pt-3 flex items-center justify-between gap-3">
                    {card.price && <span style={priceStyle}>From €{card.price}</span>}
                    <a
                      href={card.bookNowUrl || card.readMoreUrl || "#"}
                      className={`frc-booknow relative z-0 ml-auto shrink-0 rounded-full px-4 py-2 text-[11px] font-semibold transition-colors ${bookNowGlow ? "frc-booknow-glow" : ""}`}
                      style={{
                        background: `var(--exr-bookNowBackground, ${bookNowBackground || accent})`,
                        color: `var(--exr-bookNowColor, ${bookNowColor || "#171717"})`,
                      }}
                    >
                      {viewDetailsLabel || "View Details"}
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {(bookNowHoverBackground || bookNowHoverColor || bookNowHoverBorderColor) && (
          <style
            dangerouslySetInnerHTML={{
              __html: `.frc-booknow:hover{${[
                bookNowHoverBackground && `background:${bookNowHoverBackground} !important;`,
                bookNowHoverColor && `color:${bookNowHoverColor} !important;`,
                bookNowHoverBorderColor && `border-color:${bookNowHoverBorderColor} !important;`,
              ]
                .filter(Boolean)
                .join("")}}`,
            }}
          />
        )}
        {/* Same always-on pulsing glow as PricingOverviewBlock's ctaGlow /
            Services' bookNowGlow — a fixed, non-parameterized rule, safe to
            redeclare identically across every card that has it on. */}
        {bookNowGlow && (
          <style
            dangerouslySetInnerHTML={{
              __html: `
                @keyframes frc-booknow-glow-kf{0%{background-position:0% 50%;}100%{background-position:400% 50%;}}
                .frc-booknow-glow::before{content:"";position:absolute;inset:-3px;z-index:-1;border-radius:inherit;background:linear-gradient(45deg,#2563ff,#e8ce8c,#8a6f3b,#2563ff);background-size:400% 400%;filter:blur(6px);animation:frc-booknow-glow-kf 6s linear infinite;}
              `,
            }}
          />
        )}

        {showBottomCta !== false && bottomCtaText && (
          <div className="mt-10">
            <a
              href={bottomCtaLink || "#"}
              className={`frc-cta inline-block transition-colors ${ctaGlow ? "frc-cta-glow" : ""}`}
              style={{
                background: `var(--exr-ctaBackground, ${ctaBackground || accent})`,
                color: `var(--exr-ctaColor, ${ctaColor || "#171717"})`,
                borderRadius: `var(--exr-ctaBorderRadius, ${ctaBorderRadius || "999px"})`,
                paddingBlock: `var(--exr-ctaPaddingV, ${ctaPaddingV || "14px"})`,
                paddingInline: `var(--exr-ctaPaddingH, ${ctaPaddingH || "36px"})`,
                fontFamily: ctaFontFamily && ctaFontFamily !== "inherit" ? ctaFontFamily : undefined,
                fontSize: `var(--exr-ctaFontSize, ${ctaFontSize || "14px"})`,
                fontWeight: `var(--exr-ctaFontWeight, ${ctaFontWeight || "700"})` as CSSProperties["fontWeight"],
                textTransform: `var(--exr-ctaTextTransform, ${ctaTextTransform || "none"})` as CSSProperties["textTransform"],
                fontStyle: `var(--exr-ctaFontStyle, ${ctaFontStyle || "normal"})` as CSSProperties["fontStyle"],
                textDecoration: `var(--exr-ctaTextDecoration, ${ctaTextDecoration || "none"})`,
                lineHeight: `var(--exr-ctaLineHeight, ${ctaLineHeight || "normal"})`,
                letterSpacing: `var(--exr-ctaLetterSpacing, ${ctaLetterSpacing || "normal"})`,
                wordSpacing: `var(--exr-ctaWordSpacing, ${ctaWordSpacing || "normal"})`,
              }}
            >
              {bottomCtaText}
            </a>
            {(ctaHoverBackground || ctaHoverColor || ctaHoverBorderColor) && (
              <style
                dangerouslySetInnerHTML={{
                  __html: `.frc-cta:hover{${[
                    ctaHoverBackground && `background:${ctaHoverBackground} !important;`,
                    ctaHoverColor && `color:${ctaHoverColor} !important;`,
                    ctaHoverBorderColor && `border-color:${ctaHoverBorderColor} !important;`,
                  ]
                    .filter(Boolean)
                    .join("")}}`,
                }}
              />
            )}
            {ctaGlow && (
              <style
                dangerouslySetInnerHTML={{
                  __html: `
                    @keyframes frc-cta-glow-kf{0%{background-position:0% 50%;}100%{background-position:400% 50%;}}
                    .frc-cta-glow{position:relative;z-index:0;}
                    .frc-cta-glow::before{content:"";position:absolute;inset:-3px;z-index:-1;border-radius:inherit;background:linear-gradient(45deg,#2563ff,#e8ce8c,#8a6f3b,#2563ff);background-size:400% 400%;filter:blur(6px);animation:frc-cta-glow-kf 6s linear infinite;}
                  `,
                }}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
