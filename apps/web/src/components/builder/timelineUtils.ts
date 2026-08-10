// ─────────────────────────────────────────────────────────────────────────────
// timelineUtils.ts
// Pure utilities: easing math, track interpolation, DOM binding, GSAP builder,
// and the standalone GSAP script exporter.
// ─────────────────────────────────────────────────────────────────────────────

import type { ClipPathTrack, ClipShape, CssVarTrack, GsapEasing, LayerTrack, PropertyKey, PropertyTrack } from "./timelineTypes";
import { PROPERTY_DEFAULTS } from "./timelineTypes";
import gsap from "gsap";

// ── Easing math (mirrors GSAP's internal implementations) ────────────────────

export function applyEasing(ease: GsapEasing, t: number): number {
  const p = Math.min(1, Math.max(0, t));
  switch (ease) {
    case "none":
      return p;
    case "power1.out":
      return 1 - Math.pow(1 - p, 1); // linear – power1 is t^1
    case "power2.inOut":
      return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    case "power3.out":
      return 1 - Math.pow(1 - p, 3);
    case "back.out(1.7)": {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
    }
    case "bounce.out": {
      const n1 = 7.5625;
      const d1 = 2.75;
      if (p < 1 / d1) return n1 * p * p;
      if (p < 2 / d1) { const q = p - 1.5 / d1;   return n1 * q * q + 0.75; }
      if (p < 2.5 / d1){ const q = p - 2.25 / d1; return n1 * q * q + 0.9375; }
      { const q = p - 2.625 / d1; return n1 * q * q + 0.984375; }
    }
    case "elastic.out(1,0.3)": {
      if (p === 0 || p === 1) return p;
      const c4 = (2 * Math.PI) / 3;
      return Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * c4) + 1;
    }
    default:
      return p;
  }
}

// ── Interpolation ─────────────────────────────────────────────────────────────

/** Compute the interpolated value for a PropertyTrack at a given time (seconds). */
export function interpolateTrack(track: PropertyTrack, time: number): number | null {
  const kfs = [...track.keyframes].sort((a, b) => a.time - b.time);
  if (kfs.length === 0) return null;
  if (kfs.length === 1) return kfs[0].value;
  if (time <= kfs[0].time) return kfs[0].value;
  if (time >= kfs[kfs.length - 1].time) return kfs[kfs.length - 1].value;

  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i];
    const b = kfs[i + 1];
    if (time >= a.time && time <= b.time) {
      const raw = (time - a.time) / (b.time - a.time);
      return a.value + (b.value - a.value) * applyEasing(a.easing, raw);
    }
  }
  return null;
}

/**
 * Best starting value when inserting a new keyframe at `time`:
 * uses the current interpolated value, or falls back to the property default.
 */
export function trackValueAtTime(track: PropertyTrack, time: number): number {
  return interpolateTrack(track, time) ?? PROPERTY_DEFAULTS[track.property];
}

// ── CSS variable & clip-path interpolation ──────────────────────────────────
// Mirrors apps/admin's timelineUtils.ts (kept in sync manually — see that
// file's comment for the number/color/snap decision this makes).

function parseNumberUnit(v: string): { num: number; unit: string } | null {
  const m = v.trim().match(/^(-?[\d.]+)([a-z%]*)$/i);
  return m ? { num: parseFloat(m[1]), unit: m[2] } : null;
}

function parseColor(v: string): [number, number, number, number] | null {
  const s = v.trim();
  let m = s.match(/^#([0-9a-f]{3})$/i);
  if (m) {
    const [r, g, b] = m[1].split("").map((c) => parseInt(c + c, 16));
    return [r, g, b, 1];
  }
  m = s.match(/^#([0-9a-f]{6})$/i);
  if (m) {
    const hex = m[1];
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), 1];
  }
  m = s.match(/^#([0-9a-f]{8})$/i);
  if (m) {
    const hex = m[1];
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), parseInt(hex.slice(6, 8), 16) / 255];
  }
  m = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
  if (m) return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), m[4] !== undefined ? parseFloat(m[4]) : 1];
  return null;
}

function lerpColor(a: [number, number, number, number], b: [number, number, number, number], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  const al = a[3] + (b[3] - a[3]) * t;
  return al < 1 ? `rgba(${r},${g},${bl},${+al.toFixed(3)})` : `rgb(${r},${g},${bl})`;
}

export function interpolateCssVarTrack(track: CssVarTrack, time: number): string | null {
  const kfs = [...track.keyframes].sort((a, b) => a.time - b.time);
  if (kfs.length === 0) return null;
  if (kfs.length === 1) return kfs[0].value;
  if (time <= kfs[0].time) return kfs[0].value;
  if (time >= kfs[kfs.length - 1].time) return kfs[kfs.length - 1].value;

  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i];
    const b = kfs[i + 1];
    if (time >= a.time && time <= b.time) {
      const raw = (time - a.time) / (b.time - a.time);
      const t = applyEasing(a.easing, raw);

      const an = parseNumberUnit(a.value);
      const bn = parseNumberUnit(b.value);
      if (an && bn && an.unit === bn.unit) return `${an.num + (bn.num - an.num) * t}${an.unit}`;

      const ac = parseColor(a.value);
      const bc = parseColor(b.value);
      if (ac && bc) return lerpColor(ac, bc, t);

      return t < 1 ? a.value : b.value;
    }
  }
  return null;
}

function parseClipPath(shape: ClipShape, v: string): number[] | null {
  if (shape === "circle") {
    const m = v.match(/circle\(\s*([\d.]+)%\s*at\s*([\d.]+)%\s*([\d.]+)%\s*\)/i);
    return m ? [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])] : null;
  }
  if (shape === "inset") {
    const m = v.match(/inset\(\s*([\d.]+)%\s+([\d.]+)%\s+([\d.]+)%\s+([\d.]+)%\s*\)/i);
    return m ? [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), parseFloat(m[4])] : null;
  }
  const m = v.match(/polygon\(([^)]+)\)/i);
  if (!m) return null;
  const nums = m[1]
    .split(",")
    .flatMap((pair) => pair.trim().split(/\s+/).map((n) => parseFloat(n)));
  return nums.some((n) => Number.isNaN(n)) ? null : nums;
}

function formatClipPath(shape: ClipShape, nums: number[]): string {
  if (shape === "circle") return `circle(${round1(nums[0])}% at ${round1(nums[1])}% ${round1(nums[2])}%)`;
  if (shape === "inset") return `inset(${round1(nums[0])}% ${round1(nums[1])}% ${round1(nums[2])}% ${round1(nums[3])}%)`;
  const pts: string[] = [];
  for (let i = 0; i < nums.length; i += 2) pts.push(`${round1(nums[i])}% ${round1(nums[i + 1])}%`);
  return `polygon(${pts.join(", ")})`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function interpolateClipPathTrack(track: ClipPathTrack, time: number): string | null {
  const kfs = [...track.keyframes].sort((a, b) => a.time - b.time);
  if (kfs.length === 0) return null;
  if (kfs.length === 1) return kfs[0].value;
  if (time <= kfs[0].time) return kfs[0].value;
  if (time >= kfs[kfs.length - 1].time) return kfs[kfs.length - 1].value;

  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i];
    const b = kfs[i + 1];
    if (time >= a.time && time <= b.time) {
      const raw = (time - a.time) / (b.time - a.time);
      const t = applyEasing(a.easing, raw);
      const an = parseClipPath(track.shape, a.value);
      const bn = parseClipPath(track.shape, b.value);
      if (!an || !bn || an.length !== bn.length) return t < 1 ? a.value : b.value;
      return formatClipPath(track.shape, an.map((v, i) => v + (bn[i] - v) * t));
    }
  }
  return null;
}

// ── GSAP property name mapping ────────────────────────────────────────────────

export function gsapPropFor(prop: PropertyKey): string {
  // GSAP uses "rotation" not "rotate"
  return prop === "rotate" ? "rotation" : prop;
}

// ── DOM canvas binding ────────────────────────────────────────────────────────

/**
 * Apply all interpolated track values for every layer to matching DOM elements.
 * Targets: document.querySelector(`[data-block-id="${layer.id}"]`)
 *
 * Maps:
 *   x, y     → transform: translateX / translateY
 *   scale    → transform: scale()
 *   rotate   → transform: rotate()deg)
 *   opacity  → opacity
 */
export function applyTracksToDOM(layers: LayerTrack[], time: number): void {
  for (const layer of layers) {
    if (!layer.visible) continue;
    const el = document.querySelector<HTMLElement>(`[data-block-id="${layer.id}"]`);
    if (!el) continue;

    const transforms: string[] = [];

    for (const track of layer.tracks) {
      const v = interpolateTrack(track, time);
      if (v === null) continue;
      switch (track.property) {
        case "x":       transforms.push(`translateX(${v}px)`);    break;
        case "y":       transforms.push(`translateY(${v}px)`);    break;
        case "scale":   transforms.push(`scale(${v})`);           break;
        case "rotate":  transforms.push(`rotate(${v}deg)`);       break;
        case "opacity": el.style.opacity = String(v); break;
      }
    }

    if (transforms.length > 0) el.style.transform = transforms.join(" ");

    for (const track of layer.cssVarTracks) {
      const v = interpolateCssVarTrack(track, time);
      if (v !== null) el.style.setProperty(track.varName, v);
    }
    for (const track of layer.clipPathTracks) {
      const v = interpolateClipPathTrack(track, time);
      if (v !== null) el.style.clipPath = v;
    }
  }
}

// ── GSAP Timeline builder (for seek-based scrubbing / playback) ───────────────

/**
 * Build a paused GSAP timeline from LayerTrack data.
 * Use `.seek(seconds)` to scrub, `.play()` for playback.
 * Targets [data-block-id] elements in the live DOM.
 */
export function buildGSAPTimeline(
  layers: LayerTrack[],
  totalDuration: number
): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true });
  // Anchor the timeline length
  tl.to({}, { duration: totalDuration });

  for (const layer of layers) {
    if (!layer.visible) continue;
    const selector = `[data-block-id="${layer.id}"]`;

    for (const track of layer.tracks) {
      const kfs = [...track.keyframes].sort((a, b) => a.time - b.time);
      if (kfs.length < 2) continue;

      for (let i = 0; i < kfs.length - 1; i++) {
        const a = kfs[i];
        const b = kfs[i + 1];
        const dur = +(b.time - a.time).toFixed(4);
        if (dur <= 0) continue;

        tl.to(
          selector,
          {
            [gsapPropFor(track.property)]: b.value,
            duration: dur,
            ease: a.easing === "none" ? "none" : a.easing,
          },
          a.time
        );
      }
    }
  }

  return tl;
}

// ── Standalone GSAP Script Exporter ──────────────────────────────────────────

/**
 * Generate a copy-pasteable GSAP JavaScript snippet from LayerTrack data.
 * The output is valid standalone JS for any page that loads GSAP from CDN.
 *
 * @example
 * const script = generateGSAPScript(layers, 5);
 * // → "const tl = gsap.timeline();\ntl.to('[data-block-id="..."]', {...}, 0);\n..."
 */
export function generateGSAPScript(layers: LayerTrack[], totalDuration: number): string {
  const lines: string[] = [
    "// ──────────────────────────────────────────────────────────────",
    "// Marwa Digital Animation Timeline Export",
    `// Duration: ${totalDuration}s  •  Layers: ${layers.filter((l) => l.visible).length}`,
    '// Requires: <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>',
    "// ──────────────────────────────────────────────────────────────",
    "",
    "const tl = gsap.timeline();",
    "",
  ];

  let hasTweens = false;

  for (const layer of layers) {
    if (!layer.visible) continue;
    const tweens: string[] = [];

    for (const track of layer.tracks) {
      const kfs = [...track.keyframes].sort((a, b) => a.time - b.time);
      if (kfs.length < 2) continue;

      for (let i = 0; i < kfs.length - 1; i++) {
        const a = kfs[i];
        const b = kfs[i + 1];
        const dur = +(b.time - a.time).toFixed(3);
        if (dur <= 0) continue;

        const prop = gsapPropFor(track.property);
        const ease = a.easing === "none" ? '"none"' : `"${a.easing}"`;
        tweens.push(
          `tl.to('[data-block-id="${layer.id}"]', { ${prop}: ${b.value}, duration: ${dur}, ease: ${ease} }, ${a.time});`
        );
      }
    }

    if (tweens.length > 0) {
      hasTweens = true;
      lines.push(`// ── Layer: ${layer.name} (${layer.emoji}) ──`);
      lines.push(...tweens);
      lines.push("");
    }
  }

  if (!hasTweens) {
    lines.push("// No keyframes defined yet — add keyframes in the Timeline Editor.");
    lines.push("");
  }

  // Remove trailing blank line
  while (lines[lines.length - 1] === "") lines.pop();

  return lines.join("\n");
}
