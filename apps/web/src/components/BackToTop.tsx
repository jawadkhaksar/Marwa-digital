"use client";

import { useEffect, useState } from "react";
import { IconChevron } from "./home/icons";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 500);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      tabIndex={visible ? 0 : -1}
      className={`fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-gold text-white shadow-lg shadow-black/40 transition-all duration-300 hover:bg-gold-dark hover:-translate-y-0.5 ${
        visible ? "opacity-100 translate-y-0" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <IconChevron className="h-5 w-5 rotate-180" />
    </button>
  );
}
