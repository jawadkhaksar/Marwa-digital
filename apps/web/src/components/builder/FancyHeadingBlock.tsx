"use client";

import { useEffect, useState } from "react";
import { GoogleFontLink } from "@/components/builder/GoogleFontLink";

/** Classic type-out/delete-back typewriter loop over `words`. */
function useTypingWord(words: string[], speedSeconds: number) {
  const [display, setDisplay] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (words.length === 0) return;
    const word = words[wordIndex % words.length];
    const typeMs = Math.max(30, (speedSeconds * 1000) / word.length / 2);
    const pauseMs = speedSeconds * 1000;

    if (!deleting && display === word) {
      const t = setTimeout(() => setDeleting(true), pauseMs);
      return () => clearTimeout(t);
    }
    if (deleting && display === "") {
      // Instant state-machine transition (delete finished → next word),
      // no timer involved — the typing/pausing branches around this one
      // use setTimeout, but this specific edge fires the moment the effect
      // re-runs with display==="" after the last backspace.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDeleting(false);
      setWordIndex((i) => (i + 1) % words.length);
      return;
    }
    const t = setTimeout(() => {
      setDisplay((d) => (deleting ? word.slice(0, d.length - 1) : word.slice(0, d.length + 1)));
    }, typeMs);
    return () => clearTimeout(t);
  }, [display, deleting, wordIndex, words, speedSeconds]);

  return display;
}

/** Fade/slide simply cycle the whole word on an interval — CSS handles the transition. */
function useCyclingWord(words: string[], speedSeconds: number) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (words.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % words.length), Math.max(800, speedSeconds * 1000));
    return () => clearInterval(id);
  }, [words, speedSeconds]);
  return { word: words[index] ?? "", index };
}

export function FancyHeadingBlock({
  prefix,
  words,
  suffix,
  effect,
  loopSpeed,
  align,
  prefixColor,
  wordColor,
  fontFamily,
  fontSize,
  fontWeight,
}: {
  prefix?: string;
  words: string[];
  suffix?: string;
  effect?: "typing" | "fade" | "slide";
  loopSpeed?: string;
  align?: "left" | "center" | "right";
  prefixColor?: string;
  wordColor?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
}) {
  const speed = Number(loopSpeed) || 2.5;
  const typed = useTypingWord(effect === "typing" ? words : [], speed);
  const cycling = useCyclingWord(effect !== "typing" ? words : [], speed);

  if (!words || words.length === 0) return null;

  return (
    <>
      <GoogleFontLink family={fontFamily} />
      <p
        style={{
          textAlign: `var(--exr-align, ${align || "left"})` as React.CSSProperties["textAlign"],
          fontFamily: fontFamily && fontFamily !== "inherit" ? fontFamily : undefined,
          fontSize: `var(--exr-fontSize, ${fontSize || "clamp(1.75rem, 4vw, 3rem)"})`,
          fontWeight: `var(--exr-fontWeight, ${fontWeight || "800"})`,
          margin: 0,
          lineHeight: 1.15,
        }}
      >
        {prefix && <span style={{ color: `var(--exr-prefixColor, ${prefixColor || "inherit"})` }}>{prefix} </span>}
        {effect === "typing" ? (
          <span style={{ color: `var(--exr-wordColor, ${wordColor || "#2563FF"})` }}>
            {typed}
            <span className="animate-pulse">|</span>
          </span>
        ) : (
          <span
            key={cycling.index}
            className={effect === "slide" ? "inline-block animate-[exr-fancy-slide_0.5s_ease]" : "inline-block animate-[exr-fancy-fade_0.5s_ease]"}
            style={{ color: `var(--exr-wordColor, ${wordColor || "#2563FF"})` }}
          >
            {cycling.word}
          </span>
        )}
        {suffix && <span style={{ color: `var(--exr-prefixColor, ${prefixColor || "inherit"})` }}> {suffix}</span>}
      </p>
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes exr-fancy-fade{from{opacity:0;}to{opacity:1;}}@keyframes exr-fancy-slide{from{opacity:0;transform:translateY(0.4em);}to{opacity:1;transform:translateY(0);}}`,
        }}
      />
    </>
  );
}
