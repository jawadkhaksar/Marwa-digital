"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface RevealOptions {
  /** CSS selector (relative to the container ref) for items to stagger in. */
  itemsSelector?: string;
  y?: number;
  stagger?: number;
  duration?: number;
}

/** Fades + slides matched elements up as the container scrolls into view. */
export function useScrollReveal<T extends HTMLElement>({
  itemsSelector = "[data-reveal]",
  y = 32,
  stagger = 0.12,
  duration = 0.7,
}: RevealOptions = {}) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const items = el.querySelectorAll(itemsSelector);
      const targets = items.length > 0 ? items : el;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduceMotion) {
        gsap.set(targets, { opacity: 1, y: 0 });
        return;
      }

      gsap.fromTo(
        targets,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration,
          stagger,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 80%",
            once: true,
          },
        }
      );
    }, el);

    return () => ctx.revert();
  }, [itemsSelector, y, stagger, duration]);

  return ref;
}
