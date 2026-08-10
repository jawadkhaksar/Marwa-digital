"use client";

import { useRef, useState } from "react";
import { resolveImageUrl } from "@/lib/resolveImageUrl";

export function BeforeAfterBlock({
  beforeImage,
  afterImage,
  beforeLabel,
  afterLabel,
  orientation,
  initialPosition,
  height,
  handleColor,
  labelBackground,
  labelColor,
  borderRadius,
  borderRadiusTopLeft,
  borderRadiusTopRight,
  borderRadiusBottomRight,
  borderRadiusBottomLeft,
}: {
  beforeImage?: string;
  afterImage?: string;
  beforeLabel?: string;
  afterLabel?: string;
  orientation?: "horizontal" | "vertical";
  initialPosition?: string;
  height?: string;
  handleColor?: string;
  labelBackground?: string;
  labelColor?: string;
  borderRadius?: string;
  borderRadiusTopLeft?: string;
  borderRadiusTopRight?: string;
  borderRadiusBottomRight?: string;
  borderRadiusBottomLeft?: string;
}) {
  const [position, setPosition] = useState(Number(initialPosition ?? "50") || 50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const isVertical = orientation === "vertical";

  function updateFromEvent(clientX: number, clientY: number) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = isVertical ? ((clientY - rect.top) / rect.height) * 100 : ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  }

  function onPointerDown(e: React.PointerEvent) {
    dragging.current = true;
    (e.target as Element).setPointerCapture(e.pointerId);
    updateFromEvent(e.clientX, e.clientY);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    updateFromEvent(e.clientX, e.clientY);
  }
  function onPointerUp() {
    dragging.current = false;
  }

  if (!beforeImage || !afterImage) return null;

  const clipPath = isVertical ? `inset(0 0 ${100 - position}% 0)` : `inset(0 ${100 - position}% 0 0)`;

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="relative select-none touch-none overflow-hidden"
      style={{
        height: height || "420px",
        borderTopLeftRadius: borderRadiusTopLeft || borderRadius || "12px",
        borderTopRightRadius: borderRadiusTopRight || borderRadius || "12px",
        borderBottomRightRadius: borderRadiusBottomRight || borderRadius || "12px",
        borderBottomLeftRadius: borderRadiusBottomLeft || borderRadius || "12px",
        cursor: isVertical ? "ns-resize" : "ew-resize",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={resolveImageUrl(afterImage)} alt={afterLabel || "After"} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={resolveImageUrl(beforeImage)} alt={beforeLabel || "Before"} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      </div>

      {beforeLabel && (
        <span className="absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: labelBackground || "rgba(0,0,0,0.6)", color: labelColor || "#fff" }}>
          {beforeLabel}
        </span>
      )}
      {afterLabel && (
        <span className="absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: labelBackground || "rgba(0,0,0,0.6)", color: labelColor || "#fff" }}>
          {afterLabel}
        </span>
      )}

      <div
        className="absolute bg-white"
        style={
          isVertical
            ? { left: 0, right: 0, top: `${position}%`, height: "2px", transform: "translateY(-1px)", background: handleColor || "#fff" }
            : { top: 0, bottom: 0, left: `${position}%`, width: "2px", transform: "translateX(-1px)", background: handleColor || "#fff" }
        }
      />
      <div
        className="absolute flex items-center justify-center rounded-full shadow-lg"
        style={{
          width: "36px",
          height: "36px",
          background: handleColor || "#fff",
          ...(isVertical ? { left: "50%", top: `${position}%`, transform: "translate(-50%,-50%)" } : { top: "50%", left: `${position}%`, transform: "translate(-50%,-50%)" }),
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" style={{ transform: isVertical ? "rotate(90deg)" : undefined }}>
          <path d="M8 6L2 12L8 18M16 6L22 12L16 18" />
        </svg>
      </div>
    </div>
  );
}
