"use client";

import { useEffect, useState } from "react";

/**
 * Two genuinely different widgets sharing one registry entry via `mode`,
 * not two blocks — Elementor's own "Progress Tracker" collapses the same
 * two ideas (a static step indicator vs. a live scroll-read progress bar)
 * under one widget, so this mirrors that rather than being a merge of two
 * otherwise-independent modules.
 */
export function ProgressTrackerBlock({
  mode,
  steps,
  currentStep,
  barHeight,
  activeColor,
  inactiveColor,
  lineColor,
  trackColor,
}: {
  mode?: "steps" | "bar";
  steps?: string[];
  currentStep?: string;
  barHeight?: string;
  activeColor?: string;
  inactiveColor?: string;
  lineColor?: string;
  trackColor?: string;
}) {
  const [scrollPct, setScrollPct] = useState(0);

  useEffect(() => {
    if (mode !== "bar") return;
    function onScroll() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrollPct(max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mode]);

  const active = activeColor || "#2563FF";

  if (mode === "bar") {
    return (
      <div style={{ width: "100%", height: `var(--exr-barHeight, ${barHeight || "6px"})`, borderRadius: "9999px", background: `var(--exr-trackColor, ${trackColor || "rgba(0,0,0,0.08)"})`, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${scrollPct}%`, background: active, transition: "width 0.1s linear" }} />
      </div>
    );
  }

  if (!steps || steps.length === 0) return null;
  const current = Number(currentStep) || 1;

  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
      {steps.map((step, i) => {
        const stepNum = i + 1;
        const isDone = stepNum < current;
        const isActive = stepNum === current;
        return (
          <div key={i} style={{ display: "flex", flex: i < steps.length - 1 ? 1 : undefined, alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "32px",
                  height: "32px",
                  borderRadius: "9999px",
                  background: isDone || isActive ? active : `var(--exr-inactiveColor, ${inactiveColor || "rgba(0,0,0,0.08)"})`,
                  color: isDone || isActive ? "#fff" : "#999",
                  fontWeight: 700,
                  fontSize: "13px",
                }}
              >
                {isDone ? "✓" : stepNum}
              </span>
              <span style={{ marginTop: "6px", fontSize: "12px", fontWeight: isActive ? 700 : 500, color: isActive ? active : "inherit", whiteSpace: "nowrap" }}>{step}</span>
            </div>
            {i < steps.length - 1 && <span style={{ flex: 1, height: "2px", background: `var(--exr-lineColor, ${lineColor || (isDone ? active : "rgba(0,0,0,0.08)")})`, marginBottom: "18px" }} />}
          </div>
        );
      })}
    </div>
  );
}
