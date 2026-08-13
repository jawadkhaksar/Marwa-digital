"use client";

import { useId, type CSSProperties, type Ref } from "react";
import Link from "next/link";
import {
  POWER_BUTTON_ALIGN_VALUES,
  POWER_BUTTON_HOVER_EFFECT_VALUES,
  POWER_BUTTON_ICON_POSITION_VALUES,
  POWER_BUTTON_PRESET_VALUES,
  POWER_BUTTON_SHAPE_VALUES,
  POWER_BUTTON_SIZE_VALUES,
} from "@marwa/builder";
import { IconGlyph } from "@/components/builder/IconGlyph";

type Preset = (typeof POWER_BUTTON_PRESET_VALUES)[number];
type Size = (typeof POWER_BUTTON_SIZE_VALUES)[number];
type Shape = (typeof POWER_BUTTON_SHAPE_VALUES)[number];
type IconPosition = (typeof POWER_BUTTON_ICON_POSITION_VALUES)[number];
type HoverEffect = (typeof POWER_BUTTON_HOVER_EFFECT_VALUES)[number];
type Align = (typeof POWER_BUTTON_ALIGN_VALUES)[number];

/** Padding and type scale per size. Kept as literal values rather than
 *  Tailwind classes so an author's own paddingTop/fontSize overrides can win
 *  by simply being present — a class would need `!important` to beat. */
const SIZE_SPECS: Record<Size, { padY: string; padX: string; font: string; gap: string; icon: number }> = {
  xs: { padY: "6px", padX: "12px", font: "0.75rem", gap: "6px", icon: 12 },
  sm: { padY: "8px", padX: "16px", font: "0.85rem", gap: "7px", icon: 14 },
  md: { padY: "12px", padX: "24px", font: "0.95rem", gap: "8px", icon: 16 },
  lg: { padY: "15px", padX: "32px", font: "1.05rem", gap: "10px", icon: 18 },
  xl: { padY: "19px", padX: "40px", font: "1.15rem", gap: "12px", icon: 20 },
};

const SHAPE_RADIUS: Record<Shape, string> = { rounded: "10px", pill: "9999px", square: "0px" };

const ALIGN_TO_JUSTIFY: Record<Align, string> = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
  stretch: "stretch",
};

export interface PowerButtonProps {
  label?: string;
  href?: string;
  target?: "_self" | "_blank";
  rel?: string;
  subLabel?: string;
  badge?: string;
  icon?: string;
  iconPosition?: IconPosition;
  iconGap?: string;

  preset?: Preset;
  size?: Size;
  shape?: Shape;
  align?: Align;
  fullWidth?: boolean;

  gradientFrom?: string;
  gradientTo?: string;
  gradientAngle?: string;

  hoverEffect?: HoverEffect;
  hoverBackground?: string;
  hoverColor?: string;
  hoverBorderColor?: string;
  transitionDuration?: string;

  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
  ariaLabel?: string;

  background?: string;
  color?: string;
  borderStyle?: string;
  borderWidth?: string;
  borderColor?: string;
  borderRadius?: string;
  boxShadow?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  textTransform?: string;
  letterSpacing?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;

  wrapperProps?: {
    ref?: Ref<HTMLElement>;
    id?: string;
    className?: string;
    style?: CSSProperties;
    suppressHydrationWarning?: boolean;
    [key: string]: unknown;
  };
}

/** The colours each preset contributes before any author override. `accent`
 *  is the brand blue the rest of the site uses; presets that need a second
 *  colour take it from the gradient props so there is one place to change. */
function presetStyle(preset: Preset, p: PowerButtonProps): CSSProperties {
  const from = p.gradientFrom || "#2563ff";
  const to = p.gradientTo || "#7c3aed";
  const angle = p.gradientAngle || "90";

  switch (preset) {
    case "gradient":
      return { background: `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)`, color: "#ffffff", border: "1px solid transparent" };
    case "outline":
      return { background: "transparent", color: from, border: `2px solid ${from}` };
    case "ghost":
      return { background: "transparent", color: from, border: "1px solid transparent" };
    case "soft":
      // Colour-mix keeps the tint tied to the chosen colour instead of a
      // hardcoded pastel, so it still reads correctly if the brand changes.
      return { background: `color-mix(in srgb, ${from} 14%, transparent)`, color: from, border: "1px solid transparent" };
    case "link":
      return { background: "transparent", color: from, border: "1px solid transparent", textDecoration: "underline", textUnderlineOffset: "4px" };
    case "glass":
      return {
        background: "rgba(255,255,255,0.10)",
        color: "#ffffff",
        border: "1px solid rgba(255,255,255,0.22)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      };
    case "neon":
      return { background: "transparent", color: from, border: `2px solid ${from}`, boxShadow: `0 0 12px ${from}66, inset 0 0 12px ${from}22` };
    case "elevated":
      return { background: from, color: "#ffffff", border: "1px solid transparent", boxShadow: "0 10px 24px -8px rgba(15,23,42,0.45)" };
    case "solid":
    default:
      return { background: from, color: "#ffffff", border: "1px solid transparent" };
  }
}

/** Hover rules are emitted as a real scoped stylesheet rather than inline
 *  styles: :hover cannot be expressed inline, and React has no pseudo-class
 *  API. Scoped to a generated class so two Power Buttons on one page never
 *  restyle each other. */
function hoverCss(cls: string, effect: HoverEffect, p: PowerButtonProps): string {
  const rules: string[] = [];
  const colour: string[] = [];
  if (p.hoverBackground) colour.push(`background:${p.hoverBackground} !important`);
  if (p.hoverColor) colour.push(`color:${p.hoverColor} !important`);
  if (p.hoverBorderColor) colour.push(`border-color:${p.hoverBorderColor} !important`);

  switch (effect) {
    case "lift":
      colour.push("transform:translateY(-2px)", "box-shadow:0 12px 22px -10px rgba(15,23,42,0.55)");
      break;
    case "grow":
      colour.push("transform:scale(1.04)");
      break;
    case "shrink":
      colour.push("transform:scale(0.97)");
      break;
    case "glow":
      colour.push(`box-shadow:0 0 22px ${p.gradientFrom || "#2563ff"}88`);
      break;
    case "slide":
      // Oversized background slid into view, so a gradient sweeps across
      // rather than cross-fading.
      rules.push(`.${cls}{background-size:220% 100% !important;background-position:0% 0 !important;}`);
      colour.push("background-position:100% 0 !important");
      break;
    case "pulse":
      rules.push(`@keyframes ${cls}-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.035)}}`);
      colour.push(`animation:${cls}-pulse 1.1s ease-in-out infinite`);
      break;
    case "shine":
      // A rotated highlight swept across via ::after — needs the button to
      // clip, which the base style already does with overflow:hidden.
      rules.push(
        `.${cls}::after{content:"";position:absolute;top:0;left:-120%;width:60%;height:100%;` +
          `background:linear-gradient(120deg,transparent,rgba(255,255,255,0.45),transparent);` +
          `transition:left .6s ease;pointer-events:none;}`,
        `.${cls}:hover::after{left:140%;}`
      );
      break;
    case "none":
    default:
      break;
  }

  if (colour.length > 0) rules.push(`.${cls}:hover{${colour.join(";")};}`);
  // Motion-based effects are suppressed for visitors who ask for reduced
  // motion; colour changes are left alone since they convey the state.
  rules.push(`@media (prefers-reduced-motion:reduce){.${cls}:hover{transform:none;animation:none;}.${cls}::after{transition:none;}}`);
  return rules.join("");
}

export function PowerButtonBlock(props: PowerButtonProps) {
  const {
    label = "Get started",
    href = "#",
    target = "_self",
    rel,
    subLabel,
    badge,
    icon,
    iconPosition = "after",
    iconGap,
    preset = "solid",
    size = "md",
    shape = "rounded",
    align = "left",
    fullWidth = false,
    hoverEffect = "lift",
    transitionDuration = "200ms",
    loading = false,
    loadingLabel,
    disabled = false,
    ariaLabel,
    wrapperProps,
  } = props;

  // useId rather than a random value: a random class would differ between the
  // server and client renders and blow up hydration.
  const cls = `pbtn-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const spec = SIZE_SPECS[size] ?? SIZE_SPECS.md;
  const iconOnly = iconPosition === "only";
  const showIcon = iconPosition !== "none" && Boolean(icon);
  const inactive = disabled || loading;
  const text = loading && loadingLabel ? loadingLabel : label;

  const style: CSSProperties = {
    // Anchors are inline by default, which would ignore vertical padding.
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: iconGap || spec.gap,
    position: "relative",
    overflow: "hidden",
    textAlign: "center",
    lineHeight: 1.2,
    cursor: inactive ? "not-allowed" : "pointer",
    opacity: inactive ? 0.6 : 1,
    transition: `all ${transitionDuration} cubic-bezier(.22,1,.36,1)`,
    width: fullWidth ? "100%" : undefined,

    ...presetStyle(preset, props),

    paddingTop: props.paddingTop || spec.padY,
    paddingBottom: props.paddingBottom || spec.padY,
    paddingLeft: props.paddingLeft || (iconOnly ? spec.padY : spec.padX),
    paddingRight: props.paddingRight || (iconOnly ? spec.padY : spec.padX),
    borderRadius: props.borderRadius || (iconOnly && shape === "rounded" ? "12px" : SHAPE_RADIUS[shape] ?? "10px"),
    fontFamily: props.fontFamily && props.fontFamily !== "inherit" ? props.fontFamily : undefined,
    fontSize: props.fontSize || spec.font,
    fontWeight: props.fontWeight || 600,
    textTransform: (props.textTransform as CSSProperties["textTransform"]) || undefined,
    letterSpacing: props.letterSpacing || undefined,

    // Author overrides land last so they beat the preset. Each is only
    // applied when actually set — writing undefined here would wipe the
    // preset's value instead of leaving it in place.
    ...(props.background ? { background: props.background } : {}),
    ...(props.color ? { color: props.color } : {}),
    ...(props.borderStyle && props.borderStyle !== "none"
      ? { borderStyle: props.borderStyle, borderWidth: props.borderWidth || "1px", borderColor: props.borderColor || "currentColor" }
      : {}),
    ...(props.boxShadow ? { boxShadow: props.boxShadow } : {}),
  };

  const iconEl = showIcon ? <IconGlyph icon={icon} size={spec.icon} /> : null;

  const inner = (
    <>
      {loading && (
        <span
          aria-hidden
          style={{
            width: spec.icon,
            height: spec.icon,
            border: "2px solid currentColor",
            borderTopColor: "transparent",
            borderRadius: "9999px",
            animation: `${cls}-spin .7s linear infinite`,
            flexShrink: 0,
          }}
        />
      )}
      {!loading && showIcon && iconPosition !== "after" && iconEl}
      {!iconOnly && (
        <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", lineHeight: 1.15 }}>
          <span>{text}</span>
          {subLabel && <span style={{ fontSize: "0.75em", fontWeight: 400, opacity: 0.8 }}>{subLabel}</span>}
        </span>
      )}
      {!loading && showIcon && iconPosition === "after" && iconEl}
      {badge && (
        <span
          style={{
            position: "absolute",
            top: "-6px",
            right: "-6px",
            background: "#ef4444",
            color: "#fff",
            borderRadius: "9999px",
            fontSize: "0.65rem",
            fontWeight: 700,
            lineHeight: 1,
            padding: "3px 6px",
            // The badge sits outside the button's own box, so the button
            // cannot clip it — overflow is reset just for this child.
            overflow: "visible",
          }}
        >
          {badge}
        </span>
      )}
    </>
  );

  const css =
    hoverCss(cls, inactive ? "none" : hoverEffect, props) +
    `@keyframes ${cls}-spin{to{transform:rotate(360deg)}}` +
    // A badge would be clipped by the button's own overflow:hidden, which the
    // shine effect needs. Allowing the badge to escape without losing that
    // clip means turning overflow off only when there is a badge and no shine.
    (badge && hoverEffect !== "shine" ? `.${cls}{overflow:visible !important;}` : "");

  const wrapperStyle: CSSProperties = {
    display: "flex",
    justifyContent: ALIGN_TO_JUSTIFY[align] ?? "flex-start",
    width: "100%",
    ...wrapperProps?.style,
  };

  const shared = {
    className: [cls, wrapperProps?.className].filter(Boolean).join(" "),
    style,
    "aria-label": ariaLabel || (iconOnly ? label : undefined),
  };

  return (
    <div
      ref={wrapperProps?.ref as Ref<HTMLDivElement>}
      id={wrapperProps?.id}
      style={wrapperStyle}
      suppressHydrationWarning={wrapperProps?.suppressHydrationWarning}
      data-block-id={wrapperProps?.["data-block-id"] as string | undefined}
    >
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {inactive ? (
        // Rendered as a real <button disabled> rather than a dead anchor, so
        // it is genuinely unfocusable and announced as disabled instead of
        // just looking faded.
        <button type="button" disabled {...shared}>
          {inner}
        </button>
      ) : (
        <Link
          href={href || "#"}
          target={target}
          // noopener/noreferrer is forced for new-tab links even when the
          // author supplied their own rel, since omitting it hands the opened
          // page a handle back to this one.
          rel={target === "_blank" ? [rel, "noopener", "noreferrer"].filter(Boolean).join(" ") : rel || undefined}
          {...shared}
        >
          {inner}
        </Link>
      )}
    </div>
  );
}
