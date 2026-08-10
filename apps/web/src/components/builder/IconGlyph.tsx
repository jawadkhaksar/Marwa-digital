import type { CSSProperties, ComponentType } from "react";
import { resolveIconValue } from "@/lib/iconLibrary";
import { resolveImageUrl } from "@/lib/resolveImageUrl";

type FallbackIcon = ComponentType<{ size?: number | string; color?: string; className?: string; style?: CSSProperties }>;

/**
 * Universal icon renderer — every icon-bearing block should render through
 * this instead of resolving+rendering an icon component by hand, so a
 * custom-SVG value (pasted markup or an uploaded file, see resolveIconValue)
 * works everywhere a react-icons/fa6 or legacy hand-drawn key already did,
 * with no per-block wiring.
 *
 * `size`/`color` apply uniformly across all four value kinds — including
 * the legacy hand-drawn set, whose components only ever accepted
 * `className` before this existed, silently ignoring size/color.
 */
export function IconGlyph({
  icon,
  fallback,
  size,
  color,
  className,
  style,
}: {
  icon?: string;
  fallback?: FallbackIcon;
  size?: number | string;
  color?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const resolved = resolveIconValue(icon);

  if (resolved.kind === "library") {
    const Cmp = resolved.Component;
    return <Cmp size={size} color={color} className={className} style={style} />;
  }

  if (resolved.kind === "legacy") {
    // This set's components only ever accepted `className` — no `size`/
    // `color`/`style` props to forward into, unlike react-icons. A wrapping
    // span applies those instead; the SVGs themselves already use
    // `stroke/fill="currentColor"` and size off their own viewBox, so a
    // span-level color/width/height reaches them the same way `className`
    // sizing utilities (e.g. "h-4 w-4") already did at every call site.
    const Cmp = resolved.Component;
    return (
      <span
        className={className}
        style={{ display: "inline-flex", color, ...(size ? { width: size, height: size } : null), ...style }}
      >
        <Cmp className={size ? "h-full w-full" : className} />
      </span>
    );
  }

  if (resolved.kind === "inline") {
    // Pasted directly by an authenticated admin — same trust boundary as
    // RichText's `html` field elsewhere in the builder.
    return (
      <span
        className={className}
        style={{ display: "inline-flex", width: size ?? "1em", height: size ?? "1em", color, ...style }}
        dangerouslySetInnerHTML={{ __html: resolved.markup }}
      />
    );
  }

  if (resolved.kind === "file") {
    // An uploaded SVG *file* — rendered as a plain <img>, same as every
    // other uploaded-media usage in this codebase, so it keeps its own
    // real colors. An earlier version of this recolored it via a CSS
    // mask-image instead (letting the block's `color`/iconColor prop tint
    // it, the way the other three icon kinds already can) — but a mask
    // only distinguishes opaque vs transparent pixels, not the actual
    // colors inside, so any icon that isn't a pure single-tone silhouette
    // with true transparent cutouts (e.g. a pre-styled multi-color badge
    // like a gold circle with a white checkmark drawn on top, not cut out
    // of it) collapsed to a flat, unrecognizable blob of its own outer
    // shape. Preserving the uploaded icon's real appearance is the more
    // useful default — `color` has no effect on this kind now, same as it
    // never affected a plain <img> anywhere else in the builder.
    //
    // resolved.url is the raw stored value — a relative "/uploads/..."
    // path meant to be served from the API's own origin (a different port
    // in dev), not this Next app's — resolveImageUrl() maps it correctly,
    // matching every other consumer of an uploaded-media path.
    const fileUrl = resolveImageUrl(resolved.url);
    return (
      // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded content, cross-origin in dev; see ImageBox for the same fix
      <img
        src={fileUrl}
        alt=""
        className={className}
        style={{ display: "inline-block", width: size ?? "1em", height: size ?? "1em", objectFit: "contain", ...style }}
      />
    );
  }

  if (fallback) {
    const Fallback = fallback;
    return <Fallback size={size} color={color} className={className} style={style} />;
  }
  return null;
}
