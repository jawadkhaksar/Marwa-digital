"use client";

import { useState } from "react";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { IconGlyph } from "@/components/builder/IconGlyph";

function hashString(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

/**
 * A CSS-only flip (no JS needed to animate) — `flipTrigger` only decides
 * WHAT causes the flip class to apply (a real :hover selector for "hover",
 * a click-toggled boolean for "click"), not how the flip itself animates.
 */
export function FlipBoxBlock({
  frontIcon,
  frontImage,
  frontTitle,
  frontDescription,
  backTitle,
  backDescription,
  backButtonLabel,
  backButtonUrl,
  flipDirection,
  flipTrigger,
  height,
  frontBackground,
  backBackground,
  frontTitleColor,
  frontDescColor,
  backTitleColor,
  backDescColor,
  accentColor,
  borderRadius,
  borderRadiusTopLeft,
  borderRadiusTopRight,
  borderRadiusBottomRight,
  borderRadiusBottomLeft,
  cardBorderStyle,
  cardBorderWidth,
  cardBorderWidthTop,
  cardBorderWidthRight,
  cardBorderWidthBottom,
  cardBorderWidthLeft,
  cardBorderColor,
  cardBoxShadow,
  backButtonBackground,
  backButtonColor,
  backButtonHoverBackground,
  backButtonHoverColor,
}: {
  frontIcon?: string;
  frontImage?: string;
  frontTitle: string;
  frontDescription?: string;
  backTitle: string;
  backDescription?: string;
  backButtonLabel?: string;
  backButtonUrl?: string;
  flipDirection?: "horizontal" | "vertical";
  flipTrigger?: "hover" | "click";
  height?: string;
  frontBackground?: string;
  backBackground?: string;
  frontTitleColor?: string;
  frontDescColor?: string;
  backTitleColor?: string;
  backDescColor?: string;
  accentColor?: string;
  borderRadius?: string;
  borderRadiusTopLeft?: string;
  borderRadiusTopRight?: string;
  borderRadiusBottomRight?: string;
  borderRadiusBottomLeft?: string;
  cardBorderStyle?: "none" | "solid" | "dashed" | "dotted";
  cardBorderWidth?: string;
  cardBorderWidthTop?: string;
  cardBorderWidthRight?: string;
  cardBorderWidthBottom?: string;
  cardBorderWidthLeft?: string;
  cardBorderColor?: string;
  cardBoxShadow?: string;
  backButtonBackground?: string;
  backButtonColor?: string;
  backButtonHoverBackground?: string;
  backButtonHoverColor?: string;
}) {
  const [clicked, setClicked] = useState(false);
  const isFlipped = flipTrigger === "click" ? clicked : undefined;
  const axis = flipDirection === "vertical" ? "rotateX" : "rotateY";
  const accent = accentColor || "#2563FF";
  const hasCustomBorder = cardBorderStyle && cardBorderStyle !== "none";
  const customBorderColor = cardBorderColor || accent;
  const customBorderSides = hasCustomBorder
    ? {
        borderStyle: cardBorderStyle,
        borderTopWidth: `var(--exr-cardBorderWidthTop, ${cardBorderWidthTop || cardBorderWidth || "1px"})`,
        borderRightWidth: `var(--exr-cardBorderWidthRight, ${cardBorderWidthRight || cardBorderWidth || "1px"})`,
        borderBottomWidth: `var(--exr-cardBorderWidthBottom, ${cardBorderWidthBottom || cardBorderWidth || "1px"})`,
        borderLeftWidth: `var(--exr-cardBorderWidthLeft, ${cardBorderWidthLeft || cardBorderWidth || "1px"})`,
        borderColor: `var(--exr-cardBorderColor, ${customBorderColor})`,
      }
    : undefined;

  const faceStyle = {
    position: "absolute" as const,
    inset: 0,
    backfaceVisibility: "hidden" as const,
    borderTopLeftRadius: borderRadiusTopLeft || borderRadius || "16px",
    borderTopRightRadius: borderRadiusTopRight || borderRadius || "16px",
    borderBottomRightRadius: borderRadiusBottomRight || borderRadius || "16px",
    borderBottomLeftRadius: borderRadiusBottomLeft || borderRadius || "16px",
    boxShadow: cardBoxShadow || undefined,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "28px",
    textAlign: "center" as const,
  };

  const hasButtonHover = backButtonHoverBackground || backButtonHoverColor;
  const buttonHoverClass = hasButtonHover ? `fb-btn-h${hashString(`${backButtonHoverBackground ?? ""}|${backButtonHoverColor ?? ""}`)}` : "";

  return (
    <div
      onClick={flipTrigger === "click" ? () => setClicked((c) => !c) : undefined}
      className={flipTrigger === "click" ? "cursor-pointer" : "group"}
      style={{ height: height || "320px", perspective: "1200px" }}
    >
      <div
        className={flipTrigger === "hover" ? "group-hover:[transform:var(--exr-flip)]" : undefined}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transition: "transform 0.6s",
          transformStyle: "preserve-3d",
          transform: isFlipped ? `${axis}(180deg)` : undefined,
          ["--exr-flip" as string]: `${axis}(180deg)`,
        }}
      >
        <div style={{ ...faceStyle, background: frontBackground || "#fff", ...(customBorderSides || { border: `1px solid ${accent}20` }) }}>
          {frontIcon && (
            <span style={{ fontSize: "36px", color: accent, marginBottom: "12px" }}>
              <IconGlyph icon={frontIcon} />
            </span>
          )}
          {frontImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolveImageUrl(frontImage)} alt="" style={{ width: "72px", height: "72px", objectFit: "cover", borderRadius: "9999px", marginBottom: "12px" }} />
          )}
          <h3 style={{ color: `var(--exr-frontTitleColor, ${frontTitleColor || "#111"})`, fontSize: "20px", fontWeight: 700, margin: 0 }}>{frontTitle}</h3>
          {frontDescription && <p style={{ color: `var(--exr-frontDescColor, ${frontDescColor || "#666"})`, marginTop: "8px" }}>{frontDescription}</p>}
        </div>
        <div style={{ ...faceStyle, background: backBackground || accent, transform: `${axis}(180deg)`, ...customBorderSides }}>
          <h3 style={{ color: `var(--exr-backTitleColor, ${backTitleColor || "#fff"})`, fontSize: "20px", fontWeight: 700, margin: 0 }}>{backTitle}</h3>
          {backDescription && <p style={{ color: `var(--exr-backDescColor, ${backDescColor || "rgba(255,255,255,0.85)"})`, marginTop: "8px" }}>{backDescription}</p>}
          {backButtonLabel && backButtonUrl && (
            <>
              {hasButtonHover && (
                <style
                  dangerouslySetInnerHTML={{
                    __html: `.${buttonHoverClass}:hover{${[
                      `background:${backButtonHoverBackground || backButtonBackground || "rgba(255,255,255,0.2)"} !important;`,
                      `color:${backButtonHoverColor || backButtonColor || "#fff"} !important;`,
                    ].join("")}}`,
                  }}
                />
              )}
              <a
                href={backButtonUrl}
                className={buttonHoverClass}
                style={{
                  marginTop: "16px",
                  display: "inline-block",
                  padding: "8px 20px",
                  borderRadius: "9999px",
                  background: backButtonBackground || "rgba(255,255,255,0.2)",
                  color: backButtonColor || "#fff",
                  fontWeight: 600,
                  fontSize: "13px",
                  transition: "background 0.2s ease, color 0.2s ease",
                }}
              >
                {backButtonLabel}
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
