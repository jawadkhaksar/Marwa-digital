"use client";

// Small field primitives shared between PropertyPanel.tsx and
// TypographyField.tsx — pulled out of PropertyPanel.tsx specifically so
// TypographyField (which PropertyPanel renders) doesn't have to import back
// from PropertyPanel.tsx and create a circular import.

export const LENGTH_UNITS = ["px", "%", "em", "rem", "vw", "vh"] as const;

export function parseLength(value: string): { num: number; unit: (typeof LENGTH_UNITS)[number] } {
  const match = value.match(/^(-?\d*\.?\d+)(px|%|em|rem|vw|vh)?$/);
  if (!match) return { num: 0, unit: "px" };
  const unit = (LENGTH_UNITS as readonly string[]).includes(match[2] ?? "") ? (match[2] as (typeof LENGTH_UNITS)[number]) : "px";
  return { num: parseFloat(match[1]), unit };
}

export function LengthField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  defaultUnit = "px",
  isOverridden = false,
  inheritedFrom,
  onReset,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min: number;
  max: number;
  step: number;
  defaultUnit?: string;
  isOverridden?: boolean;
  inheritedFrom?: "desktop" | "tablet";
  onReset?: () => void;
}) {
  const { num, unit } = parseLength(value || `${min}${defaultUnit}`);

  function update(nextNum: number, nextUnit: string) {
    onChange(`${nextNum}${nextUnit}`);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className={`text-xs ${isOverridden ? "font-semibold text-amber-400" : "text-zinc-400"}`}>{label}</label>
          {inheritedFrom && !isOverridden && (
            <span className="rounded bg-zinc-800 px-1 py-0.2 text-[9px] text-zinc-500 uppercase tracking-wide">
              {inheritedFrom}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {isOverridden && onReset ? (
            <button
              type="button"
              onClick={onReset}
              title="Reset breakpoint override (restore inheritance)"
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300"
            >
              ⟲ reset
            </button>
          ) : (
            value && (
              <button
                type="button"
                onClick={() => onChange("")}
                title="Clear value"
                className="text-[11px] text-red-400 hover:text-red-300"
              >
                ✕
              </button>
            )
          )}
          <select
            value={unit}
            onChange={(e) => update(num, e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 text-[11px] text-zinc-300"
          >
            {LENGTH_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={num}
          onChange={(e) => update(Number(e.target.value), unit)}
          className="flex-1 accent-amber-400"
        />
        <input
          type="number"
          value={num}
          onChange={(e) => update(Number(e.target.value), unit)}
          className={`w-16 rounded-lg border bg-zinc-950 px-2 py-1 text-sm ${isOverridden ? "border-amber-400/80 ring-1 ring-amber-400/30" : "border-zinc-700"}`}
        />
      </div>
    </div>
  );
}
