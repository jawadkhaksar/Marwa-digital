"use client";

import { useEffect, useState } from "react";
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

/**
 * `isContainer: true` in the registry — its `children` are the popup's own
 * body content, independently insertable/editable blocks exactly like
 * Section/Columns/CarouselContainer already work, not a fixed content shape.
 */
export function ModalPopupBlock({
  triggerLabel,
  triggerIcon,
  modalWidth,
  modalBackground,
  overlayColor,
  closeOnOverlayClick,
  triggerBackground,
  triggerColor,
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
  modalBorderRadius,
  modalBorderStyle,
  modalBorderWidth,
  modalBorderWidthTop,
  modalBorderWidthRight,
  modalBorderWidthBottom,
  modalBorderWidthLeft,
  modalBorderColor,
  modalBoxShadow,
  wrapperProps,
  children,
}: {
  triggerLabel?: string;
  triggerIcon?: string;
  modalWidth?: string;
  modalBackground?: string;
  overlayColor?: string;
  closeOnOverlayClick?: boolean;
  triggerBackground?: string;
  triggerColor?: string;
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
  modalBorderRadius?: string;
  modalBorderStyle?: "none" | "solid" | "dashed" | "dotted";
  modalBorderWidth?: string;
  modalBorderWidthTop?: string;
  modalBorderWidthRight?: string;
  modalBorderWidthBottom?: string;
  modalBorderWidthLeft?: string;
  modalBorderColor?: string;
  modalBoxShadow?: string;
  wrapperProps?: WrapperProps;
  children?: ReactNode;
}) {
  const hasTriggerHover = triggerHoverBackground || triggerHoverColor;
  const triggerHoverClass = hasTriggerHover ? `mp-trg-h${hashString(`${triggerHoverBackground ?? ""}|${triggerHoverColor ?? ""}`)}` : "";
  const [open, setOpen] = useState(false);
  const mounted = useMounted();
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div {...wrapperProps}>
      {hasTriggerHover && (
        <style
          dangerouslySetInnerHTML={{
            __html: `.${triggerHoverClass}:hover{${[
              `background:${triggerHoverBackground || triggerBackground || "#2563FF"} !important;`,
              `color:${triggerHoverColor || triggerColor || "#fff"} !important;`,
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
          padding: "12px 24px",
          borderRadius: `var(--exr-triggerBorderRadius, ${triggerBorderRadius || "9999px"})`,
          background: `var(--exr-triggerBackground, ${triggerBackground || "#2563FF"})`,
          color: `var(--exr-triggerColor, ${triggerColor || "#fff"})`,
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
        open &&
        createPortal(
          <div
            onClick={closeOnOverlayClick ? () => setOpen(false) : undefined}
            style={{ position: "fixed", inset: 0, zIndex: 9999, background: overlayColor || "rgba(10,10,10,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "relative",
                width: "100%",
                maxWidth: modalWidth || "600px",
                maxHeight: "85vh",
                overflowY: "auto",
                background: modalBackground || "#fff",
                borderRadius: `var(--exr-modalBorderRadius, ${modalBorderRadius || "16px"})`,
                borderStyle: modalBorderStyle && modalBorderStyle !== "none" ? modalBorderStyle : undefined,
                borderTopWidth: modalBorderStyle && modalBorderStyle !== "none" ? `var(--exr-modalBorderWidthTop, ${modalBorderWidthTop || modalBorderWidth || "1px"})` : undefined,
                borderRightWidth: modalBorderStyle && modalBorderStyle !== "none" ? `var(--exr-modalBorderWidthRight, ${modalBorderWidthRight || modalBorderWidth || "1px"})` : undefined,
                borderBottomWidth: modalBorderStyle && modalBorderStyle !== "none" ? `var(--exr-modalBorderWidthBottom, ${modalBorderWidthBottom || modalBorderWidth || "1px"})` : undefined,
                borderLeftWidth: modalBorderStyle && modalBorderStyle !== "none" ? `var(--exr-modalBorderWidthLeft, ${modalBorderWidthLeft || modalBorderWidth || "1px"})` : undefined,
                borderColor: modalBorderStyle && modalBorderStyle !== "none" ? modalBorderColor || undefined : undefined,
                boxShadow: modalBoxShadow || undefined,
                padding: "32px",
              }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{ position: "absolute", top: "12px", right: "12px", width: "32px", height: "32px", borderRadius: "9999px", background: "rgba(0,0,0,0.06)", border: "none", cursor: "pointer", fontSize: "16px" }}
              >
                ✕
              </button>
              {children}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
