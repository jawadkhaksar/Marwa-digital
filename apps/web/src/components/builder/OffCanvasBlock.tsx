"use client";

import { useState } from "react";
import type { CSSProperties, ReactNode, Ref } from "react";
import { createPortal } from "react-dom";
import { IconGlyph } from "@/components/builder/IconGlyph";
import { useMounted } from "@/lib/useMounted";

function hashString(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

interface WrapperProps {
  id?: string;
  className?: string;
  style?: CSSProperties;
  "data-block-id"?: string;
  "data-block-type"?: string;
  /** Set by AnimatedBox when this node has GSAP timelines — safe to spread
   *  straight through here since this block's root already does
   *  `<div {...wrapperProps}>`. */
  ref?: Ref<HTMLDivElement>;
  /** Set by AnimatedBox alongside `ref` — see blockComponents.tsx's
   *  WrapperProps for why (browser-extension DOM injection racing hydration). */
  suppressHydrationWarning?: boolean;
}

/** `isContainer: true` — same reasoning as ModalPopupBlock, arbitrary child content. */
export function OffCanvasBlock({
  triggerLabel,
  triggerIcon,
  position,
  panelWidth,
  panelBackground,
  overlayColor,
  triggerColor,
  triggerBackground,
  triggerBorderRadius,
  triggerHoverBackground,
  triggerHoverColor,
  triggerBorderStyle,
  triggerBorderWidth,
  triggerBorderWidthTop,
  triggerBorderWidthRight,
  triggerBorderWidthBottom,
  triggerBorderWidthLeft,
  triggerBorderColor,
  triggerBoxShadow,
  triggerFontSize,
  triggerFontWeight,
  panelBoxShadow,
  wrapperProps,
  children,
}: {
  triggerLabel?: string;
  triggerIcon?: string;
  position?: "left" | "right";
  panelWidth?: string;
  panelBackground?: string;
  overlayColor?: string;
  triggerColor?: string;
  triggerBackground?: string;
  triggerBorderRadius?: string;
  triggerHoverBackground?: string;
  triggerHoverColor?: string;
  triggerBorderStyle?: "none" | "solid" | "dashed" | "dotted";
  triggerBorderWidth?: string;
  triggerBorderWidthTop?: string;
  triggerBorderWidthRight?: string;
  triggerBorderWidthBottom?: string;
  triggerBorderWidthLeft?: string;
  triggerBorderColor?: string;
  triggerBoxShadow?: string;
  triggerFontSize?: string;
  triggerFontWeight?: string;
  panelBoxShadow?: string;
  wrapperProps?: WrapperProps;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const mounted = useMounted();

  const side = position || "right";
  const hasTriggerHover = triggerHoverBackground || triggerHoverColor;
  const triggerHoverClass = hasTriggerHover ? `oc-trg-h${hashString(`${triggerHoverBackground ?? ""}|${triggerHoverColor ?? ""}`)}` : "";

  return (
    <div {...wrapperProps}>
      {hasTriggerHover && (
        <style
          dangerouslySetInnerHTML={{
            __html: `.${triggerHoverClass}:hover{${[
              `background:${triggerHoverBackground || triggerBackground || "transparent"} !important;`,
              `color:${triggerHoverColor || triggerColor || "inherit"} !important;`,
            ].join("")}}`,
          }}
        />
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerHoverClass}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 18px",
          borderRadius: `var(--exr-triggerBorderRadius, ${triggerBorderRadius || "9999px"})`,
          background: `var(--exr-triggerBackground, ${triggerBackground || "transparent"})`,
          color: `var(--exr-triggerColor, ${triggerColor || "inherit"})`,
          fontWeight: `var(--exr-triggerFontWeight, ${triggerFontWeight || "600"})` as CSSProperties["fontWeight"],
          fontSize: `var(--exr-triggerFontSize, ${triggerFontSize || "14px"})`,
          borderStyle: triggerBorderStyle && triggerBorderStyle !== "none" ? triggerBorderStyle : "none",
          borderTopWidth: triggerBorderStyle && triggerBorderStyle !== "none" ? `var(--exr-triggerBorderWidthTop, ${triggerBorderWidthTop || triggerBorderWidth || "1px"})` : undefined,
          borderRightWidth: triggerBorderStyle && triggerBorderStyle !== "none" ? `var(--exr-triggerBorderWidthRight, ${triggerBorderWidthRight || triggerBorderWidth || "1px"})` : undefined,
          borderBottomWidth: triggerBorderStyle && triggerBorderStyle !== "none" ? `var(--exr-triggerBorderWidthBottom, ${triggerBorderWidthBottom || triggerBorderWidth || "1px"})` : undefined,
          borderLeftWidth: triggerBorderStyle && triggerBorderStyle !== "none" ? `var(--exr-triggerBorderWidthLeft, ${triggerBorderWidthLeft || triggerBorderWidth || "1px"})` : undefined,
          borderColor: triggerBorderStyle && triggerBorderStyle !== "none" ? triggerBorderColor || undefined : undefined,
          boxShadow: triggerBoxShadow || undefined,
          cursor: "pointer",
          transition: "background 0.2s ease, color 0.2s ease",
        }}
      >
        {triggerIcon && <IconGlyph icon={triggerIcon} />}
        {triggerLabel}
      </button>
      {mounted &&
        createPortal(
          <>
            <div
              onClick={() => setOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9998,
                background: overlayColor || "rgba(10,10,10,0.7)",
                opacity: open ? 1 : 0,
                pointerEvents: open ? "auto" : "none",
                transition: "opacity 0.3s ease",
              }}
            />
            <div
              style={{
                position: "fixed",
                top: 0,
                bottom: 0,
                [side]: 0,
                width: panelWidth || "360px",
                maxWidth: "90vw",
                zIndex: 9999,
                background: panelBackground || "#111111",
                boxShadow: panelBoxShadow || undefined,
                overflowY: "auto",
                padding: "24px",
                transform: open ? "translateX(0)" : side === "right" ? "translateX(100%)" : "translateX(-100%)",
                transition: "transform 0.3s ease",
              }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{ width: "32px", height: "32px", borderRadius: "9999px", background: "rgba(255,255,255,0.1)", color: "#fff", border: "none", cursor: "pointer", fontSize: "16px", marginBottom: "16px" }}
              >
                ✕
              </button>
              {children}
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
