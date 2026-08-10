"use client";

import { useEffect, useState } from "react";
import { resolveImageUrl } from "@/lib/resolveImageUrl";

/**
 * Upgraded in place from a plain server-rendered grid (see the note on
 * `galleryBlock` in registry.ts) — needs "use client" now purely for the
 * lightbox's open/selected-index state; the grid layout itself is unchanged.
 */
export function GalleryBlock({
  images,
  columns,
  lightbox,
  gap,
  borderRadius,
  borderRadiusTopLeft,
  borderRadiusTopRight,
  borderRadiusBottomRight,
  borderRadiusBottomLeft,
}: {
  images: string[];
  columns: number;
  lightbox?: boolean;
  gap?: string;
  borderRadius?: string;
  borderRadiusTopLeft?: string;
  borderRadiusTopRight?: string;
  borderRadiusBottomRight?: string;
  borderRadiusBottomLeft?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (openIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenIndex(null);
      if (e.key === "ArrowRight") setOpenIndex((i) => (i === null ? null : (i + 1) % images.length));
      if (e.key === "ArrowLeft") setOpenIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length));
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openIndex, images.length]);

  if (!images || images.length === 0) return null;

  return (
    <>
      <div className="mx-auto grid max-w-6xl px-6 md:px-12" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: gap || "16px" }}>
        {images.map((src, i) => (
          <button
            key={i}
            type="button"
            onClick={lightbox ? () => setOpenIndex(i) : undefined}
            className={`aspect-square w-full overflow-hidden border-0 bg-transparent p-0 ${lightbox ? "cursor-zoom-in" : "cursor-default"}`}
            style={{
              borderTopLeftRadius: borderRadiusTopLeft || borderRadius || "8px",
              borderTopRightRadius: borderRadiusTopRight || borderRadius || "8px",
              borderBottomRightRadius: borderRadiusBottomRight || borderRadius || "8px",
              borderBottomLeftRadius: borderRadiusBottomLeft || borderRadius || "8px",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resolveImageUrl(src)} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-6" onClick={() => setOpenIndex(null)}>
          <button type="button" onClick={() => setOpenIndex(null)} aria-label="Close" className="absolute right-6 top-6 text-3xl text-white/80 hover:text-white">
            ✕
          </button>
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length));
              }}
              aria-label="Previous"
              className="absolute left-4 text-3xl text-white/80 hover:text-white md:left-8"
            >
              ‹
            </button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resolveImageUrl(images[openIndex])} alt="" className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenIndex((i) => (i === null ? null : (i + 1) % images.length));
              }}
              aria-label="Next"
              className="absolute right-4 text-3xl text-white/80 hover:text-white md:right-8"
            >
              ›
            </button>
          )}
        </div>
      )}
    </>
  );
}
