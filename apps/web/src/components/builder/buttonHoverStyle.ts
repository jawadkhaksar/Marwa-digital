// Shared hover mechanism for every in-section CTA/button (Faq's "See More",
// TourInfoSection's primary/secondary CTA, Checklist/Services/TrustHighlights/
// Testimonials/PillLinks/PricingOverview's "cta", Services' "Book Now",
// ContactForm's submit button, etc.) — extracted from
// CTAButton's own hand-rolled version so every section gets the same
// gradient-slide + box-shadow-glow hover treatment instead of a bespoke
// one-field (background-only) `:hover` rule per block.
//
// Inline styles (used for the resting state) always beat a plain
// class-selector `:hover` rule regardless of specificity, so hover overrides
// still need a real scoped <style> tag with `!important` — same root cause
// documented in resolveNodeStyle.ts for the tablet/mobile override bug.
export interface ButtonHoverInputs {
  /** Resting background — only read as the slide-mode fallback when hoverBackground is unset. */
  background?: string;
  hoverBackground?: string;
  hoverColor?: string;
  hoverBorderColor?: string;
  hoverBoxShadow?: string;
  hoverBackgroundSize?: string;
  hoverBackgroundPosition?: string;
  hoverTransitionDuration?: string;
  /** Raw CSS `transform` value, e.g. "scale(1.03)" or "translateY(-4px)" — used by card-hover lift/zoom, not just buttons despite the file's original button-only name. */
  hoverTransform?: string;
}

export interface ButtonHoverResult {
  /** Merge into the button's resting inline style. */
  restingStyle: Record<string, string | undefined>;
  /** Empty string when there's nothing to override on hover. */
  hoverClassName: string;
  /** Raw `.class:hover{...}` CSS, or "" — render inside a <style> tag. */
  hoverCss: string;
}

export function hashString(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

export function buildButtonHoverStyle(classPrefix: string, inputs: ButtonHoverInputs): ButtonHoverResult {
  const {
    background,
    hoverBackground,
    hoverColor,
    hoverBorderColor,
    hoverBoxShadow,
    hoverBackgroundSize,
    hoverBackgroundPosition,
    hoverTransitionDuration,
    hoverTransform,
  } = inputs;

  // "Gradient slide" mode: hoverBackground (which can be a full gradient,
  // not just a solid color) paints on the RESTING state instead of only on
  // :hover, oversized via hoverBackgroundSize (e.g. "300% 100%") so
  // hoverBackgroundPosition (e.g. "100% 0") has somewhere to slide it to —
  // a static gradient would otherwise just pop in/out with nothing to
  // animate between. Off (hoverBackgroundSize unset) reproduces plain
  // background-only-on-:hover behavior exactly.
  const slideMode = Boolean(hoverBackgroundSize);
  const restingStyle: Record<string, string | undefined> = {};
  if (slideMode) {
    restingStyle.background = hoverBackground || background || undefined;
    restingStyle.backgroundSize = hoverBackgroundSize;
  }
  if (hoverTransitionDuration) {
    restingStyle.transition = `all ${hoverTransitionDuration} ease-in-out`;
  }

  const hasHoverOverride = Boolean(hoverBackground || hoverColor || hoverBorderColor || hoverBoxShadow || hoverTransform || slideMode);
  const hoverClassName = hasHoverOverride
    ? `${classPrefix}-h${hashString(`${hoverBackground ?? ""}|${hoverColor ?? ""}|${hoverBorderColor ?? ""}|${hoverBoxShadow ?? ""}|${hoverBackgroundSize ?? ""}|${hoverBackgroundPosition ?? ""}|${hoverTransform ?? ""}`)}`
    : "";
  const hoverCss = hasHoverOverride
    ? `.${hoverClassName}:hover{${[
        // In slide mode the gradient is already on the resting state above —
        // hover only slides its position; re-declaring `background` here
        // would reset it back to position 0 first, fighting the slide.
        !slideMode && hoverBackground && `background:${hoverBackground} !important;`,
        slideMode && `background-position:${hoverBackgroundPosition || "100% 0"} !important;`,
        hoverColor && `color:${hoverColor} !important;`,
        hoverBorderColor && `border-color:${hoverBorderColor} !important;`,
        hoverBoxShadow && `box-shadow:${hoverBoxShadow} !important;`,
        hoverTransform && `transform:${hoverTransform} !important;`,
      ]
        .filter(Boolean)
        .join("")}}`
    : "";

  return { restingStyle, hoverClassName, hoverCss };
}
