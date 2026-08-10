"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

/**
 * Soft gold radial glow that trails the mouse — gated behind Settings →
 * Site-Wide Animation → "Cursor Glow", off by default since it's a global
 * chrome change (and irrelevant on touch devices, where it never renders).
 * Same fetch/mount pattern as CustomCursor.tsx; GSAP is dynamically imported
 * so sites that leave it off never pay for the extra JS.
 */
export function CursorGlow() {
  const [enabled, setEnabled] = useState(false);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .getSettings()
      .then((s) => setEnabled(s.cursorGlowEnabled))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined" || window.matchMedia("(pointer: coarse)").matches) return;
    // Never inside the admin builder's live-preview iframe — same guard as CustomCursor.
    if (window.self !== window.top) return;

    const el = glowRef.current;
    if (!el) return;

    let cancelled = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      const { gsap } = await import("gsap");
      if (cancelled) return;

      const quickX = gsap.quickTo(el, "x", { duration: 0.35, ease: "power3" });
      const quickY = gsap.quickTo(el, "y", { duration: 0.35, ease: "power3" });

      const move = (e: MouseEvent) => {
        quickX(e.clientX);
        quickY(e.clientY);
      };

      window.addEventListener("mousemove", move);
      cleanup = () => window.removeEventListener("mousemove", move);
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={glowRef}
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: 100,
        height: 100,
        marginLeft: -50,
        marginTop: -50,
        borderRadius: 0,
        pointerEvents: "none",
        background:
          "radial-gradient(circle, rgba(37, 99, 255, 0.25) 0%, rgba(37, 99, 255, 0.08) 40%, rgba(37, 99, 255, 0) 70%)",
        zIndex: 9999,
      }}
    />
  );
}
