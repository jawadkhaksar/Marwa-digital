"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

/**
 * Counts a number up from 0 to `target` when scrolled into view, keeping
 * whatever non-numeric prefix/suffix surrounded it (e.g. "500+" → counts to
 * 500, "+" stays put). gsap/ScrollTrigger are dynamically imported so pages
 * with no animated blocks at all still ship zero extra JS for this.
 */
export function CounterValue({
  target,
  prefix,
  suffix,
  duration,
  className,
  style,
}: {
  target: number;
  prefix: string;
  suffix: string;
  duration: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cancelled = false;
    let revert: (() => void) | undefined;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      const ctx = gsap.context(() => {
        const counter = { val: 0 };
        gsap.to(counter, {
          val: target,
          duration,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
          onUpdate: () => {
            el.textContent = `${prefix}${Math.round(counter.val).toLocaleString()}${suffix}`;
          },
        });
      }, ref);

      revert = () => ctx.revert();
    })();

    return () => {
      cancelled = true;
      revert?.();
    };
  }, [target, prefix, suffix, duration]);

  return (
    <span ref={ref} className={className} style={style}>
      {prefix}0{suffix}
    </span>
  );
}
