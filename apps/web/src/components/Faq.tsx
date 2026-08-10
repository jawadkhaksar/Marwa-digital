"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useScrollReveal } from "./home/useScrollReveal";
import { IconChevron } from "./home/icons";
import { GoogleFontLink } from "./builder/GoogleFontLink";
import { buildButtonHoverStyle } from "./builder/buttonHoverStyle";

interface FaqItem {
  question: string;
  answer: string;
}

// Each page using this block owns its own FAQ set (not a single shared
// global list) — this is only generic placeholder copy shown before an admin
// fills in the block's own `faqs` prop, so the block never renders empty on
// the canvas.
const DEFAULT_FAQS: FaqItem[] = [
  {
    question: "What services do you offer?",
    answer: "Replace this placeholder with your own answer in the block's Content tab.",
  },
  {
    question: "How long does a typical project take?",
    answer: "Replace this placeholder with your own answer in the block's Content tab.",
  },
  {
    question: "How do we get started?",
    answer: "Replace this placeholder with your own answer in the block's Content tab.",
  },
];

// Collision-safe class name for two Faq instances on the same page with
// different questionHoverColor values — inline styles can't express :hover.
function hashString(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

export function Faq({
  title = "Frequently Asked Questions",
  faqs = DEFAULT_FAQS,
  sectionBackground,
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
  questionColor,
  questionHoverColor,
  questionFontFamily,
  questionFontSize,
  questionFontWeight,
  questionTextTransform,
  questionFontStyle,
  questionTextDecoration,
  questionLineHeight,
  questionLetterSpacing,
  questionWordSpacing,
  answerColor,
  answerFontFamily,
  answerFontSize,
  answerFontWeight,
  answerTextTransform,
  answerFontStyle,
  answerTextDecoration,
  answerLineHeight,
  answerLetterSpacing,
  answerWordSpacing,
  chevronColor,
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
  cardHoverBackground,
  cardHoverBorderColor,
  cardHoverBoxShadow,
  cardPaddingTop,
  cardPaddingRight,
  cardPaddingBottom,
  cardPaddingLeft,
  showMoreLimit,
  showMoreLabel,
  showLessLabel,
  showMoreBackground,
  showMoreColor,
  showMoreHoverBackground,
  showMoreHoverColor,
  showMoreHoverBorderColor,
  showMoreBorderStyle,
  showMoreBorderWidth,
  showMoreBorderColor,
  showMoreBorderRadius,
  showMoreBoxShadow,
  showMoreHoverBoxShadow,
  showMoreHoverBackgroundSize,
  showMoreHoverBackgroundPosition,
  showMoreHoverTransitionDuration,
  showMorePaddingV,
  showMorePaddingH,
  showMorePaddingTop,
  showMorePaddingRight,
  showMorePaddingBottom,
  showMorePaddingLeft,
  showMoreMarginTop,
  showMoreMarginRight,
  showMoreMarginBottom,
  showMoreMarginLeft,
  showMoreFontFamily,
  showMoreFontSize,
  showMoreFontWeight,
  showMoreTextTransform,
  showMoreFontStyle,
  showMoreTextDecoration,
  showMoreLineHeight,
  showMoreLetterSpacing,
  showMoreWordSpacing,
}: {
  title?: string;
  faqs?: FaqItem[];
  sectionBackground?: string;
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
  questionColor?: string;
  questionHoverColor?: string;
  questionFontFamily?: string;
  questionFontSize?: string;
  questionFontWeight?: string;
  questionTextTransform?: string;
  questionFontStyle?: string;
  questionTextDecoration?: string;
  questionLineHeight?: string;
  questionLetterSpacing?: string;
  questionWordSpacing?: string;
  answerColor?: string;
  answerFontFamily?: string;
  answerFontSize?: string;
  answerFontWeight?: string;
  answerTextTransform?: string;
  answerFontStyle?: string;
  answerTextDecoration?: string;
  answerLineHeight?: string;
  answerLetterSpacing?: string;
  answerWordSpacing?: string;
  chevronColor?: string;
  cardBackground?: string;
  cardBorderStyle?: string;
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
  cardPaddingTop?: string;
  cardPaddingRight?: string;
  cardPaddingBottom?: string;
  cardPaddingLeft?: string;
  showMoreLimit?: string;
  showMoreLabel?: string;
  showLessLabel?: string;
  showMoreBackground?: string;
  showMoreColor?: string;
  showMoreHoverBackground?: string;
  showMoreHoverColor?: string;
  showMoreHoverBorderColor?: string;
  showMoreBorderStyle?: string;
  showMoreBorderWidth?: string;
  showMoreBorderColor?: string;
  showMoreBorderRadius?: string;
  showMoreBoxShadow?: string;
  showMoreHoverBoxShadow?: string;
  showMoreHoverBackgroundSize?: string;
  showMoreHoverBackgroundPosition?: string;
  showMoreHoverTransitionDuration?: string;
  showMorePaddingV?: string;
  showMorePaddingH?: string;
  showMorePaddingTop?: string;
  showMorePaddingRight?: string;
  showMorePaddingBottom?: string;
  showMorePaddingLeft?: string;
  showMoreMarginTop?: string;
  showMoreMarginRight?: string;
  showMoreMarginBottom?: string;
  showMoreMarginLeft?: string;
  showMoreFontFamily?: string;
  showMoreFontSize?: string;
  showMoreFontWeight?: string;
  showMoreTextTransform?: string;
  showMoreFontStyle?: string;
  showMoreTextDecoration?: string;
  showMoreLineHeight?: string;
  showMoreLetterSpacing?: string;
  showMoreWordSpacing?: string;
}) {
  const ref = useScrollReveal<HTMLDivElement>();
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [showAll, setShowAll] = useState(false);
  const limit = Number.parseInt(showMoreLimit || "5", 10) || 5;
  const hasMore = faqs.length > limit;
  const visibleFaqs = showAll ? faqs : faqs.slice(0, limit);

  // Reads every sub-field through var(--exr-{prefix}{Key}, {desktop value})
  // instead of the raw prop — the wrapper mints that custom property from
  // this same prop at desktop and overrides it inside a tablet/mobile media
  // query when the admin sets a per-breakpoint value in the panel. Same
  // pattern as Services.tsx/TrustHighlights.tsx's typographyVars(). fontSize
  // always falls back to a real size here, never "inherit" — set inline,
  // "inherit" would silently override the element's own Tailwind text-*
  // class regardless of specificity.
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
    defaults: { color?: string; fontSize: string; fontWeight: string; textTransform: string; letterSpacing: string; lineHeight: string }
  ): CSSProperties {
    const va = (key: string, value: string | undefined, fallback: string) => `var(--exr-${prefix}${key}, ${value || fallback})`;
    return {
      ...(defaults.color !== undefined ? { color: va("Color", v.color, defaults.color) } : {}),
      fontFamily: v.fontFamily && v.fontFamily !== "inherit" ? v.fontFamily : undefined,
      fontSize: va("FontSize", v.fontSize, defaults.fontSize),
      fontWeight: va("FontWeight", v.fontWeight, defaults.fontWeight) as CSSProperties["fontWeight"],
      textTransform: va("TextTransform", v.textTransform, defaults.textTransform) as CSSProperties["textTransform"],
      fontStyle: va("FontStyle", v.fontStyle, "normal") as CSSProperties["fontStyle"],
      textDecoration: va("TextDecoration", v.textDecoration, "none"),
      lineHeight: va("LineHeight", v.lineHeight, defaults.lineHeight),
      letterSpacing: va("LetterSpacing", v.letterSpacing, defaults.letterSpacing),
      wordSpacing: va("WordSpacing", v.wordSpacing, "inherit"),
    };
  }

  const titleStyle = typographyVars(
    "title",
    { color: titleColor, fontFamily: titleFontFamily, fontSize: titleFontSize, fontWeight: titleFontWeight, textTransform: titleTextTransform, fontStyle: titleFontStyle, textDecoration: titleTextDecoration, lineHeight: titleLineHeight, letterSpacing: titleLetterSpacing, wordSpacing: titleWordSpacing },
    { color: "#000", fontSize: "clamp(2.25rem, 5vw, 3rem)", fontWeight: "800", textTransform: "uppercase", letterSpacing: "inherit", lineHeight: "inherit" }
  );

  const questionStyle = typographyVars(
    "question",
    { color: questionColor, fontFamily: questionFontFamily, fontSize: questionFontSize, fontWeight: questionFontWeight, textTransform: questionTextTransform, fontStyle: questionFontStyle, textDecoration: questionTextDecoration, lineHeight: questionLineHeight, letterSpacing: questionLetterSpacing, wordSpacing: questionWordSpacing },
    { color: "#000", fontSize: "0.875rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.02em", lineHeight: "inherit" }
  );

  const answerStyle = typographyVars(
    "answer",
    { color: answerColor, fontFamily: answerFontFamily, fontSize: answerFontSize, fontWeight: answerFontWeight, textTransform: answerTextTransform, fontStyle: answerFontStyle, textDecoration: answerTextDecoration, lineHeight: answerLineHeight, letterSpacing: answerLetterSpacing, wordSpacing: answerWordSpacing },
    { color: "rgb(107,114,128)", fontSize: "0.875rem", fontWeight: "400", textTransform: "none", letterSpacing: "inherit", lineHeight: "inherit" }
  );

  const showMoreStyle = typographyVars(
    "showMore",
    {
      fontFamily: showMoreFontFamily,
      fontSize: showMoreFontSize,
      fontWeight: showMoreFontWeight,
      textTransform: showMoreTextTransform,
      fontStyle: showMoreFontStyle,
      textDecoration: showMoreTextDecoration,
      lineHeight: showMoreLineHeight,
      letterSpacing: showMoreLetterSpacing,
      wordSpacing: showMoreWordSpacing,
    },
    { fontSize: "0.875rem", fontWeight: "700", textTransform: "none", letterSpacing: "inherit", lineHeight: "inherit" }
  );

  const chevronColorValue = `var(--exr-chevronColor, ${chevronColor || "#000"})`;

  const questionHoverValue = questionHoverColor || "#2563FF";
  const questionHoverClassName = `faq-q-h${hashString(questionHoverValue)}`;
  const showMoreHover = buildButtonHoverStyle("faq-showmore", {
    background: showMoreBackground,
    hoverBackground: showMoreHoverBackground,
    hoverColor: showMoreHoverColor,
    hoverBorderColor: showMoreHoverBorderColor,
    hoverBoxShadow: showMoreHoverBoxShadow,
    hoverBackgroundSize: showMoreHoverBackgroundSize,
    hoverBackgroundPosition: showMoreHoverBackgroundPosition,
    hoverTransitionDuration: showMoreHoverTransitionDuration,
  });

  // Card Hover Settings for each FAQ row's own bordered box (no scale — a
  // scaling accordion row would fight its neighbors' layout on hover).
  const cardHover = buildButtonHoverStyle("faq-card", {
    background: cardBackground,
    hoverBackground: cardHoverBackground,
    hoverBorderColor: cardHoverBorderColor,
    hoverBoxShadow: cardHoverBoxShadow,
  });

  const cardStyle: CSSProperties = {
    background: cardBackground ? `var(--exr-cardBackground, ${cardBackground})` : "var(--exr-cardBackground, #f5f5f5)",
    borderStyle: `var(--exr-cardBorderStyle, ${cardBorderStyle || "none"})` as CSSProperties["borderStyle"],
    borderColor: cardBorderColor ? `var(--exr-cardBorderColor, ${cardBorderColor})` : undefined,
    borderTopWidth: `var(--exr-cardBorderWidthTop, ${cardBorderWidthTop || cardBorderWidth || "0px"})`,
    borderRightWidth: `var(--exr-cardBorderWidthRight, ${cardBorderWidthRight || cardBorderWidth || "0px"})`,
    borderBottomWidth: `var(--exr-cardBorderWidthBottom, ${cardBorderWidthBottom || cardBorderWidth || "0px"})`,
    borderLeftWidth: `var(--exr-cardBorderWidthLeft, ${cardBorderWidthLeft || cardBorderWidth || "0px"})`,
    borderRadius: `var(--exr-cardBorderRadius, ${cardBorderRadius || "1rem"})`,
    boxShadow: cardBoxShadow ? `var(--exr-cardBoxShadow, ${cardBoxShadow})` : undefined,
    paddingTop: `var(--exr-cardPaddingTop, ${cardPaddingTop || "1.25rem"})`,
    paddingRight: `var(--exr-cardPaddingRight, ${cardPaddingRight || "1.5rem"})`,
    paddingBottom: `var(--exr-cardPaddingBottom, ${cardPaddingBottom || "1.25rem"})`,
    paddingLeft: `var(--exr-cardPaddingLeft, ${cardPaddingLeft || "1.5rem"})`,
  };

  return (
    <section className="relative z-10 mx-auto w-[98%] rounded-[25px] px-6 py-20 text-black md:px-12 md:py-24" style={{ background: sectionBackground || "#fff" }}>
      <GoogleFontLink family={titleFontFamily} />
      <GoogleFontLink family={questionFontFamily} />
      <GoogleFontLink family={answerFontFamily} />
      <style dangerouslySetInnerHTML={{ __html: `.${questionHoverClassName}:hover{color:${questionHoverValue} !important;}` }} />
      {showMoreHover.hoverCss && <style dangerouslySetInnerHTML={{ __html: showMoreHover.hoverCss }} />}
      {cardHover.hoverCss && <style dangerouslySetInnerHTML={{ __html: cardHover.hoverCss }} />}
      <div ref={ref} className="mx-auto max-w-3xl">
        <h2 data-reveal className="text-center" style={titleStyle}>
          {title}
        </h2>

        <div className="mt-12 flex flex-col gap-4">
          {visibleFaqs.map((faq, i) => (
            <FaqItem
              key={faq.question}
              faq={faq}
              open={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              cardStyle={cardStyle}
              cardHoverClassName={cardHover.hoverClassName}
              questionStyle={questionStyle}
              questionHoverClassName={questionHoverClassName}
              answerStyle={answerStyle}
              chevronColorValue={chevronColorValue}
            />
          ))}
        </div>

        {hasMore && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => {
                // Collapsing back to the first `limit` items after having
                // opened one further down would leave an invisible
                // accordion item stuck "open" with no card on screen to
                // show it — reset back to the first item instead so
                // re-expanding never lands on a confusing empty state.
                if (showAll && openIndex !== null && openIndex >= limit) setOpenIndex(0);
                setShowAll((s) => !s);
              }}
              className={`transition-all ${showMoreHover.hoverClassName}`}
              style={{
                background: `var(--exr-showMoreBackground, ${showMoreBackground || "#2563ff"})`,
                color: `var(--exr-showMoreColor, ${showMoreColor || "#171717"})`,
                borderStyle: showMoreBorderStyle && showMoreBorderStyle !== "none" ? (showMoreBorderStyle as CSSProperties["borderStyle"]) : undefined,
                borderWidth: showMoreBorderStyle && showMoreBorderStyle !== "none" ? showMoreBorderWidth || "1px" : undefined,
                borderColor: showMoreBorderStyle && showMoreBorderStyle !== "none" ? showMoreBorderColor : undefined,
                borderRadius: `var(--exr-showMoreBorderRadius, ${showMoreBorderRadius || "999px"})`,
                boxShadow: showMoreBoxShadow || undefined,
                paddingTop: showMorePaddingTop || showMorePaddingV || "12px",
                paddingRight: showMorePaddingRight || showMorePaddingH || "28px",
                paddingBottom: showMorePaddingBottom || showMorePaddingV || "12px",
                paddingLeft: showMorePaddingLeft || showMorePaddingH || "28px",
                marginTop: showMoreMarginTop,
                marginRight: showMoreMarginRight,
                marginBottom: showMoreMarginBottom,
                marginLeft: showMoreMarginLeft,
                ...showMoreStyle,
                ...showMoreHover.restingStyle,
              }}
            >
              {showAll ? showLessLabel || "See Less" : showMoreLabel || "See More"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function FaqItem({
  faq,
  open,
  onToggle,
  cardStyle,
  cardHoverClassName,
  questionStyle,
  questionHoverClassName,
  answerStyle,
  chevronColorValue,
}: {
  faq: { question: string; answer: string };
  open: boolean;
  onToggle: () => void;
  cardStyle: CSSProperties;
  cardHoverClassName: string;
  questionStyle: CSSProperties;
  questionHoverClassName: string;
  answerStyle: CSSProperties;
  chevronColorValue: string;
}) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const chevronWrapRef = useRef<HTMLSpanElement | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    const body = bodyRef.current;
    const chevron = chevronWrapRef.current;
    if (!body) return;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      gsap.set(body, { height: open ? "auto" : 0 });
      if (chevron) gsap.set(chevron, { rotate: open ? 180 : 0 });
      return;
    }

    gsap.to(body, { height: open ? body.scrollHeight : 0, duration: 0.35, ease: "power2.inOut" });
    if (chevron) gsap.to(chevron, { rotate: open ? 180 : 0, duration: 0.3, ease: "power2.inOut" });
  }, [open]);

  return (
    <div data-reveal className={`transition-all ${cardHoverClassName}`} style={cardStyle}>
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-4 text-left">
        <span className={questionHoverClassName} style={questionStyle}>
          {faq.question}
        </span>
        <span ref={chevronWrapRef} className="inline-flex shrink-0" style={{ color: chevronColorValue }}>
          <IconChevron className="h-4 w-4" />
        </span>
      </button>
      <div ref={bodyRef} className="overflow-hidden" style={{ height: open ? undefined : 0 }}>
        <div className="pt-3 [&_a]:underline [&_a]:hover:text-gold" style={answerStyle} dangerouslySetInnerHTML={{ __html: faq.answer }} />
      </div>
    </div>
  );
}
