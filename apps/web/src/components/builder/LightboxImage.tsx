"use client";

import { useEffect, useState } from "react";

/** Click-to-enlarge modal overlay for the Image block's Lightbox option. */
export function LightboxImage({ src, alt, aspectRatio, className }: { src: string; alt: string; aspectRatio?: string; className?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block w-full cursor-zoom-in border-0 bg-transparent p-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={className} style={aspectRatio ? { aspectRatio } : undefined} />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-6"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute right-6 top-6 text-3xl text-white/80 hover:text-white"
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
