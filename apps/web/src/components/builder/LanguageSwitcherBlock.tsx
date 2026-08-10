"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { getCurrentLang, setLang as applyLang, type SiteLang } from "@/lib/googleTranslate";

/**
 * The Theme Builder's "Language Switcher" widget — the exact De/En toggle
 * SiteHeader has always had, as a placeable, styleable block. Fixed to
 * German/English since that's genuinely what the site supports (see
 * googleTranslate.ts's SiteLang type and its Google Translate cookie) —
 * not a generic multi-language picker.
 */
export function LanguageSwitcherBlock({
  deLabel,
  enLabel,
  background,
  activeBackground,
  activeColor,
  inactiveColor,
  hoverColor,
  borderRadius,
  borderRadiusTopLeft,
  borderRadiusTopRight,
  borderRadiusBottomRight,
  borderRadiusBottomLeft,
  buttonPaddingH,
  buttonPaddingV,
  textFontSize,
  textFontWeight,
  gap,
}: {
  deLabel?: string;
  enLabel?: string;
  background?: string;
  activeBackground?: string;
  activeColor?: string;
  inactiveColor?: string;
  hoverColor?: string;
  borderRadius?: string;
  borderRadiusTopLeft?: string;
  borderRadiusTopRight?: string;
  borderRadiusBottomRight?: string;
  borderRadiusBottomLeft?: string;
  buttonPaddingH?: string;
  buttonPaddingV?: string;
  textFontSize?: string;
  textFontWeight?: string;
  gap?: string;
}) {
  const [lang, setLang] = useState<SiteLang>("en");

  // The googtrans cookie can only be read client-side — matches the exact
  // pattern SiteHeader already uses for this same seed-on-mount read.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(getCurrentLang());
  }, []);

  function selectLang(next: SiteLang) {
    if (next === lang) return;
    setLang(next);
    applyLang(next);
  }

  const containerStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: gap || "8px",
    borderTopLeftRadius: borderRadiusTopLeft || borderRadius || "9999px",
    borderTopRightRadius: borderRadiusTopRight || borderRadius || "9999px",
    borderBottomRightRadius: borderRadiusBottomRight || borderRadius || "9999px",
    borderBottomLeftRadius: borderRadiusBottomLeft || borderRadius || "9999px",
    padding: "4px",
    background: background || "#2a2a2a",
    fontSize: textFontSize || "14px",
    fontWeight: textFontWeight || undefined,
  };

  function buttonStyle(isActive: boolean): CSSProperties {
    return {
      borderTopLeftRadius: borderRadiusTopLeft || borderRadius || "9999px",
      borderTopRightRadius: borderRadiusTopRight || borderRadius || "9999px",
      borderBottomRightRadius: borderRadiusBottomRight || borderRadius || "9999px",
      borderBottomLeftRadius: borderRadiusBottomLeft || borderRadius || "9999px",
      padding: `${buttonPaddingV || "4px"} ${buttonPaddingH || "12px"}`,
      background: isActive ? activeBackground || "rgba(255,255,255,0.1)" : "transparent",
      color: isActive ? activeColor || "#ffffff" : inactiveColor || "rgba(255,255,255,0.7)",
      cursor: "pointer",
      border: "none",
      transition: "color 0.15s ease, background-color 0.15s ease",
    };
  }

  const hoverClass = hoverColor ? "langswitch-hover" : "";

  return (
    <div style={containerStyle}>
      {hoverColor && (
        <style dangerouslySetInnerHTML={{ __html: `.${hoverClass}:hover{color:${hoverColor} !important;}` }} />
      )}
      <button type="button" onClick={() => selectLang("de")} className={lang !== "de" ? hoverClass : ""} style={buttonStyle(lang === "de")}>
        {deLabel || "De"}
      </button>
      <button type="button" onClick={() => selectLang("en")} className={lang !== "en" ? hoverClass : ""} style={buttonStyle(lang === "en")}>
        {enLabel || "En"}
      </button>
    </div>
  );
}
