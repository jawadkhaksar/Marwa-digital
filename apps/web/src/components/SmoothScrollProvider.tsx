"use client";

import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import type LenisType from "lenis";

/**
 * Site-wide momentum/inertial scrolling (Lenis), gated behind the
 * Settings → Site-Wide Animation → "Smooth Scroll" toggle so it stays
 * strictly opt-in — it changes the feel of every page, not a single block.
 * Lenis and its GSAP glue are dynamically imported so sites that leave it
 * off never pay for the extra JS.
 */
export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    api
      .getSettings()
      .then((s) => setEnabled(s.smoothScrollEnabled))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let lenis: LenisType | undefined;
    let rafId: number | undefined;
    let cancelled = false;

    (async () => {
      const [{ default: Lenis }, { gsap }, { ScrollTrigger }] = await Promise.all([
        import("lenis"),
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      lenis = new Lenis({ autoRaf: false });
      lenis.on("scroll", () => ScrollTrigger.update());

      function raf(time: number) {
        lenis?.raf(time * 1000);
        rafId = requestAnimationFrame(raf);
      }
      rafId = requestAnimationFrame(raf);
    })();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      lenis?.destroy();
    };
  }, [enabled]);

  return <>{children}</>;
}
