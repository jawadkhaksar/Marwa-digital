// ─────────────────────────────────────────────────────────────────────────────
// timelineUtils.ts
// Pure utilities for timeline interpolation, DOM updates, and GSAP script export.
// ─────────────────────────────────────────────────────────────────────────────

import type { BlockTimeline } from "@marwa/builder";
import type { ClipPathTrack, ClipShape, CssVarTrack, GsapEasing, LayerTrack, PropertyKey, PropertyTrack } from "./timelineTypes";
import { PROPERTY_DEFAULTS } from "./timelineTypes";
import gsap from "gsap";

/** GSAP's own core ease parser understands the full 28-value named
 *  vocabulary plus "cubic-bezier(x1,y1,x2,y2)" strings natively (no
 *  CustomEase plugin needed) — deferring to it directly (rather than
 *  hand-rolling power/back/bounce/elastic math, as this used to) means the
 *  scrub preview matches real exported playback exactly, for every ease,
 *  not just the 7 that had hand-written approximations before the ease
 *  vocabulary was merged with AnimationEase. */
export function applyEasing(ease: GsapEasing, t: number): number {
  const p = Math.min(1, Math.max(0, t));
  if (ease === "linear") return p;
  try {
    return gsap.parseEase(ease)(p);
  } catch {
    return p;
  }
}

// ── Bezier / Spring easing authoring helpers ────────────────────────────────
// Used by the Timeline drawer's Keyframe popover (AnimationTimelineEditor.tsx)
// to let a user either drag a standard 2-handle cubic-bezier graph, or dial
// in mass/stiffness/damping like a spring and have it converted to an
// equivalent cubic-bezier string. GSAP's core ease parser only understands
// the named vocabulary plus cubic-bezier() natively — no physics-based
// spring easing without the paid CustomEase/Spring plugins this project
// doesn't have — so "spring" here is strictly a UI authoring convenience:
// turning the dials always ends by writing a plain cubic-bezier(x1,y1,x2,y2)
// string, identical in the saved data to one authored by dragging the bezier
// handles directly. Nothing downstream (export, live playback) ever sees
// mass/stiffness/damping — they exist only inside the popover's local state.

export type BezierTuple = [number, number, number, number];

const BEZIER_RE = /^cubic-bezier\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/i;

export function parseBezierString(ease: string): BezierTuple | null {
  const m = ease.match(BEZIER_RE);
  if (!m) return null;
  return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), parseFloat(m[4])];
}

export function formatBezierString([x1, y1, x2, y2]: BezierTuple): string {
  const r = (n: number) => Math.round(n * 1000) / 1000;
  return `cubic-bezier(${r(x1)},${r(y1)},${r(x2)},${r(y2)})`;
}

/**
 * Simulates a damped spring (mass/stiffness/damping) settling from 0 to 1,
 * then fits it to a standard 2-handle cubic-bezier by sampling the simulated
 * curve at the 1/3 and 2/3 marks of its settle window and using those as the
 * bezier's y1/y2 (with x1=1/3, x2=2/3 fixed). This is a cheap 2-point match,
 * not a true least-squares curve fit — a cubic-bezier only has 2 free
 * handles to begin with, and the popover lets the user drag them further
 * after applying — but it reliably turns "mass 1 / stiffness 100 / damping
 * 10" into a recognizable overshoot-and-settle curve instead of expecting
 * the user to hand-guess bezier coordinates for that effect.
 */
export function springToBezier(mass: number, stiffness: number, damping: number): BezierTuple {
  const m = Math.max(0.1, mass);
  const k = Math.max(1, stiffness);
  const c = Math.max(0, damping);

  const dt = 1 / 2000;
  let x = 0;
  let v = 0;
  const samples: number[] = [];
  let settleStep = -1;
  for (let i = 0; i < 4000; i++) {
    const a = (-k * (x - 1) - c * v) / m;
    v += a * dt;
    x += v * dt;
    samples.push(x);
    if (settleStep < 0 && i > 10 && Math.abs(x - 1) < 0.005 && Math.abs(v) < 0.02) settleStep = i;
  }
  const totalSteps = settleStep > 0 ? settleStep : samples.length - 1;
  const at = (frac: number) => samples[Math.min(samples.length - 1, Math.round(totalSteps * frac))] ?? 1;
  return [1 / 3, Math.round(at(1 / 3) * 1000) / 1000, 2 / 3, Math.round(at(2 / 3) * 1000) / 1000];
}

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
      if (a.interpolation === "hold") return a.value; // step function — holds until b.time, then the loop's next iteration (or the >= last-keyframe check above) picks up b.value
      const raw = (time - a.time) / (b.time - a.time);
      return a.value + (b.value - a.value) * applyEasing(a.easingOut, raw);
    }
  }
  return null;
}

export function trackValueAtTime(track: PropertyTrack, time: number): number {
  return interpolateTrack(track, time) ?? PROPERTY_DEFAULTS[track.property];
}

// ── CSS variable & clip-path interpolation ──────────────────────────────────
// Same segment/easing math as interpolateTrack above, but operating on a raw
// CSS string value instead of a bare number — value pairs are auto-detected
// as either a number+matching-unit (lerp the number) or a color (lerp each
// channel); anything else snaps at the segment's easing-adjusted midpoint
// rather than attempting to interpolate an arbitrary string.

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

/** Compute the interpolated raw CSS value for a CssVarTrack at a given time — see the module doc comment above for the number/color/snap decision. */
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
      if (a.interpolation === "hold") return a.value;
      const raw = (time - a.time) / (b.time - a.time);
      const t = applyEasing(a.easingOut, raw);

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

/** Compute the interpolated clip-path value for a ClipPathTrack at a given time — always a same-shape parametric lerp (see ClipPathTrack's doc comment in timelineTypes.ts), falling back to a snap if either endpoint doesn't parse as the track's own shape. */
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
      if (a.interpolation === "hold") return a.value;
      const raw = (time - a.time) / (b.time - a.time);
      const t = applyEasing(a.easingOut, raw);
      const an = parseClipPath(track.shape, a.value);
      const bn = parseClipPath(track.shape, b.value);
      if (!an || !bn || an.length !== bn.length) return t < 1 ? a.value : b.value;
      return formatClipPath(track.shape, an.map((v, i) => v + (bn[i] - v) * t));
    }
  }
  return null;
}

export function gsapPropFor(prop: PropertyKey): string {
  return prop === "rotate" ? "rotation" : prop;
}

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
        case "scaleX":  transforms.push(`scaleX(${v})`);          break;
        case "scaleY":  transforms.push(`scaleY(${v})`);          break;
        case "rotate":  transforms.push(`rotate(${v}deg)`);       break;
        case "skewX":   transforms.push(`skewX(${v}deg)`);        break;
        case "skewY":   transforms.push(`skewY(${v}deg)`);        break;
        case "opacity": el.style.opacity = String(v);             break;
        case "borderRadius": el.style.borderRadius = `${v}px`;    break;
        case "blur":
        case "grayscale":
        case "brightness":
          // Composed together below rather than one at a time, same reason as AnimatedBox's tweenVars.
          break;
      }
    }

    if (transforms.length > 0) el.style.transform = transforms.join(" ");

    const blurTrack = layer.tracks.find((t) => t.property === "blur");
    const grayscaleTrack = layer.tracks.find((t) => t.property === "grayscale");
    const brightnessTrack = layer.tracks.find((t) => t.property === "brightness");
    if (blurTrack || grayscaleTrack || brightnessTrack) {
      const blur = blurTrack ? (interpolateTrack(blurTrack, time) ?? 0) : 0;
      const grayscale = grayscaleTrack ? (interpolateTrack(grayscaleTrack, time) ?? 0) : 0;
      const brightness = brightnessTrack ? (interpolateTrack(brightnessTrack, time) ?? 1) : 1;
      el.style.filter = `blur(${blur}px) grayscale(${grayscale}) brightness(${brightness})`;
    }

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

function safeIdent(id: string): string {
  const s = id.replace(/[^a-zA-Z0-9_]/g, "_");
  return /^[0-9]/.test(s) ? `_${s}` : s;
}

function easeLiteral(ease: GsapEasing): string {
  return ease === "linear" ? '"none"' : `"${ease}"`;
}

/** Every `.to()`/`.set()` call one layer contributes to a timeline variable — spatial tracks (via gsapPropFor), CSS var tracks (GSAP tweens `--custom-prop` keys natively), and clip-path tracks (GSAP interpolates matching clip-path functions token-by-token, same requirement as this module's own interpolateClipPathTrack: both keyframes must share a shape). A "hold" segment emits a `.set()` at its start plus another `.set()` at the next keyframe's time (the jump), instead of a `.to()` tween. */
function tweenLinesForLayer(layer: LayerTrack, tlVar: string, selector: string): string[] {
  const lines: string[] = [];

  for (const track of layer.tracks) {
    const kfs = [...track.keyframes].sort((a, b) => a.time - b.time);
    for (let i = 0; i < kfs.length - 1; i++) {
      const a = kfs[i];
      const b = kfs[i + 1];
      const dur = +(b.time - a.time).toFixed(3);
      if (dur <= 0) continue;
      const prop = gsapPropFor(track.property);
      if (a.interpolation === "hold") {
        lines.push(`${tlVar}.set('${selector}', { ${prop}: ${a.value} }, ${a.time});`);
        lines.push(`${tlVar}.set('${selector}', { ${prop}: ${b.value} }, ${b.time});`);
      } else {
        lines.push(`${tlVar}.to('${selector}', { ${prop}: ${b.value}, duration: ${dur}, ease: ${easeLiteral(a.easingOut)} }, ${a.time});`);
      }
    }
  }

  for (const track of layer.cssVarTracks) {
    const kfs = [...track.keyframes].sort((a, b) => a.time - b.time);
    for (let i = 0; i < kfs.length - 1; i++) {
      const a = kfs[i];
      const b = kfs[i + 1];
      const dur = +(b.time - a.time).toFixed(3);
      if (dur <= 0) continue;
      if (a.interpolation === "hold") {
        lines.push(`${tlVar}.set('${selector}', { "${track.varName}": ${JSON.stringify(a.value)} }, ${a.time});`);
        lines.push(`${tlVar}.set('${selector}', { "${track.varName}": ${JSON.stringify(b.value)} }, ${b.time});`);
      } else {
        lines.push(`${tlVar}.to('${selector}', { "${track.varName}": ${JSON.stringify(b.value)}, duration: ${dur}, ease: ${easeLiteral(a.easingOut)} }, ${a.time});`);
      }
    }
  }

  for (const track of layer.clipPathTracks) {
    const kfs = [...track.keyframes].sort((a, b) => a.time - b.time);
    for (let i = 0; i < kfs.length - 1; i++) {
      const a = kfs[i];
      const b = kfs[i + 1];
      const dur = +(b.time - a.time).toFixed(3);
      if (dur <= 0) continue;
      if (a.interpolation === "hold") {
        lines.push(`${tlVar}.set('${selector}', { clipPath: ${JSON.stringify(a.value)} }, ${a.time});`);
        lines.push(`${tlVar}.set('${selector}', { clipPath: ${JSON.stringify(b.value)} }, ${b.time});`);
      } else {
        lines.push(`${tlVar}.to('${selector}', { clipPath: ${JSON.stringify(b.value)}, duration: ${dur}, ease: ${easeLiteral(a.easingOut)} }, ${a.time});`);
      }
    }
  }

  return lines;
}

/**
 * Generate a copy-pasteable GSAP script from LayerTrack data. Layers whose
 * own `trigger.mode` is `"onMount"` (the default) share one page-level
 * timeline that plays once. Layers with `trigger.mode === "onScroll"` each
 * get their own paused timeline bound to viewport scroll position via
 * `ScrollTrigger.create()`, using that layer's own `trigger.scrollConfig`
 * (falling back to the same top-center/bottom-center/scrub:true defaults as
 * before if unset) — see the toolbar in AnimationTimelineEditor.tsx. Other
 * trigger modes (onHover/onClick/onMouseMove) aren't emitted by this
 * export path yet — export currently covers the two modes the toolbar
 * itself exposes a toggle for.
 */
export function generateGSAPScript(layers: LayerTrack[], totalDuration: number): string {
  const visible = layers.filter((l) => l.visible);
  const playheadLayers = visible.filter((l) => l.trigger.mode !== "onScroll");
  const scrollLayers = visible.filter((l) => l.trigger.mode === "onScroll");

  const lines: string[] = [
    "// ──────────────────────────────────────────────────────────────",
    "// Marwa Digital Animation Timeline Export",
    `// Duration: ${totalDuration}s  •  Layers: ${visible.length} (${scrollLayers.length} ScrollTrigger-bound)`,
    '// Requires: <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>',
    scrollLayers.length > 0
      ? '// ScrollTrigger-bound layers also require: <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js"></script>'
      : "",
    "// ──────────────────────────────────────────────────────────────",
    "",
  ].filter((l) => l !== "");

  let hasAny = false;

  if (playheadLayers.length > 0) {
    const playheadTweens = playheadLayers.flatMap((layer) => tweenLinesForLayer(layer, "tl", `[data-block-id="${layer.id}"]`));
    if (playheadTweens.length > 0) {
      hasAny = true;
      lines.push("const tl = gsap.timeline();", "");
      for (const layer of playheadLayers) {
        const tweens = tweenLinesForLayer(layer, "tl", `[data-block-id="${layer.id}"]`);
        if (tweens.length === 0) continue;
        lines.push(`// ── Layer: ${layer.name} (${layer.emoji}) ──`, ...tweens, "");
      }
    }
  }

  for (const layer of scrollLayers) {
    const tlVar = `${safeIdent(layer.id)}_tl`;
    const selector = `[data-block-id="${layer.id}"]`;
    const tweens = tweenLinesForLayer(layer, tlVar, selector);
    if (tweens.length === 0) continue;
    hasAny = true;
    const cfg = layer.trigger.scrollConfig ?? { scrub: true, start: "top center", end: "bottom center", pin: false };
    lines.push(
      `// ── Layer: ${layer.name} (${layer.emoji}) — ScrollTrigger-bound ──`,
      `const ${tlVar} = gsap.timeline({ paused: true });`,
      ...tweens,
      `ScrollTrigger.create({`,
      `  trigger: '${selector}',`,
      `  start: "${cfg.start}",`,
      `  end: "${cfg.end}",`,
      `  scrub: ${JSON.stringify(cfg.scrub)},`,
      `  pin: ${cfg.pin},`,
      `  animation: ${tlVar},`,
      `});`,
      ""
    );
  }

  if (!hasAny) {
    lines.push("// No keyframes defined yet — add keyframes in the Timeline Editor.", "");
  }

  while (lines[lines.length - 1] === "") lines.pop();

  return lines.join("\n");
}

// ── Editor ⇄ persisted BlockTimeline conversion ─────────────────────────────
// LayerTrack carries UI-only fields (name/color/emoji/visible/locked/
// expanded/clips) that exist for the multi-layer editor grid, not playback —
// BlockTimeline (packages/builder) is what's left once those are stripped.

export function layerToBlockTimeline(layer: LayerTrack, duration: number): BlockTimeline {
  return {
    version: 2,
    duration,
    trigger: layer.trigger,
    repeat: layer.repeat,
    yoyo: layer.yoyo,
    repeatDelay: layer.repeatDelay,
    delay: layer.delay,
    stagger: layer.stagger,
    splitText: layer.splitText,
    tracks: layer.tracks,
    cssVarTracks: layer.cssVarTracks,
    clipPathTracks: layer.clipPathTracks,
  };
}

export function blockTimelineToLayer(nodeId: string, name: string, timeline: BlockTimeline, palette: { color: string; emoji: string }): LayerTrack {
  return {
    id: nodeId,
    name,
    color: palette.color,
    emoji: palette.emoji,
    visible: true,
    locked: false,
    expanded: true,
    clips: [{ id: `${nodeId}-clip`, start: 0, end: timeline.duration, label: "Animation" }],
    tracks: timeline.tracks,
    cssVarTracks: timeline.cssVarTracks,
    clipPathTracks: timeline.clipPathTracks.map((t) => ({ ...t, shape: t.shape as ClipShape })),
    trigger: timeline.trigger,
    repeat: timeline.repeat,
    yoyo: timeline.yoyo,
    repeatDelay: timeline.repeatDelay,
    delay: timeline.delay,
    stagger: timeline.stagger,
    splitText: timeline.splitText,
  };
}
