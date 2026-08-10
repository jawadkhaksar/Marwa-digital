import type { CSSProperties } from "react";
import { GoogleFontLink } from "@/components/builder/GoogleFontLink";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { IconPerson, IconClock } from "@/components/home/icons";

export interface StaticTourItem {
  image?: string;
  title?: string;
  tagline?: string;
  description?: string;
  maxPeople?: string;
  durationLabel?: string;
  price?: string;
  href?: string;
}

/**
 * A hand-authored clone of ToursIndexLegacy's card grid (legacyPages.tsx's
 * ToursIndexContent) — same layout, same card structure (image top half,
 * flush edge-to-edge with only top corners rounded; title/tagline/
 * description; Max N / duration meta row; "From €price" + a "View Details"
 * pill), but `items` is a plain per-instance array instead of a live Tours
 * CMS fetch. Exists so a page can show a curated/static set of cards
 * without pulling from — or ever drifting against — the real Tours CMS.
 */
export function StaticToursGridBlock({
  eyebrow,
  heading,
  intro,
  badgeLabel,
  viewDetailsLabel,
  items,
  sectionBackground,
  accentColor,
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
  introColor,
  introFontFamily,
  introFontSize,
  introFontWeight,
  introTextTransform,
  introFontStyle,
  introTextDecoration,
  introLineHeight,
  introLetterSpacing,
  introWordSpacing,
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
  taglineColor,
  taglineFontFamily,
  taglineFontSize,
  taglineFontWeight,
  taglineTextTransform,
  taglineFontStyle,
  taglineTextDecoration,
  taglineLineHeight,
  taglineLetterSpacing,
  taglineWordSpacing,
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
  cardBackground,
  cardBorderColor,
  cardBorderRadius,
  cardBoxShadow,
  badgeBackground,
  badgeColor,
  ctaBackground,
  ctaColor,
  ctaHoverBackground,
}: {
  eyebrow?: string;
  heading?: string;
  intro?: string;
  badgeLabel?: string;
  viewDetailsLabel?: string;
  items?: StaticTourItem[];
  sectionBackground?: string;
  accentColor?: string;
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
  introColor?: string;
  introFontFamily?: string;
  introFontSize?: string;
  introFontWeight?: string;
  introTextTransform?: string;
  introFontStyle?: string;
  introTextDecoration?: string;
  introLineHeight?: string;
  introLetterSpacing?: string;
  introWordSpacing?: string;
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
  taglineColor?: string;
  taglineFontFamily?: string;
  taglineFontSize?: string;
  taglineFontWeight?: string;
  taglineTextTransform?: string;
  taglineFontStyle?: string;
  taglineTextDecoration?: string;
  taglineLineHeight?: string;
  taglineLetterSpacing?: string;
  taglineWordSpacing?: string;
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
  cardBackground?: string;
  cardBorderColor?: string;
  cardBorderRadius?: string;
  cardBoxShadow?: string;
  badgeBackground?: string;
  badgeColor?: string;
  ctaBackground?: string;
  ctaColor?: string;
  ctaHoverBackground?: string;
}) {
  const cards = (items ?? []).filter((item) => item.title || item.image);
  const accent = accentColor || "#2563ff";

  const eyebrowStyle: CSSProperties = {
    color: `var(--exr-eyebrowColor, ${eyebrowColor || accent})`,
    fontFamily: eyebrowFontFamily && eyebrowFontFamily !== "inherit" ? eyebrowFontFamily : undefined,
    fontSize: `var(--exr-eyebrowFontSize, ${eyebrowFontSize || "13px"})`,
    fontWeight: `var(--exr-eyebrowFontWeight, ${eyebrowFontWeight || "700"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-eyebrowTextTransform, ${eyebrowTextTransform || "uppercase"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-eyebrowFontStyle, ${eyebrowFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-eyebrowTextDecoration, ${eyebrowTextDecoration || "none"})`,
    lineHeight: `var(--exr-eyebrowLineHeight, ${eyebrowLineHeight || "normal"})`,
    letterSpacing: `var(--exr-eyebrowLetterSpacing, ${eyebrowLetterSpacing || "0.3em"})`,
    wordSpacing: `var(--exr-eyebrowWordSpacing, ${eyebrowWordSpacing || "normal"})`,
  };

  const headingStyle: CSSProperties = {
    color: `var(--exr-headingColor, ${headingColor || "#111111"})`,
    fontFamily: headingFontFamily && headingFontFamily !== "inherit" ? headingFontFamily : undefined,
    fontSize: `var(--exr-headingFontSize, ${headingFontSize || "clamp(28px,4vw,44px)"})`,
    fontWeight: `var(--exr-headingFontWeight, ${headingFontWeight || "800"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-headingTextTransform, ${headingTextTransform || "none"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-headingFontStyle, ${headingFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-headingTextDecoration, ${headingTextDecoration || "none"})`,
    lineHeight: `var(--exr-headingLineHeight, ${headingLineHeight || "1.15"})`,
    letterSpacing: `var(--exr-headingLetterSpacing, ${headingLetterSpacing || "normal"})`,
    wordSpacing: `var(--exr-headingWordSpacing, ${headingWordSpacing || "normal"})`,
  };

  const introStyle: CSSProperties = {
    color: `var(--exr-introColor, ${introColor || "#52525b"})`,
    fontFamily: introFontFamily && introFontFamily !== "inherit" ? introFontFamily : undefined,
    fontSize: `var(--exr-introFontSize, ${introFontSize || "15px"})`,
    fontWeight: `var(--exr-introFontWeight, ${introFontWeight || "400"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-introTextTransform, ${introTextTransform || "none"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-introFontStyle, ${introFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-introTextDecoration, ${introTextDecoration || "none"})`,
    lineHeight: `var(--exr-introLineHeight, ${introLineHeight || "1.6"})`,
    letterSpacing: `var(--exr-introLetterSpacing, ${introLetterSpacing || "normal"})`,
    wordSpacing: `var(--exr-introWordSpacing, ${introWordSpacing || "normal"})`,
  };

  const titleStyle: CSSProperties = {
    color: `var(--exr-titleColor, ${titleColor || "#111111"})`,
    fontFamily: titleFontFamily && titleFontFamily !== "inherit" ? titleFontFamily : undefined,
    fontSize: `var(--exr-titleFontSize, ${titleFontSize || "18px"})`,
    fontWeight: `var(--exr-titleFontWeight, ${titleFontWeight || "800"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-titleTextTransform, ${titleTextTransform || "none"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-titleFontStyle, ${titleFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-titleTextDecoration, ${titleTextDecoration || "none"})`,
    lineHeight: `var(--exr-titleLineHeight, ${titleLineHeight || "1.3"})`,
    letterSpacing: `var(--exr-titleLetterSpacing, ${titleLetterSpacing || "normal"})`,
    wordSpacing: `var(--exr-titleWordSpacing, ${titleWordSpacing || "normal"})`,
  };

  const taglineStyle: CSSProperties = {
    color: `var(--exr-taglineColor, ${taglineColor || accent})`,
    fontFamily: taglineFontFamily && taglineFontFamily !== "inherit" ? taglineFontFamily : undefined,
    fontSize: `var(--exr-taglineFontSize, ${taglineFontSize || "13px"})`,
    fontWeight: `var(--exr-taglineFontWeight, ${taglineFontWeight || "400"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-taglineTextTransform, ${taglineTextTransform || "none"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-taglineFontStyle, ${taglineFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-taglineTextDecoration, ${taglineTextDecoration || "none"})`,
    lineHeight: `var(--exr-taglineLineHeight, ${taglineLineHeight || "normal"})`,
    letterSpacing: `var(--exr-taglineLetterSpacing, ${taglineLetterSpacing || "normal"})`,
    wordSpacing: `var(--exr-taglineWordSpacing, ${taglineWordSpacing || "normal"})`,
  };

  const descStyle: CSSProperties = {
    color: `var(--exr-descColor, ${descColor || "#71717a"})`,
    fontFamily: descFontFamily && descFontFamily !== "inherit" ? descFontFamily : undefined,
    fontSize: `var(--exr-descFontSize, ${descFontSize || "13px"})`,
    fontWeight: `var(--exr-descFontWeight, ${descFontWeight || "400"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-descTextTransform, ${descTextTransform || "none"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-descFontStyle, ${descFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-descTextDecoration, ${descTextDecoration || "none"})`,
    lineHeight: `var(--exr-descLineHeight, ${descLineHeight || "1.5"})`,
    letterSpacing: `var(--exr-descLetterSpacing, ${descLetterSpacing || "normal"})`,
    wordSpacing: `var(--exr-descWordSpacing, ${descWordSpacing || "normal"})`,
  };

  const metaStyle: CSSProperties = {
    color: `var(--exr-metaColor, ${metaColor || "#52525b"})`,
    fontFamily: metaFontFamily && metaFontFamily !== "inherit" ? metaFontFamily : undefined,
    fontSize: `var(--exr-metaFontSize, ${metaFontSize || "12px"})`,
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
    fontSize: `var(--exr-priceFontSize, ${priceFontSize || "15px"})`,
    fontWeight: `var(--exr-priceFontWeight, ${priceFontWeight || "800"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-priceTextTransform, ${priceTextTransform || "none"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-priceFontStyle, ${priceFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-priceTextDecoration, ${priceTextDecoration || "none"})`,
    lineHeight: `var(--exr-priceLineHeight, ${priceLineHeight || "normal"})`,
    letterSpacing: `var(--exr-priceLetterSpacing, ${priceLetterSpacing || "normal"})`,
    wordSpacing: `var(--exr-priceWordSpacing, ${priceWordSpacing || "normal"})`,
  };

  const cardStyle: CSSProperties = {
    background: `var(--exr-cardBackground, ${cardBackground || "#ffffff"})`,
    borderRadius: `var(--exr-cardBorderRadius, ${cardBorderRadius || "16px"})`,
    borderStyle: "solid",
    borderWidth: "1px",
    borderColor: `var(--exr-cardBorderColor, ${cardBorderColor || "rgba(0,0,0,0.08)"})`,
    boxShadow: cardBoxShadow ? `var(--exr-cardBoxShadow, ${cardBoxShadow})` : undefined,
  };

  return (
    <section className="w-full px-4 py-20 md:px-8" style={{ background: sectionBackground || "#ffffff" }}>
      <GoogleFontLink family={eyebrowFontFamily} />
      <GoogleFontLink family={headingFontFamily} />
      <GoogleFontLink family={introFontFamily} />
      <GoogleFontLink family={titleFontFamily} />
      <GoogleFontLink family={taglineFontFamily} />
      <GoogleFontLink family={descFontFamily} />
      <GoogleFontLink family={metaFontFamily} />
      <GoogleFontLink family={priceFontFamily} />

      <div className="mx-auto max-w-6xl">
        {eyebrow && (
          <p className="text-center" style={eyebrowStyle}>
            {eyebrow}
          </p>
        )}
        {heading && (
          <h2 className="mt-2 text-center" style={headingStyle}>
            {heading}
          </h2>
        )}
        {intro && (
          <p className="mx-auto mt-4 max-w-2xl text-center" style={introStyle}>
            {intro}
          </p>
        )}

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((item, idx) => (
            <a
              key={idx}
              href={item.href || "#"}
              className="group flex flex-col overflow-hidden text-left transition-transform hover:-translate-y-1"
              style={cardStyle}
            >
              {item.image && (
                <div className="relative h-48 w-full shrink-0 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded content, see ImageBox for the same fix */}
                  <img src={resolveImageUrl(item.image)} alt={item.title || "Tour"} className="absolute inset-0 h-full w-full object-cover" />
                  {badgeLabel && (
                    <span
                      className="absolute left-3 top-3 whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide"
                      style={{ background: `var(--exr-badgeBackground, ${badgeBackground || "rgba(0,0,0,0.6)"})`, color: badgeColor || "#fff" }}
                    >
                      {badgeLabel}
                    </span>
                  )}
                </div>
              )}
              <div className="flex flex-1 flex-col p-6">
                {item.title && <h3 style={titleStyle}>{item.title}</h3>}
                {item.tagline && (
                  <p className="mt-1" style={taglineStyle}>
                    {item.tagline}
                  </p>
                )}
                {item.description && (
                  <p className="mt-3 flex-1" style={descStyle}>
                    {item.description}
                  </p>
                )}
                {(item.maxPeople || item.durationLabel) && (
                  <div className="mt-4 flex items-center gap-4 border-t pt-4" style={{ ...metaStyle, borderColor: "rgba(0,0,0,0.08)" }}>
                    {item.maxPeople && (
                      <span className="flex items-center gap-1.5">
                        <IconPerson className="h-4 w-4" /> Max {item.maxPeople}
                      </span>
                    )}
                    {item.durationLabel && (
                      <span className="flex items-center gap-1.5">
                        <IconClock className="h-4 w-4" /> {item.durationLabel}
                      </span>
                    )}
                  </div>
                )}
                <div className="mt-4 flex items-center justify-between">
                  {item.price && <span style={priceStyle}>From €{item.price}</span>}
                  <span
                    className="frc-static-tours-cta ml-auto rounded-full px-4 py-2 text-xs font-semibold transition-colors"
                    style={{ background: `var(--exr-ctaBackground, ${ctaBackground || accent})`, color: ctaColor || "#000" }}
                  >
                    {viewDetailsLabel || "View Details"}
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {ctaHoverBackground && (
        <style dangerouslySetInnerHTML={{ __html: `.group:hover .frc-static-tours-cta{background:${ctaHoverBackground} !important;}` }} />
      )}
    </section>
  );
}
