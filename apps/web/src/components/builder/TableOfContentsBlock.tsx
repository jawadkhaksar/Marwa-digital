"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

interface TocEntry {
  id: string;
  text: string;
  level: number;
}

function slugify(text: string, usedIds: Set<string>): string {
  const base =
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "section";
  let slug = base;
  let n = 2;
  while (usedIds.has(slug)) {
    slug = `${base}-${n++}`;
  }
  usedIds.add(slug);
  return slug;
}

/**
 * Scans the page's own headings after mount (can't know them ahead of time
 * — they belong to whatever other blocks happen to share this page) and
 * assigns each one an `id` if it doesn't already have one, so the anchor
 * links this renders actually have something to jump to.
 */
export function TableOfContentsBlock({
  headingSelector,
  title,
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
  linkColor,
  linkActiveColor,
  linkFontFamily,
  linkFontSize,
  linkFontWeight,
  linkLineHeight,
  linkLetterSpacing,
  accentColor,
}: {
  headingSelector?: string;
  title?: string;
  titleColor?: string;
  titleFontFamily?: string;
  titleFontSize?: string;
  titleFontWeight?: string;
  titleTextTransform?: CSSProperties["textTransform"];
  titleFontStyle?: CSSProperties["fontStyle"];
  titleTextDecoration?: string;
  titleLineHeight?: string;
  titleLetterSpacing?: string;
  titleWordSpacing?: string;
  linkColor?: string;
  linkActiveColor?: string;
  linkFontFamily?: string;
  linkFontSize?: string;
  linkFontWeight?: string;
  linkLineHeight?: string;
  linkLetterSpacing?: string;
  accentColor?: string;
}) {
  const [entries, setEntries] = useState<TocEntry[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(headingSelector || "h2, h3"));
    const usedIds = new Set(Array.from(document.querySelectorAll("[id]")).map((el) => el.id));
    const found: TocEntry[] = nodes.map((el) => {
      if (!el.id) el.id = slugify(el.textContent || "", usedIds);
      return { id: el.id, text: el.textContent || "", level: Number(el.tagName[1]) || 2 };
    });
    // Syncing from the DOM (an external system this component doesn't
    // render itself — the headings live in a sibling content area) is the
    // whole point of this effect; there's no async boundary to defer the
    // query result behind.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntries(found);

    const observer = new IntersectionObserver(
      (entries2) => {
        const visible = entries2.find((e) => e.isIntersecting);
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    nodes.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headingSelector]);

  if (entries.length === 0) return null;
  const minLevel = Math.min(...entries.map((e) => e.level));

  return (
    <nav style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {title && (
        <div
          style={{
            color: `var(--exr-titleColor, ${titleColor || "inherit"})`,
            fontFamily: titleFontFamily && titleFontFamily !== "inherit" ? titleFontFamily : undefined,
            fontSize: `var(--exr-titleFontSize, ${titleFontSize || "13px"})`,
            fontWeight: `var(--exr-titleFontWeight, ${titleFontWeight || "700"})` as CSSProperties["fontWeight"],
            textTransform: `var(--exr-titleTextTransform, ${titleTextTransform || "uppercase"})` as CSSProperties["textTransform"],
            fontStyle: `var(--exr-titleFontStyle, ${titleFontStyle || "normal"})` as CSSProperties["fontStyle"],
            textDecoration: `var(--exr-titleTextDecoration, ${titleTextDecoration || "none"})`,
            lineHeight: titleLineHeight ? `var(--exr-titleLineHeight, ${titleLineHeight})` : undefined,
            letterSpacing: `var(--exr-titleLetterSpacing, ${titleLetterSpacing || "0.05em"})`,
            wordSpacing: titleWordSpacing ? `var(--exr-titleWordSpacing, ${titleWordSpacing})` : undefined,
            marginBottom: "4px",
          }}
        >
          {title}
        </div>
      )}
      {entries.map((entry) => (
        <a
          key={entry.id}
          href={`#${entry.id}`}
          style={{
            color: activeId === entry.id ? `var(--exr-linkActiveColor, ${linkActiveColor || accentColor || "#2563FF"})` : `var(--exr-linkColor, ${linkColor || "inherit"})`,
            fontFamily: linkFontFamily && linkFontFamily !== "inherit" ? linkFontFamily : undefined,
            fontSize: `var(--exr-linkFontSize, ${linkFontSize || "14px"})`,
            fontWeight: activeId === entry.id ? 700 : (`var(--exr-linkFontWeight, ${linkFontWeight || "400"})` as CSSProperties["fontWeight"]),
            lineHeight: linkLineHeight ? `var(--exr-linkLineHeight, ${linkLineHeight})` : undefined,
            letterSpacing: linkLetterSpacing ? `var(--exr-linkLetterSpacing, ${linkLetterSpacing})` : undefined,
            textDecoration: "none",
            borderLeft: `2px solid ${activeId === entry.id ? accentColor || "#2563FF" : "transparent"}`,
            paddingTop: "2px",
            paddingBottom: "2px",
            paddingLeft: `${(entry.level - minLevel) * 14 + 10}px`,
          }}
        >
          {entry.text}
        </a>
      ))}
    </nav>
  );
}
