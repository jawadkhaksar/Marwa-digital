"use client";

import { useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { useScrollReveal } from "./home/useScrollReveal";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { GoogleFontLink } from "./builder/GoogleFontLink";
import { buildButtonHoverStyle } from "./builder/buttonHoverStyle";
import type { ServiceCard } from "@/lib/api";

const DEFAULT_ITEMS: ServiceCard[] = [
  {
    title: "Web Design",
    description:
      "Clean, modern designs tailored to your brand and your users. Every layout is built to convert, not just to look good.",
    features: ["Custom Design", "Responsive Layouts", "Fast Turnaround"],
    image: "",
    highlighted: false,
    badge: "Top Rated",
  },
  {
    title: "Web Development",
    description:
      "Fast, reliable builds on a modern stack. We handle everything from a simple landing page to a full custom application.",
    features: ["Modern Stack", "SEO Optimized", "Ongoing Support"],
    image: "",
    highlighted: true,
    badge: "Most Popular",
  },
  {
    title: "Branding",
    description:
      "A complete visual identity — logo, color system, and guidelines — built to scale across every touchpoint your business has.",
    features: ["Logo Design", "Brand Guidelines", "Full Identity System"],
    image: "",
    highlighted: false,
    badge: "Full Service",
  },
];

const CARD_WIDTH = 380;
const CARD_GAP = 10;
const CARD_STEP = CARD_WIDTH + CARD_GAP;

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

// service.description/features support an intentionally tiny markdown
// subset — **bold** and [label](url) — authored via the Bold/Link buttons
// in ServiceItemsEditor.tsx (which wrap the admin's textarea selection in
// this exact syntax). HTML-escaping runs first so a description containing
// a literal "<"/">"/"&" can't be misread as markup, then the two patterns
// are converted to real tags for `dangerouslySetInnerHTML`. Links run before
// bold so a bolded link's ** markers (if any land inside the brackets)
// aren't already turned into <strong> before the link pattern gets a look.
// Plain text with no markdown in it (every card saved before this existed)
// round-trips unchanged.
function renderInlineMarkdown(text: string): string {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const withLinks = escaped.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*|#[^\s)]*)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  return withLinks.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

// Gives two Services instances with different bookNowHoverBackground values
// on the same page a collision-safe, stable class name for the scoped
// :hover style tag below (inline styles can't express :hover at all).
function hashString(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

export function Services({
  eyebrow = "Services",
  heading = "Our Service",
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
  ctaBorderStyle,
  ctaBorderWidth,
  ctaBorderColor,
  ctaBorderRadius,
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
  featuresColor,
  featuresMarkerColor,
  featuresFontFamily,
  featuresFontSize,
  featuresFontWeight,
  featuresTextTransform,
  featuresFontStyle,
  featuresTextDecoration,
  featuresLineHeight,
  featuresLetterSpacing,
  featuresWordSpacing,
  featuresItemSpacing,
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
  footerBorderColor,
  readMoreColor,
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
  ctaTopSpacing,
}: {
  eyebrow?: string;
  heading?: string;
  ctaLabel?: string;
  ctaHref?: string;
  readMoreLabel?: string;
  bookNowLabel?: string;
  items?: ServiceCard[];
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
  ctaBorderStyle?: "none" | "solid" | "dashed" | "dotted" | "double";
  ctaBorderWidth?: string;
  ctaBorderColor?: string;
  ctaBorderRadius?: string;
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
  featuresColor?: string;
  featuresMarkerColor?: string;
  featuresFontFamily?: string;
  featuresFontSize?: string;
  featuresFontWeight?: string;
  featuresTextTransform?: string;
  featuresFontStyle?: string;
  featuresTextDecoration?: string;
  featuresLineHeight?: string;
  featuresLetterSpacing?: string;
  featuresWordSpacing?: string;
  featuresItemSpacing?: string;
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
  footerBorderColor?: string;
  readMoreColor?: string;
  bookNowColor?: string;
  bookNowBackground?: string;
  bookNowHoverBackground?: string;
  bookNowGlow?: boolean;
  bookNowHoverColor?: string;
  bookNowHoverBorderColor?: string;
  bookNowBorderStyle?: "none" | "solid" | "dashed" | "dotted" | "double";
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
  ctaTopSpacing?: string;
}) {
  const ref = useScrollReveal<HTMLDivElement>();
  const stripRef = useRef<HTMLDivElement | null>(null);
  const services = items.length > 0 ? items : DEFAULT_ITEMS;
  const [center, setCenter] = useState(1 % services.length);
  const [animating, setAnimating] = useState(false);
  const [glow, setGlow] = useState<{ pos: "left" | "center" | "right"; x: number; y: number } | null>(null);

  const accent = accentColor || "#2563FF";

  // Reads every sub-field through var(--exr-{prefix}{Key}, {desktop value})
  // instead of the raw prop — the wrapper mints that custom property from
  // this same prop at desktop (resolveNodeStyle's mintVars) and overrides it
  // inside a tablet/mobile media query when the admin sets a per-breakpoint
  // value in the panel; inheritance carries it down to wherever this style
  // object actually gets applied, no matter how deep in the card markup.
  // Supersedes this session's earlier svc-eyebrow/svc-title/etc marker-class
  // stopgap, which only covered font-size — this covers the full set.
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
    defaults: { color?: string; fontWeight: string; textTransform: string; letterSpacing: string; lineHeight: string }
  ): CSSProperties {
    const va = (key: string, value: string | undefined, fallback: string) => `var(--exr-${prefix}${key}, ${value || fallback})`;
    return {
      ...(defaults.color !== undefined ? { color: va("Color", v.color, defaults.color) } : {}),
      fontFamily: v.fontFamily && v.fontFamily !== "inherit" ? v.fontFamily : undefined,
      fontSize: va("FontSize", v.fontSize, "inherit"),
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
    { color: "#2563FF", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.55em", lineHeight: "inherit" }
  );

  const headingStyle = typographyVars(
    "heading",
    { color: headingColor, fontFamily: headingFontFamily, fontSize: headingFontSize, fontWeight: headingFontWeight, textTransform: headingTextTransform, fontStyle: headingFontStyle, textDecoration: headingTextDecoration, lineHeight: headingLineHeight, letterSpacing: headingLetterSpacing, wordSpacing: headingWordSpacing },
    { color: "#111", fontWeight: "900", textTransform: "uppercase", letterSpacing: "-2px", lineHeight: "inherit" }
  );

  const ctaStyle = typographyVars(
    "cta",
    { fontFamily: ctaFontFamily, fontSize: ctaFontSize, fontWeight: ctaFontWeight, textTransform: ctaTextTransform, fontStyle: ctaFontStyle, textDecoration: ctaTextDecoration, lineHeight: ctaLineHeight, letterSpacing: ctaLetterSpacing, wordSpacing: ctaWordSpacing },
    { fontWeight: "400", textTransform: "none", letterSpacing: "0.3px", lineHeight: "inherit" }
  );

  const titleStyle = typographyVars(
    "title",
    { color: titleColor, fontFamily: titleFontFamily, fontSize: titleFontSize, fontWeight: titleFontWeight, textTransform: titleTextTransform, fontStyle: titleFontStyle, textDecoration: titleTextDecoration, lineHeight: titleLineHeight, letterSpacing: titleLetterSpacing, wordSpacing: titleWordSpacing },
    { color: "#111", fontWeight: "900", textTransform: "uppercase", letterSpacing: "-0.3px", lineHeight: "inherit" }
  );

  const descStyle = typographyVars(
    "desc",
    { color: descColor, fontFamily: descFontFamily, fontSize: descFontSize, fontWeight: descFontWeight, textTransform: descTextTransform, fontStyle: descFontStyle, textDecoration: descTextDecoration, lineHeight: descLineHeight, letterSpacing: descLetterSpacing, wordSpacing: descWordSpacing },
    { color: "#999", fontWeight: "400", textTransform: "none", letterSpacing: "inherit", lineHeight: "1.75" }
  );

  // Built by hand instead of typographyVars: that helper always falls back
  // to fontSize:"inherit" (every other prefix pairs it with its own
  // Tailwind text-size class as the real default). Feature bullets have no
  // such class — they were plain hardcoded Tailwind utilities
  // (text-xs/font-bold/leading-[1.5]/text-[#111]) before this existed, so
  // the fallbacks here are chosen to reproduce that exact prior appearance
  // for every card saved before these fields existed.
  const featuresStyle: CSSProperties = {
    color: `var(--exr-featuresColor, ${featuresColor || "#111111"})`,
    fontFamily: featuresFontFamily && featuresFontFamily !== "inherit" ? featuresFontFamily : undefined,
    fontSize: `var(--exr-featuresFontSize, ${featuresFontSize || "12px"})`,
    fontWeight: `var(--exr-featuresFontWeight, ${featuresFontWeight || "700"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-featuresTextTransform, ${featuresTextTransform || "none"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-featuresFontStyle, ${featuresFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-featuresTextDecoration, ${featuresTextDecoration || "none"})`,
    lineHeight: `var(--exr-featuresLineHeight, ${featuresLineHeight || "1.5"})`,
    letterSpacing: `var(--exr-featuresLetterSpacing, ${featuresLetterSpacing || "normal"})`,
    wordSpacing: `var(--exr-featuresWordSpacing, ${featuresWordSpacing || "normal"})`,
  };

  const cardContentStyle: CSSProperties = {
    paddingTop: cardPaddingTop || "18px",
    paddingRight: cardPaddingRight || "20px",
    paddingBottom: cardPaddingBottom || "0px",
    paddingLeft: cardPaddingLeft || "20px",
  };

  const ctaHover = buildButtonHoverStyle("svc-cta", {
    background: ctaBackground || accent,
    hoverBackground: ctaHoverBackground,
    hoverColor: ctaHoverColor,
    hoverBorderColor: ctaHoverBorderColor,
    hoverBoxShadow: ctaHoverBoxShadow,
    hoverBackgroundSize: ctaHoverBackgroundSize,
    hoverBackgroundPosition: ctaHoverBackgroundPosition,
    hoverTransitionDuration: ctaHoverTransitionDuration,
  });

  const bookNowHover = buildButtonHoverStyle("svc-booknow", {
    background: bookNowBackground || accent,
    hoverBackground: bookNowHoverBackground,
    hoverBorderColor: bookNowHoverBorderColor,
    hoverBoxShadow: bookNowHoverBoxShadow,
    hoverBackgroundSize: bookNowHoverBackgroundSize,
    hoverBackgroundPosition: bookNowHoverBackgroundPosition,
    hoverTransitionDuration: bookNowHoverTransitionDuration,
  });
  const bookNowHoverClassName = bookNowHover.hoverClassName;

  // Card Hover Settings — a real per-card `:hover` rule (background/border/
  // shadow/scale), distinct from the always-on glow-on-mouse-move effect
  // above. Same scoped-<style> mechanism as the CTA/Book Now buttons since
  // these cards are nested sub-elements of this one block, not separate
  // LayoutNodes the generic inspector `:hover` selector could ever reach.
  const cardHover = buildButtonHoverStyle("svc-card", {
    background: cardBackground,
    hoverBackground: cardHoverBackground,
    hoverBorderColor: cardHoverBorderColor,
    hoverBoxShadow: cardHoverBoxShadow,
    hoverTransform: cardHoverScale ? `scale(${cardHoverScale})` : undefined,
  });

  // Text-only hover color for the "Book Now" label span next to the circle
  // (the circle's own hover is handled by bookNowHover above) — same
  // ancestor-hover scoped-class trick as Faq's questionHoverClassName.
  const bookNowLabelHoverClassName = bookNowHoverColor ? `svc-booknow-label-h${hashString(bookNowHoverColor)}` : "";

  function navigate(dir: 1 | -1) {
    if (animating || services.length < 2) return;
    setAnimating(true);
    const strip = stripRef.current;
    const moveX = dir === 1 ? -CARD_STEP : CARD_STEP;

    if (strip) {
      gsap.to(strip, {
        x: moveX,
        duration: 0.42,
        ease: "power3.inOut",
        onComplete: () => {
          setCenter((c) => mod(c + dir, services.length));
          gsap.set(strip, { x: 0 });
          setAnimating(false);
        },
      });
    } else {
      setCenter((c) => mod(c + dir, services.length));
      setAnimating(false);
    }
  }

  const dragStartX = useRef<number | null>(null);

  function handlePointerDown(e: React.PointerEvent) {
    dragStartX.current = e.clientX;
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (dragStartX.current === null) return;
    const dx = e.clientX - dragStartX.current;
    dragStartX.current = null;
    if (Math.abs(dx) > 60) navigate(dx < 0 ? 1 : -1);
  }

  function handleCardMouseMove(pos: "left" | "center" | "right", e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setGlow({ pos, x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  if (services.length === 0) return null;

  const leftIdx = mod(center - 1, services.length);
  const rightIdx = mod(center + 1, services.length);

  const slots: Array<{ pos: "left" | "center" | "right"; idx: number; isCenter: boolean }> = [
    { pos: "left", idx: leftIdx, isCenter: false },
    { pos: "center", idx: center, isCenter: true },
    { pos: "right", idx: rightIdx, isCenter: false },
  ];

  return (
    <section
      id="services"
      className="relative z-10 mx-auto w-[98%] overflow-hidden rounded-[20px] px-6 py-20 text-black md:px-12 md:py-28"
      style={{ background: sectionBackground || "#f5f5f0" }}
    >
      <div className="absolute inset-0 pointer-events-none opacity-70">
        <svg className="h-full w-full" viewBox="0 0 1400 860" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <path d="M-50,280 Q250,200 550,300 Q850,400 1150,260 Q1300,200 1450,290" fill="none" stroke="#e0dbd2" strokeWidth="1.4" />
          <path d="M-50,320 Q300,240 600,340 Q900,440 1200,300 Q1320,240 1450,330" fill="none" stroke="#e0dbd2" strokeWidth="0.9" />
          <path d="M-50,480 Q200,420 500,490 Q800,560 1100,430 Q1280,370 1450,470" fill="none" stroke="#e0dbd2" strokeWidth="1.4" />
          <path d="M-50,520 Q250,460 550,530 Q850,600 1150,470 Q1300,410 1450,510" fill="none" stroke="#e0dbd2" strokeWidth="0.9" />
          <path d="M100,640 Q400,590 680,650 Q960,710 1280,620 Q1380,590 1450,640" fill="none" stroke="#e0dbd2" strokeWidth="1.1" />
        </svg>
      </div>

      <div ref={ref} className="relative z-10 mx-auto max-w-[1440px]">
        <GoogleFontLink family={eyebrowFontFamily} />
        <GoogleFontLink family={headingFontFamily} />
        <GoogleFontLink family={ctaFontFamily} />
        <GoogleFontLink family={titleFontFamily} />
        <GoogleFontLink family={descFontFamily} />
        <GoogleFontLink family={featuresFontFamily} />
        <GoogleFontLink family={bookNowFontFamily} />
        {ctaHover.hoverCss && <style dangerouslySetInnerHTML={{ __html: ctaHover.hoverCss }} />}
        {bookNowHover.hoverCss && <style dangerouslySetInnerHTML={{ __html: bookNowHover.hoverCss }} />}
        {cardHover.hoverCss && <style dangerouslySetInnerHTML={{ __html: cardHover.hoverCss }} />}
        {bookNowHoverColor && (
          <style
            dangerouslySetInnerHTML={{
              __html: `.svc-booknow-link:hover .${bookNowLabelHoverClassName}{color:${bookNowHoverColor} !important;}`,
            }}
          />
        )}
        <div className="text-center">
          {/* Letter gaps come from CSS letter-spacing (eyebrowStyle, already
              var-bridged) rather than injecting literal space characters
              between every character — splitting the string like the
              previous version did (`eyebrow.split("").join(" ")`) turns
              every inter-letter gap into a real space character too, so
              word-spacing (meant to add extra room only at the REAL word
              boundaries) ends up applying uniformly everywhere instead,
              visually indistinguishable from letter-spacing and impossible
              to tune independently. */}
          <span data-reveal className="block text-[14px]" style={eyebrowStyle}>
            {eyebrow}
          </span>
          <h2 data-reveal className="mt-[10px] text-[clamp(3rem,6vw,3rem)] leading-none" style={headingStyle}>
            {heading}
          </h2>
        </div>

        <div data-reveal className="relative mt-8 flex w-full items-center justify-center overflow-hidden py-2.5">
          <div
            ref={stripRef}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            // items-stretch (not items-center): equalizes every card's box
            // height to the tallest one in the row before the center card's
            // own scale-100 transform is applied (a transform never affects
            // layout/height, only paint) — without it each card sat at its
            // own content-driven height, so a slightly longer description on
            // one side card made it visibly taller than its sibling.
            className="flex items-stretch justify-center gap-[10px] pb-10 pt-2.5 select-none"
          >
            {slots.map(({ pos, idx, isCenter }) => {
              const service = services[idx];
              const isGlowing = glow?.pos === pos;
              return (
                <div
                  key={pos}
                  onMouseMove={(e) => handleCardMouseMove(pos, e)}
                  onMouseLeave={() => setGlow((g) => (g?.pos === pos ? null : g))}
                  onClick={() => !isCenter && navigate(pos === "left" ? -1 : 1)}
                  className={`relative ${isCenter ? "flex" : "hidden md:flex"} w-[85vw] max-w-[380px] shrink-0 flex-col overflow-hidden transition-transform duration-[450ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${
                    isCenter ? "scale-100 translate-y-0" : "translate-y-[14px] scale-90 cursor-pointer"
                  } ${cardBoxShadow ? "" : isCenter ? "shadow-[0px_0px_19px_0px_#00000040]" : "shadow-[0px_0px_26px_0px_#00000040]"} ${cardHover.hoverClassName}`}
                  style={{
                    background: `var(--exr-cardBackground, ${cardBackground || "#fff"})`,
                    borderRadius: `var(--exr-cardBorderRadius, ${cardBorderRadius || "20px"})`,
                    borderStyle: cardBorderStyle && cardBorderStyle !== "none" ? cardBorderStyle : undefined,
                    borderTopWidth: cardBorderStyle && cardBorderStyle !== "none" ? `var(--exr-cardBorderWidthTop, ${cardBorderWidthTop || cardBorderWidth || "1.5px"})` : undefined,
                    borderRightWidth: cardBorderStyle && cardBorderStyle !== "none" ? `var(--exr-cardBorderWidthRight, ${cardBorderWidthRight || cardBorderWidth || "1.5px"})` : undefined,
                    borderBottomWidth: cardBorderStyle && cardBorderStyle !== "none" ? `var(--exr-cardBorderWidthBottom, ${cardBorderWidthBottom || cardBorderWidth || "1.5px"})` : undefined,
                    borderLeftWidth: cardBorderStyle && cardBorderStyle !== "none" ? `var(--exr-cardBorderWidthLeft, ${cardBorderWidthLeft || cardBorderWidth || "1.5px"})` : undefined,
                    // The centered card keeps its accent-highlighted border —
                    // a deliberate carousel feature, not something
                    // `cardBorderColor` overrides; that field customizes the
                    // side cards' resting border instead.
                    borderColor: isCenter ? accent : `var(--exr-cardBorderColor, ${cardBorderColor || "rgba(0,0,0,0.06)"})`,
                    boxShadow: cardBoxShadow ? `var(--exr-cardBoxShadow, ${cardBoxShadow})` : undefined,
                  }}
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 z-[1] transition-opacity duration-300"
                    style={{
                      borderRadius: `var(--exr-cardBorderRadius, ${cardBorderRadius || "20px"})`,
                      opacity: isGlowing ? 1 : 0,
                      background: isGlowing ? `radial-gradient(220px circle at ${glow.x}px ${glow.y}px, rgba(37,99,255,0.38) 0%, rgba(37,99,255,0.14) 40%, transparent 70%)` : undefined,
                    }}
                  />

                  <div className="relative mx-2.5 mt-2.5 h-[200px] shrink-0 overflow-hidden rounded-[14px]">
                    {/* Guarded on service.image: an empty string src (a card
                        added via ServiceItemsEditor before an image was
                        picked) makes the browser treat it as "reload the
                        current page" per the HTML spec, logging a console
                        error and wasting a network request — skipping the
                        tag entirely for an unset image is the fix, not a
                        placeholder src. */}
                    {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded content; next/image's optimizer rejects cross-origin /uploads/** URLs, see ImageBox/SiteLogo/ServiceCard for the same fix */}
                    {service.image && <img src={resolveImageUrl(service.image)} alt={service.title} className="absolute inset-0 h-full w-full object-cover" />}
                    {service.badge && (
                      <span className="absolute right-3 top-3 whitespace-nowrap rounded-[30px] bg-white px-3.5 py-[5px] text-[10px] font-extrabold tracking-[0.5px] text-black shadow-[0_2px_8px_rgba(0,0,0,0.13)]">
                        {service.badge.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col" style={cardContentStyle}>
                    <h3 className="mb-2.5" style={titleStyle}>
                      {service.title}
                    </h3>
                    <p className="mb-3" style={descStyle} dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(service.description) }} />

                    {service.features.length > 0 && (
                      <ul className="mb-4">
                        {service.features.map((feature, i) => (
                          <li
                            key={i}
                            className="relative pl-3.5"
                            style={{ ...featuresStyle, paddingBlock: `var(--exr-featuresItemSpacing, ${featuresItemSpacing || "3px"})` }}
                          >
                            <span className="absolute left-0 top-[3px]" style={{ color: `var(--exr-featuresMarkerColor, ${featuresMarkerColor || "#444444"})` }}>
                              &bull;
                            </span>
                            <span dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(feature) }} />
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-auto flex items-center justify-between px-0 py-3.5 pb-[18px]" style={{ borderTop: `1px solid ${footerBorderColor || "#f0f0f0"}` }}>
                      <a
                        href={service.readMoreUrl || "#"}
                        onClick={service.readMoreUrl ? undefined : (e) => e.preventDefault()}
                        className="text-[11.5px] font-semibold"
                        style={{ color: readMoreColor || "#ccc" }}
                      >
                        {readMoreLabel}
                      </a>
                      <a
                        href={service.bookNowUrl || "#"}
                        onClick={service.bookNowUrl ? undefined : (e) => e.preventDefault()}
                        className="svc-booknow-link flex items-center gap-[9px]"
                      >
                        <span
                          className={`text-[11.5px] font-semibold ${bookNowLabelHoverClassName}`}
                          style={{
                            color: bookNowColor || "#ccc",
                            fontFamily: bookNowFontFamily && bookNowFontFamily !== "inherit" ? bookNowFontFamily : undefined,
                            fontSize: bookNowFontSize || undefined,
                            fontWeight: bookNowFontWeight as CSSProperties["fontWeight"],
                            textTransform: bookNowTextTransform as CSSProperties["textTransform"],
                            letterSpacing: bookNowLetterSpacing || undefined,
                          }}
                        >
                          {bookNowLabel}
                        </span>
                        {/* Same always-on pulsing gradient glow as
                            PricingOverviewBlock's ctaGlow — the generic
                            per-block "Glow Border" hover animation can't
                            reach this circle since it's a sub-element
                            inside the whole Services block's own markup,
                            not its own top-level node. Fixed class (not
                            hashed like bookNowHoverClassName above) since
                            the effect itself isn't parameterized — every
                            Services instance with it on renders the exact
                            same rule. */}
                        {bookNowGlow && (
                          <style
                            dangerouslySetInnerHTML={{
                              __html: `
                                @keyframes svc-booknow-glow-kf{0%{background-position:0% 50%;}100%{background-position:400% 50%;}}
                                .svc-booknow-glow{position:relative;z-index:0;}
                                .svc-booknow-glow::before{content:"";position:absolute;inset:-3px;z-index:-1;border-radius:inherit;background:linear-gradient(45deg,#2563ff,#e8ce8c,#8a6f3b,#2563ff);background-size:400% 400%;filter:blur(6px);animation:svc-booknow-glow-kf 6s linear infinite;}
                              `,
                            }}
                          />
                        )}
                        <span
                          className={`flex shrink-0 items-center justify-center rounded-full transition-colors ${isCenter ? "h-11 w-11" : "h-9 w-9 bg-[#ededed]"} ${bookNowHoverClassName} ${bookNowGlow ? "svc-booknow-glow" : ""}`}
                          style={{
                            ...(isCenter ? { background: bookNowBackground || accent } : {}),
                            borderStyle: bookNowBorderStyle && bookNowBorderStyle !== "none" ? bookNowBorderStyle : undefined,
                            borderWidth: bookNowBorderStyle && bookNowBorderStyle !== "none" ? bookNowBorderWidth || "1px" : undefined,
                            borderColor: bookNowBorderStyle && bookNowBorderStyle !== "none" ? bookNowBorderColor : undefined,
                            borderRadius: bookNowBorderRadius || undefined,
                            boxShadow: bookNowBoxShadow || undefined,
                            paddingTop: bookNowPaddingTop || undefined,
                            paddingRight: bookNowPaddingRight || undefined,
                            paddingBottom: bookNowPaddingBottom || undefined,
                            paddingLeft: bookNowPaddingLeft || undefined,
                            marginTop: bookNowMarginTop || undefined,
                            marginRight: bookNowMarginRight || undefined,
                            marginBottom: bookNowMarginBottom || undefined,
                            marginLeft: bookNowMarginLeft || undefined,
                            ...(isCenter ? bookNowHover.restingStyle : {}),
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" className="h-[15px] w-[15px]">
                            <path d="M5 12h14M12 5l7 7-7 7" stroke={isCenter ? "#fff" : "#444"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile-only prev/next pair, moved below the card instead of
            overlapping its image (see the desktop side-cards above, which
            need no separate controls — clicking a side card navigates). */}
        {services.length > 1 && (
          <div className="flex items-center justify-center gap-6 md:hidden">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Previous service"
              className="flex h-9 w-9 items-center justify-center rounded-full text-white shadow transition-transform active:scale-95"
              style={{ background: accent }}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => navigate(1)}
              aria-label="Next service"
              className="flex h-9 w-9 items-center justify-center rounded-full text-white shadow transition-transform active:scale-95"
              style={{ background: accent }}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}

        {/* Admin-adjustable via Style tab → CTA Top Spacing (per breakpoint —
            see the Mobile override that closes the gap to the mobile-only
            arrows row above), instead of a hardcoded value here. */}
        <div data-reveal className="flex justify-center" style={{ marginTop: `var(--exr-ctaTopSpacing, ${ctaTopSpacing || "6px"})` }}>
            <a
              href={ctaHref || "/contact"}
              className={`rounded-[40px] px-[55px] py-[15px] text-white shadow-[0_8px_25px_rgba(37,99,255,0.4)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(37,99,255,0.55)] ${ctaHover.hoverClassName}`}
              style={{
                background: ctaBackground || accent,
                color: ctaColor || undefined,
                borderStyle: ctaBorderStyle && ctaBorderStyle !== "none" ? ctaBorderStyle : undefined,
                borderWidth: ctaBorderStyle && ctaBorderStyle !== "none" ? ctaBorderWidth || "1px" : undefined,
                borderColor: ctaBorderStyle && ctaBorderStyle !== "none" ? ctaBorderColor : undefined,
                borderRadius: ctaBorderRadius || undefined,
                boxShadow: ctaBoxShadow || undefined,
                paddingTop: ctaPaddingTop || undefined,
                paddingRight: ctaPaddingRight || undefined,
                paddingBottom: ctaPaddingBottom || undefined,
                paddingLeft: ctaPaddingLeft || undefined,
                marginTop: ctaMarginTop || undefined,
                marginRight: ctaMarginRight || undefined,
                marginBottom: ctaMarginBottom || undefined,
                marginLeft: ctaMarginLeft || undefined,
                ...ctaStyle,
                fontSize: `var(--exr-ctaFontSize, ${ctaFontSize || "12px"})`,
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
