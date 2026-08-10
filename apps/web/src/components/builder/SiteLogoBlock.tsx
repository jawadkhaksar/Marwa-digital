"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { api, type SiteSettings } from "@/lib/api";
import { resolveImageUrl } from "@/lib/resolveImageUrl";

function hashString(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

/**
 * The Theme Builder's "Site Logo" widget — a plain logo image (not the
 * branded icon+wordmark `Logo` component SiteHeader/SiteFooter use), so it
 * drops cleanly into a custom Header/Footer template. Falls back to
 * Settings → General's site logo when no per-instance override is set,
 * same source SiteHeader/SiteFooter already read from.
 */
export function SiteLogoBlock({
  logoImageOverride,
  link,
  customLinkUrl,
  openInNewTab,
  align,
  imageWidth,
  imageMaxWidth,
  imageHeight,
  imageOpacity,
  imageHoverOpacity,
  imageFilter,
  imageHoverFilter,
  borderStyle,
  borderWidth,
  borderWidthTop,
  borderWidthRight,
  borderWidthBottom,
  borderWidthLeft,
  borderColor,
  borderRadiusTop,
  borderRadiusRight,
  borderRadiusBottom,
  borderRadiusLeft,
  boxShadow,
}: {
  logoImageOverride?: string;
  link?: "site" | "custom" | "none";
  customLinkUrl?: string;
  openInNewTab?: boolean;
  align?: "left" | "center" | "right";
  imageWidth?: string;
  imageMaxWidth?: string;
  imageHeight?: string;
  imageOpacity?: string;
  imageHoverOpacity?: string;
  imageFilter?: string;
  imageHoverFilter?: string;
  borderStyle?: "none" | "solid" | "dashed" | "dotted";
  borderWidth?: string;
  borderWidthTop?: string;
  borderWidthRight?: string;
  borderWidthBottom?: string;
  borderWidthLeft?: string;
  borderColor?: string;
  borderRadiusTop?: string;
  borderRadiusRight?: string;
  borderRadiusBottom?: string;
  borderRadiusLeft?: string;
  boxShadow?: string;
}) {
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    if (logoImageOverride) return;
    api.getSettings().then(setSettings).catch(() => {});
  }, [logoImageOverride]);

  const src = logoImageOverride || settings?.logoImage;
  if (!src) return null;

  const hasHover = Boolean(imageHoverOpacity || imageHoverFilter);
  const hoverClassName = hasHover ? `sitelogo-h${hashString(`${imageHoverOpacity ?? ""}${imageHoverFilter ?? ""}`)}` : "";

  const imageStyle: CSSProperties = {
    width: imageWidth || undefined,
    maxWidth: imageMaxWidth || undefined,
    height: imageHeight || undefined,
    objectFit: "contain",
    opacity: imageOpacity || undefined,
    filter: imageFilter || undefined,
    borderStyle: borderStyle && borderStyle !== "none" ? borderStyle : undefined,
    borderTopWidth: borderStyle && borderStyle !== "none" ? (borderWidthTop || borderWidth || "1px") : undefined,
    borderRightWidth: borderStyle && borderStyle !== "none" ? (borderWidthRight || borderWidth || "1px") : undefined,
    borderBottomWidth: borderStyle && borderStyle !== "none" ? (borderWidthBottom || borderWidth || "1px") : undefined,
    borderLeftWidth: borderStyle && borderStyle !== "none" ? (borderWidthLeft || borderWidth || "1px") : undefined,
    borderColor: borderStyle && borderStyle !== "none" ? borderColor || undefined : undefined,
    borderRadius: `${borderRadiusTop || "0"} ${borderRadiusRight || "0"} ${borderRadiusBottom || "0"} ${borderRadiusLeft || "0"}`,
    boxShadow: boxShadow || undefined,
  };

  const wrapperStyle: CSSProperties = {
    display: "flex",
    justifyContent: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start",
  };

  const href = link === "custom" ? customLinkUrl : link === "site" ? "/" : undefined;

  const img = (
    // Admin-authored, arbitrary aspect ratio (imageWidth/imageHeight are
    // free-form Style-tab values) — same reasoning as ImageBox's own <img>.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={resolveImageUrl(src)} alt="" className={hoverClassName} style={imageStyle} />
  );

  return (
    <div style={wrapperStyle}>
      {hasHover && (
        <style
          dangerouslySetInnerHTML={{
            __html: `.${hoverClassName}:hover{${imageHoverOpacity ? `opacity:${imageHoverOpacity} !important;` : ""}${imageHoverFilter ? `filter:${imageHoverFilter} !important;` : ""}}`,
          }}
        />
      )}
      {href ? (
        <a href={href} target={openInNewTab ? "_blank" : undefined} rel={openInNewTab ? "noopener noreferrer" : undefined}>
          {img}
        </a>
      ) : (
        img
      )}
    </div>
  );
}
