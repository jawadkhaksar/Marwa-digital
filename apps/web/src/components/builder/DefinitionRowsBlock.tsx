"use client";

import { useState, type CSSProperties } from "react";
import type { DefinitionRowItem } from "@marwa/builder";
import { GoogleFontLink } from "@/components/builder/GoogleFontLink";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { buildButtonHoverStyle } from "./buttonHoverStyle";

/**
 * A repeatable "label left / content right" definition list — the shape
 * used by Privacy Policy / Terms-style legal content ("Data Controller" /
 * the paragraph explaining it), generic enough for any label+detail
 * section. `intro`, each item's `content`, and `footerNote` accept raw
 * HTML via dangerouslySetInnerHTML — same trust boundary as Faq's answer /
 * IconList's text elsewhere in this codebase. The admin edits `content`
 * through the shared RichTextEditor (WYSIWYG); its "Source" view still
 * allows pasting raw markup (e.g. a <table> for a row like "Legal Basis
 * for Processing") the WYSIWYG toolbar itself has no button for.
 *
 * Every Style-tab field reads through `var(--exr-{key}, {desktop value})`
 * — the same var-bridge convention every block in this codebase uses (see
 * resolveNodeStyle.ts's mintVars) — so Tablet/Mobile overrides actually
 * take effect.
 */
export function DefinitionRowsBlock({
  intro,
  items,
  footerNote,
  showMoreLimit,
  showMoreLabel,
  showLessLabel,
  showMoreBackground,
  showMoreColor,
  showMoreHoverBackground,
  showMoreHoverColor,
  showMoreBorderStyle,
  showMoreBorderWidth,
  showMoreBorderColor,
  showMoreBorderRadius,
  showMoreBoxShadow,
  showMoreHoverBoxShadow,
  showMoreHoverBackgroundSize,
  showMoreHoverBackgroundPosition,
  showMoreHoverTransitionDuration,
  showMorePaddingV,
  showMorePaddingH,
  showMorePaddingTop,
  showMorePaddingRight,
  showMorePaddingBottom,
  showMorePaddingLeft,
  showMoreMarginTop,
  showMoreMarginRight,
  showMoreMarginBottom,
  showMoreMarginLeft,
  showMoreFontFamily,
  showMoreFontSize,
  showMoreFontWeight,
  showMoreTextTransform,
  showMoreFontStyle,
  showMoreTextDecoration,
  showMoreLineHeight,
  showMoreLetterSpacing,
  showMoreWordSpacing,
  labelWidth,
  columnGap,
  rowGap,
  dividerEnabled,
  dividerColor,
  dividerWidth,
  dividerStyle,
  labelColor,
  labelFontFamily,
  labelFontSize,
  labelFontWeight,
  labelTextTransform,
  labelFontStyle,
  labelTextDecoration,
  labelLineHeight,
  labelLetterSpacing,
  labelWordSpacing,
  contentColor,
  contentLinkColor,
  contentFontFamily,
  contentFontSize,
  contentFontWeight,
  contentTextTransform,
  contentFontStyle,
  contentTextDecoration,
  contentLineHeight,
  contentLetterSpacing,
  contentWordSpacing,
  backgroundImage,
  imagePosition,
  backgroundImageWidth,
  backgroundImageOpacity,
  overlayColor,
  containerBackground,
  containerMaxWidth,
  containerBorderRadius,
  containerPaddingTop,
  containerPaddingRight,
  containerPaddingBottom,
  containerPaddingLeft,
}: {
  intro?: string;
  items?: DefinitionRowItem[];
  footerNote?: string;
  showMoreLimit?: string;
  showMoreLabel?: string;
  showLessLabel?: string;
  showMoreBackground?: string;
  showMoreColor?: string;
  showMoreHoverBackground?: string;
  showMoreHoverColor?: string;
  showMoreBorderStyle?: string;
  showMoreBorderWidth?: string;
  showMoreBorderColor?: string;
  showMoreBorderRadius?: string;
  showMoreBoxShadow?: string;
  showMoreHoverBoxShadow?: string;
  showMoreHoverBackgroundSize?: string;
  showMoreHoverBackgroundPosition?: string;
  showMoreHoverTransitionDuration?: string;
  showMorePaddingV?: string;
  showMorePaddingH?: string;
  showMorePaddingTop?: string;
  showMorePaddingRight?: string;
  showMorePaddingBottom?: string;
  showMorePaddingLeft?: string;
  showMoreMarginTop?: string;
  showMoreMarginRight?: string;
  showMoreMarginBottom?: string;
  showMoreMarginLeft?: string;
  showMoreFontFamily?: string;
  showMoreFontSize?: string;
  showMoreFontWeight?: string;
  showMoreTextTransform?: string;
  showMoreFontStyle?: string;
  showMoreTextDecoration?: string;
  showMoreLineHeight?: string;
  showMoreLetterSpacing?: string;
  showMoreWordSpacing?: string;
  labelWidth?: string;
  columnGap?: string;
  rowGap?: string;
  dividerEnabled?: boolean;
  dividerColor?: string;
  dividerWidth?: string;
  dividerStyle?: string;
  labelColor?: string;
  labelFontFamily?: string;
  labelFontSize?: string;
  labelFontWeight?: string;
  labelTextTransform?: string;
  labelFontStyle?: string;
  labelTextDecoration?: string;
  labelLineHeight?: string;
  labelLetterSpacing?: string;
  labelWordSpacing?: string;
  contentColor?: string;
  contentLinkColor?: string;
  contentFontFamily?: string;
  contentFontSize?: string;
  contentFontWeight?: string;
  contentTextTransform?: string;
  contentFontStyle?: string;
  contentTextDecoration?: string;
  contentLineHeight?: string;
  contentLetterSpacing?: string;
  contentWordSpacing?: string;
  backgroundImage?: string;
  imagePosition?: "left" | "right";
  backgroundImageWidth?: string;
  backgroundImageOpacity?: string;
  overlayColor?: string;
  containerBackground?: string;
  containerMaxWidth?: string;
  containerBorderRadius?: string;
  containerPaddingTop?: string;
  containerPaddingRight?: string;
  containerPaddingBottom?: string;
  containerPaddingLeft?: string;
}) {
  const allRows = (items ?? []).filter((r) => r.label || r.content);
  const [showAll, setShowAll] = useState(false);
  const limit = Number.parseInt(showMoreLimit || "5", 10) || 5;
  const hasMore = allRows.length > limit;
  const rows = showAll ? allRows : allRows.slice(0, limit);
  const side = imagePosition === "left" ? "left" : "right";

  const contentStyle: CSSProperties = {
    color: `var(--exr-contentColor, ${contentColor || "inherit"})`,
    fontFamily: contentFontFamily && contentFontFamily !== "inherit" ? contentFontFamily : undefined,
    fontSize: `var(--exr-contentFontSize, ${contentFontSize || "15px"})`,
    fontWeight: `var(--exr-contentFontWeight, ${contentFontWeight || "400"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-contentTextTransform, ${contentTextTransform || "none"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-contentFontStyle, ${contentFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-contentTextDecoration, ${contentTextDecoration || "none"})`,
    lineHeight: `var(--exr-contentLineHeight, ${contentLineHeight || "1.7"})`,
    letterSpacing: `var(--exr-contentLetterSpacing, ${contentLetterSpacing || "normal"})`,
    wordSpacing: `var(--exr-contentWordSpacing, ${contentWordSpacing || "normal"})`,
  };

  const showMoreHover = buildButtonHoverStyle("defrows-showmore", {
    background: showMoreBackground,
    hoverBackground: showMoreHoverBackground,
    hoverColor: showMoreHoverColor,
    hoverBoxShadow: showMoreHoverBoxShadow,
    hoverBackgroundSize: showMoreHoverBackgroundSize,
    hoverBackgroundPosition: showMoreHoverBackgroundPosition,
    hoverTransitionDuration: showMoreHoverTransitionDuration,
  });

  const showMoreStyle: CSSProperties = {
    background: `var(--exr-showMoreBackground, ${showMoreBackground || "#2563ff"})`,
    color: `var(--exr-showMoreColor, ${showMoreColor || "#171717"})`,
    fontFamily: showMoreFontFamily && showMoreFontFamily !== "inherit" ? showMoreFontFamily : undefined,
    fontSize: `var(--exr-showMoreFontSize, ${showMoreFontSize || "14px"})`,
    fontWeight: `var(--exr-showMoreFontWeight, ${showMoreFontWeight || "700"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-showMoreTextTransform, ${showMoreTextTransform || "none"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-showMoreFontStyle, ${showMoreFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-showMoreTextDecoration, ${showMoreTextDecoration || "none"})`,
    lineHeight: `var(--exr-showMoreLineHeight, ${showMoreLineHeight || "normal"})`,
    letterSpacing: `var(--exr-showMoreLetterSpacing, ${showMoreLetterSpacing || "normal"})`,
    wordSpacing: `var(--exr-showMoreWordSpacing, ${showMoreWordSpacing || "normal"})`,
    borderStyle: `var(--exr-showMoreBorderStyle, ${showMoreBorderStyle || "none"})` as CSSProperties["borderStyle"],
    borderWidth: `var(--exr-showMoreBorderWidth, ${showMoreBorderWidth || "0px"})`,
    borderColor: `var(--exr-showMoreBorderColor, ${showMoreBorderColor || "transparent"})`,
    borderRadius: `var(--exr-showMoreBorderRadius, ${showMoreBorderRadius || "999px"})`,
    boxShadow: `var(--exr-showMoreBoxShadow, ${showMoreBoxShadow || "none"})`,
    paddingTop: `var(--exr-showMorePaddingTop, ${showMorePaddingTop || showMorePaddingV || "12px"})`,
    paddingRight: `var(--exr-showMorePaddingRight, ${showMorePaddingRight || showMorePaddingH || "28px"})`,
    paddingBottom: `var(--exr-showMorePaddingBottom, ${showMorePaddingBottom || showMorePaddingV || "12px"})`,
    paddingLeft: `var(--exr-showMorePaddingLeft, ${showMorePaddingLeft || showMorePaddingH || "28px"})`,
    marginTop: `var(--exr-showMoreMarginTop, ${showMoreMarginTop || "0px"})`,
    marginRight: `var(--exr-showMoreMarginRight, ${showMoreMarginRight || "0px"})`,
    marginBottom: `var(--exr-showMoreMarginBottom, ${showMoreMarginBottom || "0px"})`,
    marginLeft: `var(--exr-showMoreMarginLeft, ${showMoreMarginLeft || "0px"})`,
    cursor: "pointer",
    ...showMoreHover.restingStyle,
  };

  const labelStyle: CSSProperties = {
    color: `var(--exr-labelColor, ${labelColor || "inherit"})`,
    fontFamily: labelFontFamily && labelFontFamily !== "inherit" ? labelFontFamily : undefined,
    fontSize: `var(--exr-labelFontSize, ${labelFontSize || "18px"})`,
    fontWeight: `var(--exr-labelFontWeight, ${labelFontWeight || "700"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-labelTextTransform, ${labelTextTransform || "none"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-labelFontStyle, ${labelFontStyle || "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-labelTextDecoration, ${labelTextDecoration || "none"})`,
    lineHeight: `var(--exr-labelLineHeight, ${labelLineHeight || "1.4"})`,
    letterSpacing: `var(--exr-labelLetterSpacing, ${labelLetterSpacing || "normal"})`,
    wordSpacing: `var(--exr-labelWordSpacing, ${labelWordSpacing || "normal"})`,
  };

  const divider =
    dividerEnabled !== false
      ? `var(--exr-dividerWidth, ${dividerWidth || "1px"}) var(--exr-dividerStyle, ${dividerStyle || "solid"}) var(--exr-dividerColor, ${dividerColor || "rgba(0,0,0,0.1)"})`
      : undefined;

  return (
    <div
      className="definition-rows relative w-full"
      style={{
        background: containerBackground || undefined,
        maxWidth: containerMaxWidth || undefined,
        borderRadius: containerBorderRadius || undefined,
        paddingTop: containerPaddingTop || undefined,
        paddingRight: containerPaddingRight || undefined,
        paddingBottom: containerPaddingBottom || undefined,
        paddingLeft: containerPaddingLeft || undefined,
        overflow: backgroundImage ? "hidden" : undefined,
      }}
    >
      <GoogleFontLink family={labelFontFamily} />
      <GoogleFontLink family={contentFontFamily} />
      <GoogleFontLink family={showMoreFontFamily} />

      {backgroundImage && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded content, see ImageBox for the same fix */}
          <img
            src={resolveImageUrl(backgroundImage)}
            alt=""
            aria-hidden="true"
            className="absolute inset-y-0 z-0 object-cover"
            style={{
              ...(side === "left" ? { left: 0 } : { right: 0 }),
              width: `var(--exr-backgroundImageWidth, ${backgroundImageWidth || "40%"})`,
              opacity: `var(--exr-backgroundImageOpacity, ${backgroundImageOpacity || "1"})`,
            }}
          />
          {overlayColor && (
            <div
              aria-hidden="true"
              className="absolute inset-y-0 z-0"
              style={{
                ...(side === "left" ? { left: 0 } : { right: 0 }),
                width: `var(--exr-backgroundImageWidth, ${backgroundImageWidth || "40%"})`,
                background: `linear-gradient(to ${side}, transparent, var(--exr-overlayColor, ${overlayColor}))`,
              }}
            />
          )}
        </>
      )}

      <div className="relative z-10 flex flex-col" style={{ gap: `var(--exr-rowGap, ${rowGap || "28px"})` }}>
        {intro && (
          <div
            className="definition-rows-content"
            style={contentStyle}
            dangerouslySetInnerHTML={{ __html: intro }}
          />
        )}

        {rows.map((row, i) => (
          <div
            key={i}
            className="flex flex-wrap"
            style={{
              gap: `var(--exr-columnGap, ${columnGap || "40px"})`,
              paddingBottom: `var(--exr-rowGap, ${rowGap || "28px"})`,
              borderBottom: i < rows.length - 1 ? divider : undefined,
            }}
          >
            {row.label && (
              <div style={{ flex: `0 1 var(--exr-labelWidth, ${labelWidth || "260px"})`, minWidth: "140px", ...labelStyle }}>
                {row.label}
              </div>
            )}
            {row.content && (
              <div
                className="definition-rows-content"
                style={{ flex: "1 1 280px", minWidth: 0, ...contentStyle }}
                dangerouslySetInnerHTML={{ __html: row.content }}
              />
            )}
          </div>
        ))}

        {hasMore && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              className={`transition-all ${showMoreHover.hoverClassName}`}
              style={showMoreStyle}
            >
              {showAll ? showLessLabel || "Read Less" : showMoreLabel || "Read More"}
            </button>
          </div>
        )}
        {showMoreHover.hoverCss && <style dangerouslySetInnerHTML={{ __html: showMoreHover.hoverCss }} />}

        {footerNote && (
          <div
            className="definition-rows-content"
            style={contentStyle}
            dangerouslySetInnerHTML={{ __html: footerNote }}
          />
        )}
      </div>

      {contentLinkColor && (
        <style dangerouslySetInnerHTML={{ __html: `.definition-rows-content a{color:${contentLinkColor} !important;}` }} />
      )}
    </div>
  );
}
