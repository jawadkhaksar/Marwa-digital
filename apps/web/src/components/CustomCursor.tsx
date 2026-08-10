"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

/**
 * Gold dot that trails the mouse and grows over interactive elements —
 * gated behind Settings → Site-Wide Animation → "Custom Cursor", off by
 * default since it's a global chrome change (and irrelevant on touch
 * devices, where it never renders). GSAP is dynamically imported so
 * sites that leave it off never pay for the extra JS.
 */
export function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .getSettings()
      .then((s) => setEnabled(s.customCursorEnabled))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined" || window.matchMedia("(pointer: coarse)").matches) return;
    // Never inside the admin builder's live-preview iframe — the real
    // cursor is needed there for PreviewBridge's hover/select toolbar.
    if (window.self !== window.top) return;

    const el = dotRef.current;
    if (!el) return;

    document.documentElement.classList.add("custom-cursor-active");

    let cancelled = false;
    const cleanups: Array<() => void> = [];

    (async () => {
      const { gsap } = await import("gsap");
      if (cancelled) return;

      const quickX = gsap.quickTo(el, "x", { duration: 0.35, ease: "power3" });
      const quickY = gsap.quickTo(el, "y", { duration: 0.35, ease: "power3" });

      const move = (e: MouseEvent) => {
        quickX(e.clientX);
        quickY(e.clientY);
      };
      const over = (e: MouseEvent) => {
        if ((e.target as HTMLElement)?.closest("a, button, [data-block-id]")) {
          gsap.to(el, { scale: 2.2, duration: 0.25 });
        }
      };
      const out = (e: MouseEvent) => {
        if ((e.target as HTMLElement)?.closest("a, button, [data-block-id]")) {
          gsap.to(el, { scale: 1, duration: 0.25 });
        }
      };

      window.addEventListener("mousemove", move);
      document.addEventListener("mouseover", over);
      document.addEventListener("mouseout", out);
      cleanups.push(() => {
        window.removeEventListener("mousemove", move);
        document.removeEventListener("mouseover", over);
        document.removeEventListener("mouseout", out);
      });
    })();

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
      document.documentElement.classList.remove("custom-cursor-active");
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={dotRef}
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: 16,
        height: 16,
        marginLeft: -8,
        marginTop: -8,
        borderRadius: "9999px",
        background: "#2563ff",
        pointerEvents: "none",
        zIndex: 9999,
        mixBlendMode: "difference",
      }}
    />
  );
}
