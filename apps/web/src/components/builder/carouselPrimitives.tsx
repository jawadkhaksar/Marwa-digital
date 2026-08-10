"use client";

// Shared between SliderBlock (fixed image+text slides) and
// CarouselContainerBlock (arbitrary-content slides) — same nav chrome,
// same scoped-breakpoint-class technique, so the two don't drift into two
// different-looking carousels for what's visually the same control.

/** Cheap deterministic string hash — gives each carousel instance a stable scoped class so its items-per-view breakpoints (a runtime-configured number, so Tailwind's JIT can't pre-compile a class for it) can live in a real injected <style> block instead of inline styles that can't express media queries. */
export function hashString(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

// Shape/size only — color comes from arrowColor/arrowBackground props,
// applied inline, so it's actually admin-editable instead of hardcoded.
const ARROW_SHAPE_CLASSES: Record<string, string> = {
  circle: "flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-sm transition",
  square: "flex h-9 w-9 items-center justify-center rounded-md backdrop-blur-sm transition",
  minimal: "flex h-9 w-9 items-center justify-center transition",
};

function ArrowIcon({ direction }: { direction: "prev" | "next" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      {direction === "prev" ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
    </svg>
  );
}

export function ArrowButton({
  direction,
  onClick,
  arrowStyle,
  arrowColor,
  arrowBackground,
  arrowHoverColor,
  arrowHoverBackground,
  position = "inside",
}: {
  direction: "prev" | "next";
  onClick: () => void;
  arrowStyle: string;
  arrowColor?: string;
  arrowBackground?: string;
  arrowHoverColor?: string;
  arrowHoverBackground?: string;
  position?: "inside" | "outside";
}) {
  const edge = direction === "prev" ? "left" : "right";
  const color = arrowColor || "#fff";
  const background = arrowStyle === "minimal" ? undefined : arrowBackground || "rgba(0,0,0,0.5)";
  const hasHover = arrowHoverColor || arrowHoverBackground;
  const hoverClass = hasHover ? `arrow-h${hashString(`${arrowHoverColor ?? ""}|${arrowHoverBackground ?? ""}`)}` : "";
  return (
    <>
      {hasHover && (
        <style
          dangerouslySetInnerHTML={{
            __html: `.${hoverClass}:hover{${[
              `color:${arrowHoverColor || color} !important;`,
              arrowStyle !== "minimal" && `background:${arrowHoverBackground || background} !important;`,
            ]
              .filter(Boolean)
              .join("")}}`,
          }}
        />
      )}
      <button
        type="button"
        aria-label={direction === "prev" ? "Previous slide" : "Next slide"}
        onClick={onClick}
        className={`absolute top-1/2 z-10 -translate-y-1/2 ${ARROW_SHAPE_CLASSES[arrowStyle]} ${hoverClass}`}
        style={{
          [edge]: position === "outside" ? -46 : 8,
          color,
          background,
        }}
      >
        <ArrowIcon direction={direction} />
      </button>
    </>
  );
}

export function Dots({
  count,
  active,
  onSelect,
  dotStyle,
  dotColor,
  dotActiveColor,
  dotHoverColor,
}: {
  count: number;
  active: number;
  onSelect: (i: number) => void;
  dotStyle?: string;
  dotColor?: string;
  dotActiveColor?: string;
  dotHoverColor?: string;
}) {
  if (count <= 1) return null;
  const inactive = dotColor || "rgba(255,255,255,0.3)";
  const activeColor = dotActiveColor || "#2563ff";
  const hoverClass = dotHoverColor ? `dot-h${hashString(dotHoverColor)}` : "";
  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      {dotHoverColor && (
        <style dangerouslySetInnerHTML={{ __html: `.${hoverClass}:not([data-active="true"]):hover{background:${dotHoverColor} !important;}` }} />
      )}
      {Array.from({ length: count }).map((_, i) =>
        dotStyle === "numbers" ? (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            data-active={i === active}
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition ${hoverClass}`}
            style={{ background: i === active ? activeColor : inactive, color: i === active ? "#000" : "#fff" }}
          >
            {i + 1}
          </button>
        ) : dotStyle === "lines" ? (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            data-active={i === active}
            className={`h-1 rounded-full transition-all ${i === active ? "w-8" : "w-4"} ${hoverClass}`}
            style={{ background: i === active ? activeColor : inactive }}
          />
        ) : (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            data-active={i === active}
            className={`h-2.5 w-2.5 rounded-full transition-all ${hoverClass}`}
            style={{ background: i === active ? activeColor : inactive }}
          />
        )
      )}
    </div>
  );
}
