"use client";

import { useState } from "react";

/** A real, working filter bar (click toggles active state) — just not wired to a live grid yet, since there's no Collections data source behind it (see the note on the "collection" category blocks in registry.ts). */
export function TaxonomyFilterBlock({
  categories,
  activeBackground,
  activeColor,
  inactiveColor,
}: {
  categories: string[];
  activeBackground?: string;
  activeColor?: string;
  inactiveColor?: string;
}) {
  const [active, setActive] = useState(0);
  if (!categories || categories.length === 0) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      {categories.map((cat, i) => (
        <button
          key={i}
          type="button"
          onClick={() => setActive(i)}
          style={{
            padding: "8px 18px",
            borderRadius: "9999px",
            border: "none",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: 600,
            background: i === active ? `var(--exr-activeBackground, ${activeBackground || "#2563FF"})` : "transparent",
            color: i === active ? `var(--exr-activeColor, ${activeColor || "#fff"})` : `var(--exr-inactiveColor, ${inactiveColor || "inherit"})`,
            boxShadow: i === active ? "none" : "inset 0 0 0 1px rgba(0,0,0,0.1)",
          }}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
