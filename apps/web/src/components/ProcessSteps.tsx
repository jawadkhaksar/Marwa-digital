"use client";

import { useRef, useState, type CSSProperties } from "react";
import { useScrollReveal } from "./home/useScrollReveal";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { GoogleFontLink } from "./builder/GoogleFontLink";
import { buildButtonHoverStyle } from "./builder/buttonHoverStyle";
import type { ProcessStepItem } from "@marwa/builder";

const DEFAULT_ITEMS: ProcessStepItem[] = [
  {
    image: "",
    stepLabel: "Step 1",
    title: "Share Your Vision",
    description: "Fill out our quick inquiry form or message us directly. Let us know your goals, timeline, and what you're trying to build.",
    highlighted: false,
  },
  {
    image: "",
    stepLabel: "Step 2",
    title: "Get Your Custom Plan",
    description: "Our team maps out the scope, timeline, and pricing, ensuring everything fits perfectly within a clear, well-planned roadmap.",
    highlighted: true,
  },
  {
    image: "",
    stepLabel: "Step 3",
    title: "Watch It Come to Life",
    description: "Once we kick off, your dedicated team gets to work. Enjoy clear updates and a smooth, unhurried path to launch.",
    highlighted: false,
  },
];

export function ProcessSteps({
  eyebrow = "How It Works",
  heading = "The Simple 3-Step Process",
  ctaLabel = "Get Started",
  ctaHref = "/contact",
  readMoreLabel = "Read More",
  bookNowLabel = "Get Started",
  items = DEFAULT_ITEMS,
  sectionBackground,
  eyebrowColor,
  headingColor,
  descColor,
  cardBackground,
  accentColor,
  eyebrowFontFamily,
  eyebrowFontSize,
  eyebrowFontWeight,
  eyebrowTextTransform,
  eyebrowFontStyle,
  eyebrowTextDecoration,
  eyebrowLineHeight,
  eyebrowLetterSpacing,
  eyebrowWordSpacing,
  headingFontFamily,
  headingFontSize,
  headingFontWeight,
  headingTextTransform,
  headingFontStyle,
  headingTextDecoration,
  headingLineHeight,
  headingLetterSpacing,
  headingWordSpacing,
  stepLabelColor,
  stepLabelFontFamily,
  stepLabelFontSize,
  stepLabelFontWeight,
  stepLabelTextTransform,
  stepLabelFontStyle,
  stepLabelTextDecoration,
  stepLabelLineHeight,
  stepLabelLetterSpacing,
  stepLabelWordSpacing,
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
  ctaHoverColor,
  ctaHoverBorderColor,
  ctaBorderRadius,
  ctaBorderStyle,
  ctaBorderWidth,
  ctaBorderColor,
  ctaBoxShadow,
  ctaHoverBoxShadow,
  ctaHoverBackgroundSize,
  ctaHoverBackgroundPosition,
  ctaHoverTransitionDuration,
  ctaPaddingV,
  ctaPaddingH,
  ctaPaddingTop,
  ctaPaddingRight,
  ctaPaddingBottom,
  ctaPaddingLeft,
  ctaMarginTop,
  ctaMarginRight,
  ctaMarginBottom,
  ctaMarginLeft,
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
  descFontFamily,
  descFontSize,
  descFontWeight,
  descTextTransform,
  descFontStyle,
  descTextDecoration,
  descLineHeight,
  descLetterSpacing,
  descWordSpacing,
  cardTextAlign,
  cardPaddingTop,
  cardPaddingRight,
  cardPaddingBottom,
  cardPaddingLeft,
  cardBorderStyle,
  cardBorderWidth,
  cardBorderWidthTop,
  cardBorderWidthRight,
  cardBorderWidthBottom,
  cardBorderWidthLeft,
  cardBorderColor,
  cardBorderRadius,
  cardBoxShadow,
  cardHoverBackground,
  cardHoverBorderColor,
  cardHoverBoxShadow,
  cardHoverScale,
  imageHeight,
  imageBorderRadius,
  imageZoomEnabled = true,
  imageZoomScale,
  imageZoomDuration,
  highlightedOffset,
  highlightedScale,
  highlightedBackground,
  highlightedBorderColor,
  highlightedBorderWidth,
  highlightedBoxShadow,
  footerBorderColor,
  readMoreColor,
  readMoreBackground,
  readMoreHoverBackground,
  readMoreHoverColor,
  readMoreFontFamily,
  readMoreFontSize,
  readMoreFontWeight,
  readMoreTextTransform,
  readMoreFontStyle,
  readMoreTextDecoration,
  readMoreLineHeight,
  readMoreLetterSpacing,
  readMoreWordSpacing,
  readMoreBorderStyle,
  readMoreBorderWidth,
  readMoreBorderColor,
  readMoreBorderRadiusTop,
  readMoreBorderRadiusRight,
  readMoreBorderRadiusBottom,
  readMoreBorderRadiusLeft,
  readMoreBoxShadow,
  readMoreHoverBoxShadow,
  readMoreHoverBorderColor,
  readMoreHoverBackgroundSize,
  readMoreHoverBackgroundPosition,
  readMoreHoverTransitionDuration,
  readMorePaddingTop,
  readMorePaddingRight,
  readMorePaddingBottom,
  readMorePaddingLeft,
  readMoreMarginTop,
  readMoreMarginRight,
  readMoreMarginBottom,
  readMoreMarginLeft,
  bookNowColor,
  bookNowBackground,
  bookNowHoverBackground,
  bookNowGlow,
  bookNowHoverColor,
  bookNowHoverBorderColor,
  bookNowBorderStyle,
  bookNowBorderWidth,
  bookNowBorderColor,
  bookNowBorderRadius,
  bookNowBoxShadow,
  bookNowHoverBoxShadow,
  bookNowHoverBackgroundSize,
  bookNowHoverBackgroundPosition,
  bookNowHoverTransitionDuration,
  bookNowFontFamily,
  bookNowFontSize,
  bookNowFontWeight,
  bookNowTextTransform,
  bookNowLetterSpacing,
  bookNowPaddingTop,
  bookNowPaddingRight,
  bookNowPaddingBottom,
  bookNowPaddingLeft,
  bookNowMarginTop,
  bookNowMarginRight,
  bookNowMarginBottom,
  bookNowMarginLeft,
}: {
  eyebrow?: string;
  heading?: string;
  ctaLabel?: string;
  ctaHref?: string;
  readMoreLabel?: string;
  bookNowLabel?: string;
  items?: ProcessStepItem[];
  sectionBackground?: string;
  eyebrowColor?: string;
  headingColor?: string;
  descColor?: string;
  cardBackground?: string;
  accentColor?: string;
  eyebrowFontFamily?: string;
  eyebrowFontSize?: string;
  eyebrowFontWeight?: string;
  eyebrowTextTransform?: string;
  eyebrowFontStyle?: string;
  eyebrowTextDecoration?: string;
  eyebrowLineHeight?: string;
  eyebrowLetterSpacing?: string;
  eyebrowWordSpacing?: string;
  headingFontFamily?: string;
  headingFontSize?: string;
  headingFontWeight?: string;
  headingTextTransform?: string;
  headingFontStyle?: string;
  headingTextDecoration?: string;
  headingLineHeight?: string;
  headingLetterSpacing?: string;
  headingWordSpacing?: string;
  stepLabelColor?: string;
  stepLabelFontFamily?: string;
  stepLabelFontSize?: string;
  stepLabelFontWeight?: string;
  stepLabelTextTransform?: string;
  stepLabelFontStyle?: string;
  stepLabelTextDecoration?: string;
  stepLabelLineHeight?: string;
  stepLabelLetterSpacing?: string;
  stepLabelWordSpacing?: string;
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
  ctaHoverColor?: string;
  ctaHoverBorderColor?: string;
  ctaBorderRadius?: string;
  ctaBorderStyle?: string;
  ctaBorderWidth?: string;
  ctaBorderColor?: string;
  ctaBoxShadow?: string;
  ctaHoverBoxShadow?: string;
  ctaHoverBackgroundSize?: string;
  ctaHoverBackgroundPosition?: string;
  ctaHoverTransitionDuration?: string;
  ctaPaddingV?: string;
  ctaPaddingH?: string;
  ctaPaddingTop?: string;
  ctaPaddingRight?: string;
  ctaPaddingBottom?: string;
  ctaPaddingLeft?: string;
  ctaMarginTop?: string;
  ctaMarginRight?: string;
  ctaMarginBottom?: string;
  ctaMarginLeft?: string;
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
  descFontFamily?: string;
  descFontSize?: string;
  descFontWeight?: string;
  descTextTransform?: string;
  descFontStyle?: string;
  descTextDecoration?: string;
  descLineHeight?: string;
  descLetterSpacing?: string;
  descWordSpacing?: string;
  cardTextAlign?: "left" | "center" | "right";
  cardPaddingTop?: string;
  cardPaddingRight?: string;
  cardPaddingBottom?: string;
  cardPaddingLeft?: string;
  cardBorderStyle?: "none" | "solid" | "dashed" | "dotted" | "double";
  cardBorderWidth?: string;
  cardBorderWidthTop?: string;
  cardBorderWidthRight?: string;
  cardBorderWidthBottom?: string;
  cardBorderWidthLeft?: string;
  cardBorderColor?: string;
  cardBorderRadius?: string;
  cardBoxShadow?: string;
  cardHoverBackground?: string;
  cardHoverBorderColor?: string;
  cardHoverBoxShadow?: string;
  cardHoverScale?: string;
  imageHeight?: string;
  imageBorderRadius?: string;
  imageZoomEnabled?: boolean;
  imageZoomScale?: string;
  imageZoomDuration?: string;
  highlightedOffset?: string;
  highlightedScale?: string;
  highlightedBackground?: string;
  highlightedBorderColor?: string;
  highlightedBorderWidth?: string;
  highlightedBoxShadow?: string;
  footerBorderColor?: string;
  readMoreColor?: string;
  readMoreBackground?: string;
  readMoreHoverBackground?: string;
  readMoreHoverColor?: string;
  readMoreFontFamily?: string;
  readMoreFontSize?: string;
  readMoreFontWeight?: string;
  readMoreTextTransform?: string;
  readMoreFontStyle?: string;
  readMoreTextDecoration?: string;
  readMoreLineHeight?: string;
  readMoreLetterSpacing?: string;
  readMoreWordSpacing?: string;
  readMoreBorderStyle?: string;
  readMoreBorderWidth?: string;
  readMoreBorderColor?: string;
  readMoreBorderRadiusTop?: string;
  readMoreBorderRadiusRight?: string;
  readMoreBorderRadiusBottom?: string;
  readMoreBorderRadiusLeft?: string;
  readMoreBoxShadow?: string;
  readMoreHoverBoxShadow?: string;
  readMoreHoverBorderColor?: string;
  readMoreHoverBackgroundSize?: string;
  readMoreHoverBackgroundPosition?: string;
  readMoreHoverTransitionDuration?: string;
  readMorePaddingTop?: string;
  readMorePaddingRight?: string;
  readMorePaddingBottom?: string;
  readMorePaddingLeft?: string;
  readMoreMarginTop?: string;
  readMoreMarginRight?: string;
  readMoreMarginBottom?: string;
  readMoreMarginLeft?: string;
  bookNowColor?: string;
  bookNowBackground?: string;
  bookNowHoverBackground?: string;
  bookNowGlow?: boolean;
  bookNowHoverColor?: string;
  bookNowHoverBorderColor?: string;
  bookNowBorderStyle?: string;
  bookNowBorderWidth?: string;
  bookNowBorderColor?: string;
  bookNowBorderRadius?: string;
  bookNowBoxShadow?: string;
  bookNowHoverBoxShadow?: string;
  bookNowHoverBackgroundSize?: string;
  bookNowHoverBackgroundPosition?: string;
  bookNowHoverTransitionDuration?: string;
  bookNowFontFamily?: string;
  bookNowFontSize?: string;
  bookNowFontWeight?: string;
  bookNowTextTransform?: string;
  bookNowLetterSpacing?: string;
  bookNowPaddingTop?: string;
  bookNowPaddingRight?: string;
  bookNowPaddingBottom?: string;
  bookNowPaddingLeft?: string;
  bookNowMarginTop?: string;
  bookNowMarginRight?: string;
  bookNowMarginBottom?: string;
  bookNowMarginLeft?: string;
}) {
  const ref = useScrollReveal<HTMLDivElement>();
  const steps = items.length > 0 ? items : DEFAULT_ITEMS;
  const accent = accentColor || "#2563FF";

  // Mobile 1-card-at-a-time snap carousel — tracks which card is currently
  // centered so the pagination dots below it stay in sync with swiping.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const containerCenter = el.scrollLeft + el.clientWidth / 2;
    let closest = 0;
    let closestDist = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const node = child as HTMLElement;
      const dist = Math.abs(node.offsetLeft + node.offsetWidth / 2 - containerCenter);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });
    setActiveIndex(closest);
  }

  function scrollToIndex(i: number) {
    const el = scrollRef.current;
    const child = el?.children[i] as HTMLElement | undefined;
    if (!el || !child) return;
    el.scrollTo({ left: child.offsetLeft - (el.clientWidth - child.offsetWidth) / 2, behavior: "smooth" });
  }

  // Same var(--exr-{prefix}{Key}, {desktop value}) bridge as Services.tsx —
  // mints from this same prop at desktop, overridden per-breakpoint inside a
  // media query by resolveNodeStyle when the admin sets a Tablet/Mobile
  // value in the panel. See that file for the full rationale.
  function typographyVars(
    prefix: string,
    v: {
      color?: string;
      fontFamily?: string;
      fontSize?: string;
      fontWeight?: string;
      textTransform?: string;
      fontStyle?: string;
      textDecoration?: string;
      lineHeight?: string;
      letterSpacing?: string;
      wordSpacing?: string;
    },
    // fontSize defaults to "inherit" unless a group explicitly supplies its
    // own (heading/eyebrow do, below) — "inherit" pulls whatever size the
    // parent happens to have, which is how the mobile heading ended up
    // overflowing/clipping instead of shrinking: nothing was actually
    // driving it down at narrow widths.
    defaults: { color?: string; fontWeight: string; textTransform: string; letterSpacing: string; lineHeight: string; fontSize?: string }
  ): CSSProperties {
    const va = (key: string, value: string | undefined, fallback: string) => `var(--exr-${prefix}${key}, ${value || fallback})`;
    return {
      ...(defaults.color !== undefined ? { color: va("Color", v.color, defaults.color) } : {}),
      fontFamily: v.fontFamily && v.fontFamily !== "inherit" ? v.fontFamily : undefined,
      fontSize: va("FontSize", v.fontSize, defaults.fontSize ?? "inherit"),
      fontWeight: va("FontWeight", v.fontWeight, defaults.fontWeight) as CSSProperties["fontWeight"],
      textTransform: va("TextTransform", v.textTransform, defaults.textTransform) as CSSProperties["textTransform"],
      fontStyle: va("FontStyle", v.fontStyle, "normal") as CSSProperties["fontStyle"],
      textDecoration: va("TextDecoration", v.textDecoration, "none"),
      lineHeight: va("LineHeight", v.lineHeight, defaults.lineHeight),
      letterSpacing: va("LetterSpacing", v.letterSpacing, defaults.letterSpacing),
      wordSpacing: va("WordSpacing", v.wordSpacing, "inherit"),
    };
  }

  const eyebrowStyle = typographyVars(
    "eyebrow",
    { color: eyebrowColor, fontFamily: eyebrowFontFamily, fontSize: eyebrowFontSize, fontWeight: eyebrowFontWeight, textTransform: eyebrowTextTransform, fontStyle: eyebrowFontStyle, textDecoration: eyebrowTextDecoration, lineHeight: eyebrowLineHeight, letterSpacing: eyebrowLetterSpacing, wordSpacing: eyebrowWordSpacing },
    { color: "#2563FF", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.35em", lineHeight: "inherit", fontSize: "clamp(10px, 3vw, 13px)" }
  );

  const headingStyle: CSSProperties = {
    ...typographyVars(
      "heading",
      { color: headingColor, fontFamily: headingFontFamily, fontSize: headingFontSize, fontWeight: headingFontWeight, textTransform: headingTextTransform, fontStyle: headingFontStyle, textDecoration: headingTextDecoration, lineHeight: headingLineHeight, letterSpacing: headingLetterSpacing, wordSpacing: headingWordSpacing },
      { color: "#111", fontWeight: "900", textTransform: "none", letterSpacing: "-1px", lineHeight: "1.15", fontSize: "clamp(1.15rem, 6.5vw, 2.75rem)" }
    ),
    // Belt-and-suspenders: the responsive clamp() above sizes the text, but
    // wrapping itself must never depend on that — force it explicitly rather
    // than trusting Tailwind's `break-words` class alone (which was already
    // present and, per the reported bug, wasn't enough on its own).
    whiteSpace: "normal",
    wordBreak: "break-word",
    overflowWrap: "break-word",
  };

  const stepLabelStyle = typographyVars(
    "stepLabel",
    { color: stepLabelColor, fontFamily: stepLabelFontFamily, fontSize: stepLabelFontSize, fontWeight: stepLabelFontWeight, textTransform: stepLabelTextTransform, fontStyle: stepLabelFontStyle, textDecoration: stepLabelTextDecoration, lineHeight: stepLabelLineHeight, letterSpacing: stepLabelLetterSpacing, wordSpacing: stepLabelWordSpacing },
    { color: accent, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.25em", lineHeight: "inherit" }
  );

  const ctaStyle = typographyVars(
    "cta",
    { color: ctaColor, fontFamily: ctaFontFamily, fontSize: ctaFontSize, fontWeight: ctaFontWeight, textTransform: ctaTextTransform, fontStyle: ctaFontStyle, textDecoration: ctaTextDecoration, lineHeight: ctaLineHeight, letterSpacing: ctaLetterSpacing, wordSpacing: ctaWordSpacing },
    { color: "#fff", fontWeight: "600", textTransform: "none", letterSpacing: "0.3px", lineHeight: "inherit" }
  );

  // Shared hover mechanism (gradient-slide + box-shadow-glow) — see
  // buttonHoverStyle.ts. The bottom CTA's defaults (box shadow + hover box
  // shadow) reproduce the gold shadow that used to be hardcoded as Tailwind
  // `shadow-[...]`/`hover:shadow-[...]` utility classes exactly, so pages
  // saved before these fields existed keep the same look.
  const ctaHover = buildButtonHoverStyle("processSteps-cta", {
    background: ctaBackground || accent,
    hoverBackground: ctaHoverBackground,
    hoverColor: ctaHoverColor,
    hoverBorderColor: ctaHoverBorderColor,
    hoverBoxShadow: ctaHoverBoxShadow || "0px 12px 30px rgba(37,99,255,0.55)",
    hoverBackgroundSize: ctaHoverBackgroundSize,
    hoverBackgroundPosition: ctaHoverBackgroundPosition,
    hoverTransitionDuration: ctaHoverTransitionDuration,
  });

  const readMoreHover = buildButtonHoverStyle("processSteps-readmore", {
    background: readMoreBackground || "transparent",
    hoverBackground: readMoreHoverBackground,
    hoverColor: readMoreHoverColor,
    hoverBorderColor: readMoreHoverBorderColor,
    hoverBoxShadow: readMoreHoverBoxShadow,
    hoverBackgroundSize: readMoreHoverBackgroundSize,
    hoverBackgroundPosition: readMoreHoverBackgroundPosition,
    hoverTransitionDuration: readMoreHoverTransitionDuration,
  });

  const bookNowHover = buildButtonHoverStyle("processSteps-booknow", {
    background: bookNowBackground || "#ededed",
    hoverBackground: bookNowHoverBackground,
    hoverColor: bookNowHoverColor,
    hoverBorderColor: bookNowHoverBorderColor,
    hoverBoxShadow: bookNowHoverBoxShadow,
    hoverBackgroundSize: bookNowHoverBackgroundSize,
    hoverBackgroundPosition: bookNowHoverBackgroundPosition,
    hoverTransitionDuration: bookNowHoverTransitionDuration,
  });

  const titleStyle = typographyVars(
    "title",
    { color: titleColor, fontFamily: titleFontFamily, fontSize: titleFontSize, fontWeight: titleFontWeight, textTransform: titleTextTransform, fontStyle: titleFontStyle, textDecoration: titleTextDecoration, lineHeight: titleLineHeight, letterSpacing: titleLetterSpacing, wordSpacing: titleWordSpacing },
    { color: "#111", fontWeight: "800", textTransform: "uppercase", letterSpacing: "-0.2px", lineHeight: "1.25" }
  );

  const descStyle = typographyVars(
    "desc",
    { color: descColor, fontFamily: descFontFamily, fontSize: descFontSize, fontWeight: descFontWeight, textTransform: descTextTransform, fontStyle: descFontStyle, textDecoration: descTextDecoration, lineHeight: descLineHeight, letterSpacing: descLetterSpacing, wordSpacing: descWordSpacing },
    { color: "#777", fontWeight: "400", textTransform: "none", letterSpacing: "inherit", lineHeight: "1.7" }
  );

  const cardContentStyle: CSSProperties = {
    paddingTop: cardPaddingTop || "22px",
    paddingRight: cardPaddingRight || "22px",
    paddingBottom: cardPaddingBottom || "22px",
    paddingLeft: cardPaddingLeft || "22px",
    // Inherits down to the step label/title/description text below —
    // the footer (Read More / Book Now) keeps its own left/right layout
    // regardless, since that row is positioned by flex justify-content,
    // not text-align.
    textAlign: `var(--exr-cardTextAlign, ${cardTextAlign || "left"})` as CSSProperties["textAlign"],
  };

  // Shared by both the desktop grid and the mobile carousel below. `stagger`
  // is only true on desktop — the highlighted card's scale-up + float-above
  // treatment only reads correctly sitting next to its two siblings; in the
  // mobile carousel each card already fills the viewport alone, so it just
  // keeps the gold highlight border/shadow without the transform.
  function renderCard(step: ProcessStepItem, i: number, stagger: boolean) {
    const isHighlighted = Boolean(step.highlighted);

    // Card Hover Settings — background/border/shadow are a plain scoped
    // :hover rule; scale composes with (rather than replaces) the resting
    // stagger transform above, since a bare `scale(x)` would otherwise wipe
    // out the highlighted card's translateY offset on hover.
    const restingTransform =
      stagger && isHighlighted
        ? `translateY(var(--exr-highlightedOffset, ${highlightedOffset || "-24px"})) scale(var(--exr-highlightedScale, ${highlightedScale || "1.05"}))`
        : stagger
          ? "scale(0.97)"
          : undefined;
    const cardHover = buildButtonHoverStyle(`processSteps-card-${i}`, {
      background: cardBackground,
      hoverBackground: cardHoverBackground,
      hoverBorderColor: cardHoverBorderColor,
      hoverBoxShadow: cardHoverBoxShadow,
      hoverTransform: cardHoverScale
        ? stagger && isHighlighted
          ? `translateY(var(--exr-highlightedOffset, ${highlightedOffset || "-24px"})) scale(${cardHoverScale})`
          : `scale(${cardHoverScale})`
        : undefined,
    });

    return (
      <div
        key={i}
        className={`group relative flex h-full flex-col overflow-hidden transition-transform duration-300 ${cardHover.hoverClassName}`}
        style={{
          background: `var(--exr-cardBackground, ${cardBackground || "#fff"})`,
          borderRadius: `var(--exr-cardBorderRadius, ${cardBorderRadius || "24px"})`,
          borderStyle: isHighlighted ? "solid" : cardBorderStyle && cardBorderStyle !== "none" ? cardBorderStyle : undefined,
          borderTopWidth: isHighlighted
            ? `var(--exr-highlightedBorderWidth, ${highlightedBorderWidth || "2px"})`
            : cardBorderStyle && cardBorderStyle !== "none"
              ? `var(--exr-cardBorderWidthTop, ${cardBorderWidthTop || cardBorderWidth || "1px"})`
              : undefined,
          borderRightWidth: isHighlighted
            ? `var(--exr-highlightedBorderWidth, ${highlightedBorderWidth || "2px"})`
            : cardBorderStyle && cardBorderStyle !== "none"
              ? `var(--exr-cardBorderWidthRight, ${cardBorderWidthRight || cardBorderWidth || "1px"})`
              : undefined,
          borderBottomWidth: isHighlighted
            ? `var(--exr-highlightedBorderWidth, ${highlightedBorderWidth || "2px"})`
            : cardBorderStyle && cardBorderStyle !== "none"
              ? `var(--exr-cardBorderWidthBottom, ${cardBorderWidthBottom || cardBorderWidth || "1px"})`
              : undefined,
          borderLeftWidth: isHighlighted
            ? `var(--exr-highlightedBorderWidth, ${highlightedBorderWidth || "2px"})`
            : cardBorderStyle && cardBorderStyle !== "none"
              ? `var(--exr-cardBorderWidthLeft, ${cardBorderWidthLeft || cardBorderWidth || "1px"})`
              : undefined,
          borderColor: isHighlighted ? `var(--exr-highlightedBorderColor, ${highlightedBorderColor || accent})` : `var(--exr-cardBorderColor, ${cardBorderColor || "rgba(0,0,0,0.08)"})`,
          boxShadow: isHighlighted
            ? `var(--exr-highlightedBoxShadow, ${highlightedBoxShadow || "0px 30px 60px 0px rgba(0,0,0,0.18)"})`
            : cardBoxShadow
              ? `var(--exr-cardBoxShadow, ${cardBoxShadow})`
              : "0px 10px 30px 0px rgba(0,0,0,0.06)",
          transform: restingTransform,
          zIndex: stagger && isHighlighted ? 1 : undefined,
        }}
      >
        {cardHover.hoverCss && <style dangerouslySetInnerHTML={{ __html: cardHover.hoverCss }} />}
        {isHighlighted && highlightedBackground && (
          <div className="pointer-events-none absolute inset-0 -z-10" style={{ background: `var(--exr-highlightedBackground, ${highlightedBackground})` }} />
        )}

        <div className="relative m-3 shrink-0 overflow-hidden" style={{ height: `var(--exr-imageHeight, ${imageHeight || "220px"})`, borderRadius: `var(--exr-imageBorderRadius, ${imageBorderRadius || "16px"})` }}>
          {step.image && (
            // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded content; next/image's optimizer rejects cross-origin /uploads/** URLs, see Services.tsx for the same fix
            <img
              src={resolveImageUrl(step.image)}
              alt={step.title}
              className={`absolute inset-0 h-full w-full object-cover ${imageZoomEnabled ? "transition-transform ease-out group-hover:scale-[var(--exr-imageZoomScale,1.08)]" : ""}`}
              style={
                imageZoomEnabled
                  ? ({ "--exr-imageZoomScale": imageZoomScale || "1.08", transitionDuration: `var(--exr-imageZoomDuration, ${imageZoomDuration || "700"}ms)` } as CSSProperties)
                  : undefined
              }
            />
          )}
        </div>

        <div className="flex flex-1 flex-col" style={cardContentStyle}>
          <span className="block" style={stepLabelStyle}>
            {step.stepLabel}
          </span>
          <h3 className="mt-2 mb-3" style={titleStyle}>
            {step.title}
          </h3>
          <p className="mb-4" style={descStyle}>
            {step.description}
          </p>

          <div className="mt-auto flex items-center justify-between pt-4" style={{ borderTop: `1px solid ${footerBorderColor || "#efefef"}` }}>
            <a
              href={step.readMoreUrl || "#"}
              onClick={step.readMoreUrl ? undefined : (e) => e.preventDefault()}
              className={`text-[12px] font-semibold transition-all ${readMoreHover.hoverClassName}`}
              style={{
                color: readMoreColor || "#b3b3b3",
                background: readMoreBackground || undefined,
                fontFamily: readMoreFontFamily && readMoreFontFamily !== "inherit" ? readMoreFontFamily : undefined,
                fontSize: readMoreFontSize || undefined,
                fontWeight: readMoreFontWeight || undefined,
                textTransform: readMoreTextTransform && readMoreTextTransform !== "none" ? (readMoreTextTransform as CSSProperties["textTransform"]) : undefined,
                fontStyle: readMoreFontStyle && readMoreFontStyle !== "normal" ? (readMoreFontStyle as CSSProperties["fontStyle"]) : undefined,
                textDecoration: readMoreTextDecoration && readMoreTextDecoration !== "none" ? readMoreTextDecoration : undefined,
                lineHeight: readMoreLineHeight || undefined,
                letterSpacing: readMoreLetterSpacing || undefined,
                wordSpacing: readMoreWordSpacing || undefined,
                borderStyle: readMoreBorderStyle && readMoreBorderStyle !== "none" ? (readMoreBorderStyle as CSSProperties["borderStyle"]) : undefined,
                borderWidth: readMoreBorderStyle && readMoreBorderStyle !== "none" ? readMoreBorderWidth || "1px" : undefined,
                borderColor: readMoreBorderStyle && readMoreBorderStyle !== "none" ? readMoreBorderColor || undefined : undefined,
                borderRadius: `var(--exr-readMoreBorderRadiusTop, ${readMoreBorderRadiusTop || "0"}) var(--exr-readMoreBorderRadiusRight, ${readMoreBorderRadiusRight || "0"}) var(--exr-readMoreBorderRadiusBottom, ${readMoreBorderRadiusBottom || "0"}) var(--exr-readMoreBorderRadiusLeft, ${readMoreBorderRadiusLeft || "0"})`,
                boxShadow: readMoreBoxShadow || undefined,
                paddingTop: readMorePaddingTop || undefined,
                paddingRight: readMorePaddingRight || undefined,
                paddingBottom: readMorePaddingBottom || undefined,
                paddingLeft: readMorePaddingLeft || undefined,
                marginTop: readMoreMarginTop || undefined,
                marginRight: readMoreMarginRight || undefined,
                marginBottom: readMoreMarginBottom || undefined,
                marginLeft: readMoreMarginLeft || undefined,
                ...readMoreHover.restingStyle,
              }}
            >
              {readMoreLabel}
            </a>
            <a href={step.bookNowUrl || "#"} onClick={step.bookNowUrl ? undefined : (e) => e.preventDefault()} className="flex items-center gap-[10px]">
              <span
                className={`text-[12px] font-semibold transition-all ${bookNowHover.hoverClassName}`}
                style={{
                  color: bookNowColor || "#111",
                  fontFamily: bookNowFontFamily && bookNowFontFamily !== "inherit" ? bookNowFontFamily : undefined,
                  fontSize: bookNowFontSize || undefined,
                  fontWeight: bookNowFontWeight || undefined,
                  textTransform: bookNowTextTransform && bookNowTextTransform !== "none" ? (bookNowTextTransform as CSSProperties["textTransform"]) : undefined,
                  letterSpacing: bookNowLetterSpacing || undefined,
                }}
              >
                {bookNowLabel}
              </span>
              {bookNowGlow && (
                <style
                  dangerouslySetInnerHTML={{
                    __html: `
                      @keyframes psteps-booknow-glow-kf{0%{background-position:0% 50%;}100%{background-position:400% 50%;}}
                      .psteps-booknow-glow{position:relative;z-index:0;}
                      .psteps-booknow-glow::before{content:"";position:absolute;inset:-3px;z-index:-1;border-radius:inherit;background:linear-gradient(45deg,#2563ff,#e8ce8c,#8a6f3b,#2563ff);background-size:400% 400%;filter:blur(6px);animation:psteps-booknow-glow-kf 6s linear infinite;}
                    `,
                  }}
                />
              )}
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all hover:opacity-90 ${bookNowGlow ? "psteps-booknow-glow" : ""} ${bookNowHover.hoverClassName}`}
                style={{
                  background: `var(--exr-bookNowBackground, ${bookNowBackground || "#ededed"})`,
                  borderStyle: bookNowBorderStyle && bookNowBorderStyle !== "none" ? (bookNowBorderStyle as CSSProperties["borderStyle"]) : undefined,
                  borderWidth: bookNowBorderStyle && bookNowBorderStyle !== "none" ? bookNowBorderWidth || "1px" : undefined,
                  borderColor: bookNowBorderStyle && bookNowBorderStyle !== "none" ? bookNowBorderColor || undefined : undefined,
                  borderRadius: bookNowBorderRadius || "9999px",
                  boxShadow: bookNowBoxShadow || undefined,
                  paddingTop: bookNowPaddingTop || undefined,
                  paddingRight: bookNowPaddingRight || undefined,
                  paddingBottom: bookNowPaddingBottom || undefined,
                  paddingLeft: bookNowPaddingLeft || undefined,
                  marginTop: bookNowMarginTop || undefined,
                  marginRight: bookNowMarginRight || undefined,
                  marginBottom: bookNowMarginBottom || undefined,
                  marginLeft: bookNowMarginLeft || undefined,
                  ...bookNowHover.restingStyle,
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-[15px] w-[15px]">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="#444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      className="relative z-10 mx-auto w-full min-w-0 max-w-full overflow-hidden overflow-x-hidden rounded-[20px] px-6 pb-24 pt-16 text-black md:w-[98%] md:px-12 md:py-28"
      style={{ background: sectionBackground || "#ffffff" }}
    >
      {/* Same thin decorative curve-line background technique as Services.tsx. */}
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <svg className="h-full w-full" viewBox="0 0 1400 860" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <path d="M-50,280 Q250,200 550,300 Q850,400 1150,260 Q1300,200 1450,290" fill="none" stroke="#e8e2d6" strokeWidth="1.4" />
          <path d="M-50,320 Q300,240 600,340 Q900,440 1200,300 Q1320,240 1450,330" fill="none" stroke="#e8e2d6" strokeWidth="0.9" />
          <path d="M100,640 Q400,590 680,650 Q960,710 1280,620 Q1380,590 1450,640" fill="none" stroke="#e8e2d6" strokeWidth="1.1" />
        </svg>
      </div>

      <div ref={ref} className="relative z-10 mx-auto max-w-[1320px]">
        <GoogleFontLink family={eyebrowFontFamily} />
        <GoogleFontLink family={headingFontFamily} />
        <GoogleFontLink family={stepLabelFontFamily} />
        <GoogleFontLink family={ctaFontFamily} />
        <GoogleFontLink family={titleFontFamily} />
        <GoogleFontLink family={descFontFamily} />
        <GoogleFontLink family={readMoreFontFamily} />
        <GoogleFontLink family={bookNowFontFamily} />
        {ctaHover.hoverCss && <style dangerouslySetInnerHTML={{ __html: ctaHover.hoverCss }} />}
        {readMoreHover.hoverCss && <style dangerouslySetInnerHTML={{ __html: readMoreHover.hoverCss }} />}
        {bookNowHover.hoverCss && <style dangerouslySetInnerHTML={{ __html: bookNowHover.hoverCss }} />}

        <div className="mx-auto w-full max-w-full overflow-hidden px-2 text-center">
          <span data-reveal className="block" style={eyebrowStyle}>
            {eyebrow}
          </span>
          <h2 data-reveal className="mx-auto mt-[10px] max-w-full break-words" style={headingStyle}>
            {heading}
          </h2>
        </div>

        {/* Desktop / tablet: static 3-up grid with the highlighted card
            scaled up and floated above its siblings. */}
        <div data-reveal className="mt-16 hidden gap-8 md:grid md:grid-cols-3 md:items-end">
          {steps.map((step, i) => renderCard(step, i, true))}
        </div>

        {/* Mobile: 1-card snap carousel — the grid above would otherwise
            collapse to 3 stacked full-width cards, which is what this
            replaces. Dots below stay in sync with swipe via handleScroll. */}
        <div data-reveal className="mt-10 flex w-full max-w-full flex-col items-center gap-6 overflow-hidden md:hidden">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex w-full max-w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {steps.map((step, i) => (
              <div key={i} className="h-auto min-h-[420px] w-full shrink-0 snap-center">
                {renderCard(step, i, false)}
              </div>
            ))}
          </div>

          {steps.length > 1 && (
            <div className="flex items-center justify-center gap-2">
              {steps.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to step ${i + 1}`}
                  onClick={() => scrollToIndex(i)}
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ width: i === activeIndex ? "22px" : "8px", background: i === activeIndex ? accent : "rgba(0,0,0,0.15)" }}
                />
              ))}
            </div>
          )}
        </div>

        <div data-reveal className="mt-16 flex justify-center">
          <a
            href={ctaHref}
            className={`transition-all hover:-translate-y-0.5 ${ctaHover.hoverClassName}`}
            style={{
              background: `var(--exr-ctaBackground, ${ctaBackground || accent})`,
              ...ctaStyle,
              fontSize: `var(--exr-ctaFontSize, ${ctaFontSize || "13px"})`,
              borderStyle: ctaBorderStyle && ctaBorderStyle !== "none" ? (ctaBorderStyle as CSSProperties["borderStyle"]) : undefined,
              borderWidth: ctaBorderStyle && ctaBorderStyle !== "none" ? ctaBorderWidth || "1px" : undefined,
              borderColor: ctaBorderStyle && ctaBorderStyle !== "none" ? ctaBorderColor || undefined : undefined,
              borderRadius: `var(--exr-ctaBorderRadius, ${ctaBorderRadius || "40px"})`,
              boxShadow: ctaBoxShadow || "0px 8px 25px rgba(37,99,255,0.4)",
              paddingTop: ctaPaddingTop || ctaPaddingV || "15px",
              paddingRight: ctaPaddingRight || ctaPaddingH || "55px",
              paddingBottom: ctaPaddingBottom || ctaPaddingV || "15px",
              paddingLeft: ctaPaddingLeft || ctaPaddingH || "55px",
              marginTop: ctaMarginTop || undefined,
              marginRight: ctaMarginRight || undefined,
              marginBottom: ctaMarginBottom || undefined,
              marginLeft: ctaMarginLeft || undefined,
              ...ctaHover.restingStyle,
            }}
          >
            {ctaLabel}
          </a>
        </div>
      </div>
    </section>
  );
}
