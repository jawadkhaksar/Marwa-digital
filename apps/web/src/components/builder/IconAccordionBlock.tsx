"use client";

import { useState, type CSSProperties } from "react";
import type { IconAccordionItem } from "@marwa/builder";
import { IconGlyph } from "@/components/builder/IconGlyph";
import { GoogleFontLink } from "@/components/builder/GoogleFontLink";

export function IconAccordionBlock({
  items,
  allowMultipleOpen,
  openAllByDefault,
  defaultOpenIndex,
  iconOpen,
  iconClosed,
  questionColor,
  questionActiveColor,
  questionFontFamily,
  questionFontSize,
  questionFontWeight,
  questionTextTransform,
  questionFontStyle,
  questionTextDecoration,
  questionLineHeight,
  questionLetterSpacing,
  questionWordSpacing,
  answerColor,
  answerFontFamily,
  answerFontSize,
  answerFontWeight,
  answerTextTransform,
  answerFontStyle,
  answerTextDecoration,
  answerLineHeight,
  answerLetterSpacing,
  answerWordSpacing,
  iconColor,
  iconActiveColor,
  iconSize,
  iconBackground,
  iconBorderRadius,
  iconGap,
  dividerColor,
  dividerWidth,
  dividerStyle,
  itemBackground,
  activeBackground,
  itemGap,
  itemBorderRadius,
  itemBorderColor,
  itemBorderWidth,
  itemBorderStyle,
  itemBoxShadow,
  itemPaddingTop,
  itemPaddingRight,
  itemPaddingBottom,
  itemPaddingLeft,
}: {
  items: IconAccordionItem[];
  allowMultipleOpen?: boolean;
  openAllByDefault?: boolean;
  defaultOpenIndex?: string;
  iconOpen?: string;
  iconClosed?: string;
  questionColor?: string;
  questionActiveColor?: string;
  questionFontFamily?: string;
  questionFontSize?: string;
  questionFontWeight?: string;
  questionTextTransform?: string;
  questionFontStyle?: string;
  questionTextDecoration?: string;
  questionLineHeight?: string;
  questionLetterSpacing?: string;
  questionWordSpacing?: string;
  answerColor?: string;
  answerFontFamily?: string;
  answerFontSize?: string;
  answerFontWeight?: string;
  answerTextTransform?: string;
  answerFontStyle?: string;
  answerTextDecoration?: string;
  answerLineHeight?: string;
  answerLetterSpacing?: string;
  answerWordSpacing?: string;
  iconColor?: string;
  iconActiveColor?: string;
  iconSize?: string;
  iconBackground?: string;
  iconBorderRadius?: string;
  iconGap?: string;
  dividerColor?: string;
  dividerWidth?: string;
  dividerStyle?: string;
  itemBackground?: string;
  activeBackground?: string;
  itemGap?: string;
  itemBorderRadius?: string;
  itemBorderColor?: string;
  itemBorderWidth?: string;
  itemBorderStyle?: string;
  itemBoxShadow?: string;
  itemPaddingTop?: string;
  itemPaddingRight?: string;
  itemPaddingBottom?: string;
  itemPaddingLeft?: string;
}) {
  const initial = openAllByDefault
    ? new Set(items.map((_, i) => i))
    : defaultOpenIndex !== undefined && defaultOpenIndex !== ""
      ? new Set([Number(defaultOpenIndex)])
      : new Set<number>();
  const [openSet, setOpenSet] = useState<Set<number>>(initial);

  if (!items || items.length === 0) return null;

  function toggle(i: number) {
    setOpenSet((prev) => {
      const next = allowMultipleOpen ? new Set(prev) : new Set<number>();
      if (prev.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const questionStyle: CSSProperties = {
    flex: 1,
    fontFamily: questionFontFamily && questionFontFamily !== "inherit" ? questionFontFamily : undefined,
    fontSize: `var(--exr-questionFontSize, ${questionFontSize || "inherit"})`,
    fontWeight: `var(--exr-questionFontWeight, ${questionFontWeight || "600"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-questionTextTransform, ${questionTextTransform || "none"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-questionFontStyle, ${questionFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-questionTextDecoration, ${questionTextDecoration || "none"})`,
    lineHeight: `var(--exr-questionLineHeight, ${questionLineHeight || "inherit"})`,
    letterSpacing: `var(--exr-questionLetterSpacing, ${questionLetterSpacing || "normal"})`,
    wordSpacing: `var(--exr-questionWordSpacing, ${questionWordSpacing || "normal"})`,
  };

  const answerStyle: CSSProperties = {
    fontFamily: answerFontFamily && answerFontFamily !== "inherit" ? answerFontFamily : undefined,
    fontSize: `var(--exr-answerFontSize, ${answerFontSize || "inherit"})`,
    fontWeight: `var(--exr-answerFontWeight, ${answerFontWeight || "400"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-answerTextTransform, ${answerTextTransform || "none"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-answerFontStyle, ${answerFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-answerTextDecoration, ${answerTextDecoration || "none"})`,
    lineHeight: `var(--exr-answerLineHeight, ${answerLineHeight || "inherit"})`,
    letterSpacing: `var(--exr-answerLetterSpacing, ${answerLetterSpacing || "normal"})`,
    wordSpacing: `var(--exr-answerWordSpacing, ${answerWordSpacing || "normal"})`,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `var(--exr-itemGap, ${itemGap || "0px"})` }}>
      <GoogleFontLink family={questionFontFamily} />
      <GoogleFontLink family={answerFontFamily} />
      {items.map((item, i) => {
        const isOpen = openSet.has(i);
        const activeIcon = item.icon || (isOpen ? iconOpen || "FaMinus" : iconClosed || "FaPlus");
        return (
          <div
            key={i}
            style={{
              borderBottom:
                i < items.length - 1 && (!itemGap || itemGap === "0px")
                  ? `var(--exr-dividerWidth, ${dividerWidth || "1px"}) var(--exr-dividerStyle, ${dividerStyle || "solid"}) var(--exr-dividerColor, ${dividerColor || "rgba(0,0,0,0.08)"})`
                  : undefined,
              background: isOpen ? `var(--exr-activeBackground, ${activeBackground || "transparent"})` : `var(--exr-itemBackground, ${itemBackground || "transparent"})`,
              borderRadius: `var(--exr-itemBorderRadius, ${itemBorderRadius || "0px"})`,
              borderStyle: itemBorderStyle && itemBorderStyle !== "none" ? itemBorderStyle : undefined,
              borderWidth: itemBorderStyle && itemBorderStyle !== "none" ? `var(--exr-itemBorderWidth, ${itemBorderWidth || "1px"})` : undefined,
              borderColor: itemBorderStyle && itemBorderStyle !== "none" ? `var(--exr-itemBorderColor, ${itemBorderColor || "rgba(0,0,0,0.08)"})` : undefined,
              boxShadow: itemBoxShadow ? `var(--exr-itemBoxShadow, ${itemBoxShadow})` : undefined,
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              onClick={() => toggle(i)}
              aria-expanded={isOpen}
              style={{
                display: "flex",
                width: "100%",
                alignItems: "center",
                gap: `var(--exr-iconGap, ${iconGap || "12px"})`,
                paddingTop: `var(--exr-itemPaddingTop, ${itemPaddingTop || "16px"})`,
                paddingRight: `var(--exr-itemPaddingRight, ${itemPaddingRight || "4px"})`,
                paddingBottom: `var(--exr-itemPaddingBottom, ${itemPaddingBottom || "16px"})`,
                paddingLeft: `var(--exr-itemPaddingLeft, ${itemPaddingLeft || "4px"})`,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: isOpen ? `var(--exr-iconActiveColor, ${iconActiveColor || iconColor || "#2563FF"})` : `var(--exr-iconColor, ${iconColor || "#2563FF"})`,
                  fontSize: `var(--exr-iconSize, ${iconSize || "inherit"})`,
                  width: iconSize ? `var(--exr-iconSize, ${iconSize})` : undefined,
                  height: iconSize ? `var(--exr-iconSize, ${iconSize})` : undefined,
                  background: iconBackground ? `var(--exr-iconBackground, ${iconBackground})` : undefined,
                  borderRadius: iconBackground ? `var(--exr-iconBorderRadius, ${iconBorderRadius || "0px"})` : undefined,
                }}
              >
                <IconGlyph icon={activeIcon} />
              </span>
              <span style={{ ...questionStyle, color: isOpen ? `var(--exr-questionActiveColor, ${questionActiveColor || questionColor || "inherit"})` : `var(--exr-questionColor, ${questionColor || "inherit"})` }}>
                {item.question}
              </span>
            </button>
            {isOpen && (
              <div
                style={{
                  paddingRight: `var(--exr-itemPaddingRight, ${itemPaddingRight || "4px"})`,
                  paddingBottom: `var(--exr-itemPaddingBottom, ${itemPaddingBottom || "16px"})`,
                  paddingLeft: `var(--exr-itemPaddingLeft, ${itemPaddingLeft || "4px"})`,
                  color: `var(--exr-answerColor, ${answerColor || "inherit"})`,
                  ...answerStyle,
                }}
              >
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
