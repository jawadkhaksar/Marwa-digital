"use client";

/**
 * AnimationTimelineEditor — Admin Builder Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-featured timeline editor integrated into the builder layout drawer.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import gsap from "gsap";
import { generateClipRevealTrack, generateMagneticHoverTracks, magneticHoverTrigger } from "@marwa/builder";

import {
  ALL_PROPERTIES,
  EASING_CURVES,
  GSAP_EASINGS,
  PROPERTY_DEFAULTS,
  PROPERTY_LABELS,
  PROPERTY_UNITS,
  type ClipPathTrack,
  type ClipShape,
  type GsapEasing,
  type LayerClip,
  type LayerTrack,
  type PropertyKey,
  type PropertyKeyframe,
  type PropertyTrack,
} from "./timelineTypes";
import {
  formatBezierString,
  generateGSAPScript,
  interpolateClipPathTrack,
  interpolateCssVarTrack,
  parseBezierString,
  springToBezier,
  trackValueAtTime,
  type BezierTuple,
} from "./timelineUtils";

function defaultClipPathValue(shape: ClipShape): string {
  if (shape === "circle") return "circle(50% at 50% 50%)";
  if (shape === "inset") return "inset(0% 0% 0% 0%)";
  return "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)";
}

export const TOTAL_DURATION = 5;
const RULER_BASE_PX  = 800;
const SNAP_PX  = 6;    // pixel radius (at current zoom) within which a drag snaps to a candidate
const GRID_STEP = 0.05; // fallback grid, seconds — only used when no keyframe/clip/playhead candidate is in range
const CLIP_ROW_H     = 40;
const TRACK_ROW_H    = 26;
const RULER_H        = 32;
const SIDEBAR_W      = 210;

function uid(): string { return Math.random().toString(36).slice(2, 9); }
function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }
function formatTime(s: number): string {
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(Math.floor(s % 60)).padStart(2, "0");
  const ms = String(Math.floor((s % 1) * 100)).padStart(2, "0");
  return `${mm}:${ss}.${ms}`;
}

function makeDefaultTracks(): PropertyTrack[] {
  return ALL_PROPERTIES.map((property) => ({ id: uid(), property, keyframes: [] }));
}

function defaultKf(time: number, value: number, easingOut: GsapEasing): PropertyKeyframe {
  return { id: uid(), time, value, easingOut, easingIn: easingOut, interpolation: "smooth" };
}

const DEFAULT_LAYERS: LayerTrack[] = [
  {
    id: "block-hero",
    name: "Hero Section",
    color: "#2563ff",
    emoji: "📦",
    visible: true,
    locked: false,
    expanded: true,
    cssVarTracks: [],
    clipPathTracks: [],
    trigger: { mode: "onMount" },
    clips: [
      { id: uid(), start: 0, end: 2.5, label: "Fade In (2.5s)" },
      { id: uid(), start: 3, end: 4.8, label: "Slide Up (1.8s)" },
    ],
    tracks: ALL_PROPERTIES.map((property) => ({
      id: uid(),
      property,
      keyframes:
        property === "opacity"
          ? [defaultKf(0, 0, "power2.inOut"), defaultKf(1.2, 1, "linear")]
          : property === "y"
          ? [defaultKf(0, 40, "power3.out"), defaultKf(1.5, 0, "linear")]
          : [],
    })),
  },
  {
    id: "block-jenny",
    name: "Jenny (Chauffeur)",
    color: "#4ade80",
    emoji: "🚗",
    visible: true,
    locked: false,
    expanded: true,
    cssVarTracks: [],
    clipPathTracks: [],
    trigger: { mode: "onMount" },
    clips: [{ id: uid(), start: 0.5, end: 3.5, label: "Scenic Route (3s)" }],
    tracks: ALL_PROPERTIES.map((property) => ({
      id: uid(),
      property,
      keyframes:
        property === "x"
          ? [defaultKf(0.5, -60, "power2.out"), defaultKf(2.5, 0, "linear")]
          : property === "scale"
          ? [defaultKf(0.5, 0.8, "back.out"), defaultKf(2, 1, "linear")]
          : [],
    })),
  },
  {
    id: "block-sun",
    name: "Gold Ray Badge",
    color: "#fbbf24",
    emoji: "✨",
    visible: true,
    locked: false,
    expanded: false,
    cssVarTracks: [],
    clipPathTracks: [],
    trigger: { mode: "onMount" },
    clips: [{ id: uid(), start: 1, end: 4.5, label: "Glow & Rotate (3.5s)" }],
    tracks: ALL_PROPERTIES.map((property) => ({
      id: uid(),
      property,
      keyframes:
        property === "rotate"
          ? [defaultKf(1, -15, "power1.out"), defaultKf(3, 0, "bounce.out")]
          : [],
    })),
  },
];

const LAYER_PALETTE = ["#2563ff","#4ade80","#60a5fa","#fbbf24","#f87171","#a3e635","#e879f9"];
const LAYER_EMOJIS  = ["📦","✨","🎬","🌊","⚡","🎨","🚀"];

type PlayState = "stopped" | "playing" | "paused";

interface SelectedKf {
  layerId: string;
  trackId: string;
  kfId: string;
  anchorX: number;
  anchorY: number;
  kind: "spatial" | "cssVar" | "clipPath";
}

/** A bare reference to one keyframe, no anchor coords — used by the
 *  marquee/shift-click multi-selection (SelectedKf above is only for the
 *  single keyframe the value/easing popover is open on). */
interface KfRef {
  layerId: string;
  trackId: string;
  kfId: string;
  kind: "spatial" | "cssVar" | "clipPath";
}

const Ic = {
  Play: ({ s=13 }:{s?:number}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14.72A1 1 0 0 0 9.5 21l11-7a1 1 0 0 0 0-1.72l-11-7A1 1 0 0 0 8 5.14Z"/></svg>,
  Pause: ({ s=13 }:{s?:number}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>,
  Stop: ({ s=12 }:{s?:number}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>,
  SkipBack: ({ s=12 }:{s?:number}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M19 20L9 12l10-8v16Z"/><rect x="5" y="4" width="2" height="16" rx="1"/></svg>,
  SkipFwd: ({ s=12 }:{s?:number}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M5 4l10 8-10 8V4Z"/><rect x="17" y="4" width="2" height="16" rx="1"/></svg>,
  Eye: ({ open, s=12 }:{open:boolean;s?:number}) => open
    ? <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
    : <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/></svg>,
  Lock: ({ locked, s=12 }:{locked:boolean;s?:number}) => locked
    ? <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    : <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>,
  Trash: ({ s=11 }:{s?:number}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>,
  Scroll: ({ s=11 }:{s?:number}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2.5"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>,
  Add: ({ s=11 }:{s?:number}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Expand: ({ open, s=9 }:{open:boolean;s?:number}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}><polyline points="9 18 15 12 9 6"/></svg>,
  Export: ({ s=12 }:{s?:number}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/><path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4"/></svg>,
  Copy: ({ s=12 }:{s?:number}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  X: ({ s=12 }:{s?:number}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
};

// A custom cubic-bezier string (see GsapEasing/PresetEasing in
// timelineTypes.ts) has no curated SVG preview — falls back to a plain
// diagonal line rather than indexing EASING_CURVES with a key it doesn't
// have.
function EasingCurve({ easing, size = 24, color = "#2563ff" }: { easing: GsapEasing; size?: number; color?: string }) {
  const d = (EASING_CURVES as Record<string, string>)[easing] ?? "M 2 22 L 22 2";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={d} stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

const BEZIER_PAD = 14;
const BEZIER_SIZE = 120;
const BEZIER_Y_MIN = -0.5;
const BEZIER_Y_MAX = 1.5;

function bezierToPx(x: number, y: number): { px: number; py: number } {
  const inner = BEZIER_SIZE - BEZIER_PAD * 2;
  const px = BEZIER_PAD + x * inner;
  const yFrac = (y - BEZIER_Y_MIN) / (BEZIER_Y_MAX - BEZIER_Y_MIN);
  const py = BEZIER_PAD + (1 - yFrac) * inner;
  return { px, py };
}
function pxToBezier(px: number, py: number): { x: number; y: number } {
  const inner = BEZIER_SIZE - BEZIER_PAD * 2;
  const x = clamp((px - BEZIER_PAD) / inner, 0, 1);
  const yFrac = 1 - (py - BEZIER_PAD) / inner;
  const y = BEZIER_Y_MIN + yFrac * (BEZIER_Y_MAX - BEZIER_Y_MIN);
  return { x, y: clamp(y, BEZIER_Y_MIN, BEZIER_Y_MAX) };
}

/** Standard 2-handle cubic-bezier graph (P0 fixed at 0,0 / P3 fixed at 1,1,
 *  matching the CSS cubic-bezier() convention) — drag P1/P2 to shape the
 *  curve. `readOnly` renders the curve (used for the Spring tab's live
 *  preview of what "Apply" will write) without draggable handles. */
function BezierGraphEditor({ value, onChange, readOnly }: { value: BezierTuple; onChange: (v: BezierTuple) => void; readOnly?: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [x1, y1, x2, y2] = value;
  const p0 = bezierToPx(0, 0);
  const p1 = bezierToPx(x1, y1);
  const p2 = bezierToPx(x2, y2);
  const p3 = bezierToPx(1, 1);
  const zero = bezierToPx(0, 0);
  const one = bezierToPx(1, 1);

  function handlePointerDown(which: "p1" | "p2") {
    return (e: ReactPointerEvent<SVGCircleElement>) => {
      if (readOnly) return;
      e.stopPropagation();
      const svg = svgRef.current;
      if (!svg) return;
      function onMove(ev: PointerEvent) {
        const rect = svg!.getBoundingClientRect();
        const px = ((ev.clientX - rect.left) / rect.width) * BEZIER_SIZE;
        const py = ((ev.clientY - rect.top) / rect.height) * BEZIER_SIZE;
        const { x, y } = pxToBezier(px, py);
        const rx = Math.round(x * 100) / 100;
        const ry = Math.round(y * 100) / 100;
        if (which === "p1") onChange([rx, ry, x2, y2]);
        else onChange([x1, y1, rx, ry]);
      }
      function onUp() {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      }
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    };
  }

  return (
    <svg ref={svgRef} viewBox={`0 0 ${BEZIER_SIZE} ${BEZIER_SIZE}`} width="100%" height={110} style={{ touchAction: "none" }}>
      <rect x={0} y={0} width={BEZIER_SIZE} height={BEZIER_SIZE} rx={8} fill="#0f0f11" />
      <rect x={zero.px} y={one.py} width={one.px - zero.px} height={zero.py - one.py} fill="none" stroke="rgba(255,255,255,0.14)" strokeDasharray="2,2" />
      <path d={`M ${p0.px} ${p0.py} C ${p1.px} ${p1.py} ${p2.px} ${p2.py} ${p3.px} ${p3.py}`} stroke="#fbbf24" strokeWidth={2} fill="none" />
      {!readOnly && (
        <>
          <line x1={p0.px} y1={p0.py} x2={p1.px} y2={p1.py} stroke="#60a5fa" strokeWidth={1} opacity={0.6} />
          <line x1={p3.px} y1={p3.py} x2={p2.px} y2={p2.py} stroke="#60a5fa" strokeWidth={1} opacity={0.6} />
        </>
      )}
      <circle cx={p0.px} cy={p0.py} r={2.5} fill="rgba(255,255,255,0.4)" />
      <circle cx={p3.px} cy={p3.py} r={2.5} fill="rgba(255,255,255,0.4)" />
      {!readOnly && (
        <>
          <circle cx={p1.px} cy={p1.py} r={5} fill="#60a5fa" stroke="#fff" strokeWidth={1} style={{ cursor: "grab" }} onPointerDown={handlePointerDown("p1")} />
          <circle cx={p2.px} cy={p2.py} r={5} fill="#60a5fa" stroke="#fff" strokeWidth={1} style={{ cursor: "grab" }} onPointerDown={handlePointerDown("p2")} />
        </>
      )}
    </svg>
  );
}

/**
 * The single popover for every keyframe kind — "spatial" (PropertyKeyframe,
 * a plain number with a per-property unit from PROPERTY_UNITS), "cssVar"/
 * "clipPath" (a raw CSS string, no fixed unit). `valueUnit === undefined`
 * switches the Value field to free-text mode for the latter two; any other
 * string (including "" for opacity) renders a numeric input with that unit
 * shown as a suffix.
 */
function KeyframePopover({
  anchor, time, onTimeChange, value, valueUnit, valuePlaceholder, currentEasing, interpolation, onValueChange, onEasingChange, onInterpolationChange, onDelete, onClose,
}: {
  anchor: { x: number; y: number };
  time: number;
  onTimeChange: (t: number) => void;
  value: string;
  valueUnit?: string;
  valuePlaceholder?: string;
  currentEasing: GsapEasing;
  interpolation: "smooth" | "hold";
  onValueChange: (value: string) => void;
  onEasingChange: (e: GsapEasing) => void;
  onInterpolationChange: (i: "smooth" | "hold") => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const numeric = valueUnit !== undefined;
  const safeX = Math.min(anchor.x, window.innerWidth - 250);
  const safeY = anchor.y > window.innerHeight - 400 ? Math.max(10, anchor.y - 400) : anchor.y + 15;
  const [localValue, setLocalValue] = useState(value);
  const [localTime, setLocalTime] = useState(time.toFixed(2));
  const [curveMode, setCurveMode] = useState<"bezier" | "spring">("bezier");
  const [bezierTuple, setBezierTuple] = useState<BezierTuple>(() => parseBezierString(currentEasing) ?? [0.25, 0.1, 0.25, 1]);
  const [bezierText, setBezierText] = useState(() => formatBezierString(parseBezierString(currentEasing) ?? [0.25, 0.1, 0.25, 1]));
  const [spring, setSpring] = useState({ mass: 1, stiffness: 100, damping: 10 });

  function commitValue() { onValueChange(localValue); }
  function commitTime() {
    const t = parseFloat(localTime);
    if (Number.isNaN(t)) { setLocalTime(time.toFixed(2)); return; }
    const clamped = clamp(t, 0, TOTAL_DURATION);
    onTimeChange(clamped);
    setLocalTime(clamped.toFixed(2));
  }
  function applyBezier(v: BezierTuple) {
    setBezierTuple(v);
    setBezierText(formatBezierString(v));
    onEasingChange(formatBezierString(v) as GsapEasing);
  }
  function commitBezierText() {
    const parsed = parseBezierString(bezierText.trim());
    if (parsed) applyBezier(parsed);
    else setBezierText(formatBezierString(bezierTuple));
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 rounded-xl overflow-hidden"
        style={{ left: safeX, top: safeY, width: 240, background: "#18181b", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Keyframe</span>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><Ic.X s={10} /></button>
        </div>
        <div className="grid grid-cols-2 gap-2 p-2.5">
          <label className="flex flex-col gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-zinc-500">Value{numeric && valueUnit ? ` (${valueUnit})` : ""}</span>
            <input
              value={localValue}
              placeholder={valuePlaceholder}
              type={numeric ? "number" : "text"}
              step={numeric ? "any" : undefined}
              onChange={(e) => setLocalValue(e.target.value)}
              onBlur={commitValue}
              onKeyDown={(e) => { if (e.key === "Enter") commitValue(); }}
              className="w-full rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1.5 text-[11px] text-zinc-100 font-mono focus:outline-none focus:border-amber-400/60"
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-zinc-500">Time (s)</span>
            <input
              value={localTime}
              type="number"
              step="0.01"
              min={0}
              max={TOTAL_DURATION}
              onChange={(e) => setLocalTime(e.target.value)}
              onBlur={commitTime}
              onKeyDown={(e) => { if (e.key === "Enter") commitTime(); }}
              className="w-full rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1.5 text-[11px] text-zinc-100 font-mono focus:outline-none focus:border-amber-400/60"
            />
          </label>
        </div>
        <div className="px-2.5 pb-2">
          <span className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-zinc-500">Interpolation</span>
          <div className="flex overflow-hidden rounded-md border border-zinc-700">
            <button
              onClick={() => onInterpolationChange("smooth")}
              className={`flex-1 px-2 py-1 text-[10px] font-semibold ${interpolation === "smooth" ? "bg-amber-400/20 text-amber-400" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"}`}
            >
              Smooth
            </button>
            <button
              onClick={() => onInterpolationChange("hold")}
              title="Step function — holds this value until the next keyframe, then jumps (renders as a square on the track)"
              className={`flex-1 px-2 py-1 text-[10px] font-semibold ${interpolation === "hold" ? "bg-amber-400/20 text-amber-400" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"}`}
            >
              Hold
            </button>
          </div>
        </div>
        <div className="px-3 pb-1 pt-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Easing</span>
        </div>
        <div className="grid max-h-32 grid-cols-4 gap-1 overflow-y-auto p-2 pt-1">
          {GSAP_EASINGS.map((ease) => {
            const active = ease === currentEasing;
            return (
              <button
                key={ease}
                onClick={() => onEasingChange(ease)}
                className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border text-center transition-all ${
                  active ? "bg-amber-400/20 border-amber-400/50 text-amber-400" : "bg-zinc-900/50 border-transparent text-zinc-400 hover:bg-zinc-800"
                }`}
              >
                <EasingCurve easing={ease} size={18} color={active ? "#fbbf24" : "rgba(255,255,255,0.4)"} />
              </button>
            );
          })}
        </div>
        <div className="border-t border-zinc-800 px-2.5 py-2">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-zinc-500">Custom Curve</span>
            <div className="flex overflow-hidden rounded-md border border-zinc-700">
              <button
                onClick={() => setCurveMode("bezier")}
                className={`px-1.5 py-0.5 text-[9px] font-bold ${curveMode === "bezier" ? "bg-amber-400/20 text-amber-400" : "bg-zinc-900 text-zinc-500 hover:bg-zinc-800"}`}
              >
                Bezier
              </button>
              <button
                onClick={() => setCurveMode("spring")}
                className={`px-1.5 py-0.5 text-[9px] font-bold ${curveMode === "spring" ? "bg-amber-400/20 text-amber-400" : "bg-zinc-900 text-zinc-500 hover:bg-zinc-800"}`}
              >
                Spring
              </button>
            </div>
          </div>

          {curveMode === "bezier" ? (
            <>
              <BezierGraphEditor value={bezierTuple} onChange={applyBezier} />
              <div className="mt-1.5 grid grid-cols-4 gap-1">
                {(["x1", "y1", "x2", "y2"] as const).map((label, i) => (
                  <label key={label} className="flex flex-col gap-0.5">
                    <span className="text-[8px] uppercase text-zinc-600">{label}</span>
                    <input
                      type="number"
                      step="0.01"
                      value={bezierTuple[i]}
                      onChange={(e) => {
                        const n = parseFloat(e.target.value);
                        if (Number.isNaN(n)) return;
                        const next = [...bezierTuple] as BezierTuple;
                        next[i] = n;
                        applyBezier(next);
                      }}
                      className="w-full rounded bg-zinc-900 border border-zinc-700 px-1 py-0.5 text-[10px] text-zinc-200 font-mono focus:outline-none focus:border-amber-400/60"
                    />
                  </label>
                ))}
              </div>
              <input
                value={bezierText}
                placeholder="cubic-bezier(.17,.67,.83,.67)"
                onChange={(e) => setBezierText(e.target.value)}
                onBlur={commitBezierText}
                onKeyDown={(e) => { if (e.key === "Enter") commitBezierText(); }}
                className="mt-1.5 w-full rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1.5 text-[10px] text-zinc-100 font-mono focus:outline-none focus:border-amber-400/60"
              />
            </>
          ) : (
            <>
              <BezierGraphEditor value={springToBezier(spring.mass, spring.stiffness, spring.damping)} onChange={() => {}} readOnly />
              <div className="mt-1.5 flex flex-col gap-1.5">
                {([
                  ["mass", 0.1, 10] as const,
                  ["stiffness", 1, 300] as const,
                  ["damping", 0, 40] as const,
                ]).map(([key, min, max]) => (
                  <label key={key} className="flex items-center gap-1.5">
                    <span className="w-12 text-[9px] uppercase text-zinc-500">{key}</span>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={0.1}
                      value={spring[key]}
                      onChange={(e) => setSpring((s) => ({ ...s, [key]: parseFloat(e.target.value) }))}
                      className="flex-1 accent-amber-400"
                    />
                    <span className="w-8 text-right text-[9px] font-mono text-zinc-400">{spring[key].toFixed(1)}</span>
                  </label>
                ))}
                <button
                  onClick={() => {
                    applyBezier(springToBezier(spring.mass, spring.stiffness, spring.damping));
                    setCurveMode("bezier");
                  }}
                  className="mt-0.5 rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[10px] font-semibold text-amber-400 hover:bg-amber-400/20"
                >
                  Apply as Easing
                </button>
              </div>
            </>
          )}
        </div>
        <div className="border-t border-zinc-800 p-2">
          <button
            onClick={onDelete}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-[11px] font-semibold text-red-400 transition-colors hover:bg-red-500/20"
          >
            <Ic.Trash s={11} /> Delete Keyframe
          </button>
        </div>
      </div>
    </>
  );
}

/** Right-click menu on a keyframe diamond — Duplicate / Reset Value / Delete. `onResetValue` is omitted for cssVar/clipPath tracks, which have no single well-defined "default" the way a spatial property's PROPERTY_DEFAULTS does. */
function KeyframeContextMenu({
  x, y, onDuplicate, onResetValue, onDelete, onClose,
}: {
  x: number;
  y: number;
  onDuplicate: () => void;
  onResetValue?: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const safeX = Math.min(x, window.innerWidth - 180);
  const safeY = Math.min(y, window.innerHeight - 140);
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        className="fixed z-50 w-44 overflow-hidden rounded-lg py-1"
        style={{ left: safeX, top: safeY, background: "#18181b", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}
      >
        <button
          onClick={() => { onDuplicate(); onClose(); }}
          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-zinc-300 hover:bg-zinc-800"
        >
          <Ic.Copy s={11} /> Duplicate Keyframe
        </button>
        {onResetValue && (
          <button
            onClick={() => { onResetValue(); onClose(); }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-zinc-300 hover:bg-zinc-800"
          >
            <Ic.Stop s={10} /> Reset Value
          </button>
        )}
        <button
          onClick={() => { onDelete(); onClose(); }}
          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-red-400 hover:bg-red-500/10"
        >
          <Ic.Trash s={11} /> Delete Keyframe
        </button>
      </div>
    </>
  );
}

function DiamondMarker({
  kf, rulerPx, color, selected, multiSelected, locked, onDragStart, onDragEnd, onSelect, onContextMenu,
}: {
  // Structural, not PropertyKeyframe — this component only ever reads
  // id/time, so it doubles as the marker for CssVarKeyframe/
  // ClipPathKeyframe rows too (both share this same {id,time,...} shape).
  kf: { id: string; time: number };
  rulerPx: number;
  color: string;
  selected: boolean;
  /** Part of the marquee/shift-click batch selection — styled with a ring
   *  distinct from `selected` (the single keyframe the value/easing popover
   *  is open on) since both can be true at once. */
  multiSelected?: boolean;
  locked: boolean;
  /** Fires once at drag start with this keyframe's pre-drag time — lets the
   *  parent snapshot the whole batch selection's original times so a group
   *  drag can apply one consistent delta (see handleGroupAwareDragEnd). */
  onDragStart?: (kfId: string, origTime: number) => void;
  onDragEnd: (kfId: string, newTime: number) => void;
  onSelect: (kfId: string, anchorX: number, anchorY: number, shiftKey: boolean) => void;
  onContextMenu?: (kfId: string, clientX: number, clientY: number) => void;
}) {
  const SIZE = 10;
  const drag = useRef<{ startX: number; origTime: number } | null>(null);
  const left = (kf.time / TOTAL_DURATION) * rulerPx;

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    if (locked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, origTime: kf.time };
    onDragStart?.(kf.id, kf.time);
  }
  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.startX;
    const dt = (dx / rulerPx) * TOTAL_DURATION;
    onDragEnd(kf.id, clamp(drag.current.origTime + dt, 0, TOTAL_DURATION));
  }

  return (
    <div
      className="absolute flex items-center justify-center"
      style={{
        left: left - SIZE / 2 - 1,
        top: "50%",
        transform: "translateY(-50%)",
        width: SIZE + 2,
        height: SIZE + 2,
        cursor: locked ? "not-allowed" : "ew-resize",
        zIndex: 5,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => { drag.current = null; }}
      onClick={e => {
        e.stopPropagation();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        onSelect(kf.id, rect.left + rect.width / 2, rect.top, e.shiftKey);
      }}
      onContextMenu={e => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu?.(kf.id, e.clientX, e.clientY);
      }}
    >
      <div
        style={{
          width: SIZE,
          height: SIZE,
          background: selected ? "#fbbf24" : multiSelected ? "#60a5fa" : color,
          transform: "rotate(45deg)",
          border: `1.5px solid ${selected || multiSelected ? "#fff" : "rgba(255,255,255,0.5)"}`,
          boxShadow: selected ? `0 0 10px ${color}` : multiSelected ? "0 0 8px #60a5fa" : `0 0 4px ${color}66`,
        }}
      />
    </div>
  );
}

function ClipBar({ clip, color, rulerPx, locked, onUpdate }: {
  clip: LayerClip;
  color: string;
  rulerPx: number;
  locked: boolean;
  onUpdate: (id: string, start: number, end: number) => void;
}) {
  const drag = useRef<{ type: "move"|"l"|"r"; startX: number; origStart: number; origEnd: number } | null>(null);
  const left  = (clip.start / TOTAL_DURATION) * rulerPx;
  const width = ((clip.end - clip.start) / TOTAL_DURATION) * rulerPx;

  function startDrag(e: ReactPointerEvent<HTMLDivElement>, type: "move"|"l"|"r") {
    if (locked) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { type, startX: e.clientX, origStart: clip.start, origEnd: clip.end };
  }
  function onMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const dt = ((e.clientX - drag.current.startX) / rulerPx) * TOTAL_DURATION;
    const { type, origStart, origEnd } = drag.current;
    const dur = origEnd - origStart;
    if (type === "move")  onUpdate(clip.id, clamp(origStart + dt, 0, TOTAL_DURATION - dur), clamp(origStart + dt + dur, dur, TOTAL_DURATION));
    else if (type === "l") onUpdate(clip.id, clamp(origStart + dt, 0, origEnd - 0.1), origEnd);
    else                   onUpdate(clip.id, origStart, clamp(origEnd + dt, origStart + 0.1, TOTAL_DURATION));
  }

  return (
    <div
      className="absolute group"
      style={{ top: "50%", left, width, height: CLIP_ROW_H * 0.6, transform: "translateY(-50%)", cursor: locked ? "not-allowed" : "grab", zIndex: 2 }}
      onPointerDown={e => startDrag(e, "move")}
      onPointerMove={onMove}
      onPointerUp={() => { drag.current = null; }}
    >
      <div className="h-full w-full rounded-md overflow-hidden relative" style={{ background: `linear-gradient(90deg,${color}cc,${color}77)`, border: `1px solid ${color}bb` }}>
        {clip.label && <span className="absolute inset-0 flex items-center px-2 truncate pointer-events-none text-[10px] font-bold text-white/90">{clip.label}</span>}
      </div>
    </div>
  );
}

function TimeRuler({ zoom, rulerPx }: { zoom: number; rulerPx: number }) {
  const step = zoom >= 4 ? 0.25 : zoom >= 2 ? 0.5 : 1;
  const ticks: number[] = [];
  for (let t = 0; t <= TOTAL_DURATION + 0.001; t = Math.round((t + step) * 1000) / 1000) ticks.push(t);
  return (
    <div data-ruler="true" style={{ width: rulerPx, height: RULER_H, flexShrink: 0, position: "relative", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", cursor: "crosshair", userSelect: "none" }}>
      {ticks.map(t => {
        const x = (t / TOTAL_DURATION) * rulerPx;
        const whole = Math.abs(t - Math.round(t)) < 0.001;
        return (
          <div key={t} style={{ position: "absolute", left: x, top: 0, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", pointerEvents: "none" }}>
            <div style={{ width: 1, height: whole ? 14 : 6, marginTop: whole ? 0 : 6, background: whole ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)" }} />
            {whole && <span style={{ fontSize: 9, fontFamily: "ui-monospace,monospace", color: "rgba(255,255,255,0.35)", marginTop: 1 }}>{t}s</span>}
          </div>
        );
      })}
    </div>
  );
}

function ExportModal({ script, onClose }: { script: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(script).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative flex flex-col rounded-2xl overflow-hidden w-[600px] max-h-[80vh] bg-zinc-900 border border-zinc-800 shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5"><Ic.Export s={12}/> Export GSAP Script</span>
          <div className="flex items-center gap-2">
            <button onClick={copy} className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-semibold hover:bg-amber-400/20">
              <Ic.Copy s={11}/>{copied ? "Copied!" : "Copy"}
            </button>
            <button onClick={onClose} className="text-zinc-400 hover:text-white"><Ic.X s={12}/></button>
          </div>
        </div>
        <div className="overflow-auto flex-1 p-4">
          <pre className="font-mono text-xs text-zinc-300 whitespace-pre-wrap">{script}</pre>
        </div>
      </div>
    </div>
  );
}

export interface TimelineEditorProps {
  initialLayers?: LayerTrack[];
  onTimeUpdate?: (currentTime: number, tracks: LayerTrack[]) => void;
  /** Fires on every layer/track/keyframe mutation, not just a playhead move — onTimeUpdate above only re-fires when `currentTime` itself changes, so editing a keyframe without also scrubbing never reached a parent listening solely on that callback. */
  onLayersChange?: (layers: LayerTrack[]) => void;
  selectedLayerId?: string | null;
  onSelectLayer?: (layerId: string) => void;
  className?: string;
  style?: CSSProperties;
}

export function AnimationTimelineEditor({
  initialLayers,
  onTimeUpdate,
  onLayersChange,
  selectedLayerId,
  onSelectLayer,
  className,
  style,
}: TimelineEditorProps = {}) {
  const [layers, setLayers]           = useState<LayerTrack[]>(initialLayers ?? DEFAULT_LAYERS);
  const [playState, setPlayState]     = useState<PlayState>("stopped");
  const [currentTime, setCurrentTime] = useState(0);
  const [zoom, setZoom]               = useState<1|2|4>(1);
  const [selLayer, setSelLayer]       = useState<string|null>(selectedLayerId ?? null);
  const [selectedKf, setSelectedKf]   = useState<SelectedKf|null>(null);
  const [kfContextMenu, setKfContextMenu] = useState<{ layerId: string; trackId: string; kfId: string; kind: "spatial" | "cssVar" | "clipPath"; x: number; y: number } | null>(null);
  const [exportOpen, setExportOpen]   = useState(false);
  // Marquee/shift-click batch selection — see KfRef's doc comment. Distinct
  // from `selectedKf` (the single keyframe with the value/easing popover
  // open); a keyframe can be in both at once (shift-clicking the popover's
  // own keyframe adds it to the batch without closing the popover).
  const [multiSelected, setMultiSelected] = useState<KfRef[]>([]);
  const [marqueeRect, setMarqueeRect] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);

  const rulerPx      = RULER_BASE_PX * zoom;
  const layersRef    = useRef(layers);
  const timeRef      = useRef(0);
  const playStateRef = useRef<PlayState>("stopped");
  const tickerRef    = useRef<gsap.TickerCallback|null>(null);
  const playOrigin   = useRef<{ wall: number; sim: number }>({ wall: 0, sim: 0 });
  const phDragging   = useRef(false);
  const timelineEl   = useRef<HTMLDivElement>(null);
  const marqueeStartRef = useRef<{ x: number; y: number } | null>(null);
  // Snapshot of a batch selection's original keyframe times, captured once
  // at the start of a drag on any keyframe that's part of a >1-member
  // selection — lets a group drag apply one consistent delta to every
  // selected keyframe instead of only moving the one actually dragged. Null
  // whenever the drag target isn't part of a multi-selection (normal
  // single-keyframe drag, unaffected by any of this).
  const groupDragRef = useRef<{ draggedKfId: string; draggedOrigTime: number; snapshot: { ref: KfRef; origTime: number }[] } | null>(null);
  // The parent (builder page) mirrors our own `layers` state into its
  // `timelineLayers` state inside onLayersChange, then hands it straight
  // back down as this same `initialLayers` array on the next render — so
  // every genuine edit here bounces back as an "incoming" prop change.
  // Without tracking what WE last emitted, the sync effect below can't tell
  // that echo apart from an actual external change (opening a different
  // node's timeline, an itinerary preset being inserted, etc.), re-applies
  // it via setLayers, which re-fires the onLayersChange effect, which the
  // parent mirrors back down again — "Maximum update depth exceeded".
  const lastEmittedLayersRef = useRef<LayerTrack[] | null>(null);

  // Sync prop layers
  useEffect(() => {
    if (initialLayers && initialLayers !== lastEmittedLayersRef.current) setLayers(initialLayers);
  }, [initialLayers]);

  // Sync selectedLayerId prop
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (selectedLayerId !== undefined) setSelLayer(selectedLayerId);
  }, [selectedLayerId]);

  useEffect(() => { layersRef.current = layers; }, [layers]);
  useEffect(() => { timeRef.current   = currentTime; }, [currentTime]);
  useEffect(() => { playStateRef.current = playState; }, [playState]);

  useEffect(() => {
    onTimeUpdate?.(currentTime, layersRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime]);

  useEffect(() => {
    lastEmittedLayersRef.current = layers;
    onLayersChange?.(layers);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers]);

  const killTicker = useCallback(() => {
    if (tickerRef.current) { gsap.ticker.remove(tickerRef.current); tickerRef.current = null; }
  }, []);

  const handleStop = useCallback(() => {
    killTicker(); setPlayState("stopped"); setCurrentTime(0);
  }, [killTicker]);

  const handlePlay = useCallback(() => {
    killTicker();
    playOrigin.current = { wall: performance.now(), sim: timeRef.current };
    setPlayState("playing");
    const tick: gsap.TickerCallback = () => {
      if (phDragging.current) return;
      const t = playOrigin.current.sim + (performance.now() - playOrigin.current.wall) / 1000;
      if (t >= TOTAL_DURATION) {
        setCurrentTime(TOTAL_DURATION); setPlayState("stopped"); killTicker(); return;
      }
      setCurrentTime(t);
    };
    gsap.ticker.add(tick);
    tickerRef.current = tick;
  }, [killTicker]);

  const handlePause   = useCallback(() => { killTicker(); setPlayState("paused"); }, [killTicker]);
  const handleToggle  = useCallback(() => { if (playState === "playing") handlePause(); else handlePlay(); }, [playState, handlePlay, handlePause]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.code === "Space" && e.target === document.body) { e.preventDefault(); handleToggle(); }};
    window.addEventListener("keydown", h);
    return () => { window.removeEventListener("keydown", h); };
  }, [handleToggle]);

  // Delete/Backspace removes the currently-selected keyframe — guarded
  // against an editable target so backspacing text inside the popover's
  // Value/Time/custom-easing inputs edits the field instead of deleting the
  // whole keyframe out from under it.
  useEffect(() => {
    function h(e: KeyboardEvent) {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      // Inlined rather than calling batchDeleteSelected()/deleteRef()
      // directly — those are redefined every render (not memoized), which
      // would otherwise force this effect to detach/reattach its window
      // listener on every render too. deleteKf/deleteCssVarKf/
      // deleteClipPathKf are the same three functions the single-delete
      // branch below already calls directly without issue.
      if (multiSelected.length > 0) {
        e.preventDefault();
        for (const ref of multiSelected) {
          if (ref.kind === "spatial") deleteKf(ref.layerId, ref.trackId, ref.kfId);
          else if (ref.kind === "cssVar") deleteCssVarKf(ref.layerId, ref.trackId, ref.kfId);
          else deleteClipPathKf(ref.layerId, ref.trackId, ref.kfId);
        }
        setMultiSelected([]);
        return;
      }
      if (!selectedKf) return;
      e.preventDefault();
      const { layerId, trackId, kfId, kind } = selectedKf;
      if (kind === "spatial") deleteKf(layerId, trackId, kfId);
      else if (kind === "cssVar") deleteCssVarKf(layerId, trackId, kfId);
      else deleteClipPathKf(layerId, trackId, kfId);
    }
    window.addEventListener("keydown", h);
    return () => { window.removeEventListener("keydown", h); };
  }, [selectedKf, multiSelected]);

  useEffect(() => {
    return () => {
      if (tickerRef.current) {
        gsap.ticker.remove(tickerRef.current);
        tickerRef.current = null;
      }
    };
  }, []);

  function timeFromX(clientX: number): number {
    const el = timelineEl.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return clamp(((clientX - rect.left) / rulerPx) * TOTAL_DURATION, 0, TOTAL_DURATION);
  }

  function updateClip(layerId: string, clipId: string, start: number, end: number) {
    setLayers(p => {
      // ClipBar's onPointerMove calls this on every pointer event, but the
      // caller snaps to the grid first, so most of those events resolve to the
      // value the clip already has. Rebuilding the array anyway produced a new
      // state object each time, which re-rendered the bar and repositioned it
      // under a captured pointer — feeding the next event straight back in and
      // tripping React's "Maximum update depth exceeded". Returning the same
      // reference on a no-op lets React skip the render entirely.
      const clip = p.find(l => l.id === layerId)?.clips.find(c => c.id === clipId);
      if (!clip || (clip.start === start && clip.end === end)) return p;
      return p.map(l => l.id !== layerId ? l : { ...l, clips: l.clips.map(c => c.id !== clipId ? c : { ...c, start, end }) });
    });
  }
  function updateKfTime(layerId: string, trackId: string, kfId: string, time: number) {
    setLayers(p => p.map(l => l.id !== layerId ? l : {
      ...l, tracks: l.tracks.map(t => t.id !== trackId ? t : { ...t, keyframes: t.keyframes.map(k => k.id !== kfId ? k : { ...k, time }) }),
    }));
  }
  function setKfEasing(layerId: string, trackId: string, kfId: string, easing: GsapEasing) {
    setLayers(p => p.map(l => l.id !== layerId ? l : {
      ...l, tracks: l.tracks.map(t => t.id !== trackId ? t : { ...t, keyframes: t.keyframes.map(k => k.id !== kfId ? k : { ...k, easingOut: easing, easingIn: easing }) }),
    }));
  }
  function setKfInterpolation(layerId: string, trackId: string, kfId: string, interpolation: "smooth" | "hold") {
    setLayers(p => p.map(l => l.id !== layerId ? l : {
      ...l, tracks: l.tracks.map(t => t.id !== trackId ? t : { ...t, keyframes: t.keyframes.map(k => k.id !== kfId ? k : { ...k, interpolation }) }),
    }));
  }
  function updateKfValue(layerId: string, trackId: string, kfId: string, value: number) {
    setLayers(p => p.map(l => l.id !== layerId ? l : {
      ...l, tracks: l.tracks.map(t => t.id !== trackId ? t : { ...t, keyframes: t.keyframes.map(k => k.id !== kfId ? k : { ...k, value }) }),
    }));
  }
  function deleteKf(layerId: string, trackId: string, kfId: string) {
    setLayers(p => p.map(l => l.id !== layerId ? l : {
      ...l, tracks: l.tracks.map(t => t.id !== trackId ? t : { ...t, keyframes: t.keyframes.filter(k => k.id !== kfId) }),
    }));
    setSelectedKf(null);
  }
  // Placed 0.2s after the source (clamped to the timeline's end) and nudged
  // forward in 0.05s steps past any keyframe already occupying that exact
  // spot — same collision-avoidance margin insertKf uses above, so a
  // duplicate never silently lands exactly on top of an existing keyframe.
  function duplicateKf(layerId: string, trackId: string, kfId: string) {
    setLayers(p => p.map(l => {
      if (l.id !== layerId) return l;
      return {
        ...l,
        tracks: l.tracks.map(t => {
          if (t.id !== trackId) return t;
          const src = t.keyframes.find(k => k.id === kfId);
          if (!src) return t;
          let time = Math.min(src.time + 0.2, TOTAL_DURATION);
          while (t.keyframes.some(k => Math.abs(k.time - time) < 0.05) && time < TOTAL_DURATION) time = Math.min(time + 0.05, TOTAL_DURATION);
          return { ...t, keyframes: [...t.keyframes, { ...src, id: uid(), time }] };
        }),
      };
    }));
  }
  function resetKfValue(layerId: string, trackId: string, kfId: string, property: PropertyKey) {
    updateKfValue(layerId, trackId, kfId, PROPERTY_DEFAULTS[property]);
  }

  function insertKf(layerId: string, trackId: string, clientX: number) {
    const time = snapTime(timeFromX(clientX));
    setLayers(p => p.map(l => {
      if (l.id !== layerId) return l;
      return {
        ...l,
        tracks: l.tracks.map(t => {
          if (t.id !== trackId) return t;
          if (t.keyframes.some(k => Math.abs(k.time - time) < 0.05)) return t;
          const value = trackValueAtTime(t, time);
          const newKf: PropertyKeyframe = { id: uid(), time, value, easingOut: "power2.inOut", easingIn: "power2.inOut", interpolation: "smooth" };
          return { ...t, keyframes: [...t.keyframes, newKf] };
        }),
      };
    }));
  }

  function handleSelectLayerRow(id: string) {
    setSelLayer(id);
    onSelectLayer?.(id);
  }

  function toggleExpand(id: string) { setLayers(p => p.map(l => l.id === id ? { ...l, expanded: !l.expanded } : l)); }
  function toggleVis(id: string)    { setLayers(p => p.map(l => l.id === id ? { ...l, visible: !l.visible } : l)); }
  function toggleLock(id: string)   { setLayers(p => p.map(l => l.id === id ? { ...l, locked: !l.locked } : l)); }
  function toggleScrollTrigger(id: string) {
    setLayers(p => p.map(l => l.id === id ? { ...l, trigger: { mode: l.trigger.mode === "onScroll" ? "onMount" : "onScroll" } } : l));
  }
  function deleteLayer(id: string)  { setLayers(p => p.filter(l => l.id !== id)); if (selLayer === id) setSelLayer(null); }

  // ── CSS variable sub-tracks ──────────────────────────────────────────────
  function addCssVarTrack(layerId: string) {
    const varName = window.prompt('CSS variable name (e.g. "--exr-cardRadius")')?.trim();
    if (!varName) return;
    const name = varName.startsWith("--") ? varName : `--${varName}`;
    setLayers(p => p.map(l => l.id !== layerId ? l : { ...l, cssVarTracks: [...l.cssVarTracks, { id: uid(), varName: name, keyframes: [] }] }));
  }
  function removeCssVarTrack(layerId: string, trackId: string) {
    setLayers(p => p.map(l => l.id !== layerId ? l : { ...l, cssVarTracks: l.cssVarTracks.filter(t => t.id !== trackId) }));
  }
  function insertCssVarKf(layerId: string, trackId: string, clientX: number) {
    const time = snapTime(timeFromX(clientX));
    setLayers(p => p.map(l => {
      if (l.id !== layerId) return l;
      return {
        ...l,
        cssVarTracks: l.cssVarTracks.map(t => {
          if (t.id !== trackId) return t;
          if (t.keyframes.some(k => Math.abs(k.time - time) < 0.05)) return t;
          const value = interpolateCssVarTrack(t, time) ?? "0px";
          return { ...t, keyframes: [...t.keyframes, { id: uid(), time, value, easingOut: "power2.inOut" as GsapEasing, easingIn: "power2.inOut" as GsapEasing, interpolation: "smooth" as const }] };
        }),
      };
    }));
  }
  function updateCssVarKfTime(layerId: string, trackId: string, kfId: string, time: number) {
    setLayers(p => p.map(l => l.id !== layerId ? l : {
      ...l, cssVarTracks: l.cssVarTracks.map(t => t.id !== trackId ? t : { ...t, keyframes: t.keyframes.map(k => k.id !== kfId ? k : { ...k, time }) }),
    }));
  }
  function updateCssVarKfValue(layerId: string, trackId: string, kfId: string, value: string) {
    setLayers(p => p.map(l => l.id !== layerId ? l : {
      ...l, cssVarTracks: l.cssVarTracks.map(t => t.id !== trackId ? t : { ...t, keyframes: t.keyframes.map(k => k.id !== kfId ? k : { ...k, value }) }),
    }));
  }
  function setCssVarKfEasing(layerId: string, trackId: string, kfId: string, easing: GsapEasing) {
    setLayers(p => p.map(l => l.id !== layerId ? l : {
      ...l, cssVarTracks: l.cssVarTracks.map(t => t.id !== trackId ? t : { ...t, keyframes: t.keyframes.map(k => k.id !== kfId ? k : { ...k, easingOut: easing, easingIn: easing }) }),
    }));
  }
  function setCssVarKfInterpolation(layerId: string, trackId: string, kfId: string, interpolation: "smooth" | "hold") {
    setLayers(p => p.map(l => l.id !== layerId ? l : {
      ...l, cssVarTracks: l.cssVarTracks.map(t => t.id !== trackId ? t : { ...t, keyframes: t.keyframes.map(k => k.id !== kfId ? k : { ...k, interpolation }) }),
    }));
  }
  function deleteCssVarKf(layerId: string, trackId: string, kfId: string) {
    setLayers(p => p.map(l => l.id !== layerId ? l : {
      ...l, cssVarTracks: l.cssVarTracks.map(t => t.id !== trackId ? t : { ...t, keyframes: t.keyframes.filter(k => k.id !== kfId) }),
    }));
    setSelectedKf(null);
  }
  function duplicateCssVarKf(layerId: string, trackId: string, kfId: string) {
    setLayers(p => p.map(l => {
      if (l.id !== layerId) return l;
      return {
        ...l,
        cssVarTracks: l.cssVarTracks.map(t => {
          if (t.id !== trackId) return t;
          const src = t.keyframes.find(k => k.id === kfId);
          if (!src) return t;
          let time = Math.min(src.time + 0.2, TOTAL_DURATION);
          while (t.keyframes.some(k => Math.abs(k.time - time) < 0.05) && time < TOTAL_DURATION) time = Math.min(time + 0.05, TOTAL_DURATION);
          return { ...t, keyframes: [...t.keyframes, { ...src, id: uid(), time }] };
        }),
      };
    }));
  }

  // ── Clip-path sub-tracks ─────────────────────────────────────────────────
  function addClipPathTrack(layerId: string, shape: ClipShape) {
    setLayers(p => p.map(l => l.id !== layerId ? l : { ...l, clipPathTracks: [...l.clipPathTracks, { id: uid(), shape, keyframes: [] }] }));
  }
  /** A directional mask wipe / iris reveal, pre-populated via the shared
   *  generateClipRevealTrack (packages/builder/src/timelineGenerators.ts) —
   *  the same generator the Animation tab's "Clip Reveal" dropdown uses
   *  (see animationConfigAdapter.ts), so a preset picked here plays back
   *  identically to one picked there, and neither UI reimplements the
   *  from/to clip-path math on its own. */
  function addClipRevealTrack(layerId: string, direction: "up" | "down" | "left" | "right" | "circle") {
    const generated = generateClipRevealTrack(direction, 1, "power2.inOut");
    setLayers(p => p.map(l => l.id !== layerId ? l : { ...l, clipPathTracks: [...l.clipPathTracks, generated as ClipPathTrack] }));
  }
  function removeClipPathTrack(layerId: string, trackId: string) {
    setLayers(p => p.map(l => l.id !== layerId ? l : { ...l, clipPathTracks: l.clipPathTracks.filter(t => t.id !== trackId) }));
  }
  /** Magnetic hover — cursor-follow while hovering, snapping back to a rest
   *  position on mouseleave. Sets this layer's own trigger to onMouseMove/
   *  element scope (see LayerTrigger) and seeds its always-present x/y
   *  PropertyTracks with the shared generateMagneticHoverTracks' single
   *  rest keyframe, same generator + same rest-keyframe shape the Animation
   *  tab's onMouseMove/"This Block Only" option produces (see AnimatedBox.tsx's
   *  onMouseMove handling, which reads exactly this rest x/y off `bt.tracks`
   *  regardless of which UI authored it). Rest position defaults to the
   *  element's own natural (0,0) offset — drag the x/y keyframes afterward
   *  to offset the rest point if needed. */
  function applyMagneticHoverPreset(layerId: string) {
    const restTracks = generateMagneticHoverTracks(0, 0);
    setLayers(p => p.map(l => {
      if (l.id !== layerId) return l;
      return {
        ...l,
        trigger: magneticHoverTrigger({ scope: "element", strength: 30 }),
        tracks: l.tracks.map(t => {
          const preset = restTracks.find(rt => rt.property === t.property);
          return preset ? { ...t, keyframes: preset.keyframes as PropertyKeyframe[] } : t;
        }),
      };
    }));
  }
  function insertClipPathKf(layerId: string, trackId: string, clientX: number) {
    const time = snapTime(timeFromX(clientX));
    setLayers(p => p.map(l => {
      if (l.id !== layerId) return l;
      return {
        ...l,
        clipPathTracks: l.clipPathTracks.map(t => {
          if (t.id !== trackId) return t;
          if (t.keyframes.some(k => Math.abs(k.time - time) < 0.05)) return t;
          const value = interpolateClipPathTrack(t, time) ?? defaultClipPathValue(t.shape);
          return { ...t, keyframes: [...t.keyframes, { id: uid(), time, value, easingOut: "power2.inOut" as GsapEasing, easingIn: "power2.inOut" as GsapEasing, interpolation: "smooth" as const }] };
        }),
      };
    }));
  }
  function updateClipPathKfTime(layerId: string, trackId: string, kfId: string, time: number) {
    setLayers(p => p.map(l => l.id !== layerId ? l : {
      ...l, clipPathTracks: l.clipPathTracks.map(t => t.id !== trackId ? t : { ...t, keyframes: t.keyframes.map(k => k.id !== kfId ? k : { ...k, time }) }),
    }));
  }
  function updateClipPathKfValue(layerId: string, trackId: string, kfId: string, value: string) {
    setLayers(p => p.map(l => l.id !== layerId ? l : {
      ...l, clipPathTracks: l.clipPathTracks.map(t => t.id !== trackId ? t : { ...t, keyframes: t.keyframes.map(k => k.id !== kfId ? k : { ...k, value }) }),
    }));
  }
  function setClipPathKfEasing(layerId: string, trackId: string, kfId: string, easing: GsapEasing) {
    setLayers(p => p.map(l => l.id !== layerId ? l : {
      ...l, clipPathTracks: l.clipPathTracks.map(t => t.id !== trackId ? t : { ...t, keyframes: t.keyframes.map(k => k.id !== kfId ? k : { ...k, easingOut: easing, easingIn: easing }) }),
    }));
  }
  function setClipPathKfInterpolation(layerId: string, trackId: string, kfId: string, interpolation: "smooth" | "hold") {
    setLayers(p => p.map(l => l.id !== layerId ? l : {
      ...l, clipPathTracks: l.clipPathTracks.map(t => t.id !== trackId ? t : { ...t, keyframes: t.keyframes.map(k => k.id !== kfId ? k : { ...k, interpolation }) }),
    }));
  }
  function deleteClipPathKf(layerId: string, trackId: string, kfId: string) {
    setLayers(p => p.map(l => l.id !== layerId ? l : {
      ...l, clipPathTracks: l.clipPathTracks.map(t => t.id !== trackId ? t : { ...t, keyframes: t.keyframes.filter(k => k.id !== kfId) }),
    }));
    setSelectedKf(null);
  }
  function duplicateClipPathKf(layerId: string, trackId: string, kfId: string) {
    setLayers(p => p.map(l => {
      if (l.id !== layerId) return l;
      return {
        ...l,
        clipPathTracks: l.clipPathTracks.map(t => {
          if (t.id !== trackId) return t;
          const src = t.keyframes.find(k => k.id === kfId);
          if (!src) return t;
          let time = Math.min(src.time + 0.2, TOTAL_DURATION);
          while (t.keyframes.some(k => Math.abs(k.time - time) < 0.05) && time < TOTAL_DURATION) time = Math.min(time + 0.05, TOTAL_DURATION);
          return { ...t, keyframes: [...t.keyframes, { ...src, id: uid(), time }] };
        }),
      };
    }));
  }

  // ── Snapping ──────────────────────────────────────────────────────────────
  // Snap targets, in priority order: other keyframes (across every track on
  // every layer, not just the one being dragged — a value change lining up
  // in time with an unrelated layer's beat is exactly the case snapping is
  // for), clip start/end times ("labels" — this editor has no separate
  // marker/label system, clips' own start/end + text label are the closest
  // existing concept), and the playhead. Falls back to a fixed grid only
  // when nothing more specific is within range, so an intentional snap to a
  // nearby keyframe always wins over an arbitrary grid tick beside it.
  function snapTime(rawTime: number, excludeKfIds?: Set<string>, includePlayhead = true): number {
    if (!snapEnabled) return rawTime;
    const thresholdSeconds = (SNAP_PX / rulerPx) * TOTAL_DURATION;
    const candidates: number[] = includePlayhead ? [currentTime] : [];
    layersRef.current.forEach(l => {
      l.clips.forEach(c => { candidates.push(c.start, c.end); });
      l.tracks.forEach(t => t.keyframes.forEach(k => { if (!excludeKfIds?.has(k.id)) candidates.push(k.time); }));
      l.cssVarTracks.forEach(t => t.keyframes.forEach(k => { if (!excludeKfIds?.has(k.id)) candidates.push(k.time); }));
      l.clipPathTracks.forEach(t => t.keyframes.forEach(k => { if (!excludeKfIds?.has(k.id)) candidates.push(k.time); }));
    });
    let best: number | null = null;
    let bestDist = thresholdSeconds;
    for (const c of candidates) {
      const d = Math.abs(c - rawTime);
      if (d <= bestDist) { bestDist = d; best = c; }
    }
    if (best !== null) return best;
    const gridSnapped = Math.round(rawTime / GRID_STEP) * GRID_STEP;
    if (Math.abs(gridSnapped - rawTime) <= thresholdSeconds) return clamp(Math.round(gridSnapped * 1000) / 1000, 0, TOTAL_DURATION);
    return rawTime;
  }

  // ── Multi-select batch operations ────────────────────────────────────────
  function kfsForRef(ref: KfRef) {
    const layer = layersRef.current.find(l => l.id === ref.layerId);
    if (!layer) return undefined;
    if (ref.kind === "spatial") return layer.tracks.find(t => t.id === ref.trackId)?.keyframes;
    if (ref.kind === "cssVar") return layer.cssVarTracks.find(t => t.id === ref.trackId)?.keyframes;
    return layer.clipPathTracks.find(t => t.id === ref.trackId)?.keyframes;
  }
  function getKfTime(ref: KfRef): number {
    return kfsForRef(ref)?.find(k => k.id === ref.kfId)?.time ?? 0;
  }
  function toggleMultiSelect(ref: KfRef) {
    setSelectedKf(null);
    setMultiSelected(prev => (prev.some(r => r.kfId === ref.kfId) ? prev.filter(r => r.kfId !== ref.kfId) : [...prev, ref]));
  }
  function deleteRef(ref: KfRef) {
    if (ref.kind === "spatial") deleteKf(ref.layerId, ref.trackId, ref.kfId);
    else if (ref.kind === "cssVar") deleteCssVarKf(ref.layerId, ref.trackId, ref.kfId);
    else deleteClipPathKf(ref.layerId, ref.trackId, ref.kfId);
  }
  function retimeRef(ref: KfRef, time: number) {
    if (ref.kind === "spatial") updateKfTime(ref.layerId, ref.trackId, ref.kfId, time);
    else if (ref.kind === "cssVar") updateCssVarKfTime(ref.layerId, ref.trackId, ref.kfId, time);
    else updateClipPathKfTime(ref.layerId, ref.trackId, ref.kfId, time);
  }
  function easeRef(ref: KfRef, ease: GsapEasing) {
    if (ref.kind === "spatial") setKfEasing(ref.layerId, ref.trackId, ref.kfId, ease);
    else if (ref.kind === "cssVar") setCssVarKfEasing(ref.layerId, ref.trackId, ref.kfId, ease);
    else setClipPathKfEasing(ref.layerId, ref.trackId, ref.kfId, ease);
  }
  function batchDeleteSelected() {
    multiSelected.forEach(deleteRef);
    setMultiSelected([]);
  }
  function batchRetimeSelected(delta: number) {
    multiSelected.forEach(ref => retimeRef(ref, clamp(getKfTime(ref) + delta, 0, TOTAL_DURATION)));
  }
  function batchApplyEase(ease: GsapEasing) {
    multiSelected.forEach(ref => easeRef(ref, ease));
  }
  /** A drag on a keyframe that's part of a >1-member selection moves every
   *  selected keyframe by the same delta (captured relative to the dragged
   *  keyframe's own pre-drag time via groupDragRef, set in handleDragStart)
   *  instead of only the one under the pointer. */
  function handleDragStart(kfId: string, origTime: number, ref: KfRef) {
    const isGroup = multiSelected.length > 1 && multiSelected.some(r => r.kfId === kfId);
    groupDragRef.current = isGroup ? { draggedKfId: kfId, draggedOrigTime: origTime, snapshot: multiSelected.map(r => ({ ref: r, origTime: getKfTime(r) })) } : null;
    void ref;
  }
  function handleGroupAwareDragEnd(kfId: string, newTime: number, fallback: (t: number) => void) {
    const g = groupDragRef.current;
    if (g && g.draggedKfId === kfId) {
      // Snap only the dragged keyframe's own target (excluding every member
      // of the group itself from candidates, so the group doesn't snap to
      // its own other members) — then apply that one delta uniformly, so
      // the group's internal spacing never distorts from snapping.
      const exclude = new Set(g.snapshot.map(s => s.ref.kfId));
      const snapped = snapTime(newTime, exclude);
      const delta = snapped - g.draggedOrigTime;
      g.snapshot.forEach(({ ref, origTime }) => retimeRef(ref, clamp(origTime + delta, 0, TOTAL_DURATION)));
      return;
    }
    fallback(snapTime(newTime, new Set([kfId])));
  }

  // ── Marquee (rubber-band) selection ──────────────────────────────────────
  // Row containers carry `data-row-key="kind:layerId:trackId"` (see the
  // track-row JSX below) so this can resolve hits without duplicating the
  // vertical layout math (clip row + property/cssVar/clipPath rows per
  // layer, gated by `layer.expanded`) a second time here.
  function finalizeMarquee(rect: { x0: number; y0: number; x1: number; y1: number }) {
    const x0 = Math.min(rect.x0, rect.x1), x1 = Math.max(rect.x0, rect.x1);
    const y0 = Math.min(rect.y0, rect.y1), y1 = Math.max(rect.y0, rect.y1);
    if (x1 - x0 < 3 && y1 - y0 < 3) { setMultiSelected([]); return; } // plain click on empty space — clear selection
    const container = timelineEl.current;
    if (!container) return;
    const hits: KfRef[] = [];
    container.querySelectorAll<HTMLElement>("[data-row-key]").forEach(row => {
      const r = row.getBoundingClientRect();
      if (r.bottom < y0 || r.top > y1 || r.width === 0) return;
      const [kind, layerId, trackId] = row.dataset.rowKey!.split("::");
      const ref0: KfRef = { layerId, trackId, kfId: "", kind: kind as KfRef["kind"] };
      const kfs = kfsForRef(ref0) ?? [];
      kfs.forEach(kf => {
        const kfX = r.left + (kf.time / TOTAL_DURATION) * r.width;
        if (kfX >= x0 && kfX <= x1) hits.push({ layerId, trackId, kfId: kf.id, kind: ref0.kind });
      });
    });
    setMultiSelected(hits);
    setSelectedKf(null);
  }

  function addLayer() {
    const newId = uid();
    setLayers(p => {
      const i = p.length % LAYER_PALETTE.length;
      return [...p, {
        id: newId, name: `Layer ${p.length + 1}`, color: LAYER_PALETTE[i], emoji: LAYER_EMOJIS[i],
        visible: true, locked: false, expanded: false, cssVarTracks: [], clipPathTracks: [],
        clips: [{ id: uid(), start: 0, end: 2 }], tracks: makeDefaultTracks(),
        trigger: { mode: "onMount" },
      }];
    });
    handleSelectLayerRow(newId);
  }

  const phX = (currentTime / TOTAL_DURATION) * rulerPx;

  return (
    <div
      className={className}
      style={{ display: "flex", flexDirection: "column", position: "relative", borderRadius: 12, overflow: "hidden", background: "#09090b", border: "1px solid rgba(255,255,255,0.08)", minWidth: 700, userSelect: "none", ...style }}
    >
      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800/80 bg-zinc-950/60">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-300">Timeline</span>
          <span className="rounded px-1.5 py-0.5 text-[10px] font-mono text-amber-400 bg-amber-400/10 border border-amber-400/20">{formatTime(currentTime)}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleStop} title="Stop" className="p-1 rounded text-zinc-400 hover:text-zinc-200"><Ic.Stop/></button>
          <button onClick={handleToggle} title="Play/Pause" className="p-1 rounded bg-amber-400/20 border border-amber-400/40 text-amber-400 hover:bg-amber-400/30">
            {playState === "playing" ? <Ic.Pause/> : <Ic.Play/>}
          </button>
          <div className="h-4 w-px bg-zinc-800 mx-1"/>
          {([1,2,4] as const).map(z => (
            <button key={z} onClick={() => setZoom(z)} className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${zoom === z ? "bg-amber-400/20 text-amber-400 border border-amber-400/30" : "text-zinc-500 hover:text-zinc-300"}`}>{z}×</button>
          ))}
          <div className="h-4 w-px bg-zinc-800 mx-1"/>
          <button
            onClick={() => setSnapEnabled(s => !s)}
            title={snapEnabled ? "Snapping on (keyframes/clips/playhead/grid) — click to disable" : "Snapping off — click to enable"}
            className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${snapEnabled ? "bg-amber-400/20 text-amber-400 border border-amber-400/30" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            🧲
          </button>
          {(() => {
            const scrollLayer = layers.find(l => l.id === selLayer);
            if (!scrollLayer || scrollLayer.trigger.mode !== "onScroll") return null;
            const progress = clamp(currentTime / TOTAL_DURATION, 0, 1);
            return (
              <>
                <div className="h-4 w-px bg-zinc-800 mx-1"/>
                <span className="text-[9px] font-bold uppercase tracking-wide text-zinc-500">Scroll</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.001}
                  value={progress}
                  onPointerDown={() => { if (playStateRef.current === "playing") handlePause(); }}
                  onChange={e => setCurrentTime(clamp(parseFloat(e.target.value), 0, 1) * TOTAL_DURATION)}
                  title="Scrub this ScrollTrigger-bound layer's scroll progress — previews exactly how the animation looks at each point in its scroll range, live in the preview pane, without scrolling the real page"
                  className="w-20 accent-amber-400"
                />
                <span className="w-9 text-right text-[10px] font-mono text-amber-400">{Math.round(progress * 100)}%</span>
              </>
            );
          })()}
          <div className="h-4 w-px bg-zinc-800 mx-1"/>
          <button onClick={() => setExportOpen(true)} className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-zinc-400 bg-zinc-800/50 hover:text-amber-400"><Ic.Export s={11}/> Export</button>
        </div>
      </div>

      {/* ── Main area ────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 180 }}>
        {/* Sidebar */}
        <div style={{ width: SIDEBAR_W, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column" }}>
          <div className="flex items-center justify-between px-2.5" style={{ height: RULER_H, borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Layers</span>
            <button onClick={addLayer} className="text-zinc-400 hover:text-amber-400"><Ic.Add s={11}/></button>
          </div>
          <div className="overflow-y-auto flex-1">
            {layers.map(layer => {
              const sel = layer.id === selLayer;
              return (
                <div key={layer.id}>
                  <div
                    onClick={() => handleSelectLayerRow(layer.id)}
                    className={`group flex items-center gap-1.5 px-2 cursor-pointer transition-colors ${sel ? "bg-amber-400/10 border-l-2 border-amber-400" : "hover:bg-zinc-900"}`}
                    style={{ height: CLIP_ROW_H, borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <button onClick={e => { e.stopPropagation(); toggleExpand(layer.id); }} className="text-zinc-500 hover:text-zinc-300">
                      <Ic.Expand open={layer.expanded} s={9}/>
                    </button>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: layer.color }}/>
                    <span className="text-xs">{layer.emoji}</span>
                    <span className="flex-1 truncate text-xs font-medium text-zinc-300">{layer.name}</span>
                    <button
                      onClick={e => { e.stopPropagation(); toggleScrollTrigger(layer.id); }}
                      title={layer.trigger.mode === "onScroll" ? "ScrollTrigger-bound (scrub with scroll position) — click for Playhead mode" : "Playhead mode (plays once on mount) — click for ScrollTrigger mode"}
                      className={layer.trigger.mode === "onScroll" ? "text-amber-400" : "text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-zinc-300"}
                    >
                      <Ic.Scroll/>
                    </button>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                      <button onClick={e => { e.stopPropagation(); toggleVis(layer.id); }} className="text-zinc-500 hover:text-zinc-200"><Ic.Eye open={layer.visible}/></button>
                      <button onClick={e => { e.stopPropagation(); toggleLock(layer.id); }} className="text-zinc-500 hover:text-amber-400"><Ic.Lock locked={layer.locked}/></button>
                      <button onClick={e => { e.stopPropagation(); deleteLayer(layer.id); }} className="text-zinc-500 hover:text-red-400"><Ic.Trash/></button>
                    </div>
                  </div>
                  {layer.expanded && ALL_PROPERTIES.map(prop => (
                    <div key={prop} className="flex items-center gap-1.5 pl-7 pr-2 bg-black/20 text-zinc-500" style={{ height: TRACK_ROW_H, borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <span className="text-[10px] font-semibold">{PROPERTY_LABELS[prop]}</span>
                    </div>
                  ))}
                  {layer.expanded && layer.cssVarTracks.map(track => (
                    <div key={track.id} className="group/t flex items-center gap-1.5 pl-7 pr-2 bg-black/20 text-zinc-500" style={{ height: TRACK_ROW_H, borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <span className="text-[10px] font-semibold font-mono truncate flex-1" title={track.varName}>{track.varName}</span>
                      <button onClick={() => removeCssVarTrack(layer.id, track.id)} className="opacity-0 group-hover/t:opacity-100 text-zinc-500 hover:text-red-400"><Ic.Trash s={9}/></button>
                    </div>
                  ))}
                  {layer.expanded && layer.clipPathTracks.map(track => (
                    <div key={track.id} className="group/t flex items-center gap-1.5 pl-7 pr-2 bg-black/20 text-zinc-500" style={{ height: TRACK_ROW_H, borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <span className="text-[10px] font-semibold truncate flex-1">Clip: {track.shape}</span>
                      <button onClick={() => removeClipPathTrack(layer.id, track.id)} className="opacity-0 group-hover/t:opacity-100 text-zinc-500 hover:text-red-400"><Ic.Trash s={9}/></button>
                    </div>
                  ))}
                  {layer.expanded && (
                    <div className="flex flex-wrap items-center gap-1 pl-7 pr-2 py-1 bg-black/20" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <button onClick={() => addCssVarTrack(layer.id)} className="text-[9px] font-bold px-1.5 py-0.5 rounded text-zinc-500 hover:text-amber-400 hover:bg-zinc-800">+ CSS Var</button>
                      <select
                        onChange={e => {
                          const v = e.target.value;
                          if (!v) return;
                          if (v.startsWith("reveal:")) addClipRevealTrack(layer.id, v.slice(7) as "up" | "down" | "left" | "right" | "circle");
                          else addClipPathTrack(layer.id, v as ClipShape);
                          e.target.value = "";
                        }}
                        value=""
                        title="Add a clip-path track"
                        className="text-[9px] font-bold px-1 py-0.5 rounded text-zinc-500 bg-transparent hover:text-amber-400 hover:bg-zinc-800 border-none outline-none cursor-pointer"
                      >
                        <option value="" disabled>+ Clip-Path</option>
                        <option value="circle">Circle (blank)</option>
                        <option value="inset">Inset (blank)</option>
                        <option value="polygon">Polygon (blank)</option>
                        <option value="reveal:up">Reveal: Wipe Up</option>
                        <option value="reveal:down">Reveal: Wipe Down</option>
                        <option value="reveal:left">Reveal: Wipe Left</option>
                        <option value="reveal:right">Reveal: Wipe Right</option>
                        <option value="reveal:circle">Reveal: Circle Iris</option>
                      </select>
                      <button
                        onClick={() => applyMagneticHoverPreset(layer.id)}
                        title="Magnetic hover — cursor-follow while hovering, snaps back to rest on mouseleave. Sets this layer's trigger to onMouseMove."
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded text-zinc-500 hover:text-amber-400 hover:bg-zinc-800"
                      >
                        🧲 Magnetic Hover
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline Panel */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden flex flex-col" style={{ position: "relative" }}>
          <div
            ref={timelineEl}
            style={{ width: rulerPx, flexShrink: 0, position: "relative" }}
            onPointerDown={e => {
              if ((e.target as HTMLElement).dataset.ruler === "true") { setCurrentTime(snapTime(timeFromX(e.clientX), undefined, false)); return; }
              // Marquee select — only reaches here when the pointerdown wasn't
              // already consumed (and stopPropagation'd) by a DiamondMarker
              // or ClipBar, i.e. the click landed on empty track/row space.
              const start = { x: e.clientX, y: e.clientY };
              marqueeStartRef.current = start;
              setMarqueeRect({ x0: start.x, y0: start.y, x1: start.x, y1: start.y });
              function onMove(ev: PointerEvent) {
                if (!marqueeStartRef.current) return;
                setMarqueeRect({ x0: marqueeStartRef.current.x, y0: marqueeStartRef.current.y, x1: ev.clientX, y1: ev.clientY });
              }
              function onUp(ev: PointerEvent) {
                window.removeEventListener("pointermove", onMove);
                window.removeEventListener("pointerup", onUp);
                if (marqueeStartRef.current) {
                  finalizeMarquee({ x0: marqueeStartRef.current.x, y0: marqueeStartRef.current.y, x1: ev.clientX, y1: ev.clientY });
                }
                marqueeStartRef.current = null;
                setMarqueeRect(null);
              }
              window.addEventListener("pointermove", onMove);
              window.addEventListener("pointerup", onUp);
            }}
          >
            <TimeRuler zoom={zoom} rulerPx={rulerPx}/>

            {layers.map(layer => (
              <div key={layer.id}>
                <div style={{ height: CLIP_ROW_H, position: "relative", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  {layer.clips.map(clip => (
                    <ClipBar key={clip.id} clip={clip} color={layer.color} rulerPx={rulerPx} locked={layer.locked} onUpdate={(id,s,e) => updateClip(layer.id, id, snapTime(s), snapTime(e))}/>
                  ))}
                </div>
                {layer.expanded && ALL_PROPERTIES.map(prop => {
                  const track = layer.tracks.find(t => t.property === prop);
                  if (!track) return null;
                  return (
                    <div
                      key={prop}
                      data-row-key={`spatial::${layer.id}::${track.id}`}
                      style={{ height: TRACK_ROW_H, position: "relative", borderBottom: "1px solid rgba(255,255,255,0.03)", background: "rgba(0,0,0,0.15)" }}
                      onDoubleClick={e => { if (!layer.locked) insertKf(layer.id, track.id, e.clientX); }}
                    >
                      {track.keyframes.map(kf => (
                        <DiamondMarker
                          key={kf.id}
                          kf={kf}
                          rulerPx={rulerPx}
                          color={layer.color}
                          selected={selectedKf?.kfId === kf.id}
                          multiSelected={multiSelected.some(r => r.kfId === kf.id)}
                          locked={layer.locked}
                          onDragStart={(kfId, origTime) => handleDragStart(kfId, origTime, { layerId: layer.id, trackId: track.id, kfId, kind: "spatial" })}
                          onDragEnd={(kfId, newTime) => handleGroupAwareDragEnd(kfId, newTime, t => updateKfTime(layer.id, track.id, kfId, t))}
                          onSelect={(kfId, ax, ay, shiftKey) => {
                            if (shiftKey) toggleMultiSelect({ layerId: layer.id, trackId: track.id, kfId, kind: "spatial" });
                            else { setMultiSelected([]); setSelectedKf({ layerId: layer.id, trackId: track.id, kfId, anchorX: ax, anchorY: ay, kind: "spatial" }); }
                          }}
                          onContextMenu={(kfId, cx, cy) => setKfContextMenu({ layerId: layer.id, trackId: track.id, kfId, kind: "spatial", x: cx, y: cy })}
                        />
                      ))}
                    </div>
                  );
                })}
                {layer.expanded && layer.cssVarTracks.map(track => (
                  <div
                    key={track.id}
                    data-row-key={`cssVar::${layer.id}::${track.id}`}
                    style={{ height: TRACK_ROW_H, position: "relative", borderBottom: "1px solid rgba(255,255,255,0.03)", background: "rgba(0,0,0,0.15)" }}
                    onDoubleClick={e => { if (!layer.locked) insertCssVarKf(layer.id, track.id, e.clientX); }}
                  >
                    {track.keyframes.map(kf => (
                      <DiamondMarker
                        key={kf.id}
                        kf={kf}
                        rulerPx={rulerPx}
                        color={layer.color}
                        selected={selectedKf?.kfId === kf.id}
                        multiSelected={multiSelected.some(r => r.kfId === kf.id)}
                        locked={layer.locked}
                        onDragStart={(kfId, origTime) => handleDragStart(kfId, origTime, { layerId: layer.id, trackId: track.id, kfId, kind: "cssVar" })}
                        onDragEnd={(kfId, newTime) => handleGroupAwareDragEnd(kfId, newTime, t => updateCssVarKfTime(layer.id, track.id, kfId, t))}
                        onSelect={(kfId, ax, ay, shiftKey) => {
                          if (shiftKey) toggleMultiSelect({ layerId: layer.id, trackId: track.id, kfId, kind: "cssVar" });
                          else { setMultiSelected([]); setSelectedKf({ layerId: layer.id, trackId: track.id, kfId, anchorX: ax, anchorY: ay, kind: "cssVar" }); }
                        }}
                        onContextMenu={(kfId, cx, cy) => setKfContextMenu({ layerId: layer.id, trackId: track.id, kfId, kind: "cssVar", x: cx, y: cy })}
                      />
                    ))}
                  </div>
                ))}
                {layer.expanded && layer.clipPathTracks.map(track => (
                  <div
                    key={track.id}
                    data-row-key={`clipPath::${layer.id}::${track.id}`}
                    style={{ height: TRACK_ROW_H, position: "relative", borderBottom: "1px solid rgba(255,255,255,0.03)", background: "rgba(0,0,0,0.15)" }}
                    onDoubleClick={e => { if (!layer.locked) insertClipPathKf(layer.id, track.id, e.clientX); }}
                  >
                    {track.keyframes.map(kf => (
                      <DiamondMarker
                        key={kf.id}
                        kf={kf}
                        rulerPx={rulerPx}
                        color={layer.color}
                        selected={selectedKf?.kfId === kf.id}
                        multiSelected={multiSelected.some(r => r.kfId === kf.id)}
                        locked={layer.locked}
                        onDragStart={(kfId, origTime) => handleDragStart(kfId, origTime, { layerId: layer.id, trackId: track.id, kfId, kind: "clipPath" })}
                        onDragEnd={(kfId, newTime) => handleGroupAwareDragEnd(kfId, newTime, t => updateClipPathKfTime(layer.id, track.id, kfId, t))}
                        onSelect={(kfId, ax, ay, shiftKey) => {
                          if (shiftKey) toggleMultiSelect({ layerId: layer.id, trackId: track.id, kfId, kind: "clipPath" });
                          else { setMultiSelected([]); setSelectedKf({ layerId: layer.id, trackId: track.id, kfId, anchorX: ax, anchorY: ay, kind: "clipPath" }); }
                        }}
                        onContextMenu={(kfId, cx, cy) => setKfContextMenu({ layerId: layer.id, trackId: track.id, kfId, kind: "clipPath", x: cx, y: cy })}
                      />
                    ))}
                  </div>
                ))}
              </div>
            ))}

            {/* Playhead */}
            <div style={{ position: "absolute", top: RULER_H, left: phX, bottom: 0, width: 1, background: "#fbbf24", pointerEvents: "none", zIndex: 10 }}/>
            <div
              style={{ position: "absolute", top: 0, left: phX, width: 16, height: RULER_H, transform: "translateX(-50%)", cursor: "ew-resize", zIndex: 20, display: "flex", justifyContent: "center" }}
              onPointerDown={e => {
                e.stopPropagation();
                phDragging.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={e => { if (phDragging.current) setCurrentTime(snapTime(timeFromX(e.clientX), undefined, false)); }}
              onPointerUp={() => { phDragging.current = false; }}
            >
              <div style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "7px solid #fbbf24" }}/>
            </div>
          </div>
        </div>
      </div>

      {/* Marquee drag rectangle — plain `position: fixed` using raw
          clientX/Y, same coordinate space finalizeMarquee compares against
          via getBoundingClientRect, so no local coordinate conversion. */}
      {marqueeRect && (
        <div
          style={{
            position: "fixed",
            left: Math.min(marqueeRect.x0, marqueeRect.x1),
            top: Math.min(marqueeRect.y0, marqueeRect.y1),
            width: Math.abs(marqueeRect.x1 - marqueeRect.x0),
            height: Math.abs(marqueeRect.y1 - marqueeRect.y0),
            background: "rgba(96,165,250,0.15)",
            border: "1px solid rgba(96,165,250,0.6)",
            pointerEvents: "none",
            zIndex: 30,
          }}
        />
      )}

      {/* Batch selection toolbar — appears whenever a marquee/shift-click
          selection is active, offering move/retime/ease-apply/delete across
          every selected keyframe at once regardless of which track/layer/kind
          each one belongs to. */}
      {multiSelected.length > 0 && (
        <div className="absolute left-1/2 top-10 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-1.5 shadow-2xl">
          <span className="text-[10px] font-bold text-amber-400">{multiSelected.length} selected</span>
          <div className="h-3.5 w-px bg-zinc-700" />
          <button onClick={() => batchRetimeSelected(-0.1)} title="Nudge -0.1s" className="rounded px-1.5 py-0.5 text-[10px] font-bold text-zinc-300 hover:bg-zinc-800">-0.1s</button>
          <button onClick={() => batchRetimeSelected(0.1)} title="Nudge +0.1s" className="rounded px-1.5 py-0.5 text-[10px] font-bold text-zinc-300 hover:bg-zinc-800">+0.1s</button>
          <div className="h-3.5 w-px bg-zinc-700" />
          <select
            onChange={e => { if (e.target.value) { batchApplyEase(e.target.value as GsapEasing); e.target.value = ""; } }}
            value=""
            title="Apply easing to all selected"
            className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300 outline-none"
          >
            <option value="" disabled>Set Ease…</option>
            {GSAP_EASINGS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <div className="h-3.5 w-px bg-zinc-700" />
          <button onClick={batchDeleteSelected} title="Delete all selected" className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold text-red-400 hover:bg-red-500/10">
            <Ic.Trash s={10} /> Delete
          </button>
          <button onClick={() => setMultiSelected([])} title="Clear selection" className="rounded px-1.5 py-0.5 text-[10px] font-bold text-zinc-500 hover:bg-zinc-800">
            <Ic.X s={10} />
          </button>
        </div>
      )}

      {selectedKf && selectedKf.kind === "spatial" && (() => {
        const track = layers.flatMap(l => l.tracks).find(t => t.id === selectedKf.trackId);
        const kf = track?.keyframes.find(k => k.id === selectedKf.kfId);
        return track && kf ? (
          <KeyframePopover
            anchor={{ x: selectedKf.anchorX, y: selectedKf.anchorY }}
            time={kf.time}
            onTimeChange={t => updateKfTime(selectedKf.layerId, selectedKf.trackId, selectedKf.kfId, t)}
            value={String(kf.value)}
            valueUnit={PROPERTY_UNITS[track.property]}
            currentEasing={kf.easingOut}
            interpolation={kf.interpolation}
            onValueChange={v => { const n = parseFloat(v); if (!Number.isNaN(n)) updateKfValue(selectedKf.layerId, selectedKf.trackId, selectedKf.kfId, n); }}
            onEasingChange={ease => setKfEasing(selectedKf.layerId, selectedKf.trackId, selectedKf.kfId, ease)}
            onInterpolationChange={i => setKfInterpolation(selectedKf.layerId, selectedKf.trackId, selectedKf.kfId, i)}
            onDelete={() => deleteKf(selectedKf.layerId, selectedKf.trackId, selectedKf.kfId)}
            onClose={() => setSelectedKf(null)}
          />
        ) : null;
      })()}

      {selectedKf && selectedKf.kind === "cssVar" && (() => {
        const kf = layers.flatMap(l => l.cssVarTracks).flatMap(t => t.keyframes).find(k => k.id === selectedKf.kfId);
        return kf ? (
          <KeyframePopover
            anchor={{ x: selectedKf.anchorX, y: selectedKf.anchorY }}
            time={kf.time}
            onTimeChange={t => updateCssVarKfTime(selectedKf.layerId, selectedKf.trackId, selectedKf.kfId, t)}
            value={kf.value}
            valuePlaceholder="12px, 50%, or #2563ff"
            currentEasing={kf.easingOut}
            interpolation={kf.interpolation}
            onValueChange={v => updateCssVarKfValue(selectedKf.layerId, selectedKf.trackId, selectedKf.kfId, v)}
            onEasingChange={e => setCssVarKfEasing(selectedKf.layerId, selectedKf.trackId, selectedKf.kfId, e)}
            onInterpolationChange={i => setCssVarKfInterpolation(selectedKf.layerId, selectedKf.trackId, selectedKf.kfId, i)}
            onDelete={() => deleteCssVarKf(selectedKf.layerId, selectedKf.trackId, selectedKf.kfId)}
            onClose={() => setSelectedKf(null)}
          />
        ) : null;
      })()}

      {selectedKf && selectedKf.kind === "clipPath" && (() => {
        const kf = layers.flatMap(l => l.clipPathTracks).flatMap(t => t.keyframes).find(k => k.id === selectedKf.kfId);
        return kf ? (
          <KeyframePopover
            anchor={{ x: selectedKf.anchorX, y: selectedKf.anchorY }}
            time={kf.time}
            onTimeChange={t => updateClipPathKfTime(selectedKf.layerId, selectedKf.trackId, selectedKf.kfId, t)}
            value={kf.value}
            valuePlaceholder='e.g. circle(50% at 50% 50%)'
            currentEasing={kf.easingOut}
            interpolation={kf.interpolation}
            onValueChange={v => updateClipPathKfValue(selectedKf.layerId, selectedKf.trackId, selectedKf.kfId, v)}
            onEasingChange={e => setClipPathKfEasing(selectedKf.layerId, selectedKf.trackId, selectedKf.kfId, e)}
            onInterpolationChange={i => setClipPathKfInterpolation(selectedKf.layerId, selectedKf.trackId, selectedKf.kfId, i)}
            onDelete={() => deleteClipPathKf(selectedKf.layerId, selectedKf.trackId, selectedKf.kfId)}
            onClose={() => setSelectedKf(null)}
          />
        ) : null;
      })()}

      {kfContextMenu && (
        <KeyframeContextMenu
          x={kfContextMenu.x}
          y={kfContextMenu.y}
          onDuplicate={() => {
            if (kfContextMenu.kind === "spatial") duplicateKf(kfContextMenu.layerId, kfContextMenu.trackId, kfContextMenu.kfId);
            else if (kfContextMenu.kind === "cssVar") duplicateCssVarKf(kfContextMenu.layerId, kfContextMenu.trackId, kfContextMenu.kfId);
            else duplicateClipPathKf(kfContextMenu.layerId, kfContextMenu.trackId, kfContextMenu.kfId);
          }}
          onResetValue={kfContextMenu.kind === "spatial" ? () => {
            const track = layers.flatMap(l => l.tracks).find(t => t.id === kfContextMenu.trackId);
            if (track) resetKfValue(kfContextMenu.layerId, kfContextMenu.trackId, kfContextMenu.kfId, track.property);
          } : undefined}
          onDelete={() => {
            if (kfContextMenu.kind === "spatial") deleteKf(kfContextMenu.layerId, kfContextMenu.trackId, kfContextMenu.kfId);
            else if (kfContextMenu.kind === "cssVar") deleteCssVarKf(kfContextMenu.layerId, kfContextMenu.trackId, kfContextMenu.kfId);
            else deleteClipPathKf(kfContextMenu.layerId, kfContextMenu.trackId, kfContextMenu.kfId);
          }}
          onClose={() => setKfContextMenu(null)}
        />
      )}

      {exportOpen && (
        <ExportModal script={generateGSAPScript(layers, TOTAL_DURATION)} onClose={() => setExportOpen(false)} />
      )}
    </div>
  );
}
