import type { CSSProperties } from "react";
import { GoogleFontLink } from "@/components/builder/GoogleFontLink";
import { buildButtonHoverStyle } from "./buttonHoverStyle";

/**
 * A dark eyebrow+heading+description card wrapping a data table (arbitrary
 * column count via `headers`/`rows` — the same shape as the plain `Table`
 * block, reused deliberately so this stays a real table rather than a rigid
 * 5-named-field row shape only good for one route-pricing layout) plus a
 * centered CTA button.
 *
 * Every visual cluster (card, eyebrow, heading, description, table header
 * row, table body rows, price column, CTA button) reads its styling through
 * `var(--exr-{key}, {desktop value})` rather than the raw prop directly —
 * same convention Heading/Image/Services/etc already use (see
 * resolveNodeStyle.ts's `mintVars`) — so every field is both fully
 * styleable from the Style tab AND genuinely responds to the admin's
 * Tablet/Mobile breakpoint overrides, not just desktop.
 */
export function PricingOverviewBlock({
  eyebrow,
  heading,
  description,
  headers,
  rows,
  showCta,
  ctaLabel,
  ctaUrl,
  accentColor,
  background,
  cardRadius,
  cardMaxWidth,
  cardPaddingTop,
  cardPaddingRight,
  cardPaddingBottom,
  cardPaddingLeft,
  cardBorderColor,
  cardBorderWidth,
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
  tableHeaderBackground,
  tableHeaderColor,
  tableHeaderFontFamily,
  tableHeaderFontSize,
  tableHeaderFontWeight,
  tableHeaderTextTransform,
  tableHeaderFontStyle,
  tableHeaderTextDecoration,
  tableHeaderLineHeight,
  tableHeaderLetterSpacing,
  tableHeaderWordSpacing,
  tableHeaderRadius,
  tableHeaderPaddingV,
  tableHeaderPaddingH,
  tableRowColor,
  tableRowFontFamily,
  tableRowFontSize,
  tableRowFontWeight,
  tableRowTextTransform,
  tableRowFontStyle,
  tableRowTextDecoration,
  tableRowLineHeight,
  tableRowLetterSpacing,
  tableRowWordSpacing,
  tableRowPaddingV,
  tableRowPaddingH,
  tableRowDividerColor,
  priceColumnIndex,
  priceColor,
  priceFontWeight,
  ctaBackground,
  ctaColor,
  ctaHoverBackground,
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
  heading?: string;
  description?: string;
  headers?: string[];
  rows?: string[][];
  showCta?: boolean;
  ctaLabel?: string;
  ctaUrl?: string;
  accentColor?: string;
  background?: string;
  cardRadius?: string;
  cardMaxWidth?: string;
  cardPaddingTop?: string;
  cardPaddingRight?: string;
  cardPaddingBottom?: string;
  cardPaddingLeft?: string;
  cardBorderColor?: string;
  cardBorderWidth?: string;
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
  tableHeaderBackground?: string;
  tableHeaderColor?: string;
  tableHeaderFontFamily?: string;
  tableHeaderFontSize?: string;
  tableHeaderFontWeight?: string;
  tableHeaderTextTransform?: string;
  tableHeaderFontStyle?: string;
  tableHeaderTextDecoration?: string;
  tableHeaderLineHeight?: string;
  tableHeaderLetterSpacing?: string;
  tableHeaderWordSpacing?: string;
  tableHeaderRadius?: string;
  tableHeaderPaddingV?: string;
  tableHeaderPaddingH?: string;
  tableRowColor?: string;
  tableRowFontFamily?: string;
  tableRowFontSize?: string;
  tableRowFontWeight?: string;
  tableRowTextTransform?: string;
  tableRowFontStyle?: string;
  tableRowTextDecoration?: string;
  tableRowLineHeight?: string;
  tableRowLetterSpacing?: string;
  tableRowWordSpacing?: string;
  tableRowPaddingV?: string;
  tableRowPaddingH?: string;
  tableRowDividerColor?: string;
  priceColumnIndex?: string;
  priceColor?: string;
  priceFontWeight?: string;
  ctaBackground?: string;
  ctaColor?: string;
  ctaHoverBackground?: string;
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
  const cols = headers && headers.length > 0 ? headers : ["From", "To", "Approx. Distance", "Estimated Base Price Range", "Best Suited For"];
  const tableRows = rows ?? [];
  const priceIdx = Number.parseInt(priceColumnIndex ?? "3", 10);
  const accent = accentColor || "#2563ff";

  const headerCellStyle: CSSProperties = {
    background: `var(--exr-tableHeaderBackground, ${tableHeaderBackground || "rgba(37,99,255,0.14)"})`,
    color: `var(--exr-tableHeaderColor, ${tableHeaderColor || accent})`,
    fontFamily: tableHeaderFontFamily && tableHeaderFontFamily !== "inherit" ? tableHeaderFontFamily : undefined,
    fontSize: `var(--exr-tableHeaderFontSize, ${tableHeaderFontSize || "13px"})`,
    fontWeight: `var(--exr-tableHeaderFontWeight, ${tableHeaderFontWeight || "700"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-tableHeaderTextTransform, ${tableHeaderTextTransform || "none"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-tableHeaderFontStyle, ${tableHeaderFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-tableHeaderTextDecoration, ${tableHeaderTextDecoration || "none"})`,
    lineHeight: `var(--exr-tableHeaderLineHeight, ${tableHeaderLineHeight || "normal"})`,
    letterSpacing: `var(--exr-tableHeaderLetterSpacing, ${tableHeaderLetterSpacing || "normal"})`,
    wordSpacing: `var(--exr-tableHeaderWordSpacing, ${tableHeaderWordSpacing || "normal"})`,
    borderRadius: `var(--exr-tableHeaderRadius, ${tableHeaderRadius || "8px"})`,
    paddingBlock: `var(--exr-tableHeaderPaddingV, ${tableHeaderPaddingV || "12px"})`,
    paddingInline: `var(--exr-tableHeaderPaddingH, ${tableHeaderPaddingH || "18px"})`,
    textAlign: "left",
  };

  const rowCellStyle: CSSProperties = {
    color: `var(--exr-tableRowColor, ${tableRowColor || "rgba(255,255,255,0.85)"})`,
    fontFamily: tableRowFontFamily && tableRowFontFamily !== "inherit" ? tableRowFontFamily : undefined,
    fontSize: `var(--exr-tableRowFontSize, ${tableRowFontSize || "14px"})`,
    fontWeight: `var(--exr-tableRowFontWeight, ${tableRowFontWeight || "400"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-tableRowTextTransform, ${tableRowTextTransform || "none"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-tableRowFontStyle, ${tableRowFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-tableRowTextDecoration, ${tableRowTextDecoration || "none"})`,
    lineHeight: `var(--exr-tableRowLineHeight, ${tableRowLineHeight || "normal"})`,
    letterSpacing: `var(--exr-tableRowLetterSpacing, ${tableRowLetterSpacing || "normal"})`,
    wordSpacing: `var(--exr-tableRowWordSpacing, ${tableRowWordSpacing || "normal"})`,
    paddingBlock: `var(--exr-tableRowPaddingV, ${tableRowPaddingV || "14px"})`,
    paddingInline: `var(--exr-tableRowPaddingH, ${tableRowPaddingH || "18px"})`,
    borderTop: `1px solid var(--exr-tableRowDividerColor, ${tableRowDividerColor || "rgba(255,255,255,0.08)"})`,
    textAlign: "left",
  };

  const priceCellStyle: CSSProperties = {
    ...rowCellStyle,
    color: `var(--exr-priceColor, ${priceColor || "#ffffff"})`,
    fontWeight: `var(--exr-priceFontWeight, ${priceFontWeight || "700"})` as CSSProperties["fontWeight"],
  };

  const ctaHover = buildButtonHoverStyle("pricing-cta", {
    background: ctaBackground || accent,
    hoverBackground: ctaHoverBackground,
    hoverColor: ctaHoverColor,
    hoverBoxShadow: ctaHoverBoxShadow,
    hoverBackgroundSize: ctaHoverBackgroundSize,
    hoverBackgroundPosition: ctaHoverBackgroundPosition,
    hoverTransitionDuration: ctaHoverTransitionDuration,
  });

  return (
    <div
      className="w-full"
      style={{
        background: background || "#151515",
        borderRadius: `var(--exr-cardRadius, ${cardRadius || "24px"})`,
        maxWidth: `var(--exr-cardMaxWidth, ${cardMaxWidth || "1160px"})`,
        marginInline: "auto",
        borderStyle: "solid",
        borderWidth: `var(--exr-cardBorderWidth, ${cardBorderWidth || "1px"})`,
        borderColor: `var(--exr-cardBorderColor, ${cardBorderColor || "rgba(255,255,255,0.12)"})`,
        paddingTop: `var(--exr-cardPaddingTop, ${cardPaddingTop || "48px"})`,
        paddingRight: `var(--exr-cardPaddingRight, ${cardPaddingRight || "48px"})`,
        paddingBottom: `var(--exr-cardPaddingBottom, ${cardPaddingBottom || "48px"})`,
        paddingLeft: `var(--exr-cardPaddingLeft, ${cardPaddingLeft || "48px"})`,
      }}
    >
      <GoogleFontLink family={eyebrowFontFamily} />
      <GoogleFontLink family={headingFontFamily} />
      <GoogleFontLink family={descFontFamily} />
      <GoogleFontLink family={tableHeaderFontFamily} />
      <GoogleFontLink family={tableRowFontFamily} />
      <GoogleFontLink family={ctaFontFamily} />

      <div className="text-center">
        {eyebrow && (
          <p
            style={{
              margin: 0,
              color: `var(--exr-eyebrowColor, ${eyebrowColor || accent})`,
              fontFamily: eyebrowFontFamily && eyebrowFontFamily !== "inherit" ? eyebrowFontFamily : undefined,
              fontSize: `var(--exr-eyebrowFontSize, ${eyebrowFontSize || "12px"})`,
              fontWeight: `var(--exr-eyebrowFontWeight, ${eyebrowFontWeight || "700"})` as CSSProperties["fontWeight"],
              textTransform: `var(--exr-eyebrowTextTransform, ${eyebrowTextTransform || "uppercase"})` as CSSProperties["textTransform"],
              fontStyle: `var(--exr-eyebrowFontStyle, ${eyebrowFontStyle || "normal"})` as CSSProperties["fontStyle"],
              textDecoration: `var(--exr-eyebrowTextDecoration, ${eyebrowTextDecoration || "none"})`,
              lineHeight: `var(--exr-eyebrowLineHeight, ${eyebrowLineHeight || "normal"})`,
              letterSpacing: `var(--exr-eyebrowLetterSpacing, ${eyebrowLetterSpacing || "0.2em"})`,
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
              color: `var(--exr-headingColor, ${headingColor || "#ffffff"})`,
              fontFamily: headingFontFamily && headingFontFamily !== "inherit" ? headingFontFamily : undefined,
              fontSize: `var(--exr-headingFontSize, ${headingFontSize || "clamp(28px,4vw,44px)"})`,
              fontWeight: `var(--exr-headingFontWeight, ${headingFontWeight || "800"})` as CSSProperties["fontWeight"],
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
            className="mx-auto"
            style={{
              marginTop: "10px",
              maxWidth: "760px",
              color: `var(--exr-descColor, ${descColor || "rgba(255,255,255,0.65)"})`,
              fontFamily: descFontFamily && descFontFamily !== "inherit" ? descFontFamily : undefined,
              fontSize: `var(--exr-descFontSize, ${descFontSize || "14px"})`,
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
      </div>

      <div className="mt-8 overflow-x-auto">
        <div
          className="grid min-w-[640px]"
          style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))`, columnGap: "4px" }}
        >
          {cols.map((label, i) => (
            <div key={i} style={headerCellStyle}>
              {label}
            </div>
          ))}
          {tableRows.map((row, rowIndex) =>
            cols.map((_, colIndex) => (
              <div key={`${rowIndex}-${colIndex}`} style={colIndex === priceIdx ? priceCellStyle : rowCellStyle}>
                {row[colIndex] ?? ""}
              </div>
            ))
          )}
        </div>
      </div>

      {showCta !== false && ctaLabel && (
        <div className="mt-8 text-center">
          {/* No onClick preventDefault guard for an empty ctaUrl (unlike
              Services.tsx's identical-looking pattern) — this component has
              no other reason to be a Client Component, and an event handler
              prop is illegal on a Server Component ("Event handlers cannot
              be passed to Client Component props"). href="#" alone is a
              harmless no-op when unset — not worth opting the whole block
              into client-side JS just to suppress it. */}
          <a
            href={ctaUrl || "#"}
            className={`inline-block transition-colors ${ctaHover.hoverClassName} ${ctaGlow ? "exr-pricing-cta-glow" : ""}`}
            style={{
              background: `var(--exr-ctaBackground, ${ctaBackground || accent})`,
              color: `var(--exr-ctaColor, ${ctaColor || "#171717"})`,
              borderStyle: ctaBorderStyle && ctaBorderStyle !== "none" ? ctaBorderStyle : undefined,
              borderWidth: ctaBorderStyle && ctaBorderStyle !== "none" ? ctaBorderWidth || "1px" : undefined,
              borderColor: ctaBorderStyle && ctaBorderStyle !== "none" ? ctaBorderColor : undefined,
              borderRadius: `var(--exr-ctaBorderRadius, ${ctaBorderRadius || "999px"})`,
              boxShadow: ctaBoxShadow || undefined,
              paddingTop: ctaPaddingTop || `var(--exr-ctaPaddingV, ${ctaPaddingV || "14px"})`,
              paddingRight: ctaPaddingRight || `var(--exr-ctaPaddingH, ${ctaPaddingH || "36px"})`,
              paddingBottom: ctaPaddingBottom || `var(--exr-ctaPaddingV, ${ctaPaddingV || "14px"})`,
              paddingLeft: ctaPaddingLeft || `var(--exr-ctaPaddingH, ${ctaPaddingH || "36px"})`,
              marginTop: ctaMarginTop || undefined,
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
              ...ctaHover.restingStyle,
            }}
          >
            {ctaLabel}
          </a>
          {ctaHover.hoverCss && <style dangerouslySetInnerHTML={{ __html: ctaHover.hoverCss }} />}
          {/* An always-on pulsing gradient glow, not a hover reveal — the
              generic per-block "Glow Border" hover animation (Advanced tab
              -> Hover Animation) can't reach this button because it's a
              sub-element rendered inside this whole PricingOverview block's
              own markup, not a separate top-level node with its own
              wrapper class; that mechanism's `selector` always resolves to
              THIS block's outer wrapper, not this specific <a>. Same
              gradient/blur recipe as that preset, just unconditional
              instead of :hover-gated, and scoped to a fixed class since the
              effect itself isn't parameterized per instance (unlike
              ctaHoverBackground above, nothing here varies between
              PricingOverview instances, so redeclaring the identical rule
              twice on a page with two of these is harmless). */}
          {ctaGlow && (
            <style
              dangerouslySetInnerHTML={{
                __html: `
                  @keyframes exr-pricing-cta-glow-kf{0%{background-position:0% 50%;}100%{background-position:400% 50%;}}
                  .exr-pricing-cta-glow{position:relative;z-index:0;}
                  .exr-pricing-cta-glow::before{content:"";position:absolute;inset:-3px;z-index:-1;border-radius:inherit;background:linear-gradient(45deg,#2563ff,#e8ce8c,#8a6f3b,#2563ff);background-size:400% 400%;filter:blur(6px);animation:exr-pricing-cta-glow-kf 6s linear infinite;}
                `,
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
