"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import type { TabItem } from "@marwa/builder";
import { IconGlyph } from "@/components/builder/IconGlyph";

function hashString(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

export function TabsBlock({
  tabs,
  tabFontFamily,
  tabFontSize,
  tabFontWeight,
  tabLineHeight,
  tabLetterSpacing,
  tabTextTransform,
  tabColor,
  tabHoverColor,
  tabActiveColor,
  tabBackground,
  tabHoverBackground,
  tabActiveBackground,
  tabBorderColor,
  tabActiveBorderColor,
  tabBorderStyle,
  tabBorderWidth,
  tabBoxShadow,
  tabPaddingTop,
  tabPaddingRight,
  tabPaddingBottom,
  tabPaddingLeft,
  tabGap,
  tabBorderRadiusTop,
  tabBorderRadiusRight,
  tabBorderRadiusBottom,
  tabBorderRadiusLeft,
  contentColor,
  contentBackground,
  contentFontFamily,
  contentFontSize,
  contentFontWeight,
  contentLineHeight,
  contentLetterSpacing,
  contentTextTransform,
  contentPaddingTop,
  contentPaddingRight,
  contentPaddingBottom,
  contentPaddingLeft,
  contentBorderStyle,
  contentBorderWidth,
  contentBorderWidthTop,
  contentBorderWidthRight,
  contentBorderWidthBottom,
  contentBorderWidthLeft,
  contentBorderColor,
  contentBorderRadiusTop,
  contentBorderRadiusRight,
  contentBorderRadiusBottom,
  contentBorderRadiusLeft,
  contentBoxShadow,
}: {
  tabs: TabItem[];
  tabFontFamily?: string;
  tabFontSize?: string;
  tabFontWeight?: string;
  tabLineHeight?: string;
  tabLetterSpacing?: string;
  tabTextTransform?: CSSProperties["textTransform"];
  tabColor?: string;
  tabHoverColor?: string;
  tabActiveColor?: string;
  tabBackground?: string;
  tabHoverBackground?: string;
  tabActiveBackground?: string;
  tabBorderColor?: string;
  tabActiveBorderColor?: string;
  tabBorderStyle?: "none" | "solid" | "dashed" | "dotted";
  tabBorderWidth?: string;
  tabBoxShadow?: string;
  tabPaddingTop?: string;
  tabPaddingRight?: string;
  tabPaddingBottom?: string;
  tabPaddingLeft?: string;
  tabGap?: string;
  tabBorderRadiusTop?: string;
  tabBorderRadiusRight?: string;
  tabBorderRadiusBottom?: string;
  tabBorderRadiusLeft?: string;
  contentColor?: string;
  contentBackground?: string;
  contentFontFamily?: string;
  contentFontSize?: string;
  contentFontWeight?: string;
  contentLineHeight?: string;
  contentLetterSpacing?: string;
  contentTextTransform?: CSSProperties["textTransform"];
  contentPaddingTop?: string;
  contentPaddingRight?: string;
  contentPaddingBottom?: string;
  contentPaddingLeft?: string;
  contentBorderStyle?: "none" | "solid" | "dashed" | "dotted";
  contentBorderWidth?: string;
  contentBorderWidthTop?: string;
  contentBorderWidthRight?: string;
  contentBorderWidthBottom?: string;
  contentBorderWidthLeft?: string;
  contentBorderColor?: string;
  contentBorderRadiusTop?: string;
  contentBorderRadiusRight?: string;
  contentBorderRadiusBottom?: string;
  contentBorderRadiusLeft?: string;
  contentBoxShadow?: string;
}) {
  const [active, setActive] = useState(0);
  if (!tabs || tabs.length === 0) return null;

  const hoverClassName = `exr-tab-btn-h${hashString(`${tabHoverColor ?? ""}|${tabHoverBackground ?? ""}`)}`;

  return (
    <div className="mx-auto max-w-3xl px-6 md:px-12">
      <style
        dangerouslySetInnerHTML={{
          __html: `.${hoverClassName}:not([data-active="true"]):hover{${[
            `color:var(--exr-tabHoverColor, ${tabHoverColor || "inherit"}) !important;`,
            `background:var(--exr-tabHoverBackground, ${tabHoverBackground || "transparent"}) !important;`,
          ].join("")}}`,
        }}
      />
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: `var(--exr-tabGap, ${tabGap || "8px"})`,
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {tabs.map((tab, i) => {
          const isActive = i === active;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={hoverClassName}
              data-active={isActive}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                border: "none",
                cursor: "pointer",
                transition: "color 0.2s ease, background 0.2s ease",
                fontFamily: tabFontFamily && tabFontFamily !== "inherit" ? tabFontFamily : undefined,
                fontSize: `var(--exr-tabFontSize, ${tabFontSize || "14px"})`,
                fontWeight: `var(--exr-tabFontWeight, ${tabFontWeight || "500"})` as CSSProperties["fontWeight"],
                lineHeight: tabLineHeight ? `var(--exr-tabLineHeight, ${tabLineHeight})` : undefined,
                letterSpacing: tabLetterSpacing ? `var(--exr-tabLetterSpacing, ${tabLetterSpacing})` : undefined,
                textTransform: `var(--exr-tabTextTransform, ${tabTextTransform || "none"})` as CSSProperties["textTransform"],
                color: isActive ? `var(--exr-tabActiveColor, ${tabActiveColor || "#2563FF"})` : `var(--exr-tabColor, ${tabColor || "inherit"})`,
                background: isActive ? `var(--exr-tabActiveBackground, ${tabActiveBackground || "transparent"})` : `var(--exr-tabBackground, ${tabBackground || "transparent"})`,
                borderBottomStyle: (tabBorderStyle && tabBorderStyle !== "none" ? tabBorderStyle : "solid") as CSSProperties["borderBottomStyle"],
                borderBottomWidth: `var(--exr-tabBorderWidth, ${tabBorderWidth || "2px"})`,
                borderBottomColor: isActive ? `var(--exr-tabActiveBorderColor, ${tabActiveBorderColor || "#2563FF"})` : `var(--exr-tabBorderColor, ${tabBorderColor || "transparent"})`,
                boxShadow: tabBoxShadow ? `var(--exr-tabBoxShadow, ${tabBoxShadow})` : undefined,
                marginBottom: "-1px",
                borderRadius: `var(--exr-tabBorderRadiusTop, ${tabBorderRadiusTop || "0"}) var(--exr-tabBorderRadiusRight, ${tabBorderRadiusRight || "0"}) var(--exr-tabBorderRadiusBottom, ${tabBorderRadiusBottom || "0"}) var(--exr-tabBorderRadiusLeft, ${tabBorderRadiusLeft || "0"})`,
                paddingTop: `var(--exr-tabPaddingTop, ${tabPaddingTop || "8px"})`,
                paddingRight: `var(--exr-tabPaddingRight, ${tabPaddingRight || "16px"})`,
                paddingBottom: `var(--exr-tabPaddingBottom, ${tabPaddingBottom || "8px"})`,
                paddingLeft: `var(--exr-tabPaddingLeft, ${tabPaddingLeft || "16px"})`,
              }}
            >
              {tab.icon && <IconGlyph icon={tab.icon} />}
              {tab.label}
            </button>
          );
        })}
      </div>
      {/* Content is rich HTML (same trust boundary/authoring path as RichText's `html` field, edited via the same Tiptap editor) — not plain text. */}
      <div
        className="tiptap-content"
        style={{
          fontFamily: contentFontFamily && contentFontFamily !== "inherit" ? contentFontFamily : undefined,
          fontSize: `var(--exr-contentFontSize, ${contentFontSize || "14px"})`,
          fontWeight: `var(--exr-contentFontWeight, ${contentFontWeight || "400"})` as CSSProperties["fontWeight"],
          lineHeight: contentLineHeight ? `var(--exr-contentLineHeight, ${contentLineHeight})` : undefined,
          letterSpacing: contentLetterSpacing ? `var(--exr-contentLetterSpacing, ${contentLetterSpacing})` : undefined,
          textTransform: `var(--exr-contentTextTransform, ${contentTextTransform || "none"})` as CSSProperties["textTransform"],
          color: `var(--exr-contentColor, ${contentColor || "inherit"})`,
          background: `var(--exr-contentBackground, ${contentBackground || "transparent"})`,
          borderStyle: contentBorderStyle && contentBorderStyle !== "none" ? contentBorderStyle : undefined,
          borderTopWidth: contentBorderStyle && contentBorderStyle !== "none" ? `var(--exr-contentBorderWidthTop, ${contentBorderWidthTop || contentBorderWidth || "1px"})` : undefined,
          borderRightWidth: contentBorderStyle && contentBorderStyle !== "none" ? `var(--exr-contentBorderWidthRight, ${contentBorderWidthRight || contentBorderWidth || "1px"})` : undefined,
          borderBottomWidth: contentBorderStyle && contentBorderStyle !== "none" ? `var(--exr-contentBorderWidthBottom, ${contentBorderWidthBottom || contentBorderWidth || "1px"})` : undefined,
          borderLeftWidth: contentBorderStyle && contentBorderStyle !== "none" ? `var(--exr-contentBorderWidthLeft, ${contentBorderWidthLeft || contentBorderWidth || "1px"})` : undefined,
          borderColor: contentBorderStyle && contentBorderStyle !== "none" ? `var(--exr-contentBorderColor, ${contentBorderColor || "transparent"})` : undefined,
          borderRadius: `var(--exr-contentBorderRadiusTop, ${contentBorderRadiusTop || "0"}) var(--exr-contentBorderRadiusRight, ${contentBorderRadiusRight || "0"}) var(--exr-contentBorderRadiusBottom, ${contentBorderRadiusBottom || "0"}) var(--exr-contentBorderRadiusLeft, ${contentBorderRadiusLeft || "0"})`,
          boxShadow: contentBoxShadow ? `var(--exr-contentBoxShadow, ${contentBoxShadow})` : undefined,
          paddingTop: `var(--exr-contentPaddingTop, ${contentPaddingTop || "24px"})`,
          paddingRight: `var(--exr-contentPaddingRight, ${contentPaddingRight || "0px"})`,
          paddingBottom: `var(--exr-contentPaddingBottom, ${contentPaddingBottom || "24px"})`,
          paddingLeft: `var(--exr-contentPaddingLeft, ${contentPaddingLeft || "0px"})`,
        }}
        dangerouslySetInnerHTML={{ __html: tabs[active]?.content ?? "" }}
      />
    </div>
  );
}
