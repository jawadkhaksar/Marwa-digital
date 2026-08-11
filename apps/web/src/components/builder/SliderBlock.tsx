"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import type { SliderSlide } from "@marwa/builder";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { hashString, ArrowButton, Dots } from "@/components/builder/carouselPrimitives";

function SlideCard({
  slide,
  isActive = true,
  aspectRatio,
  contentAlign,
  contentSize,
  color,
  background,
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
}: {
  slide: SliderSlide;
  isActive?: boolean;
  aspectRatio?: string;
  contentAlign?: "left" | "center" | "right";
  contentSize?: "default" | "hero";
  color?: string;
  background?: string;
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
}) {
  const hasOverlay = slide.heading || slide.subheading || slide.buttonLabel || slide.buttonLabel2;
  const isHero = contentSize === "hero";
  // Where the caption sits in the frame. Centre keeps the original
  // behaviour; left/right pull the copy to one side and cap its width, so a
  // hero slide's text clears the artwork's focal point instead of sitting
  // on top of it.
  const alignClass =
    contentAlign === "left"
      ? "items-start text-left"
      : contentAlign === "right"
        ? "items-end text-right"
        : "items-center text-center";
  const clamp = (lines: number): CSSProperties =>
    isHero ? {} : { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical" };
  const enter = (delayMs: number): CSSProperties =>
    isHero
      ? {
          opacity: isActive ? 1 : 0,
          transform: isActive ? "translateY(0)" : "translateY(26px)",
          transition: `opacity .7s cubic-bezier(.22,1,.36,1) ${delayMs}ms, transform .7s cubic-bezier(.22,1,.36,1) ${delayMs}ms`,
        }
      : {};
  const cardStyle: CSSProperties = {
    aspectRatio: aspectRatio || "16/9",
    borderTopLeftRadius: borderRadiusTopLeft || borderRadius || "12px",
    borderTopRightRadius: borderRadiusTopRight || borderRadius || "12px",
    borderBottomRightRadius: borderRadiusBottomRight || borderRadius || "12px",
    borderBottomLeftRadius: borderRadiusBottomLeft || borderRadius || "12px",
    boxShadow: boxShadow || undefined,
    borderStyle: borderStyle && borderStyle !== "none" ? borderStyle : undefined,
    borderTopWidth: borderStyle && borderStyle !== "none" ? (borderWidthTop || borderWidth || "1px") : undefined,
    borderRightWidth: borderStyle && borderStyle !== "none" ? (borderWidthRight || borderWidth || "1px") : undefined,
    borderBottomWidth: borderStyle && borderStyle !== "none" ? (borderWidthBottom || borderWidth || "1px") : undefined,
    borderLeftWidth: borderStyle && borderStyle !== "none" ? (borderWidthLeft || borderWidth || "1px") : undefined,
    borderColor: borderStyle && borderStyle !== "none" ? borderColor || undefined : undefined,
  };
  return (
    <div className="relative w-full overflow-hidden" style={cardStyle}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={resolveImageUrl(slide.image)} alt={slide.heading || ""} className="h-full w-full object-cover" />
      {hasOverlay && (
        <div
          className={`absolute inset-0 flex flex-col justify-center overflow-hidden ${alignClass} ${
            isHero ? "gap-5 px-8 py-10 md:px-16 lg:px-24" : "gap-2 px-6 py-4"
          }`}
          style={{ background: background || "rgba(0,0,0,0.35)", color: color || "#fff" }}
        >
          {slide.heading && (
            <h2
              className={`overflow-hidden text-ellipsis font-extrabold leading-[1.08] tracking-tight ${
                isHero ? "max-w-2xl text-3xl md:text-5xl lg:text-6xl" : "w-full text-xl md:text-3xl"
              }`}
              style={{ ...clamp(2), ...enter(120) }}
            >
              {slide.heading}
            </h2>
          )}
          {slide.subheading && (
            <p
              className={`overflow-hidden text-ellipsis opacity-90 ${
                isHero ? "max-w-xl text-sm leading-relaxed md:text-base lg:text-lg" : "w-full max-w-xl text-xs md:text-sm"
              }`}
              style={{ ...clamp(3), ...enter(240) }}
            >
              {slide.subheading}
            </p>
          )}
          {(slide.buttonLabel || slide.buttonLabel2) && (
            <div className={`flex flex-wrap gap-3 ${contentAlign === "right" ? "justify-end" : contentAlign === "left" ? "justify-start" : "justify-center"}`} style={enter(360)}>
              {slide.buttonLabel && slide.buttonUrl && (
                <a
                  href={slide.buttonUrl}
                  className={`shrink-0 rounded-full bg-gold font-semibold text-white transition hover:bg-gold-dark ${
                    isHero ? "px-8 py-3.5 text-sm md:text-base" : "mt-1 px-5 py-2 text-xs md:text-sm"
                  }`}
                >
                  {slide.buttonLabel}
                </a>
              )}
              {slide.buttonLabel2 && slide.buttonUrl2 && (
                <a
                  href={slide.buttonUrl2}
                  className={`shrink-0 rounded-full border border-white/45 font-semibold text-white backdrop-blur-sm transition hover:border-white hover:bg-white/15 ${
                    isHero ? "px-8 py-3.5 text-sm md:text-base" : "mt-1 px-5 py-2 text-xs md:text-sm"
                  }`}
                >
                  {slide.buttonLabel2}
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SliderProps {
  slides: SliderSlide[];
  itemsDesktop?: number;
  itemsTablet?: number;
  itemsMobile?: number;
  gap?: string;
  aspectRatio?: string;
  autoplay?: boolean;
  autoplaySpeed?: number;
  loop?: boolean;
  showArrows?: boolean;
  showDots?: boolean;
  pauseOnHover?: boolean;
  transition?: "slide" | "fade";
  arrowStyle?: "circle" | "square" | "minimal";
  dotStyle?: "dots" | "lines" | "numbers";
  contentAlign?: "left" | "center" | "right";
  contentSize?: "default" | "hero";
  color?: string;
  background?: string;
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
  arrowColor?: string;
  arrowBackground?: string;
  arrowHoverColor?: string;
  arrowHoverBackground?: string;
  dotColor?: string;
  dotActiveColor?: string;
  dotHoverColor?: string;
}

export function SliderBlock({
  slides,
  itemsDesktop = 1,
  itemsTablet = 1,
  itemsMobile = 1,
  gap = "16px",
  aspectRatio = "16/9",
  autoplay = true,
  autoplaySpeed = 4000,
  loop = true,
  showArrows = true,
  showDots = true,
  pauseOnHover = true,
  transition = "slide",
  arrowStyle = "circle",
  dotStyle = "dots",
  contentAlign = "center",
  contentSize = "default",
  color,
  background,
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
  arrowColor,
  arrowBackground,
  arrowHoverColor,
  arrowHoverBackground,
  dotColor,
  dotActiveColor,
  dotHoverColor,
}: SliderProps) {
  const scopedClass = `sl-${hashString(`${itemsDesktop}|${itemsTablet}|${itemsMobile}|${gap}`)}`;
  const cardProps = {
    aspectRatio,
    contentAlign,
    contentSize,
    color,
    background,
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
  };
  const navProps = { arrowStyle, arrowColor, arrowBackground, arrowHoverColor, arrowHoverBackground, dotColor, dotActiveColor, dotHoverColor };

  if (!slides || slides.length === 0) return null;

  return transition === "fade" ? (
    <FadeSlider
      slides={slides}
      autoplay={autoplay}
      autoplaySpeed={autoplaySpeed}
      showArrows={showArrows}
      showDots={showDots}
      pauseOnHover={pauseOnHover}
      dotStyle={dotStyle}
      cardProps={cardProps}
      navProps={navProps}
    />
  ) : (
    <SlideSlider
      slides={slides}
      itemsDesktop={itemsDesktop}
      itemsTablet={itemsTablet}
      itemsMobile={itemsMobile}
      gap={gap}
      autoplay={autoplay}
      autoplaySpeed={autoplaySpeed}
      loop={loop}
      showArrows={showArrows}
      showDots={showDots}
      pauseOnHover={pauseOnHover}
      dotStyle={dotStyle}
      scopedClass={scopedClass}
      cardProps={cardProps}
      navProps={navProps}
    />
  );
}

interface CardStyleProps {
  aspectRatio?: string;
  color?: string;
  background?: string;
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
}
interface NavStyleProps {
  arrowStyle: string;
  arrowColor?: string;
  arrowBackground?: string;
  arrowHoverColor?: string;
  arrowHoverBackground?: string;
  dotColor?: string;
  dotActiveColor?: string;
  dotHoverColor?: string;
}

/** The default, real Owl/Slick-equivalent mode: an embla-carousel-react
 * track that translates horizontally, with real touch/swipe support and a
 * loop mode embla handles natively (no manual wraparound math). */
function SlideSlider({
  slides,
  itemsDesktop,
  itemsTablet,
  itemsMobile,
  gap,
  autoplay,
  autoplaySpeed,
  loop,
  showArrows,
  showDots,
  pauseOnHover,
  dotStyle,
  scopedClass,
  cardProps,
  navProps,
}: {
  slides: SliderSlide[];
  itemsDesktop: number;
  itemsTablet: number;
  itemsMobile: number;
  gap: string;
  autoplay: boolean;
  autoplaySpeed: number;
  loop: boolean;
  showArrows: boolean;
  showDots: boolean;
  pauseOnHover: boolean;
  dotStyle?: string;
  scopedClass: string;
  cardProps: CardStyleProps;
  navProps: NavStyleProps;
}) {
  // Built once (empty deps) via useMemo rather than useRef — see the
  // identical pattern in CarouselContainerBlock.tsx.
  const plugins = useMemo(() => (autoplay ? [Autoplay({ delay: autoplaySpeed, stopOnInteraction: false, stopOnMouseEnter: pauseOnHover })] : []), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop, align: "start" }, plugins);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    // See CarouselContainerBlock.tsx's identical pattern — syncing the dot
    // count from Embla's own ready state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScrollSnaps(emblaApi.scrollSnapList());
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  // itemsDesktop > 1 puts the nav arrows at the *track's* edges, not each
  // slide's — so they'd otherwise sit directly on top of the first/last
  // slide's image and overlay text. Padding the track and insetting the
  // arrows into that padding keeps them out of every slide's content area.
  const needsInset = showArrows && slides.length > 1;

  return (
    <div className={`relative ${scopedClass}`} style={{ padding: needsInset ? "0 44px" : undefined }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `.${scopedClass} .embla-slide{flex:0 0 calc((100% - ${itemsMobile - 1} * ${gap}) / ${itemsMobile});min-width:0;}
@media (min-width:641px){.${scopedClass} .embla-slide{flex:0 0 calc((100% - ${itemsTablet - 1} * ${gap}) / ${itemsTablet});}}
@media (min-width:1025px){.${scopedClass} .embla-slide{flex:0 0 calc((100% - ${itemsDesktop - 1} * ${gap}) / ${itemsDesktop});}}`,
        }}
      />
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex" style={{ gap, marginLeft: `-${gap}` }}>
          {slides.map((slide, i) => (
            <div key={i} className="embla-slide" style={{ paddingLeft: gap }}>
              <SlideCard slide={slide} isActive={i === selectedIndex} {...cardProps} />
            </div>
          ))}
        </div>
      </div>

      {showArrows && slides.length > 1 && (
        <>
          <ArrowButton direction="prev" onClick={() => emblaApi?.scrollPrev()} arrowStyle={navProps.arrowStyle} arrowColor={navProps.arrowColor} arrowBackground={navProps.arrowBackground} arrowHoverColor={navProps.arrowHoverColor} arrowHoverBackground={navProps.arrowHoverBackground} />
          <ArrowButton direction="next" onClick={() => emblaApi?.scrollNext()} arrowStyle={navProps.arrowStyle} arrowColor={navProps.arrowColor} arrowBackground={navProps.arrowBackground} arrowHoverColor={navProps.arrowHoverColor} arrowHoverBackground={navProps.arrowHoverBackground} />
        </>
      )}

      {showDots && (
        <Dots
          count={scrollSnaps.length}
          active={selectedIndex}
          onSelect={(i) => emblaApi?.scrollTo(i)}
          dotStyle={dotStyle}
          dotColor={navProps.dotColor}
          dotActiveColor={navProps.dotActiveColor}
          dotHoverColor={navProps.dotHoverColor}
        />
      )}
    </div>
  );
}

/** Cross-fade mode — Owl/Slick's "fade" transition doesn't translate slides
 * at all, so it's a genuinely different rendering strategy, not an embla
 * option: every slide is stacked absolutely and only opacity animates. */
function FadeSlider({
  slides,
  autoplay,
  autoplaySpeed,
  showArrows,
  showDots,
  pauseOnHover,
  dotStyle,
  cardProps,
  navProps,
}: {
  slides: SliderSlide[];
  autoplay: boolean;
  autoplaySpeed: number;
  showArrows: boolean;
  showDots: boolean;
  pauseOnHover: boolean;
  dotStyle?: string;
  cardProps: CardStyleProps;
  navProps: NavStyleProps;
}) {
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if (!autoplay || (pauseOnHover && hovering) || slides.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), autoplaySpeed);
    return () => clearInterval(id);
  }, [autoplay, autoplaySpeed, pauseOnHover, hovering, slides.length]);

  return (
    <div className="relative" onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
      <div
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: cardProps.aspectRatio || "16/9",
          borderTopLeftRadius: cardProps.borderRadiusTopLeft || cardProps.borderRadius || "12px",
          borderTopRightRadius: cardProps.borderRadiusTopRight || cardProps.borderRadius || "12px",
          borderBottomRightRadius: cardProps.borderRadiusBottomRight || cardProps.borderRadius || "12px",
          borderBottomLeftRadius: cardProps.borderRadiusBottomLeft || cardProps.borderRadius || "12px",
        }}
      >
        {slides.map((slide, i) => (
          <div key={i} className="absolute inset-0 transition-opacity duration-700" style={{ opacity: i === index ? 1 : 0, pointerEvents: i === index ? "auto" : "none" }}>
            <SlideCard slide={slide} isActive={i === index} {...cardProps} />
          </div>
        ))}
      </div>

      {showArrows && slides.length > 1 && (
        <>
          <ArrowButton
            direction="prev"
            onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
            arrowStyle={navProps.arrowStyle}
            arrowColor={navProps.arrowColor}
            arrowBackground={navProps.arrowBackground}
            arrowHoverColor={navProps.arrowHoverColor}
            arrowHoverBackground={navProps.arrowHoverBackground}
          />
          <ArrowButton
            direction="next"
            onClick={() => setIndex((i) => (i + 1) % slides.length)}
            arrowStyle={navProps.arrowStyle}
            arrowColor={navProps.arrowColor}
            arrowBackground={navProps.arrowBackground}
            arrowHoverColor={navProps.arrowHoverColor}
            arrowHoverBackground={navProps.arrowHoverBackground}
          />
        </>
      )}

      {showDots && (
        <Dots count={slides.length} active={index} onSelect={setIndex} dotStyle={dotStyle} dotColor={navProps.dotColor} dotActiveColor={navProps.dotActiveColor} dotHoverColor={navProps.dotHoverColor} />
      )}
    </div>
  );
}
