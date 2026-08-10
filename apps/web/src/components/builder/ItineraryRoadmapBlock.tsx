"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { GoogleFontLink } from "@/components/builder/GoogleFontLink";
import { buildButtonHoverStyle } from "@/components/builder/buttonHoverStyle";
import type { ItineraryRoadmapItem } from "@marwa/builder";

/**
 * A winding-road "trip timeline" — a top-down vehicle travels along an SVG
 * path as the visitor scrolls, with a card per stop alternating left/right
 * (see registry.ts's doc comment for the one-off homepage section/demo
 * route this generalizes). Fully reusable: multiple instances on one page
 * each get their own car/path/cards, located via `data-itinerary-*`
 * attributes scoped under this block's own root rather than global ids —
 * the old singleton version (MotionPathScrollBinder.tsx) hardcoded
 * `#road-path`/`#car-element`, which only ever worked for exactly one
 * instance per page.
 *
 * `triggerMode: "timeline"` opts OUT of this component's own scroll
 * binding entirely, on the assumption something else (this node's own
 * `animations`/`timeline` — see AnimationTimelineEditor) will drive it
 * instead. Note that neither of those systems can make an element follow
 * an arbitrary SVG path the way GSAP's MotionPathPlugin does (they animate
 * x/y/scale/rotate/opacity/CSS vars/clip-path, not path-following) — in
 * "timeline" mode the vehicle simply stays at the path's start until
 * something animates it some other way. Not a gap this block attempts to
 * paper over.
 */
export function ItineraryRoadmapBlock({
  subtitle,
  title,
  items,
  vehicleImage,
  vehicleWidth,
  roadPathSvg,
  roadColor,
  roadWidth,
  dashColor,
  dashWidth,
  dashLength,
  dashGap,
  glowActiveCard,
  glowColor,
  inactiveOpacity,
  triggerMode,
  sectionBackground,
  sectionBackgroundImage,
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
  timeColor,
  timeFontFamily,
  timeFontSize,
  timeFontWeight,
  timeTextTransform,
  timeFontStyle,
  timeTextDecoration,
  timeLineHeight,
  timeLetterSpacing,
  timeWordSpacing,
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
  cardWidth,
  cardBackground,
  cardBorderRadius,
  cardHoverBackground,
  cardHoverBorderColor,
  cardHoverBoxShadow,
  cardHoverScale,
  cardPadding,
  containerMaxWidth,
  headerMarginBottom,
  containerPaddingTop,
  containerPaddingRight,
  containerPaddingBottom,
  containerPaddingLeft,
}: {
  subtitle?: string;
  title?: string;
  items: ItineraryRoadmapItem[];
  vehicleImage?: string;
  vehicleWidth?: number;
  roadPathSvg: string;
  roadColor?: string;
  roadWidth?: string;
  dashColor?: string;
  dashWidth?: string;
  dashLength?: string;
  dashGap?: string;
  glowActiveCard?: boolean;
  glowColor?: string;
  inactiveOpacity?: string;
  triggerMode?: "scroll" | "timeline";
  sectionBackground?: string;
  sectionBackgroundImage?: string;
  subtitleColor?: string;
  subtitleFontFamily?: string;
  subtitleFontSize?: string;
  subtitleFontWeight?: string;
  subtitleTextTransform?: string;
  subtitleFontStyle?: string;
  subtitleTextDecoration?: string;
  subtitleLineHeight?: string;
  subtitleLetterSpacing?: string;
  subtitleWordSpacing?: string;
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
  timeColor?: string;
  timeFontFamily?: string;
  timeFontSize?: string;
  timeFontWeight?: string;
  timeTextTransform?: string;
  timeFontStyle?: string;
  timeTextDecoration?: string;
  timeLineHeight?: string;
  timeLetterSpacing?: string;
  timeWordSpacing?: string;
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
  cardWidth?: string;
  cardBackground?: string;
  cardBorderRadius?: string;
  cardHoverBackground?: string;
  cardHoverBorderColor?: string;
  cardHoverBoxShadow?: string;
  cardHoverScale?: string;
  cardPadding?: string;
  containerMaxWidth?: string;
  headerMarginBottom?: string;
  containerPaddingTop?: string;
  containerPaddingRight?: string;
  containerPaddingBottom?: string;
  containerPaddingLeft?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  // Always rendered (CSS media-query controls which of the two — winding
  // SVG road vs. straight mobile line — is actually visible), so its top%
  // can be driven by the same scroll-linked onUpdate below regardless of
  // viewport. Cheaper and simpler than detecting the breakpoint in JS and
  // switching which element MotionPathPlugin targets.
  const mobileCarRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  // Scopes the mobile-breakpoint <style> below to just this instance — two
  // ItineraryRoadmap blocks on the same page must not share one global
  // class name (see Faq.tsx's hashString for the same problem solved a
  // different way; useId is the more direct tool here since there's no
  // single instance-varying value to hash).
  const scopeId = useId().replace(/:/g, "");

  useEffect(() => {
    if (triggerMode === "timeline") return;
    const root = rootRef.current;
    if (!root) return;
    const car = root.querySelector<SVGImageElement>("[data-itinerary-car]");
    const path = root.querySelector<SVGPathElement>("[data-itinerary-path]");
    if (!car || !path) return;

    let cancelled = false;
    let ctx: ReturnType<typeof import("gsap").gsap.context> | null = null;

    (async () => {
      const [{ gsap }, { ScrollTrigger }, { MotionPathPlugin }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
        import("gsap/MotionPathPlugin"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

      ctx = gsap.context(() => {
        gsap.set(car, { motionPath: { path, align: path, alignOrigin: [0.5, 0.5], autoRotate: true, start: 0, end: 0 } });
        if (mobileCarRef.current) gsap.set(mobileCarRef.current, { top: "0%" });
        gsap.to(car, {
          motionPath: { path, align: path, alignOrigin: [0.5, 0.5], autoRotate: true, start: 0, end: 1 },
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top center",
            end: "bottom center",
            scrub: 0.5,
            onUpdate: (self) => {
              if (mobileCarRef.current) gsap.set(mobileCarRef.current, { top: `${self.progress * 100}%` });
              if (items.length === 0) return;
              setActiveIndex(Math.min(items.length - 1, Math.floor(self.progress * items.length)));
            },
          },
        });
      }, root);
    })();

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [items.length, triggerMode]);

  const width = vehicleWidth || 80;

  const subtitleStyle: CSSProperties = {
    color: `var(--exr-subtitleColor, ${subtitleColor || "#2563ff"})`,
    fontFamily: subtitleFontFamily && subtitleFontFamily !== "inherit" ? subtitleFontFamily : undefined,
    fontSize: `var(--exr-subtitleFontSize, ${subtitleFontSize || "13px"})`,
    fontWeight: `var(--exr-subtitleFontWeight, ${subtitleFontWeight || "700"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-subtitleTextTransform, ${subtitleTextTransform || "uppercase"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-subtitleFontStyle, ${subtitleFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-subtitleTextDecoration, ${subtitleTextDecoration || "none"})`,
    lineHeight: `var(--exr-subtitleLineHeight, ${subtitleLineHeight || "normal"})`,
    letterSpacing: `var(--exr-subtitleLetterSpacing, ${subtitleLetterSpacing || "0.25em"})`,
    wordSpacing: `var(--exr-subtitleWordSpacing, ${subtitleWordSpacing || "normal"})`,
    marginBottom: "10px",
  };

  const titleStyle: CSSProperties = {
    color: `var(--exr-titleColor, ${titleColor || "#000"})`,
    fontFamily: titleFontFamily && titleFontFamily !== "inherit" ? titleFontFamily : undefined,
    fontSize: `var(--exr-titleFontSize, ${titleFontSize || "36px"})`,
    fontWeight: `var(--exr-titleFontWeight, ${titleFontWeight || "900"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-titleTextTransform, ${titleTextTransform || "none"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-titleFontStyle, ${titleFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-titleTextDecoration, ${titleTextDecoration || "none"})`,
    lineHeight: `var(--exr-titleLineHeight, ${titleLineHeight || "1.1"})`,
    letterSpacing: `var(--exr-titleLetterSpacing, ${titleLetterSpacing || "-0.02em"})`,
    wordSpacing: `var(--exr-titleWordSpacing, ${titleWordSpacing || "normal"})`,
    margin: 0,
  };

  const timeStyle: CSSProperties = {
    color: `var(--exr-timeColor, ${timeColor || "#2563ff"})`,
    fontFamily: timeFontFamily && timeFontFamily !== "inherit" ? timeFontFamily : undefined,
    fontSize: `var(--exr-timeFontSize, ${timeFontSize || "14px"})`,
    fontWeight: `var(--exr-timeFontWeight, ${timeFontWeight || "700"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-timeTextTransform, ${timeTextTransform || "none"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-timeFontStyle, ${timeFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-timeTextDecoration, ${timeTextDecoration || "none"})`,
    lineHeight: `var(--exr-timeLineHeight, ${timeLineHeight || "normal"})`,
    letterSpacing: `var(--exr-timeLetterSpacing, ${timeLetterSpacing || "normal"})`,
    wordSpacing: `var(--exr-timeWordSpacing, ${timeWordSpacing || "normal"})`,
    marginBottom: "6px",
  };

  const headingStyle: CSSProperties = {
    color: `var(--exr-headingColor, ${headingColor || "#111"})`,
    fontFamily: headingFontFamily && headingFontFamily !== "inherit" ? headingFontFamily : undefined,
    fontSize: `var(--exr-headingFontSize, ${headingFontSize || "18px"})`,
    fontWeight: `var(--exr-headingFontWeight, ${headingFontWeight || "800"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-headingTextTransform, ${headingTextTransform || "none"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-headingFontStyle, ${headingFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-headingTextDecoration, ${headingTextDecoration || "none"})`,
    lineHeight: `var(--exr-headingLineHeight, ${headingLineHeight || "1.2"})`,
    letterSpacing: `var(--exr-headingLetterSpacing, ${headingLetterSpacing || "normal"})`,
    wordSpacing: `var(--exr-headingWordSpacing, ${headingWordSpacing || "normal"})`,
    marginBottom: "8px",
  };

  const descStyle: CSSProperties = {
    color: `var(--exr-descColor, ${descColor || "#666"})`,
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

  return (
    <div
      ref={rootRef}
      className={`itinerary-roadmap-${scopeId}`}
      data-itinerary-trigger={triggerMode === "timeline" ? "timeline" : undefined}
      style={{
        position: "relative",
        background: sectionBackground ? `var(--exr-sectionBackground, ${sectionBackground})` : undefined,
        backgroundImage: sectionBackgroundImage ? `var(--exr-sectionBackgroundImage, url(${resolveImageUrl(sectionBackgroundImage)}))` : undefined,
        backgroundSize: sectionBackgroundImage ? "cover" : undefined,
        backgroundPosition: sectionBackgroundImage ? "center" : undefined,
        backgroundRepeat: sectionBackgroundImage ? "no-repeat" : undefined,
        paddingTop: `var(--exr-containerPaddingTop, ${containerPaddingTop || "80px"})`,
        paddingRight: `var(--exr-containerPaddingRight, ${containerPaddingRight || "24px"})`,
        paddingBottom: `var(--exr-containerPaddingBottom, ${containerPaddingBottom || "80px"})`,
        paddingLeft: `var(--exr-containerPaddingLeft, ${containerPaddingLeft || "24px"})`,
      }}
    >
      <GoogleFontLink family={subtitleFontFamily} />
      <GoogleFontLink family={titleFontFamily} />
      <GoogleFontLink family={timeFontFamily} />
      <GoogleFontLink family={headingFontFamily} />
      <GoogleFontLink family={descFontFamily} />

      {(subtitle || title) && (
        <div style={{ textAlign: "center", marginBottom: `var(--exr-headerMarginBottom, ${headerMarginBottom || "64px"})` }}>
          {subtitle && <div style={subtitleStyle}>{subtitle}</div>}
          {title && <h2 style={titleStyle}>{title}</h2>}
        </div>
      )}

      <div
        className="itinerary-road-wrap"
        style={{
          position: "relative",
          maxWidth: `var(--exr-containerMaxWidth, ${containerMaxWidth || "900px"})`,
          margin: "0 auto",
          minHeight: "900px",
        }}
      >
        <svg
          className="itinerary-road-svg"
          viewBox="0 0 800 800"
          style={{ width: "100%", height: "auto", overflow: "visible", display: "block", position: "absolute", top: 0, left: 0 }}
        >
          <path
            data-itinerary-path=""
            d={roadPathSvg}
            fill="none"
            strokeLinecap="round"
            style={{
              stroke: `var(--exr-roadColor, ${roadColor || "#e4e4e7"})`,
              strokeWidth: `var(--exr-roadWidth, ${roadWidth || "48"})`,
            }}
          />
          <path
            d={roadPathSvg}
            fill="none"
            strokeLinecap="round"
            style={{
              stroke: `var(--exr-dashColor, ${dashColor || "#ffffff"})`,
              strokeWidth: `var(--exr-dashWidth, ${dashWidth || "6"})`,
              strokeDasharray: `var(--exr-dashLength, ${dashLength || "24"}) var(--exr-dashGap, ${dashGap || "16"})`,
            }}
          />
          <image
            data-itinerary-car=""
            href={resolveImageUrl(vehicleImage || "/carsvg.svg")}
            width={width}
            height={width * 0.6875}
            x={-width / 2}
            y={(-width * 0.6875) / 2}
          />
        </svg>

        {/* Mobile-only straight vertical line, replacing the winding road —
            a curved path that bulges toward the container's edges has
            nowhere left to bulge into once cards stop sitting side-by-side
            and drop into a single stacked column (see the media query
            below), so it just overlaps the text instead. Hidden on
            desktop; the media query flips which of this pair is visible. */}
        <div
          className="itinerary-mobile-line"
          style={{
            display: "none",
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "12px",
            width: "4px",
            borderRadius: "2px",
            background: `var(--exr-roadColor, ${roadColor || "#e4e4e7"})`,
            backgroundImage: `linear-gradient(var(--exr-dashColor, ${dashColor || "#ffffff"}) 50%, transparent 50%)`,
            backgroundSize: "4px 20px",
            backgroundRepeat: "repeat-y",
          }}
        />
        <div
          ref={mobileCarRef}
          className="itinerary-mobile-car"
          style={{ display: "none", position: "absolute", left: "12px", top: 0, zIndex: 5, transform: "translate(-50%, -50%) rotate(90deg)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded content, see ImageBox for the same fix */}
          <img src={resolveImageUrl(vehicleImage || "/carsvg.svg")} alt="" style={{ display: "block", width: "28px", height: "auto" }} />
        </div>

        {items.map((item, i) => {
          const isActive = glowActiveCard && activeIndex === i;
          const top = items.length > 1 ? (i / (items.length - 1)) * 90 + 5 : 50;
          // Card Hover Settings — scale composes with (rather than
          // replaces) the card's own permanent translateY(-50%) centering,
          // since a bare hover scale would otherwise snap it out of
          // vertical alignment with its milestone on the road.
          const cardHover = buildButtonHoverStyle(`itin-card-${i}`, {
            background: cardBackground,
            hoverBackground: cardHoverBackground,
            hoverBorderColor: cardHoverBorderColor,
            hoverBoxShadow: cardHoverBoxShadow,
            hoverTransform: cardHoverScale ? `translateY(-50%) scale(${cardHoverScale})` : undefined,
          });
          return (
            <div
              key={i}
              data-itinerary-card=""
              className={cardHover.hoverClassName}
              style={{
                position: "absolute",
                top: `${top}%`,
                [item.position === "right" ? "right" : "left"]: 0,
                // Capped at 29% of the container regardless of the
                // cardWidth setting — DEFAULT_ROAD_PATH_D's lane only
                // leaves roughly 32.5% clear on each side (minus the
                // road's own stroke width), so an uncapped fixed pixel
                // width (the old behavior) could still overlap the road at
                // narrower container widths, and a custom `roadPathSvg`
                // may leave less room than the default. Scaling with the
                // container is also what keeps this from overflowing a
                // narrow viewport instead of just shrinking.
                width: `min(var(--exr-cardWidth, ${cardWidth || "280px"}), 29%)`,
                background: cardBackground ? `var(--exr-cardBackground, ${cardBackground})` : undefined,
                transform: "translateY(-50%)",
                transition: "opacity 0.3s ease, box-shadow 0.3s ease",
                opacity: glowActiveCard && activeIndex !== null && !isActive ? `var(--exr-inactiveOpacity, ${inactiveOpacity || "0.55"})` : 1,
                boxShadow: isActive ? `0 0 32px 6px var(--exr-glowColor, ${glowColor || "rgba(37,99,255,0.28)"})` : "none",
                borderRadius: `var(--exr-cardBorderRadius, ${cardBorderRadius || "12px"})`,
                // Base padding (cardPadding, "0px" by default) plus a fixed
                // 12px inset only while active — the inset expands the
                // card's box so the glow's box-shadow (and the base
                // padding, whatever it is) both paint outward from the same
                // edges rather than the glow starting flush against the
                // text; the matching negative margin below keeps the card's
                // own visible top-left corner anchored in place either way.
                padding: `calc(var(--exr-cardPadding, ${cardPadding || "0px"}) + ${isActive ? "12px" : "0px"})`,
                margin: isActive ? "-12px" : "0",
              }}
            >
              {cardHover.hoverCss && <style dangerouslySetInnerHTML={{ __html: cardHover.hoverCss }} />}
              <div style={timeStyle}>{item.time} –</div>
              <div style={headingStyle}>{item.heading}</div>
              <div style={descStyle}>{item.description}</div>
            </div>
          );
        })}
      </div>

      {/* At <=640px the alternating-sides layout has nowhere left to put a
          card without shrinking it to an unreadable sliver, and a curved
          road that bulges toward the container's edges has nothing left to
          curve around once every card drops into one stacked column — so
          below that width the winding road/car swap for the straight
          itinerary-mobile-line/-car pair above, cards go full-width in
          normal document flow (same top-to-bottom order as desktop), and
          the wrap gets a left gutter so text never sits under the line. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media (max-width: 640px) {
              .itinerary-roadmap-${scopeId} .itinerary-road-svg { display: none !important; }
              .itinerary-roadmap-${scopeId} .itinerary-mobile-line { display: block !important; }
              .itinerary-roadmap-${scopeId} .itinerary-mobile-car { display: block !important; }
              .itinerary-roadmap-${scopeId} .itinerary-road-wrap {
                min-height: 0 !important;
                padding-left: 32px;
              }
              .itinerary-roadmap-${scopeId} [data-itinerary-card] {
                position: static !important;
                width: 100% !important;
                left: auto !important;
                right: auto !important;
                transform: none !important;
                margin: 0 0 28px 0 !important;
                opacity: 1 !important;
                box-shadow: none !important;
              }
              .itinerary-roadmap-${scopeId} [data-itinerary-card]:last-child { margin-bottom: 0 !important; }
            }
          `,
        }}
      />
    </div>
  );
}
