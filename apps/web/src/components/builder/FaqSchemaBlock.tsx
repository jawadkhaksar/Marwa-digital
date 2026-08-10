"use client";

import { useState } from "react";
import type { FaqSchemaItem } from "@marwa/builder";

/**
 * Same accordion mechanics as IconAccordionBlock (open/close state, single-
 * vs-multiple-open) but a distinct component per the no-merge rule — the
 * part that actually makes this "FAQ Schema" rather than a second Icon
 * Accordion is the JSON-LD block below, which a plain accordion has no
 * reason to carry.
 */
export function FaqSchemaBlock({
  items,
  allowMultipleOpen,
  questionColor,
  questionFontSize,
  questionFontWeight,
  answerColor,
  answerFontSize,
  dividerColor,
  iconColor,
}: {
  items: FaqSchemaItem[];
  allowMultipleOpen?: boolean;
  questionColor?: string;
  questionFontSize?: string;
  questionFontWeight?: string;
  answerColor?: string;
  answerFontSize?: string;
  dividerColor?: string;
  iconColor?: string;
}) {
  const [openSet, setOpenSet] = useState<Set<number>>(new Set());
  if (!items || items.length === 0) return null;

  function toggle(i: number) {
    setOpenSet((prev) => {
      const next = allowMultipleOpen ? new Set(prev) : new Set<number>();
      if (prev.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {items.map((item, i) => {
        const isOpen = openSet.has(i);
        return (
          <div key={i} style={{ borderBottom: i < items.length - 1 ? `1px solid var(--exr-dividerColor, ${dividerColor || "rgba(0,0,0,0.08)"})` : undefined }}>
            <button
              type="button"
              onClick={() => toggle(i)}
              aria-expanded={isOpen}
              style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "16px 4px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
            >
              <span style={{ color: `var(--exr-questionColor, ${questionColor || "inherit"})`, fontSize: `var(--exr-questionFontSize, ${questionFontSize || "inherit"})`, fontWeight: `var(--exr-questionFontWeight, ${questionFontWeight || "600"})` }}>
                {item.question}
              </span>
              <span style={{ color: `var(--exr-iconColor, ${iconColor || "#2563FF"})`, flexShrink: 0, fontSize: "18px", lineHeight: 1 }}>{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen && (
              <div style={{ padding: "0 4px 16px 4px", color: `var(--exr-answerColor, ${answerColor || "inherit"})`, fontSize: `var(--exr-answerFontSize, ${answerFontSize || "inherit"})` }}>
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
