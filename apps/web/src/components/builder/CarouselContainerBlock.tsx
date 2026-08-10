"use client";

import { Children, useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode, Ref } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { hashString, ArrowButton, Dots } from "@/components/builder/carouselPrimitives";

interface WrapperProps {
  id?: string;
  className?: string;
  style?: CSSProperties;
  "data-block-id"?: string;
  "data-block-type"?: string;
  /** Set by AnimatedBox when this node has GSAP timelines — see
   *  blockComponents.tsx's WrapperProps for why this goes through
   *  wrapperProps rather than a second wrapping element. */
  ref?: Ref<HTMLDivElement>;
  /** Set by AnimatedBox alongside `ref` — see blockComponents.tsx's
   *  WrapperProps for why (browser-extension DOM injection racing hydration). */
  suppressHydrationWarning?: boolean;
}

interface CarouselContainerProps {
  itemsDesktop?: number;
  itemsTablet?: number;
  itemsMobile?: number;
  gap?: string;
  autoplay?: boolean;
  autoplaySpeed?: number;
  loop?: boolean;
  showArrows?: boolean;
  showDots?: boolean;
  pauseOnHover?: boolean;
  transition?: "slide" | "fade";
  arrowStyle?: "circle" | "square" | "minimal";
  arrowPosition?: "inside" | "outside";
  dotStyle?: "dots" | "lines" | "numbers";
  slideBackground?: string;
  slideBorderRadius?: string;
  slideBoxShadow?: string;
  slidePadding?: string;
  arrowColor?: string;
  arrowBackground?: string;
  dotColor?: string;
  dotActiveColor?: string;
  wrapperProps?: WrapperProps;
  children?: ReactNode;
}

/**
 * The "put anything in it" carousel — unlike SliderBlock (fixed image+text
 * slides), this is a real container: `isContainer: true` in the registry
 * means each direct child is an independently insertable/editable block
 * (Heading, Image, Button, whole Sections, ...), exactly like Section and
 * Columns already work. The only carousel-specific part is *how* those
 * already-rendered children get laid out — each wrapped in its own
 * .embla-slide instead of a plain row/column.
 */
export function CarouselContainerBlock({
  itemsDesktop = 1,
  itemsTablet = 1,
  itemsMobile = 1,
  gap = "16px",
  autoplay = true,
  autoplaySpeed = 4000,
  loop = true,
  showArrows = true,
  showDots = true,
  pauseOnHover = true,
  transition = "slide",
  arrowStyle = "circle",
  arrowPosition = "inside",
  dotStyle = "dots",
  slideBackground,
  slideBorderRadius,
  slideBoxShadow,
  slidePadding,
  arrowColor,
  arrowBackground,
  dotColor,
  dotActiveColor,
  wrapperProps,
  children,
}: CarouselContainerProps) {
  const slides = Children.toArray(children);
  const scopedClass = `cc-${hashString(`${itemsDesktop}|${itemsTablet}|${itemsMobile}|${gap}`)}`;
  const slideStyle: CSSProperties = {
    background: slideBackground || undefined,
    borderRadius: slideBorderRadius || undefined,
    boxShadow: slideBoxShadow || undefined,
    padding: slidePadding || undefined,
    overflow: "hidden",
    height: "100%",
  };

  if (slides.length === 0) {
    return (
      <div
        ref={wrapperProps?.ref}
        suppressHydrationWarning={wrapperProps?.suppressHydrationWarning}
        id={wrapperProps?.id}
        className={["rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center text-sm text-foreground/50", wrapperProps?.className].filter(Boolean).join(" ")}
        style={wrapperProps?.style}
        data-block-id={wrapperProps?.["data-block-id"]}
        data-block-type={wrapperProps?.["data-block-type"]}
      >
        Empty carousel — select it and add blocks from the palette; each one becomes a slide.
      </div>
    );
  }

  return transition === "fade" ? (
    <FadeCarousel
      slides={slides}
      autoplay={autoplay}
      autoplaySpeed={autoplaySpeed}
      showArrows={showArrows}
      showDots={showDots}
      pauseOnHover={pauseOnHover}
      arrowStyle={arrowStyle}
      arrowPosition={arrowPosition}
      dotStyle={dotStyle}
      dotColor={dotColor}
      dotActiveColor={dotActiveColor}
      arrowColor={arrowColor}
      arrowBackground={arrowBackground}
      slideStyle={slideStyle}
      wrapperProps={wrapperProps}
    />
  ) : (
    <SlideCarousel
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
      arrowStyle={arrowStyle}
      arrowPosition={arrowPosition}
      dotStyle={dotStyle}
      dotColor={dotColor}
      dotActiveColor={dotActiveColor}
      arrowColor={arrowColor}
      arrowBackground={arrowBackground}
      scopedClass={scopedClass}
      slideStyle={slideStyle}
      wrapperProps={wrapperProps}
    />
  );
}

function SlideCarousel({
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
  arrowStyle,
  arrowPosition,
  dotStyle,
  dotColor,
  dotActiveColor,
  arrowColor,
  arrowBackground,
  scopedClass,
  slideStyle,
  wrapperProps,
}: {
  slides: ReactNode[];
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
  arrowStyle: string;
  arrowPosition: "inside" | "outside";
  dotStyle?: string;
  dotColor?: string;
  dotActiveColor?: string;
  arrowColor?: string;
  arrowBackground?: string;
  scopedClass: string;
  slideStyle: CSSProperties;
  wrapperProps?: WrapperProps;
}) {
  // Built once (empty deps) via useMemo rather than useRef — Embla requires
  // a referentially-stable plugin instance across renders, but reading
  // ref.current directly in the render body (the previous approach) is what
  // the lint rule actually objects to; a memoized value serves the same
  // "compute once, keep stable" need without touching a ref during render.
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
    // Syncs the dot-indicator count from Embla's own snap list once it's
    // ready — a real "read the external library's current state" sync, the
    // canonical case for setState-in-an-effect the rule's own docs
    // describe, just triggered directly rather than from inside a
    // subscription callback.
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

  const needsInset = showArrows && slides.length > 1;

  return (
    <div
      ref={wrapperProps?.ref}
      suppressHydrationWarning={wrapperProps?.suppressHydrationWarning}
      id={wrapperProps?.id}
      className={["relative", scopedClass, wrapperProps?.className].filter(Boolean).join(" ")}
      style={{ ...wrapperProps?.style, padding: needsInset && arrowPosition === "inside" ? "0 44px" : wrapperProps?.style?.padding }}
      data-block-id={wrapperProps?.["data-block-id"]}
      data-block-type={wrapperProps?.["data-block-type"]}
    >
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
              <div style={slideStyle}>{slide}</div>
            </div>
          ))}
        </div>
      </div>

      {showArrows && slides.length > 1 && (
        <>
          <ArrowButton direction="prev" onClick={() => emblaApi?.scrollPrev()} arrowStyle={arrowStyle} arrowColor={arrowColor} arrowBackground={arrowBackground} position={arrowPosition} />
          <ArrowButton direction="next" onClick={() => emblaApi?.scrollNext()} arrowStyle={arrowStyle} arrowColor={arrowColor} arrowBackground={arrowBackground} position={arrowPosition} />
        </>
      )}

      {showDots && <Dots count={scrollSnaps.length} active={selectedIndex} onSelect={(i) => emblaApi?.scrollTo(i)} dotStyle={dotStyle} dotColor={dotColor} dotActiveColor={dotActiveColor} />}
    </div>
  );
}

function FadeCarousel({
  slides,
  autoplay,
  autoplaySpeed,
  showArrows,
  showDots,
  pauseOnHover,
  arrowStyle,
  arrowPosition,
  dotStyle,
  dotColor,
  dotActiveColor,
  arrowColor,
  arrowBackground,
  slideStyle,
  wrapperProps,
}: {
  slides: ReactNode[];
  autoplay: boolean;
  autoplaySpeed: number;
  showArrows: boolean;
  showDots: boolean;
  pauseOnHover: boolean;
  arrowStyle: string;
  arrowPosition: "inside" | "outside";
  dotStyle?: string;
  dotColor?: string;
  dotActiveColor?: string;
  arrowColor?: string;
  arrowBackground?: string;
  slideStyle: CSSProperties;
  wrapperProps?: WrapperProps;
}) {
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if (!autoplay || (pauseOnHover && hovering) || slides.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), autoplaySpeed);
    return () => clearInterval(id);
  }, [autoplay, autoplaySpeed, pauseOnHover, hovering, slides.length]);

  return (
    <div
      ref={wrapperProps?.ref}
      suppressHydrationWarning={wrapperProps?.suppressHydrationWarning}
      id={wrapperProps?.id}
      className={["relative", wrapperProps?.className].filter(Boolean).join(" ")}
      style={wrapperProps?.style}
      data-block-id={wrapperProps?.["data-block-id"]}
      data-block-type={wrapperProps?.["data-block-type"]}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="relative w-full">
        {slides.map((slide, i) => (
          <div key={i} className={i === 0 ? "relative" : "absolute inset-0"} style={{ opacity: i === index ? 1 : 0, pointerEvents: i === index ? "auto" : "none", transition: "opacity 0.7s" }}>
            <div style={slideStyle}>{slide}</div>
          </div>
        ))}
      </div>

      {showArrows && slides.length > 1 && (
        <>
          <ArrowButton direction="prev" onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)} arrowStyle={arrowStyle} arrowColor={arrowColor} arrowBackground={arrowBackground} position={arrowPosition} />
          <ArrowButton direction="next" onClick={() => setIndex((i) => (i + 1) % slides.length)} arrowStyle={arrowStyle} arrowColor={arrowColor} arrowBackground={arrowBackground} position={arrowPosition} />
        </>
      )}

      {showDots && <Dots count={slides.length} active={index} onSelect={setIndex} dotStyle={dotStyle} dotColor={dotColor} dotActiveColor={dotActiveColor} />}
    </div>
  );
}
