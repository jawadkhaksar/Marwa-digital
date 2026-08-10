"use client";

import { useState } from "react";
import type { CSSProperties, ElementType } from "react";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { GoogleFontLink } from "@/components/builder/GoogleFontLink";

function hashString(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

function fourSide(top?: string, right?: string, bottom?: string, left?: string): string | undefined {
  if (!top && !right && !bottom && !left) return undefined;
  return `${top || "0"} ${right || "0"} ${bottom || "0"} ${left || "0"}`;
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: expanded ? "rotate(180deg)" : undefined, transition: "transform 0.3s ease" }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function TextUnfoldBlock({
  includeImage,
  src,
  title,
  includeReadMore,
  expandMode,
  containerHeight,
  readMoreText,
  readLessText,
  includeIcon,
  html,
  imageAlignment,
  imageWidth,
  imageHeight,
  imageBoxShadow,
  imageBorderRadiusTop,
  imageBorderRadiusRight,
  imageBorderRadiusBottom,
  imageBorderRadiusLeft,
  imagePaddingTop,
  imagePaddingRight,
  imagePaddingBottom,
  imagePaddingLeft,
  imageMarginTop,
  imageMarginRight,
  imageMarginBottom,
  imageMarginLeft,
  titleColor,
  titleTag,
  titleFontFamily,
  titleFontSize,
  titleFontWeight,
  titleTextTransform,
  titleFontStyle,
  titleTextDecoration,
  titleLineHeight,
  titleLetterSpacing,
  titleWordSpacing,
  titleAlignment,
  titlePaddingTop,
  titlePaddingRight,
  titlePaddingBottom,
  titlePaddingLeft,
  titleMarginTop,
  titleMarginRight,
  titleMarginBottom,
  titleMarginLeft,
  background,
  color,
  fontFamily,
  fontSize,
  fontWeight,
  textTransform,
  fontStyle,
  textDecoration,
  lineHeight,
  letterSpacing,
  wordSpacing,
  align,
  borderStyle,
  borderWidth,
  borderWidthTop,
  borderWidthRight,
  borderWidthBottom,
  borderWidthLeft,
  borderColor,
  contentBorderRadiusTop,
  contentBorderRadiusRight,
  contentBorderRadiusBottom,
  contentBorderRadiusLeft,
  contentBoxShadow,
  contentPaddingTop,
  contentPaddingRight,
  contentPaddingBottom,
  contentPaddingLeft,
  contentMarginTop,
  contentMarginRight,
  contentMarginBottom,
  contentMarginLeft,
  enableFadeOverlay,
  overlayColor,
  overlayHeight,
  showScrollbar,
  scrollbarWidth,
  scrollbarRadius,
  scrollbarTrackColor,
  scrollbarThumbColor,
  scrollbarThumbHoverColor,
  readMoreAlignment,
  readMoreBackground,
  readMoreHoverBackground,
  readMoreColor,
  readMoreHoverColor,
  readMoreFontFamily,
  readMoreFontSize,
  readMoreFontWeight,
  readMoreTextTransform,
  readMoreFontStyle,
  readMoreTextDecoration,
  readMoreLineHeight,
  readMoreLetterSpacing,
  readMoreWordSpacing,
  readMoreBorderStyle,
  readMoreBorderWidth,
  readMoreBorderWidthTop,
  readMoreBorderWidthRight,
  readMoreBorderWidthBottom,
  readMoreBorderWidthLeft,
  readMoreBorderColor,
  readMoreBorderRadiusTop,
  readMoreBorderRadiusRight,
  readMoreBorderRadiusBottom,
  readMoreBorderRadiusLeft,
  readMorePaddingTop,
  readMorePaddingRight,
  readMorePaddingBottom,
  readMorePaddingLeft,
  readMoreMarginTop,
  readMoreMarginRight,
  readMoreMarginBottom,
  readMoreMarginLeft,
}: {
  includeImage?: boolean;
  src?: string;
  title?: string;
  includeReadMore?: boolean;
  expandMode?: "button" | "scroll";
  containerHeight?: string;
  readMoreText?: string;
  readLessText?: string;
  includeIcon?: boolean;
  html: string;
  imageAlignment?: "left" | "center" | "right";
  imageWidth?: string;
  imageHeight?: string;
  imageBoxShadow?: string;
  imageBorderRadiusTop?: string;
  imageBorderRadiusRight?: string;
  imageBorderRadiusBottom?: string;
  imageBorderRadiusLeft?: string;
  imagePaddingTop?: string;
  imagePaddingRight?: string;
  imagePaddingBottom?: string;
  imagePaddingLeft?: string;
  imageMarginTop?: string;
  imageMarginRight?: string;
  imageMarginBottom?: string;
  imageMarginLeft?: string;
  titleColor?: string;
  titleTag?: string;
  titleFontFamily?: string;
  titleFontSize?: string;
  titleFontWeight?: string;
  titleTextTransform?: CSSProperties["textTransform"];
  titleFontStyle?: CSSProperties["fontStyle"];
  titleTextDecoration?: string;
  titleLineHeight?: string;
  titleLetterSpacing?: string;
  titleWordSpacing?: string;
  titleAlignment?: "left" | "center" | "right";
  titlePaddingTop?: string;
  titlePaddingRight?: string;
  titlePaddingBottom?: string;
  titlePaddingLeft?: string;
  titleMarginTop?: string;
  titleMarginRight?: string;
  titleMarginBottom?: string;
  titleMarginLeft?: string;
  background?: string;
  color?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  textTransform?: CSSProperties["textTransform"];
  fontStyle?: CSSProperties["fontStyle"];
  textDecoration?: string;
  lineHeight?: string;
  letterSpacing?: string;
  wordSpacing?: string;
  align?: "left" | "center" | "right" | "justify";
  borderStyle?: "none" | "solid" | "dashed" | "dotted";
  borderWidth?: string;
  borderWidthTop?: string;
  borderWidthRight?: string;
  borderWidthBottom?: string;
  borderWidthLeft?: string;
  borderColor?: string;
  contentBorderRadiusTop?: string;
  contentBorderRadiusRight?: string;
  contentBorderRadiusBottom?: string;
  contentBorderRadiusLeft?: string;
  contentBoxShadow?: string;
  contentPaddingTop?: string;
  contentPaddingRight?: string;
  contentPaddingBottom?: string;
  contentPaddingLeft?: string;
  contentMarginTop?: string;
  contentMarginRight?: string;
  contentMarginBottom?: string;
  contentMarginLeft?: string;
  enableFadeOverlay?: boolean;
  overlayColor?: string;
  overlayHeight?: string;
  showScrollbar?: boolean;
  scrollbarWidth?: string;
  scrollbarRadius?: string;
  scrollbarTrackColor?: string;
  scrollbarThumbColor?: string;
  scrollbarThumbHoverColor?: string;
  readMoreAlignment?: "left" | "center" | "right";
  readMoreBackground?: string;
  readMoreHoverBackground?: string;
  readMoreColor?: string;
  readMoreHoverColor?: string;
  readMoreFontFamily?: string;
  readMoreFontSize?: string;
  readMoreFontWeight?: string;
  readMoreTextTransform?: CSSProperties["textTransform"];
  readMoreFontStyle?: CSSProperties["fontStyle"];
  readMoreTextDecoration?: string;
  readMoreLineHeight?: string;
  readMoreLetterSpacing?: string;
  readMoreWordSpacing?: string;
  readMoreBorderStyle?: "none" | "solid" | "dashed" | "dotted";
  readMoreBorderWidth?: string;
  readMoreBorderWidthTop?: string;
  readMoreBorderWidthRight?: string;
  readMoreBorderWidthBottom?: string;
  readMoreBorderWidthLeft?: string;
  readMoreBorderColor?: string;
  readMoreBorderRadiusTop?: string;
  readMoreBorderRadiusRight?: string;
  readMoreBorderRadiusBottom?: string;
  readMoreBorderRadiusLeft?: string;
  readMorePaddingTop?: string;
  readMorePaddingRight?: string;
  readMorePaddingBottom?: string;
  readMorePaddingLeft?: string;
  readMoreMarginTop?: string;
  readMoreMarginRight?: string;
  readMoreMarginBottom?: string;
  readMoreMarginLeft?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const isTruncatable = includeReadMore && expandMode === "scroll" ? true : includeReadMore && !expanded;
  const showOverlay = enableFadeOverlay && includeReadMore && (expandMode === "scroll" || !expanded);

  const imageStyle: CSSProperties = {
    width: imageWidth || undefined,
    height: imageHeight || undefined,
    boxShadow: imageBoxShadow || undefined,
    borderRadius: `var(--exr-imageBorderRadiusTop, ${imageBorderRadiusTop || "0"}) var(--exr-imageBorderRadiusRight, ${imageBorderRadiusRight || "0"}) var(--exr-imageBorderRadiusBottom, ${imageBorderRadiusBottom || "0"}) var(--exr-imageBorderRadiusLeft, ${imageBorderRadiusLeft || "0"})`,
    paddingTop: imagePaddingTop || undefined,
    paddingRight: imagePaddingRight || undefined,
    paddingBottom: imagePaddingBottom || undefined,
    paddingLeft: imagePaddingLeft || undefined,
    marginTop: imageMarginTop || undefined,
    marginRight: imageMarginRight || undefined,
    marginBottom: imageMarginBottom || undefined,
    marginLeft: imageMarginLeft || undefined,
    objectFit: "cover",
    display: "inline-block",
  };
  const imageWrapStyle: CSSProperties = {
    textAlign: imageAlignment || "center",
  };

  const TitleTag = (titleTag || "h3") as ElementType;
  const titleStyle: CSSProperties = {
    color: titleColor || undefined,
    fontFamily: titleFontFamily && titleFontFamily !== "inherit" ? titleFontFamily : undefined,
    fontSize: titleFontSize || undefined,
    fontWeight: titleFontWeight || undefined,
    textTransform: titleTextTransform && titleTextTransform !== "none" ? titleTextTransform : undefined,
    fontStyle: titleFontStyle && titleFontStyle !== "normal" ? titleFontStyle : undefined,
    textDecoration: titleTextDecoration && titleTextDecoration !== "none" ? titleTextDecoration : undefined,
    lineHeight: titleLineHeight || undefined,
    letterSpacing: titleLetterSpacing || undefined,
    wordSpacing: titleWordSpacing || undefined,
    textAlign: titleAlignment || "left",
    paddingTop: titlePaddingTop || undefined,
    paddingRight: titlePaddingRight || undefined,
    paddingBottom: titlePaddingBottom || undefined,
    paddingLeft: titlePaddingLeft || undefined,
    marginTop: titleMarginTop || undefined,
    marginRight: titleMarginRight || undefined,
    marginBottom: titleMarginBottom || undefined,
    marginLeft: titleMarginLeft || undefined,
  };

  const wrapperStyle: CSSProperties = {
    position: "relative",
    background: background || undefined,
    borderStyle: borderStyle && borderStyle !== "none" ? borderStyle : undefined,
    borderWidth: borderStyle && borderStyle !== "none" ? fourSide(borderWidthTop || borderWidth, borderWidthRight || borderWidth, borderWidthBottom || borderWidth, borderWidthLeft || borderWidth) || "1px" : undefined,
    borderColor: borderStyle && borderStyle !== "none" ? borderColor || undefined : undefined,
    borderRadius: `var(--exr-contentBorderRadiusTop, ${contentBorderRadiusTop || "0"}) var(--exr-contentBorderRadiusRight, ${contentBorderRadiusRight || "0"}) var(--exr-contentBorderRadiusBottom, ${contentBorderRadiusBottom || "0"}) var(--exr-contentBorderRadiusLeft, ${contentBorderRadiusLeft || "0"})`,
    boxShadow: contentBoxShadow || undefined,
    paddingTop: contentPaddingTop || undefined,
    paddingRight: contentPaddingRight || undefined,
    paddingBottom: contentPaddingBottom || undefined,
    paddingLeft: contentPaddingLeft || undefined,
    marginTop: contentMarginTop || undefined,
    marginRight: contentMarginRight || undefined,
    marginBottom: contentMarginBottom || undefined,
    marginLeft: contentMarginLeft || undefined,
  };

  const innerStyle: CSSProperties = {
    color: color || undefined,
    fontFamily: fontFamily && fontFamily !== "inherit" ? fontFamily : undefined,
    fontSize: fontSize || undefined,
    fontWeight: fontWeight || undefined,
    textTransform: textTransform && textTransform !== "none" ? textTransform : undefined,
    fontStyle: fontStyle && fontStyle !== "normal" ? fontStyle : undefined,
    textDecoration: textDecoration && textDecoration !== "none" ? textDecoration : undefined,
    lineHeight: lineHeight || undefined,
    letterSpacing: letterSpacing || undefined,
    wordSpacing: wordSpacing || undefined,
    textAlign: align || "left",
    maxHeight: isTruncatable ? containerHeight || "70px" : undefined,
    overflow: expandMode === "scroll" ? "auto" : "hidden",
    transition: expandMode === "button" ? "max-height 0.4s ease" : undefined,
  };
  // Expanding a fixed max-height smoothly requires animating to another
  // fixed (large) value — "none"/"auto" can't be a CSS transition endpoint.
  if (includeReadMore && expandMode === "button" && expanded) innerStyle.maxHeight = "5000px";

  const hasHoverOverride = readMoreHoverBackground || readMoreHoverColor;
  const hoverClassName = hasHoverOverride ? `tu-h${hashString(`${readMoreHoverBackground ?? ""}|${readMoreHoverColor ?? ""}`)}` : "";

  // Scrollbar styling only matters in Scroll mode — pseudo-elements can't be
  // expressed as inline styles, so this is a scoped <style> block like the
  // hover rules above, keyed off every scrollbar prop so a change to any of
  // them produces a fresh (correctly-updated) class name.
  const scrollClassName =
    expandMode === "scroll"
      ? `tu-scroll${hashString(`${showScrollbar}|${scrollbarWidth ?? ""}|${scrollbarRadius ?? ""}|${scrollbarTrackColor ?? ""}|${scrollbarThumbColor ?? ""}|${scrollbarThumbHoverColor ?? ""}`)}`
      : "";
  const scrollbarCss =
    scrollClassName &&
    (showScrollbar === false
      ? `.${scrollClassName}{scrollbar-width:none;}.${scrollClassName}::-webkit-scrollbar{display:none;}`
      : `.${scrollClassName}{scrollbar-width:thin;scrollbar-color:${scrollbarThumbColor || "rgba(148,148,148,0.5)"} ${scrollbarTrackColor || "transparent"};}
.${scrollClassName}::-webkit-scrollbar{width:${scrollbarWidth || "8px"};}
.${scrollClassName}::-webkit-scrollbar-track{background:${scrollbarTrackColor || "transparent"};}
.${scrollClassName}::-webkit-scrollbar-thumb{background:${scrollbarThumbColor || "rgba(148,148,148,0.5)"};border-radius:${scrollbarRadius || "9999px"};}
${scrollbarThumbHoverColor ? `.${scrollClassName}::-webkit-scrollbar-thumb:hover{background:${scrollbarThumbHoverColor};}` : ""}`);

  const buttonStyle: CSSProperties = {
    background: readMoreBackground || "transparent",
    color: readMoreColor || undefined,
    fontFamily: readMoreFontFamily && readMoreFontFamily !== "inherit" ? readMoreFontFamily : undefined,
    fontSize: readMoreFontSize || undefined,
    fontWeight: readMoreFontWeight || undefined,
    textTransform: readMoreTextTransform && readMoreTextTransform !== "none" ? readMoreTextTransform : undefined,
    fontStyle: readMoreFontStyle && readMoreFontStyle !== "normal" ? readMoreFontStyle : undefined,
    textDecoration: readMoreTextDecoration && readMoreTextDecoration !== "none" ? readMoreTextDecoration : undefined,
    lineHeight: readMoreLineHeight || undefined,
    letterSpacing: readMoreLetterSpacing || undefined,
    wordSpacing: readMoreWordSpacing || undefined,
    borderStyle: readMoreBorderStyle && readMoreBorderStyle !== "none" ? readMoreBorderStyle : undefined,
    borderTopWidth: readMoreBorderStyle && readMoreBorderStyle !== "none" ? `var(--exr-readMoreBorderWidthTop, ${readMoreBorderWidthTop || readMoreBorderWidth || "1px"})` : undefined,
    borderRightWidth: readMoreBorderStyle && readMoreBorderStyle !== "none" ? `var(--exr-readMoreBorderWidthRight, ${readMoreBorderWidthRight || readMoreBorderWidth || "1px"})` : undefined,
    borderBottomWidth: readMoreBorderStyle && readMoreBorderStyle !== "none" ? `var(--exr-readMoreBorderWidthBottom, ${readMoreBorderWidthBottom || readMoreBorderWidth || "1px"})` : undefined,
    borderLeftWidth: readMoreBorderStyle && readMoreBorderStyle !== "none" ? `var(--exr-readMoreBorderWidthLeft, ${readMoreBorderWidthLeft || readMoreBorderWidth || "1px"})` : undefined,
    borderColor: readMoreBorderStyle && readMoreBorderStyle !== "none" ? readMoreBorderColor || undefined : undefined,
    borderRadius: `var(--exr-readMoreBorderRadiusTop, ${readMoreBorderRadiusTop || "0"}) var(--exr-readMoreBorderRadiusRight, ${readMoreBorderRadiusRight || "0"}) var(--exr-readMoreBorderRadiusBottom, ${readMoreBorderRadiusBottom || "0"}) var(--exr-readMoreBorderRadiusLeft, ${readMoreBorderRadiusLeft || "0"})`,
    paddingTop: readMorePaddingTop || "8px",
    paddingRight: readMorePaddingRight || "16px",
    paddingBottom: readMorePaddingBottom || "8px",
    paddingLeft: readMorePaddingLeft || "16px",
    marginTop: readMoreMarginTop || "12px",
    marginRight: readMoreMarginRight || undefined,
    marginBottom: readMoreMarginBottom || undefined,
    marginLeft: readMoreMarginLeft || undefined,
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    cursor: "pointer",
  };

  return (
    <div>
      <GoogleFontLink family={titleFontFamily} />
      <GoogleFontLink family={fontFamily} />
      <GoogleFontLink family={readMoreFontFamily} />
      {hasHoverOverride && (
        <style
          dangerouslySetInnerHTML={{
            __html: `.${hoverClassName}:hover{${[
              readMoreHoverBackground && `background:${readMoreHoverBackground} !important;`,
              readMoreHoverColor && `color:${readMoreHoverColor} !important;`,
            ]
              .filter(Boolean)
              .join("")}}`,
          }}
        />
      )}
      {scrollbarCss && <style dangerouslySetInnerHTML={{ __html: scrollbarCss }} />}

      {includeImage && src && (
        <div style={imageWrapStyle}>
          {/* Admin-authored, arbitrary aspect ratio — same reasoning as the
              other builder blocks that keep a plain <img>. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resolveImageUrl(src)} alt={title || ""} style={imageStyle} />
        </div>
      )}

      {title && (
        <TitleTag style={titleStyle}>{title}</TitleTag>
      )}

      <div style={wrapperStyle}>
        <div className={scrollClassName} style={innerStyle} dangerouslySetInnerHTML={{ __html: html }} />
        {showOverlay && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: overlayHeight || "60px",
              background: `linear-gradient(to bottom, transparent, ${overlayColor || "#050505"})`,
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {includeReadMore && expandMode === "button" && (
        <div style={{ textAlign: readMoreAlignment || "left" }}>
          <button type="button" onClick={() => setExpanded((e) => !e)} className={hoverClassName} style={buttonStyle}>
            {expanded ? readLessText || "Read Less" : readMoreText || "Read More"}
            {includeIcon && <ChevronIcon expanded={expanded} />}
          </button>
        </div>
      )}
    </div>
  );
}
