"use client";

import { useEffect } from "react";
import Script from "next/script";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate: {
        TranslateElement: new (options: Record<string, unknown>, elementId: string) => unknown;
      };
    };
  }
}

// Powers the De/En switcher in SiteHeader: auto-translates the rendered page
// (including CMS-driven tour/page/review content) via Google's free website
// translator, driven by the `googtrans` cookie (see lib/googleTranslate.ts).
// There's no maintained German copy anywhere in this codebase — this is
// machine translation, not hand-authored localization.
export function GoogleTranslate() {
  useEffect(() => {
    window.googleTranslateElementInit = () => {
      if (!window.google) return;
      new window.google.translate.TranslateElement(
        { pageLanguage: "en", includedLanguages: "en,de", autoDisplay: false },
        "google_translate_element"
      );
    };
  }, []);

  return (
    <>
      <div id="google_translate_element" style={{ position: "absolute", left: -9999, top: 0 }} />
      <Script
        src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
      />
    </>
  );
}
