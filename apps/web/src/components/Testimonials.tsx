"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { api, type Review } from "@/lib/api";
import { useScrollReveal } from "./home/useScrollReveal";
import { IconStar } from "./home/icons";
import { LogoGoogle, LogoTrustpilot, LogoTripadvisor } from "./home/icons";
import { GoogleFontLink } from "./builder/GoogleFontLink";
import { buildButtonHoverStyle } from "./builder/buttonHoverStyle";

const PLATFORM_LOGOS: Record<string, typeof LogoGoogle> = {
  google: LogoGoogle,
  trustpilot: LogoTrustpilot,
  tripadvisor: LogoTripadvisor,
};

interface TestimonialPlatform {
  name?: string;
  href?: string;
  rating?: string;
  viewReviewsLabel?: string;
  icon?: string;
}

const DEFAULT_PLATFORMS: TestimonialPlatform[] = [
  { name: "Google", href: "#", rating: "5", viewReviewsLabel: "View Reviews", icon: "google" },
  { name: "Trustpilot", href: "#", rating: "5", viewReviewsLabel: "View Reviews", icon: "trustpilot" },
  { name: "Tripadvisor", href: "#", rating: "5", viewReviewsLabel: "View Reviews", icon: "tripadvisor" },
];

// Gives two Testimonials instances with different ctaHoverBackground values
// on the same page a collision-safe, stable class name for the scoped
// :hover style tag below (inline styles can't express :hover at all).
function hashString(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

export function Testimonials({
  eyebrow = "See what our client has to say",
  title = "Testimonials",
  description = "Discover why clients trust Marwa Digital for premium work and flawless service, project after project.",
  platforms = DEFAULT_PLATFORMS,
  ctaLabel = "Get Started",
  ctaHref = "/contact",
  sectionBackground,
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
  starColor,
  dotColor,
  dotActiveColor,
  platformBackground,
  platformHoverBackground,
  platformBorderColor,
  platformHoverBorderColor,
  platformBorderRadius,
  platformBoxShadow,
  platformHoverBoxShadow,
  platformHoverScale,
  platformStarColor,
  platformNameColor,
  platformNameFontFamily,
  platformNameFontSize,
  platformNameFontWeight,
  platformNameTextTransform,
  platformNameFontStyle,
  platformNameTextDecoration,
  platformNameLineHeight,
  platformNameLetterSpacing,
  platformNameWordSpacing,
  viewReviewsColor,
  viewReviewsFontFamily,
  viewReviewsFontSize,
  viewReviewsFontWeight,
  viewReviewsTextTransform,
  viewReviewsFontStyle,
  viewReviewsTextDecoration,
  viewReviewsLineHeight,
  viewReviewsLetterSpacing,
  viewReviewsWordSpacing,
  ctaBackground,
  ctaColor,
  ctaHoverBackground,
  ctaHoverBorderColor,
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
  platforms?: TestimonialPlatform[];
  ctaLabel?: string;
  ctaHref?: string;
  sectionBackground?: string;
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
  nameColor?: string;
  nameFontFamily?: string;
  nameFontSize?: string;
  nameFontWeight?: string;
  nameTextTransform?: string;
  nameFontStyle?: string;
  nameTextDecoration?: string;
  nameLineHeight?: string;
  nameLetterSpacing?: string;
  nameWordSpacing?: string;
  quoteColor?: string;
  quoteFontFamily?: string;
  quoteFontSize?: string;
  quoteFontWeight?: string;
  quoteTextTransform?: string;
  quoteFontStyle?: string;
  quoteTextDecoration?: string;
  quoteLineHeight?: string;
  quoteLetterSpacing?: string;
  quoteWordSpacing?: string;
  starColor?: string;
  dotColor?: string;
  dotActiveColor?: string;
  platformBackground?: string;
  platformHoverBackground?: string;
  platformBorderColor?: string;
  platformHoverBorderColor?: string;
  platformBorderRadius?: string;
  platformBoxShadow?: string;
  platformHoverBoxShadow?: string;
  platformHoverScale?: string;
  platformStarColor?: string;
  platformNameColor?: string;
  platformNameFontFamily?: string;
  platformNameFontSize?: string;
  platformNameFontWeight?: string;
  platformNameTextTransform?: string;
  platformNameFontStyle?: string;
  platformNameTextDecoration?: string;
  platformNameLineHeight?: string;
  platformNameLetterSpacing?: string;
  platformNameWordSpacing?: string;
  viewReviewsColor?: string;
  viewReviewsFontFamily?: string;
  viewReviewsFontSize?: string;
  viewReviewsFontWeight?: string;
  viewReviewsTextTransform?: string;
  viewReviewsFontStyle?: string;
  viewReviewsTextDecoration?: string;
  viewReviewsLineHeight?: string;
  viewReviewsLetterSpacing?: string;
  viewReviewsWordSpacing?: string;
  ctaBackground?: string;
  ctaColor?: string;
  ctaHoverBackground?: string;
  ctaHoverBorderColor?: string;
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
  const ref = useScrollReveal<HTMLDivElement>();
  const quoteRef = useRef<HTMLDivElement | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    api.getReviews().then(setReviews).catch(() => {});
  }, []);

  function select(i: number) {
    if (i === index) return;
    if (quoteRef.current) {
      gsap.fromTo(quoteRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" });
    }
    setIndex(i);
  }

  const testimonial = reviews[index];

  // Reads every sub-field through var(--exr-{prefix}{Key}, {desktop value})
  // instead of the raw prop — the wrapper mints that custom property from
  // this same prop at desktop and overrides it inside a tablet/mobile media
  // query when the admin sets a per-breakpoint value in the panel. Same
  // pattern as Services.tsx/TrustHighlights.tsx's typographyVars().
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
      // Falls back to a real size, not "inherit" — set inline, which always
      // wins over the element's own Tailwind text-* class regardless of
      // specificity, so "inherit" here would silently collapse the text to
      // the ambient body size instead of the intended default.
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

  const eyebrowStyle = typographyVars(
    "eyebrow",
    { color: eyebrowColor, fontFamily: eyebrowFontFamily, fontSize: eyebrowFontSize, fontWeight: eyebrowFontWeight, textTransform: eyebrowTextTransform, fontStyle: eyebrowFontStyle, textDecoration: eyebrowTextDecoration, lineHeight: eyebrowLineHeight, letterSpacing: eyebrowLetterSpacing, wordSpacing: eyebrowWordSpacing },
    { color: "#2563FF", fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.3em", lineHeight: "inherit" }
  );

  const titleStyle = typographyVars(
    "title",
    { color: titleColor, fontFamily: titleFontFamily, fontSize: titleFontSize, fontWeight: titleFontWeight, textTransform: titleTextTransform, fontStyle: titleFontStyle, textDecoration: titleTextDecoration, lineHeight: titleLineHeight, letterSpacing: titleLetterSpacing, wordSpacing: titleWordSpacing },
    { color: "#000", fontSize: "clamp(2.25rem, 5vw, 3rem)", fontWeight: "800", textTransform: "uppercase", letterSpacing: "inherit", lineHeight: "inherit" }
  );

  const descStyle = typographyVars(
    "desc",
    { color: descColor, fontFamily: descFontFamily, fontSize: descFontSize, fontWeight: descFontWeight, textTransform: descTextTransform, fontStyle: descFontStyle, textDecoration: descTextDecoration, lineHeight: descLineHeight, letterSpacing: descLetterSpacing, wordSpacing: descWordSpacing },
    { color: "rgb(107,114,128)", fontSize: "0.875rem", fontWeight: "400", textTransform: "uppercase", letterSpacing: "0.02em", lineHeight: "inherit" }
  );

  const nameStyle = typographyVars(
    "name",
    { color: nameColor, fontFamily: nameFontFamily, fontSize: nameFontSize, fontWeight: nameFontWeight, textTransform: nameTextTransform, fontStyle: nameFontStyle, textDecoration: nameTextDecoration, lineHeight: nameLineHeight, letterSpacing: nameLetterSpacing, wordSpacing: nameWordSpacing },
    { color: "#000", fontSize: "1.5rem", fontWeight: "400", textTransform: "none", letterSpacing: "inherit", lineHeight: "inherit" }
  );

  const quoteStyle = typographyVars(
    "quote",
    { color: quoteColor, fontFamily: quoteFontFamily, fontSize: quoteFontSize, fontWeight: quoteFontWeight, textTransform: quoteTextTransform, fontStyle: quoteFontStyle, textDecoration: quoteTextDecoration, lineHeight: quoteLineHeight, letterSpacing: quoteLetterSpacing, wordSpacing: quoteWordSpacing },
    { color: "rgb(107,114,128)", fontSize: "1rem", fontWeight: "400", textTransform: "none", letterSpacing: "inherit", lineHeight: "inherit" }
  );

  const platformNameStyle = typographyVars(
    "platformName",
    { color: platformNameColor, fontFamily: platformNameFontFamily, fontSize: platformNameFontSize, fontWeight: platformNameFontWeight, textTransform: platformNameTextTransform, fontStyle: platformNameFontStyle, textDecoration: platformNameTextDecoration, lineHeight: platformNameLineHeight, letterSpacing: platformNameLetterSpacing, wordSpacing: platformNameWordSpacing },
    { color: "#000", fontSize: "1.125rem", fontWeight: "700", textTransform: "none", letterSpacing: "inherit", lineHeight: "inherit" }
  );

  const viewReviewsStyle = typographyVars(
    "viewReviews",
    { color: viewReviewsColor, fontFamily: viewReviewsFontFamily, fontSize: viewReviewsFontSize, fontWeight: viewReviewsFontWeight, textTransform: viewReviewsTextTransform, fontStyle: viewReviewsFontStyle, textDecoration: viewReviewsTextDecoration, lineHeight: viewReviewsLineHeight, letterSpacing: viewReviewsLetterSpacing, wordSpacing: viewReviewsWordSpacing },
    { color: "rgb(156,163,175)", fontSize: "0.75rem", fontWeight: "400", textTransform: "none", letterSpacing: "inherit", lineHeight: "inherit" }
  );

  const ctaStyle = typographyVars(
    "cta",
    { fontFamily: ctaFontFamily, fontSize: ctaFontSize, fontWeight: ctaFontWeight, textTransform: ctaTextTransform, fontStyle: ctaFontStyle, textDecoration: ctaTextDecoration, lineHeight: ctaLineHeight, letterSpacing: ctaLetterSpacing, wordSpacing: ctaWordSpacing },
    { fontSize: "12px", fontWeight: "400", textTransform: "none", letterSpacing: "inherit", lineHeight: "inherit" }
  );

  // The base background is set inline (so admin-picked colors + the
  // --exr-ctaBackground responsive var both work), which means a plain
  // Tailwind `hover:bg-*` class can never win — inline styles always beat
  // stylesheet rules regardless of :hover. So the hover color is always
  // applied via this scoped-class technique, with a sensible default when
  // the admin hasn't customized it.
  const ctaHover = buildButtonHoverStyle("testimonials-cta", {
    background: ctaBackground || "#2563FF",
    // Preserves the exact pre-existing default (a hardcoded darker-gold
    // hover even when the admin never touched ctaHoverBackground).
    hoverBackground: ctaHoverBackground || "#1d4fd8",
    hoverColor: ctaHoverColor,
    hoverBorderColor: ctaHoverBorderColor,
    hoverBoxShadow: ctaHoverBoxShadow,
    hoverBackgroundSize: ctaHoverBackgroundSize,
    hoverBackgroundPosition: ctaHoverBackgroundPosition,
    hoverTransitionDuration: ctaHoverTransitionDuration,
  });
  const ctaHoverClassName = ctaHover.hoverClassName;
  const ctaBackgroundValue = `var(--exr-ctaBackground, ${ctaBackground || "#2563FF"})`;

  const starColorValue = `var(--exr-starColor, ${starColor || "#2563FF"})`;
  const dotColorValue = `var(--exr-dotColor, ${dotColor || "rgba(0,0,0,0.1)"})`;
  const dotActiveColorValue = `var(--exr-dotActiveColor, ${dotActiveColor || "#2563FF"})`;
  const platformStarColorValue = `var(--exr-platformStarColor, ${platformStarColor || "#2563FF"})`;

  // The platform cards render as one bordered/rounded group with thin
  // dividers between columns (matching the reference design) rather than
  // three separately-boxed cards, so the divider color needs the same
  // scoped-<style>-tag technique as the CTA hover above (a plain
  // Tailwind divide-* class can't take an admin-picked var() color).
  const platformDividerValue = `var(--exr-platformBorderColor, ${platformBorderColor || "rgb(243,244,246)"})`;
  const platformDividerClassName = `testimonials-plat-d${hashString(platformDividerValue)}`;

  // Each platform card's own Card Hover Settings — same scoped-class
  // technique as ctaHoverClassName above, since the base background is also
  // set inline (var(--exr-platformBackground, ...) on the shared row) and
  // would otherwise always beat a plain Tailwind hover:bg-* class regardless
  // of :hover. Applied per-card (not on the shared row) so hovering one
  // platform only highlights that card, not the whole group.
  const platformHover = buildButtonHoverStyle("testimonials-plat", {
    background: platformBackground,
    hoverBackground: platformHoverBackground || "rgba(37,99,255,0.08)",
    hoverBorderColor: platformHoverBorderColor,
    hoverBoxShadow: platformHoverBoxShadow,
    hoverTransform: platformHoverScale ? `scale(${platformHoverScale})` : undefined,
  });

  return (
    <section className="relative z-10 mx-auto w-[98%] overflow-hidden rounded-[25px] text-black" style={{ background: sectionBackground || "#fff" }}>
      <GoogleFontLink family={eyebrowFontFamily} />
      <GoogleFontLink family={titleFontFamily} />
      <GoogleFontLink family={descFontFamily} />
      <GoogleFontLink family={nameFontFamily} />
      <GoogleFontLink family={quoteFontFamily} />
      <GoogleFontLink family={platformNameFontFamily} />
      <GoogleFontLink family={viewReviewsFontFamily} />
      <GoogleFontLink family={ctaFontFamily} />

      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full text-black/[0.06]"
        viewBox="0 0 1200 700"
        fill="none"
        preserveAspectRatio="none"
      >
        <path d="M-50 120 C 220 40, 480 200, 760 110 S 1150 60, 1300 140" stroke="currentColor" strokeWidth="1.5" />
        <path d="M-50 250 C 250 320, 500 160, 800 230 S 1150 300, 1300 220" stroke="currentColor" strokeWidth="1.5" />
        <path d="M-50 580 C 240 660, 520 500, 820 570 S 1150 640, 1300 560" stroke="currentColor" strokeWidth="1.5" />
      </svg>

      <div ref={ref} className="relative mx-auto max-w-3xl px-6 py-20 text-center md:px-12 md:py-24">
        <p data-reveal style={eyebrowStyle}>
          {eyebrow}
        </p>
        <h2 data-reveal className="mt-2" style={titleStyle}>
          {title}
        </h2>
        {description && (
          <p data-reveal className="mx-auto mt-3 max-w-xl" style={descStyle}>
            {description}
          </p>
        )}

        {testimonial && (
          <>
            <div ref={quoteRef} className="mt-8">
              <p style={nameStyle}>{testimonial.customerName}</p>
              <p className="mx-auto mt-4 max-w-xl" style={quoteStyle}>
                {testimonial.quote}
              </p>
              <div className="mt-4 flex justify-center gap-1" style={{ color: starColorValue }}>
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <IconStar key={i} className="h-5 w-5" />
                ))}
              </div>
            </div>

            <div className="mt-5 flex justify-center gap-2">
              {reviews.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Show testimonial ${i + 1}`}
                  onClick={() => select(i)}
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: i === index ? "24px" : "8px",
                    background: i === index ? dotActiveColorValue : dotColorValue,
                  }}
                />
              ))}
            </div>
          </>
        )}

        <style
          dangerouslySetInnerHTML={{
            __html: `
              .${platformDividerClassName} > * + * { border-top: 1px solid ${platformDividerValue}; }
              @media (min-width: 640px) {
                .${platformDividerClassName} > * + * { border-top: none; border-left: 1px solid ${platformDividerValue}; }
              }
            `,
          }}
        />
        {platformHover.hoverCss && <style dangerouslySetInnerHTML={{ __html: platformHover.hoverCss }} />}
        <div
          data-reveal
          className={`mt-10 flex flex-col overflow-hidden sm:flex-row ${platformDividerClassName}`}
          style={{
            background: `var(--exr-platformBackground, ${platformBackground || "transparent"})`,
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: platformDividerValue,
            borderRadius: `var(--exr-platformBorderRadius, ${platformBorderRadius || "1rem"})`,
            boxShadow: `var(--exr-platformBoxShadow, ${platformBoxShadow || "0 8px 30px rgba(0,0,0,0.06)"})`,
          }}
        >
          {platforms.map((platform, i) => {
            const Logo = PLATFORM_LOGOS[platform.icon || "google"] || LogoGoogle;
            const rating = Math.max(0, Math.min(5, Number(platform.rating) || 0));
            return (
              <a
                key={`${platform.name}-${i}`}
                href={platform.href || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex flex-1 cursor-pointer flex-col items-center gap-2 px-6 py-8 transition-all duration-300 ${platformHoverScale ? "" : "hover:-translate-y-1"} ${platformHover.hoverClassName}`}
              >
                <div className="flex items-center gap-2">
                  <Logo className="h-7 w-7 transition-transform duration-300 group-hover:scale-110" />
                  <span style={platformNameStyle}>{platform.name}</span>
                </div>
                <div className="flex gap-0.5" style={{ color: platformStarColorValue }}>
                  {Array.from({ length: rating }).map((_, i) => (
                    <IconStar key={i} className="h-4 w-4" />
                  ))}
                </div>
                <span className="transition-colors group-hover:text-gold" style={viewReviewsStyle}>
                  {platform.viewReviewsLabel || "View Reviews"}
                </span>
              </a>
            );
          })}
        </div>

        {ctaHover.hoverCss && <style dangerouslySetInnerHTML={{ __html: ctaHover.hoverCss }} />}
        <div className="mt-8 flex justify-center">
          <a
            data-reveal
            href={ctaHref}
            className={`inline-block rounded-full px-7 py-3 transition-colors ${ctaHoverClassName}`}
            style={{
              background: ctaBackgroundValue,
              color: `var(--exr-ctaColor, ${ctaColor || "#000"})`,
              borderStyle: ctaBorderStyle && ctaBorderStyle !== "none" ? ctaBorderStyle : undefined,
              borderWidth: ctaBorderStyle && ctaBorderStyle !== "none" ? ctaBorderWidth || "1px" : undefined,
              borderColor: ctaBorderStyle && ctaBorderStyle !== "none" ? ctaBorderColor : undefined,
              borderRadius: ctaBorderRadius ? `var(--exr-ctaBorderRadius, ${ctaBorderRadius})` : undefined,
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
