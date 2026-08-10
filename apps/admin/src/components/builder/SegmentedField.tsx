// Shared visual replacement for the plain `<select>` a raw CSS-valued enum
// field (justify-content, text-align, flex-direction, ...) used to render
// as — same idea as ColorField/IconLibraryPicker: one component, applied to
// any field by matching its name against SEGMENTED_FIELD_KEYS in
// PropertyPanel.tsx, no per-block wiring. Values without a mapped icon
// still work — they just fall back to a short text label in the same
// button group, so this never has to cover every possible enum value
// up front to be safe to opt a field into.

const ICON_PROPS = {
  width: 14,
  height: 14,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function AlignLeftIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M3 6h18M3 12h12M3 18h15" />
    </svg>
  );
}
function AlignCenterIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M3 6h18M6 12h12M4.5 18h15" />
    </svg>
  );
}
function AlignRightIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M3 6h18M9 12h12M6 18h15" />
    </svg>
  );
}
function AlignJustifyIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}
function AlignTopIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M3 4h18M7 9v11M12 9v7M17 9v9" />
    </svg>
  );
}
function AlignBottomIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M3 20h18M7 4v11M12 8v7M17 6v9" />
    </svg>
  );
}
function SpaceBetweenIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M4 4v16M20 4v16M9 12h1M14 12h1" />
    </svg>
  );
}
function NoneIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M6.5 17.5 17.5 6.5" />
    </svg>
  );
}
function BeforeIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M11 5 5 12l6 7M5 12h14" />
    </svg>
  );
}
function AfterIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M13 5l6 7-6 7M19 12H5" />
    </svg>
  );
}
function FullWidthIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M3 12h18M7 7l-4 5 4 5M17 7l4 5-4 5" />
    </svg>
  );
}
function HorizontalIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M3 12h18M7 7l-4 5 4 5M17 7l4 5-4 5" />
    </svg>
  );
}
function VerticalIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M12 3v18M7 7l5-4 5 4M7 17l5 4 5-4" />
    </svg>
  );
}
function RowIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="3" y="5" width="5" height="14" rx="1" />
      <rect x="9.5" y="5" width="5" height="14" rx="1" />
      <rect x="16" y="5" width="5" height="14" rx="1" />
    </svg>
  );
}
function ColumnIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="5" y="3" width="14" height="5" rx="1" />
      <rect x="5" y="9.5" width="14" height="5" rx="1" />
      <rect x="5" y="16" width="14" height="5" rx="1" />
    </svg>
  );
}

export const ALIGNMENT_OPTION_ICONS: Record<string, () => React.JSX.Element> = {
  left: AlignLeftIcon,
  center: AlignCenterIcon,
  right: AlignRightIcon,
  justify: AlignJustifyIcon,
  "flex-start": AlignLeftIcon,
  "flex-end": AlignRightIcon,
  start: AlignLeftIcon,
  end: AlignRightIcon,
  top: AlignTopIcon,
  bottom: AlignBottomIcon,
  "space-between": SpaceBetweenIcon,
  none: NoneIcon,
  before: BeforeIcon,
  after: AfterIcon,
  "full-width": FullWidthIcon,
  horizontal: HorizontalIcon,
  vertical: VerticalIcon,
  row: RowIcon,
  column: ColumnIcon,
};

/** Vertical-axis override for the ambiguous flex-start/end and start/end values — see `orientation` on SegmentedField. */
const VERTICAL_OPTION_ICONS: Record<string, () => React.JSX.Element> = {
  "flex-start": AlignTopIcon,
  "flex-end": AlignBottomIcon,
  start: AlignTopIcon,
  end: AlignBottomIcon,
};

export const ALIGNMENT_OPTION_LABELS: Record<string, string> = {
  left: "Left",
  center: "Center",
  right: "Right",
  justify: "Justify",
  "flex-start": "Start",
  "flex-end": "End",
  start: "Start",
  end: "End",
  top: "Top",
  bottom: "Bottom",
  "space-between": "Space Between",
  none: "None",
  before: "Before",
  after: "After",
  "full-width": "Full Width",
  horizontal: "Horizontal",
  vertical: "Vertical",
  row: "Row",
  column: "Column",
  "row-reverse": "Row (Reversed)",
  "column-reverse": "Column (Reversed)",
  inside: "Inside",
  outside: "Outside",
};

const VERTICAL_OPTION_LABELS: Record<string, string> = {
  "flex-start": "Top",
  "flex-end": "Bottom",
  start: "Top",
  end: "Bottom",
};

export function SegmentedField({
  label,
  value,
  onChange,
  options,
  orientation = "horizontal",
  allowUnset = false,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  /** "flex-start"/"flex-end"/"start"/"end" are shared vocabulary between horizontal (left/right) and vertical (top/bottom) alignment fields — the value string alone can't tell them apart, so callers on a vertical axis (e.g. IconList's vertical icon alignment) must say so explicitly to get Top/Bottom icons instead of the Left/Right default. */
  orientation?: "horizontal" | "vertical";
  /** Prepends a "Default" button that calls onChange("") — for fields whose empty value means "inherit/don't force a value" rather than one of the real options (e.g. the Advanced tab's Text Align/Alignment, previously a select with a leading "(default)" option). */
  allowUnset?: boolean;
}) {
  const allOptions = allowUnset ? (["", ...options] as const) : options;
  return (
    <div>
      {label && <label className="mb-1 block text-xs text-zinc-400">{label}</label>}
      <div className="flex overflow-hidden rounded-lg border border-zinc-700">
        {allOptions.map((opt, i) => {
          if (opt === "") {
            return (
              <button
                key="__unset"
                type="button"
                title="Default"
                onClick={() => onChange("")}
                className={`flex flex-1 items-center justify-center px-2 py-2 text-[10px] ${
                  value === "" ? "bg-amber-400 text-white" : "bg-zinc-950 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                Default
              </button>
            );
          }
          const Icon = orientation === "vertical" ? (VERTICAL_OPTION_ICONS[opt] ?? ALIGNMENT_OPTION_ICONS[opt]) : ALIGNMENT_OPTION_ICONS[opt];
          const optLabel = orientation === "vertical" ? (VERTICAL_OPTION_LABELS[opt] ?? ALIGNMENT_OPTION_LABELS[opt]) : ALIGNMENT_OPTION_LABELS[opt];
          return (
            <button
              key={opt}
              type="button"
              title={optLabel ?? opt}
              onClick={() => onChange(opt)}
              className={`flex flex-1 items-center justify-center gap-1 px-2 py-2 ${i !== 0 ? "border-l border-zinc-700" : ""} ${
                value === opt ? "bg-amber-400 text-white" : "bg-zinc-950 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              {Icon ? <Icon /> : <span className="whitespace-nowrap text-[10px] capitalize">{opt.replace(/-/g, " ")}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
