"use client";

import { useState } from "react";
import { LengthField } from "@/components/builder/sharedFields";
import { FontFamilyField } from "@/components/builder/FontFamilyField";

// The full set every text-capable block (Heading, RichText, CTAButton) now
// shares — see the matching propsSchema additions in packages/builder's
// registry.ts. Grouped into one collapsible control here instead of each
// rendering as its own row, matching Elementor's "Typography" popover.
export const TYPOGRAPHY_FIELD_KEYS = ["fontFamily", "fontSize", "fontWeight", "textTransform", "fontStyle", "textDecoration", "lineHeight", "letterSpacing", "wordSpacing"] as const;
export type TypographyKey = (typeof TYPOGRAPHY_FIELD_KEYS)[number];

const FONT_WEIGHT_OPTIONS = ["100", "200", "300", "400", "500", "600", "700", "800", "900", "normal", "bold"];
const TEXT_TRANSFORM_OPTIONS = ["none", "uppercase", "lowercase", "capitalize"];
const FONT_STYLE_OPTIONS = ["normal", "italic", "oblique"];
const TEXT_DECORATION_OPTIONS = ["none", "underline", "overline", "line-through"];

function SelectRow({ label, value, options, onChange }: { label: string; value?: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-zinc-400">{label}</label>
      <select
        value={value ?? options[0]}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

export type TypographyValues = Partial<Record<TypographyKey, string>>;

/**
 * One collapsible "Typography" control replacing 9 separate rows — expand
 * via the pencil icon, matching Elementor's own Typography popover. Each
 * sub-field's actual value/onChange is decided by the caller (PropertyPanel):
 * fontFamily always edits node.props directly; the other 8 fields redirect
 * to a tablet/mobile override when a non-desktop breakpoint is active, same
 * as every other Style-tab field — TypographyField itself doesn't need to
 * know which breakpoint is active, it just calls onChange(key, value).
 */
export function TypographyField({
  values,
  onChange,
  isOverriddenMap = {},
  inheritedFromMap = {},
  onResetKey,
}: {
  values: TypographyValues;
  onChange: (key: TypographyKey, value: string) => void;
  isOverriddenMap?: Partial<Record<TypographyKey, boolean>>;
  inheritedFromMap?: Partial<Record<TypographyKey, "desktop" | "tablet">>;
  onResetKey?: (key: TypographyKey) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasAnyOverride = Object.values(isOverriddenMap).some(Boolean);

  return (
    <div>
      <div className={`flex items-center justify-between rounded-lg border bg-zinc-950 px-3 py-2 ${hasAnyOverride ? "border-amber-400/80 bg-amber-400/5" : "border-zinc-700"}`}>
        <span className={`text-xs ${hasAnyOverride ? "font-semibold text-amber-400" : "text-zinc-400"}`}>
          Typography {hasAnyOverride && "•"}
        </span>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className={`rounded px-1.5 py-0.5 text-xs ${expanded || hasAnyOverride ? "text-amber-400 font-bold" : "text-zinc-400 hover:text-zinc-200"}`}
          title="Edit Typography"
        >
          ✎
        </button>
      </div>

      {expanded && (
        <div className="mt-2 flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
          <FontFamilyField value={values.fontFamily} onChange={(v) => onChange("fontFamily", v)} />
          <LengthField
            label="Size"
            value={values.fontSize ?? ""}
            onChange={(v) => onChange("fontSize", v)}
            min={8}
            max={120}
            step={1}
            isOverridden={isOverriddenMap.fontSize}
            inheritedFrom={inheritedFromMap.fontSize}
            onReset={onResetKey ? () => onResetKey("fontSize") : undefined}
          />
          <SelectRow label="Weight" value={values.fontWeight} options={FONT_WEIGHT_OPTIONS} onChange={(v) => onChange("fontWeight", v)} />
          <SelectRow label="Transform" value={values.textTransform} options={TEXT_TRANSFORM_OPTIONS} onChange={(v) => onChange("textTransform", v)} />
          <SelectRow label="Style" value={values.fontStyle} options={FONT_STYLE_OPTIONS} onChange={(v) => onChange("fontStyle", v)} />
          <SelectRow label="Decoration" value={values.textDecoration} options={TEXT_DECORATION_OPTIONS} onChange={(v) => onChange("textDecoration", v)} />
          <LengthField
            label="Line Height"
            value={values.lineHeight ?? ""}
            onChange={(v) => onChange("lineHeight", v)}
            min={0.5}
            max={3}
            step={0.1}
            defaultUnit="em"
            isOverridden={isOverriddenMap.lineHeight}
            inheritedFrom={inheritedFromMap.lineHeight}
            onReset={onResetKey ? () => onResetKey("lineHeight") : undefined}
          />
          <LengthField
            label="Letter Spacing"
            value={values.letterSpacing ?? ""}
            onChange={(v) => onChange("letterSpacing", v)}
            min={-5}
            max={20}
            step={0.5}
            isOverridden={isOverriddenMap.letterSpacing}
            inheritedFrom={inheritedFromMap.letterSpacing}
            onReset={onResetKey ? () => onResetKey("letterSpacing") : undefined}
          />
          <LengthField
            label="Word Spacing"
            value={values.wordSpacing ?? ""}
            onChange={(v) => onChange("wordSpacing", v)}
            min={-10}
            max={50}
            step={1}
            isOverridden={isOverriddenMap.wordSpacing}
            inheritedFrom={inheritedFromMap.wordSpacing}
            onReset={onResetKey ? () => onResetKey("wordSpacing") : undefined}
          />
        </div>
      )}
    </div>
  );
}
