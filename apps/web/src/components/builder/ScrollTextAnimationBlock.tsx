"use client";

import { useEffect, useRef } from "react";
import { GoogleFontLink } from "@/components/builder/GoogleFontLink";

/**
 * gsap/ScrollTrigger/SplitText dynamically imported inside the effect — see
 * AnimatedBox.tsx for the same pattern and the reasoning (keeps the ~70kb of
 * GSAP plugin code out of the initial bundle for pages that don't use it).
 */
export function ScrollTextAnimationBlock({
  text,
  unit,
  revealStyle,
  dimmedOpacity,
  align,
  color,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
}: {
  text: string;
  unit?: "char" | "word" | "line";
  revealStyle?: "opacity" | "blur" | "y";
  dimmedOpacity?: string;
  align?: "left" | "center" | "right";
  color?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  letterSpacing?: string;
  lineHeight?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let split: InstanceType<typeof import("gsap/SplitText").SplitText> | undefined;
    let ctx: { revert: () => void } | undefined;

    (async () => {
      const [{ gsap }, { ScrollTrigger }, { SplitText }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger"), import("gsap/SplitText")]);
      gsap.registerPlugin(ScrollTrigger, SplitText);

      ctx = gsap.context(() => {
        const type = unit === "char" ? "chars" : unit === "line" ? "lines" : "words";
        split = new SplitText(el, { type });
        const targets = unit === "char" ? split.chars : unit === "line" ? split.lines : split.words;

        const fromVars =
          revealStyle === "blur"
            ? { filter: "blur(8px)", opacity: Number(dimmedOpacity ?? "0.15") }
            : revealStyle === "y"
              ? { y: "0.6em", opacity: Number(dimmedOpacity ?? "0.15") }
              : { opacity: Number(dimmedOpacity ?? "0.15") };
        const toVars = revealStyle === "blur" ? { filter: "blur(0px)", opacity: 1 } : revealStyle === "y" ? { y: "0em", opacity: 1 } : { opacity: 1 };

        gsap.fromTo(targets, fromVars, {
          ...toVars,
          stagger: 0.05,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top 85%", end: "bottom 40%", scrub: true },
        });
      }, el);
    })();

    return () => {
      ctx?.revert();
      split?.revert();
    };
  }, [text, unit, revealStyle, dimmedOpacity]);

  return (
    <>
      <GoogleFontLink family={fontFamily} />
      <p
        ref={ref}
        style={{
          textAlign: `var(--exr-align, ${align || "left"})` as React.CSSProperties["textAlign"],
          color: `var(--exr-color, ${color || "inherit"})`,
          fontFamily: fontFamily && fontFamily !== "inherit" ? fontFamily : undefined,
          fontSize: `var(--exr-fontSize, ${fontSize || "inherit"})`,
          fontWeight: `var(--exr-fontWeight, ${fontWeight || "800"})`,
          letterSpacing: `var(--exr-letterSpacing, ${letterSpacing || "inherit"})`,
          lineHeight: `var(--exr-lineHeight, ${lineHeight || "inherit"})`,
          margin: 0,
        }}
      >
        {text}
      </p>
    </>
  );
}
