"use client";

import { useEffect } from "react";

/**
 * Binds a car SVG element to scroll via GSAP MotionPathPlugin + ScrollTrigger.
 * Also animates the headlights: dim at rest, glowing gold when the car moves.
 */
export function MotionPathScrollBinder() {
  useEffect(() => {
    let cancelled = false;
    let ctx: ReturnType<typeof import("gsap").gsap.context> | null = null;
    let boundEl: HTMLElement | null = null;

    (async () => {
      const carEl =
        document.querySelector('[data-block-id="car-layer"]') ||
        document.getElementById("car-element");
      const pathEl = document.getElementById("road-path");
      if (!carEl || !pathEl) return;
      // LayoutRenderer mounts one of these per call (header + page body +
      // footer, at minimum) — all sharing this same page-global `#road-path`/
      // car element, since it's looked up by id rather than scoped to this
      // instance's own subtree. Without this guard, every one of those
      // instances independently binds its own ScrollTrigger/tween to the
      // exact same element, so the car gets driven by several conflicting
      // scroll-scrubbed timelines at once. Only the first mounted instance
      // actually binds; the marker is cleared on its own unmount so a real
      // remount (route change, HMR) can rebind.
      if ((carEl as HTMLElement).dataset.motionPathBound === "1") return;
      (carEl as HTMLElement).dataset.motionPathBound = "1";
      boundEl = carEl as HTMLElement;

      const [{ gsap }, { ScrollTrigger }, { MotionPathPlugin }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
        import("gsap/MotionPathPlugin"),
      ]);

      if (cancelled) return;

      // ── Dynamically inject the new car image ────────────────────────────────
      // This ensures existing database records (which have the old SVG rects)
      // are automatically updated to use the new carsvg.svg on the client.
      carEl.innerHTML = `
        <image href="/carsvg.svg" x="-25" y="-36" width="50" height="72" transform="rotate(270)" />
        <ellipse id="hl-left" cx="-14" cy="28" rx="4" ry="2.5" fill="#2563ff" opacity="0.08" />
        <ellipse id="hl-right" cx="14" cy="28" rx="4" ry="2.5" fill="#2563ff" opacity="0.08" />
      `;

      gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

      // ── Headlight elements ──────────────────────────────────────────────────
      // Supports both: id="hl-left"/"hl-right" (new) or the first two <ellipse>
      // children of the car group that carry fill="#2563ff" (legacy inline SVG).
      const hlLeft: Element | null =
        carEl.querySelector("#hl-left") ||
        carEl.querySelector('ellipse[fill="#2563ff"]') ||
        null;
      const hlRight: Element | null =
        carEl.querySelector("#hl-right") ||
        (carEl.querySelectorAll('ellipse[fill="#2563ff"]')[1] ?? null);

      // Inject a SVG <filter> for the golden glow (appended once to the SVG root)
      const svgRoot = pathEl.closest("svg");
      if (svgRoot && !svgRoot.querySelector("#hl-glow-filter")) {
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        defs.innerHTML = `
          <filter id="hl-glow-filter" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
            <feColorMatrix in="blur" type="matrix"
              values="1 0.8 0 0 0.2
                      0 0.6 0 0 0.1
                      0 0   0 0 0
                      0 0   0 18 -7" result="glow"/>
            <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        `;
        svgRoot.prepend(defs);
      }

      // Start headlights dim (engine off)
      if (hlLeft) { (hlLeft as SVGElement).style.opacity = "0.08"; }
      if (hlRight) { (hlRight as SVGElement).style.opacity = "0.08"; }

      ctx = gsap.context(() => {
        // Set the car at the start of the path before any scroll.
        gsap.set(carEl, {
          motionPath: {
            path: "#road-path",
            align: "#road-path",
            alignOrigin: [0.5, 0.5],
            autoRotate: 90,
            start: 0,
            end: 0,
          },
        });

        const section = pathEl.closest("section") || pathEl.parentElement || pathEl;

        // ONE tween — GSAP scrubs internally, perfectly smooth.
        gsap.to(carEl, {
          motionPath: {
            path: "#road-path",
            align: "#road-path",
            alignOrigin: [0.5, 0.5],
            autoRotate: 90,
            start: 0,
            end: 1,
          },
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.2,
          },
        });

        // ── Headlight on/off tied to scroll progress ────────────────────────
        if (hlLeft || hlRight) {
          ScrollTrigger.create({
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            onUpdate(self) {
              const p = self.progress;
              // Lights ON: fade in quickly over first 3% of scroll, then stay bright
              const opacity = p < 0.001 ? 0.08 : Math.min(1, p * 35);
              const filter = p > 0.02 ? "url(#hl-glow-filter)" : "none";
              if (hlLeft) {
                (hlLeft as SVGElement).style.opacity = String(opacity);
                (hlLeft as SVGElement).style.filter = filter;
              }
              if (hlRight) {
                (hlRight as SVGElement).style.opacity = String(opacity);
                (hlRight as SVGElement).style.filter = filter;
              }
            },
          });
        }
      });
    })();

    return () => {
      cancelled = true;
      ctx?.revert();
      if (boundEl) delete boundEl.dataset.motionPathBound;
    };
  }, []);

  return null;
}
