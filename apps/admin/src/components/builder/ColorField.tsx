"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HexAlphaColorPicker } from "react-colorful";

/** Accepts hex(3/6/8), rgb()/rgba(), or a CSS color keyword — anything the rest of the field already accepted — and returns an 8-digit hex the picker can work with. Falls back to opaque black when it can't parse (e.g. "currentColor", "transparent", empty). */
function toHex8(value: string): string {
  const v = value.trim();
  if (!v) return "#000000ff";

  if (v.startsWith("#")) {
    if (v.length === 4) {
      const [, r, g, b] = v;
      return `#${r}${r}${g}${g}${b}${b}ff`.toLowerCase();
    }
    if (v.length === 7) return `${v}ff`.toLowerCase();
    if (v.length === 9) return v.toLowerCase();
    return "#000000ff";
  }

  const rgbMatch = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
  if (rgbMatch) {
    const [, r, g, b, a] = rgbMatch;
    const toHex = (n: string) => Number(n).toString(16).padStart(2, "0");
    const alpha = a !== undefined ? Math.round(parseFloat(a) * 255) : 255;
    return `#${toHex(r)}${toHex(g)}${toHex(b)}${alpha.toString(16).padStart(2, "0")}`;
  }

  return "#000000ff";
}

/**
 * Pairs the existing free-text input (still accepts hex/rgba/keywords
 * directly — nothing that already worked stops working) with a visual
 * swatch button that opens a react-colorful gradient+hue+alpha picker.
 * Picking a color writes an 8-digit hex string (#RRGGBBAA) back through the
 * same `onChange` as typing would.
 */
export function ColorField({
  label,
  value,
  onChange,
  compact = false,
  placeholder = "#000000 or rgba(...)",
}: {
  label?: string;
  value?: string;
  onChange: (v: string) => void;
  /** Drops the label and shrinks paddings — for dense contexts like the animation tween grid, which supplies its own shared label. */
  compact?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  // Portals to document.body with fixed positioning computed from the
  // trigger's own screen position — a plain `position: absolute` popover
  // gets silently clipped by the inspector panel's `overflow-y-auto`
  // ancestor (only tall enough to show part of the saturation square, never
  // the hue/alpha sliders or hex input below it), since `absolute` never
  // escapes a scrolling/clipping ancestor the way a portal + `fixed` does.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const POPOVER_WIDTH = 224; // w-56
    const GAP = 8;
    function place() {
      const rect = triggerRef.current!.getBoundingClientRect();
      const left = Math.min(Math.max(8, rect.right - POPOVER_WIDTH), window.innerWidth - POPOVER_WIDTH - 8);
      const top = Math.min(rect.bottom + GAP, window.innerHeight - 8);
      setPopoverPos({ top, left });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  const swatchColor = value ? toHex8(value) : undefined;
  const supportsEyeDropper = typeof window !== "undefined" && "EyeDropper" in window;

  // Catches the single most common way this field breaks rendering: pasting
  // a full declaration copied from devtools ("background: rgba(...);")
  // instead of just the value — React throws on a trailing `;` in a style
  // value, which crashed a live page this exact way. Only runs on blur, not
  // every keystroke, so it doesn't fight typing mid-edit.
  function sanitizeOnBlur() {
    if (!value) return;
    const cleaned = value.trim().replace(/^[a-zA-Z-]+\s*:\s*/, "").replace(/;\s*$/, "").trim();
    if (cleaned !== value) onChange(cleaned);
  }

  async function pickWithEyeDropper() {
    try {
      // @ts-expect-error EyeDropper isn't in the DOM lib types yet
      const dropper = new window.EyeDropper();
      const result = await dropper.open();
      onChange(result.sRGBHex);
    } catch {
      // user cancelled — no-op
    }
  }

  return (
    <div className="relative">
      {label && <label className="mb-1 block text-xs text-zinc-400">{label}</label>}
      <div ref={triggerRef} className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`relative shrink-0 overflow-hidden rounded-lg border border-zinc-700 ${compact ? "h-6 w-6" : "h-8 w-8"}`}
          title="Open color picker"
        >
          {/* Checkerboard sits behind the color swatch — a semi-transparent color lets it show through, an opaque one fully covers it. Both as absolutely-positioned layers so the color is never painted over by the pattern. */}
          <span className="absolute inset-0 bg-[repeating-conic-gradient(#3a3a3a_0%_25%,#2a2a2a_0%_50%)] bg-[length:8px_8px]" />
          <span className="absolute inset-0" style={{ backgroundColor: swatchColor }} />
        </button>
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={sanitizeOnBlur}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-zinc-700 bg-zinc-950 text-sm ${compact ? "px-1.5 py-1 text-center text-[11px]" : "px-3 py-2"}`}
        />
      </div>

      {open &&
        popoverPos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            className="fixed z-50 w-56 rounded-xl border border-zinc-700 bg-zinc-900 p-3 shadow-xl"
            style={{ top: popoverPos.top, left: popoverPos.left }}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">Color Picker</span>
              <div className="flex items-center gap-2">
                {supportsEyeDropper && (
                  <button type="button" onClick={pickWithEyeDropper} title="Pick from screen" className="text-zinc-400 hover:text-amber-400">
                    🎨
                  </button>
                )}
                <button type="button" onClick={() => onChange("")} title="Clear" className="text-zinc-400 hover:text-red-400">
                  ✕
                </button>
              </div>
            </div>
            <HexAlphaColorPicker color={swatchColor ?? "#000000ff"} onChange={onChange} />
            <input
              type="text"
              value={value ?? ""}
              onChange={(e) => onChange(e.target.value)}
              onBlur={sanitizeOnBlur}
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-center text-xs"
            />
          </div>,
          document.body
        )}
    </div>
  );
}
