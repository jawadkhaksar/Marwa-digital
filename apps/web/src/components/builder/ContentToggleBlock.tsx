"use client";

import { useState } from "react";

/**
 * Content is a rich-text HTML pair (same trust boundary/rendering as
 * RichText's own `html` prop), not two nested-block containers — a true
 * two-slot container (arbitrary blocks on each side) would need a "named
 * slots" extension to LayoutNode that doesn't exist yet (today's
 * `isContainer` blocks — Modal Popup, Off-Canvas — only support a single
 * flat `children` array). Scoped down deliberately rather than half-built.
 */
export function ContentToggleBlock({
  toggleLabelA,
  toggleLabelB,
  contentA,
  contentB,
  defaultSelected,
  activeBackground,
  activeColor,
  inactiveColor,
  trackBackground,
}: {
  toggleLabelA: string;
  toggleLabelB: string;
  contentA?: string;
  contentB?: string;
  defaultSelected?: "A" | "B";
  activeBackground?: string;
  activeColor?: string;
  inactiveColor?: string;
  trackBackground?: string;
}) {
  const [selected, setSelected] = useState<"A" | "B">(defaultSelected || "A");

  return (
    <div>
      <div
        style={{
          display: "inline-flex",
          padding: "4px",
          borderRadius: "9999px",
          background: `var(--exr-trackBackground, ${trackBackground || "rgba(0,0,0,0.06)"})`,
          marginBottom: "20px",
        }}
      >
        {(["A", "B"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setSelected(key)}
            style={{
              padding: "8px 20px",
              borderRadius: "9999px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "13px",
              background: selected === key ? `var(--exr-activeBackground, ${activeBackground || "#2563FF"})` : "transparent",
              color: selected === key ? `var(--exr-activeColor, ${activeColor || "#fff"})` : `var(--exr-inactiveColor, ${inactiveColor || "inherit"})`,
              transition: "background 0.2s ease, color 0.2s ease",
            }}
          >
            {key === "A" ? toggleLabelA : toggleLabelB}
          </button>
        ))}
      </div>
      <div className="tiptap-content" dangerouslySetInnerHTML={{ __html: (selected === "A" ? contentA : contentB) || "" }} />
    </div>
  );
}
