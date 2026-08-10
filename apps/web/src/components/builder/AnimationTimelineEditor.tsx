"use client";

/**
 * AnimationTimelineEditor — v2
 * ─────────────────────────────────────────────────────────────────────────────
 * Upgrades over v1:
 *  • LayerTrack type  — clips[] (duration bars) + tracks[] (property sub-tracks)
 *  • Expandable layers reveal 5 CSS property sub-tracks: opacity, x, y, scale, rotate
 *  • ◆ Diamond keyframes — double-click sub-track to insert; drag to move
 *  • GSAP Easing Picker — click a diamond to open a 7-option popover w/ SVG curves
 *  • Export Modal — generates copy-able standalone GSAP JS via generateGSAPScript()
 *  • onTimeUpdate prop — fires on every scrub/tick with (time, LayerTrack[])
 *  • initialLayers prop — override default layers (used by timeline-demo page)
 *  • Canvas binding — applyTracksToDOM targets [data-block-id] elements live
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import gsap from "gsap";

import {
  ALL_PROPERTIES,
  EASING_CURVES,
  GSAP_EASINGS,
  PROPERTY_LABELS,
  PROPERTY_UNITS,
  type GsapEasing,
  type LayerClip,
  type LayerTrack,
  type PropertyKeyframe,
  type PropertyTrack,
} from "./timelineTypes";
import { applyTracksToDOM, generateGSAPScript, trackValueAtTime } from "./timelineUtils";

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_DURATION = 5;
const RULER_BASE_PX  = 800;
const CLIP_ROW_H     = 44;
const TRACK_ROW_H    = 28;
const RULER_H        = 36;
const SIDEBAR_W      = 224;

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Default layers ───────────────────────────────────────────────────────────

const DEFAULT_LAYERS: LayerTrack[] = [
  {
    id: "block-plant",
    name: "Plant",
    color: "#4ade80",
    emoji: "🌿",
    visible: true,
    locked: false,
    expanded: false,
    cssVarTracks: [],
    clipPathTracks: [],
    clips: [
      { id: uid(), start: 0, end: 2.5, label: "Grow" },
      { id: uid(), start: 3, end: 4.5, label: "Sway" },
    ],
    tracks: ALL_PROPERTIES.map((property) => ({
      id: uid(),
      property,
      keyframes:
        property === "opacity"
          ? [
              { id: uid(), time: 0, value: 0, easing: "power2.inOut" as GsapEasing },
              { id: uid(), time: 1.2, value: 1, easing: "none" as GsapEasing },
            ]
          : property === "y"
          ? [
              { id: uid(), time: 0, value: 30, easing: "power3.out" as GsapEasing },
              { id: uid(), time: 1.5, value: 0, easing: "none" as GsapEasing },
            ]
          : [],
    })),
  },
  {
    id: "block-jenny",
    name: "Jenny",
    color: "#2563ff",
    emoji: "👤",
    visible: true,
    locked: false,
    expanded: false,
    cssVarTracks: [],
    clipPathTracks: [],
    clips: [{ id: uid(), start: 0.5, end: 3, label: "Walk" }],
    tracks: ALL_PROPERTIES.map((property) => ({
      id: uid(),
      property,
      keyframes:
        property === "x"
          ? [
              { id: uid(), time: 0.5, value: -30, easing: "power2.out" as GsapEasing },
              { id: uid(), time: 2, value: 0, easing: "none" as GsapEasing },
            ]
          : property === "opacity"
          ? [
              { id: uid(), time: 0.5, value: 0, easing: "power1.out" as GsapEasing },
              { id: uid(), time: 1.2, value: 1, easing: "none" as GsapEasing },
            ]
          : [],
    })),
  },
  {
    id: "block-milk",
    name: "Milk",
    color: "#60a5fa",
    emoji: "🥛",
    visible: true,
    locked: false,
    expanded: false,
    cssVarTracks: [],
    clipPathTracks: [],
    clips: [
      { id: uid(), start: 1, end: 4, label: "Pour" },
      { id: uid(), start: 4.2, end: 4.8, label: "Splash" },
    ],
    tracks: makeDefaultTracks(),
  },
  {
    id: "block-sun",
    name: "Sun Ray",
    color: "#fbbf24",
    emoji: "☀️",
    visible: true,
    locked: false,
    expanded: false,
    cssVarTracks: [],
    clipPathTracks: [],
    clips: [{ id: uid(), start: 0, end: 5, label: "Shine" }],
    tracks: ALL_PROPERTIES.map((property) => ({
      id: uid(),
      property,
      keyframes:
        property === "opacity"
          ? [
              { id: uid(), time: 0, value: 0, easing: "power1.out" as GsapEasing },
              { id: uid(), time: 2, value: 0.8, easing: "none" as GsapEasing },
            ]
          : [],
    })),
  },
];

const LAYER_PALETTE = ["#f87171","#fb923c","#fbbf24","#a3e635","#34d399","#22d3ee","#818cf8","#e879f9","#f472b6"];
const LAYER_EMOJIS  = ["✨","🎬","🎭","🌊","🔥","⚡","🎵","🎨","🚀"];

type PlayState = "stopped" | "playing" | "paused";

interface SelectedKf {
  layerId: string;
  trackId: string;
  kfId: string;
  anchorX: number; // viewport px
  anchorY: number;
}

// ─── Tiny icon atoms ──────────────────────────────────────────────────────────

const Ic = {
  Play: ({ s=14 }:{s?:number}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14.72A1 1 0 0 0 9.5 21l11-7a1 1 0 0 0 0-1.72l-11-7A1 1 0 0 0 8 5.14Z"/></svg>,
  Pause: ({ s=14 }:{s?:number}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>,
  Stop: ({ s=13 }:{s?:number}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>,
  SkipBack: ({ s=13 }:{s?:number}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M19 20L9 12l10-8v16Z"/><rect x="5" y="4" width="2" height="16" rx="1"/></svg>,
  SkipFwd: ({ s=13 }:{s?:number}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M5 4l10 8-10 8V4Z"/><rect x="17" y="4" width="2" height="16" rx="1"/></svg>,
  Eye: ({ open, s=13 }:{open:boolean;s?:number}) => open
    ? <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
    : <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/></svg>,
  Lock: ({ locked, s=13 }:{locked:boolean;s?:number}) => locked
    ? <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    : <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>,
  Trash: ({ s=11 }:{s?:number}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>,
  Add: ({ s=11 }:{s?:number}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Expand: ({ open, s=10 }:{open:boolean;s?:number}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}><polyline points="9 18 15 12 9 6"/></svg>,
  Export: ({ s=13 }:{s?:number}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/><path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4"/></svg>,
  Copy: ({ s=13 }:{s?:number}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  X: ({ s=13 }:{s?:number}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
};

// ─── EasingCurve ──────────────────────────────────────────────────────────────

function EasingCurve({ easing, size = 28, color = "#2563ff" }: { easing: GsapEasing; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={EASING_CURVES[easing]} stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// ─── EasingPickerPopover ──────────────────────────────────────────────────────

function EasingPickerPopover({
  anchor, currentEasing, onSelect, onClose,
}: {
  anchor: { x: number; y: number };
  currentEasing: GsapEasing;
  onSelect: (e: GsapEasing) => void;
  onClose: () => void;
}) {
  const safeX = Math.min(anchor.x, window.innerWidth - 260);
  const safeY = anchor.y > window.innerHeight - 220 ? anchor.y - 220 : anchor.y + 20;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 rounded-xl overflow-hidden"
        style={{
          left: safeX,
          top: safeY,
          width: 248,
          background: "linear-gradient(145deg, #1a1b20, #141518)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
        }}
      >
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)" }}>
            Easing
          </span>
          <button onClick={onClose} style={{ color: "rgba(255,255,255,0.3)", cursor: "pointer" }}>
            <Ic.X s={10} />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-1 p-2">
          {GSAP_EASINGS.map((ease) => {
            const active = ease === currentEasing;
            return (
              <button
                key={ease}
                onClick={() => { onSelect(ease); onClose(); }}
                title={ease}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  padding: "6px 4px",
                  borderRadius: 8,
                  cursor: "pointer",
                  background: active ? "rgba(37,99,255,0.18)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${active ? "rgba(37,99,255,0.4)" : "transparent"}`,
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
              >
                <EasingCurve easing={ease} size={24} color={active ? "#2563ff" : "rgba(255,255,255,0.4)"} />
                <span style={{
                  fontSize: 8,
                  color: active ? "#2563ff" : "rgba(255,255,255,0.3)",
                  fontWeight: 600,
                  textAlign: "center",
                  lineHeight: 1.2,
                  wordBreak: "break-all",
                }}>
                  {ease.replace("elastic.out(1,0.3)", "elastic").replace("back.out(1.7)", "back")}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── DiamondMarker ────────────────────────────────────────────────────────────

function DiamondMarker({
  kf, rulerPx, color, selected, locked,
  onDragEnd, onSelect,
}: {
  kf: PropertyKeyframe;
  rulerPx: number;
  color: string;
  selected: boolean;
  locked: boolean;
  onDragEnd: (kfId: string, newTime: number) => void;
  onSelect: (kfId: string, anchorX: number, anchorY: number) => void;
}) {
  const SIZE = 10;
  const drag = useRef<{ startX: number; origTime: number } | null>(null);

  const left = (kf.time / TOTAL_DURATION) * rulerPx;

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    if (locked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, origTime: kf.time };
  }
  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.startX;
    const dt = (dx / rulerPx) * TOTAL_DURATION;
    onDragEnd(kf.id, clamp(drag.current.origTime + dt, 0, TOTAL_DURATION));
  }
  function onPointerUp() { drag.current = null; }

  function onClick(e: ReactMouseEvent<HTMLDivElement>) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    onSelect(kf.id, rect.left + rect.width / 2, rect.top);
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
        touchAction: "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={onClick}
      onDoubleClick={e => e.stopPropagation()}
    >
      <div
        style={{
          width: SIZE,
          height: SIZE,
          background: selected ? "#e8a63a" : color,
          transform: "rotate(45deg)",
          border: `1.5px solid ${selected ? "#fff" : "rgba(255,255,255,0.5)"}`,
          boxShadow: selected ? `0 0 10px ${color}` : `0 0 4px ${color}66`,
          transition: "background 0.15s, box-shadow 0.15s",
          flexShrink: 0,
        }}
      />
    </div>
  );
}

// ─── ClipBar ──────────────────────────────────────────────────────────────────

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
  function endDrag() { drag.current = null; }

  return (
    <div
      className="absolute group"
      style={{ top: "50%", left, width, height: CLIP_ROW_H * 0.58, transform: "translateY(-50%)", cursor: locked ? "not-allowed" : "grab", zIndex: 2 }}
      onPointerDown={e => startDrag(e, "move")}
      onPointerMove={onMove}
      onPointerUp={endDrag}
    >
      <div className="absolute left-0 top-0 h-full w-2 cursor-ew-resize z-10 opacity-0 group-hover:opacity-100 rounded-l-md" style={{ background: `${color}99` }} onPointerDown={e => startDrag(e, "l")} />
      <div className="h-full w-full rounded-md overflow-hidden relative" style={{ background: `linear-gradient(90deg,${color}cc,${color}77)`, border: `1px solid ${color}bb`, boxShadow: `0 2px 10px ${color}33` }}>
        <div className="absolute inset-0 pointer-events-none opacity-30" style={{ backgroundImage: "repeating-linear-gradient(90deg,transparent,transparent 7px,rgba(0,0,0,0.3) 7px,rgba(0,0,0,0.3) 8px)" }} />
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${color},transparent)` }} />
        {clip.label && <span className="absolute inset-0 flex items-center px-2 truncate pointer-events-none" style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.88)" }}>{clip.label}</span>}
      </div>
      <div className="absolute right-0 top-0 h-full w-2 cursor-ew-resize z-10 opacity-0 group-hover:opacity-100 rounded-r-md" style={{ background: `${color}99` }} onPointerDown={e => startDrag(e, "r")} />
    </div>
  );
}

// ─── TimeRuler ────────────────────────────────────────────────────────────────

function TimeRuler({ zoom, rulerPx }: { zoom: number; rulerPx: number }) {
  const step = zoom >= 4 ? 0.25 : zoom >= 2 ? 0.5 : 1;
  const ticks: number[] = [];
  for (let t = 0; t <= TOTAL_DURATION + 0.001; t = Math.round((t + step) * 1000) / 1000) ticks.push(t);
  return (
    <div data-ruler="true" style={{ width: rulerPx, height: RULER_H, flexShrink: 0, position: "relative", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(to bottom,rgba(255,255,255,0.025),transparent)", cursor: "crosshair", userSelect: "none" }}>
      {ticks.map(t => {
        const x = (t / TOTAL_DURATION) * rulerPx;
        const whole = Math.abs(t - Math.round(t)) < 0.001;
        const half  = !whole && Math.abs(t * 2 - Math.round(t * 2)) < 0.001;
        return (
          <div key={t} style={{ position: "absolute", left: x, top: 0, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", pointerEvents: "none" }}>
            <div style={{ width: 1, height: whole ? 16 : half ? 10 : 6, marginTop: whole ? 0 : half ? 6 : 10, background: whole ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.1)" }} />
            {whole && <span style={{ fontSize: 9, fontFamily: "ui-monospace,monospace", color: "rgba(255,255,255,0.32)", marginTop: 2 }}>{t}s</span>}
          </div>
        );
      })}
    </div>
  );
}

// ─── ExportModal ──────────────────────────────────────────────────────────────

function ExportModal({ script, onClose }: { script: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(script).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)" }}>
      <div className="relative flex flex-col rounded-2xl overflow-hidden" style={{ width: "min(680px,95vw)", maxHeight: "80vh", background: "#111115", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 40px 100px rgba(0,0,0,0.8)" }}>
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2.5">
            <Ic.Export s={14} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.88)" }}>Export GSAP Script</span>
          </div>
          <div className="flex items-center gap-2">
            <button id="export-copy-btn" onClick={copy} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all" style={{ background: copied ? "rgba(74,222,128,0.18)" : "rgba(37,99,255,0.14)", color: copied ? "#4ade80" : "#2563ff", border: `1px solid ${copied ? "rgba(74,222,128,0.3)" : "rgba(37,99,255,0.28)"}` }}>
              <Ic.Copy s={11} />{copied ? "Copied!" : "Copy"}
            </button>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
              <Ic.X s={12} />
            </button>
          </div>
        </div>
        <div className="overflow-auto flex-1 p-4">
          <pre style={{ fontFamily: "ui-monospace,SFMono-Regular,monospace", fontSize: 12, lineHeight: 1.65, color: "rgba(255,255,255,0.75)", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>{script}</pre>
        </div>
        <div className="px-5 py-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.2)" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)" }}>Paste after loading GSAP from CDN. Targets <code style={{ color: "#2563ff" }}>[data-block-id]</code> attributes.</span>
        </div>
      </div>
    </div>
  );
}

// ─── AnimationTimelineEditor (main export) ────────────────────────────────────

interface TimelineEditorProps {
  /** Override the default layers (e.g. from timeline-demo page) */
  initialLayers?: LayerTrack[];
  /** Fires on every scrub/tick with current time + full track snapshot */
  onTimeUpdate?: (currentTime: number, tracks: LayerTrack[]) => void;
  className?: string;
  style?: CSSProperties;
}

export function AnimationTimelineEditor({ initialLayers, onTimeUpdate, className, style }: TimelineEditorProps = {}) {
  const [layers, setLayers]           = useState<LayerTrack[]>(initialLayers ?? DEFAULT_LAYERS);
  const [playState, setPlayState]     = useState<PlayState>("stopped");
  const [currentTime, setCurrentTime] = useState(0);
  const [zoom, setZoom]               = useState<1|2|4>(1);
  const [selectedLayerId, setSelLayer]= useState<string|null>(null);
  const [selectedKf, setSelectedKf]   = useState<SelectedKf|null>(null);
  const [exportOpen, setExportOpen]   = useState(false);

  const rulerPx      = RULER_BASE_PX * zoom;
  const layersRef    = useRef(layers);
  const timeRef      = useRef(0);
  const playStateRef = useRef<PlayState>("stopped");
  const tickerRef    = useRef<gsap.TickerCallback|null>(null);
  const playOrigin   = useRef<{ wall: number; sim: number }>({ wall: 0, sim: 0 });
  const phDragging   = useRef(false);
  const timelineEl   = useRef<HTMLDivElement>(null);

  // Keep refs in sync
  useEffect(() => { layersRef.current = layers; }, [layers]);
  useEffect(() => { timeRef.current   = currentTime; }, [currentTime]);
  useEffect(() => { playStateRef.current = playState; }, [playState]);

  // Apply canvas binding + notify parent on every currentTime change
  useEffect(() => {
    applyTracksToDOM(layersRef.current, currentTime);
    onTimeUpdate?.(currentTime, layersRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime]);

  // ── Transport ──────────────────────────────────────────────────────────────

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
  const handleSkipEnd = useCallback(() => { killTicker(); setPlayState("stopped"); setCurrentTime(TOTAL_DURATION); }, [killTicker]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.code === "Space" && e.target === document.body) { e.preventDefault(); handleToggle(); }};
    window.addEventListener("keydown", h);
    return () => { window.removeEventListener("keydown", h); };
  }, [handleToggle]);

  // Clean ticker on component unmount only
  useEffect(() => {
    return () => {
      if (tickerRef.current) {
        gsap.ticker.remove(tickerRef.current);
        tickerRef.current = null;
      }
    };
  }, []);

  // ── Playhead drag ──────────────────────────────────────────────────────────

  function timeFromX(clientX: number): number {
    const el = timelineEl.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return clamp(((clientX - rect.left) / rulerPx) * TOTAL_DURATION, 0, TOTAL_DURATION);
  }

  function onPhDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    if (playState === "playing") handlePause();
    phDragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPanelDown(e: ReactPointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).dataset.ruler === "true") {
      if (playState === "playing") handlePause();
      setCurrentTime(timeFromX(e.clientX));
    }
  }
  function onPanelMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (phDragging.current) setCurrentTime(timeFromX(e.clientX));
  }
  function onPanelUp() { phDragging.current = false; }

  // ── Layer mutations ────────────────────────────────────────────────────────

  function updateClip(layerId: string, clipId: string, start: number, end: number) {
    setLayers(p => p.map(l => l.id !== layerId ? l : { ...l, clips: l.clips.map(c => c.id !== clipId ? c : { ...c, start, end }) }));
  }
  function updateKfTime(layerId: string, trackId: string, kfId: string, time: number) {
    setLayers(p => p.map(l => l.id !== layerId ? l : {
      ...l, tracks: l.tracks.map(t => t.id !== trackId ? t : { ...t, keyframes: t.keyframes.map(k => k.id !== kfId ? k : { ...k, time }) }),
    }));
  }
  function setKfEasing(layerId: string, trackId: string, kfId: string, easing: GsapEasing) {
    setLayers(p => p.map(l => l.id !== layerId ? l : {
      ...l, tracks: l.tracks.map(t => t.id !== trackId ? t : { ...t, keyframes: t.keyframes.map(k => k.id !== kfId ? k : { ...k, easing }) }),
    }));
  }

  function insertKf(layerId: string, trackId: string, clientX: number) {
    const time = timeFromX(clientX);
    setLayers(p => p.map(l => {
      if (l.id !== layerId) return l;
      return {
        ...l,
        tracks: l.tracks.map(t => {
          if (t.id !== trackId) return t;
          if (t.keyframes.some(k => Math.abs(k.time - time) < 0.05)) return t; // too close to existing
          const value = trackValueAtTime(t, time);
          const newKf: PropertyKeyframe = { id: uid(), time, value, easing: "power2.inOut" };
          return { ...t, keyframes: [...t.keyframes, newKf] };
        }),
      };
    }));
  }

  function toggleExpand(id: string) { setLayers(p => p.map(l => l.id === id ? { ...l, expanded: !l.expanded } : l)); }
  function toggleVis(id: string)    { setLayers(p => p.map(l => l.id === id ? { ...l, visible: !l.visible } : l)); }
  function toggleLock(id: string)   { setLayers(p => p.map(l => l.id === id ? { ...l, locked: !l.locked } : l)); }
  function deleteLayer(id: string)  { setLayers(p => p.filter(l => l.id !== id)); if (selectedLayerId === id) setSelLayer(null); }

  function addLayer() {
    const i = layers.length % LAYER_PALETTE.length;
    setLayers(p => [...p, {
      id: uid(), name: `Layer ${p.length + 1}`, color: LAYER_PALETTE[i], emoji: LAYER_EMOJIS[i],
      visible: true, locked: false, expanded: false, cssVarTracks: [], clipPathTracks: [],
      clips: [{ id: uid(), start: 0, end: 2 }], tracks: makeDefaultTracks(),
    }]);
  }

  const phX = (currentTime / TOTAL_DURATION) * rulerPx;

  const stateMeta = {
    stopped: { dot: "rgba(255,255,255,0.2)", label: "#666",    bg: "rgba(255,255,255,0.05)", bd: "rgba(255,255,255,0.08)" },
    paused:  { dot: "#fbbf24",              label: "#fbbf24", bg: "rgba(251,191,36,0.1)",   bd: "rgba(251,191,36,0.2)"  },
    playing: { dot: "#4ade80",              label: "#4ade80", bg: "rgba(74,222,128,0.1)",    bd: "rgba(74,222,128,0.25)" },
  }[playState];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className={className}
      style={{ display: "flex", flexDirection: "column", borderRadius: 16, overflow: "hidden", background: "linear-gradient(145deg,#111115,#0d0e12)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 32px 80px rgba(0,0,0,0.7),inset 0 1px 0 rgba(255,255,255,0.07)", fontFamily: "'Outfit',system-ui,sans-serif", minWidth: 860, userSelect: "none", ...style }}
    >
      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: "linear-gradient(135deg,#2563ff,#1d4fd8)", boxShadow: "0 2px 8px rgba(37,99,255,0.3)" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.88)" }}>Timeline Editor</span>
          <span className="rounded-full px-2 py-0.5" style={{ background: "rgba(255,255,255,0.06)", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", fontFamily: "ui-monospace,monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>{formatTime(currentTime)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* handleStop/killTicker only read their refs inside their own
              callback bodies (invoked on click), never during this render —
              the rule can't see through the useCallback indirection to
              confirm that statically. */}
          {/* eslint-disable-next-line react-hooks/refs */}
          {[
            { id: "tl-skip-start", icon: <Ic.SkipBack/>, action: handleStop,      title: "Skip to start" },
            { id: "tl-stop",       icon: <Ic.Stop/>,     action: handleStop,      title: "Stop" },
          ].map(btn => (
            <button key={btn.id} id={btn.id} onClick={btn.action} title={btn.title} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 8, cursor: "pointer", color: "rgba(255,255,255,0.4)", background: "transparent" }} onMouseEnter={e=>(e.currentTarget.style.color="rgba(255,255,255,0.82)")} onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,0.4)")}>{btn.icon}</button>
          ))}
          <button id="tl-play-pause" onClick={handleToggle} title={`${playState === "playing" ? "Pause" : "Play"} (Space)`} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, cursor: "pointer", background: "rgba(37,99,255,0.12)", border: "1px solid rgba(37,99,255,0.28)", color: "#2563ff", boxShadow: playState === "playing" ? "0 0 14px rgba(37,99,255,0.22)" : "none" }}>
            {playState === "playing" ? <Ic.Pause/> : <Ic.Play/>}
          </button>
          <button id="tl-skip-end" onClick={handleSkipEnd} title="Skip to end" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 8, cursor: "pointer", color: "rgba(255,255,255,0.4)", background: "transparent" }} onMouseEnter={e=>(e.currentTarget.style.color="rgba(255,255,255,0.82)")} onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,0.4)")}><Ic.SkipFwd/></button>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)", margin: "0 2px" }}/>
          {([1,2,4] as const).map(z => (
            <button key={z} id={`tl-zoom-${z}x`} onClick={() => setZoom(z)} style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", background: zoom === z ? "rgba(37,99,255,0.18)" : "transparent", color: zoom === z ? "#2563ff" : "rgba(255,255,255,0.3)", border: `1px solid ${zoom === z ? "rgba(37,99,255,0.3)" : "transparent"}`, transition: "all 0.15s" }}>{z}×</button>
          ))}
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)", margin: "0 2px" }}/>
          <button id="tl-export" onClick={() => setExportOpen(true)} title="Export GSAP script" className="flex items-center gap-1.5 rounded-lg px-2.5 py-1" style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer" }} onMouseEnter={e=>(e.currentTarget.style.color="#2563ff")} onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,0.4)")}><Ic.Export s={12}/> Export</button>
        </div>
      </div>

      {/* ── Main area ────────────────────────────────────────────────── */}
      <div className="flex" style={{ minHeight: 280 }}>

        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <div style={{ width: SIDEBAR_W, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column" }}>
          <div className="flex items-center justify-between px-3" style={{ height: RULER_H, borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.015)", flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.22)" }}>Layers</span>
            <button id="tl-add-layer" onClick={addLayer} title="Add layer" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 4, cursor: "pointer", color: "rgba(255,255,255,0.3)", background: "transparent" }} onMouseEnter={e=>(e.currentTarget.style.color="#2563ff")} onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,0.3)")}><Ic.Add s={11}/></button>
          </div>

          <div style={{ overflowY: "auto", flex: 1 }}>
            {layers.map(layer => {
              const sel = layer.id === selectedLayerId;
              return (
                <div key={layer.id}>
                  {/* Layer row */}
                  <div
                    onClick={() => setSelLayer(layer.id)}
                    className="group flex items-center gap-1.5 px-2 cursor-pointer"
                    style={{ height: CLIP_ROW_H, flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.04)", borderLeft: `2px solid ${sel ? "#2563ff" : "transparent"}`, background: sel ? "rgba(37,99,255,0.06)" : "transparent" }}
                    onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
                    onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <button onClick={e => { e.stopPropagation(); toggleExpand(layer.id); }} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, flexShrink: 0, color: "rgba(255,255,255,0.3)", cursor: "pointer", background: "transparent" }}>
                      <Ic.Expand open={layer.expanded} s={9}/>
                    </button>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: layer.color, boxShadow: `0 0 5px ${layer.color}88` }}/>
                    <span style={{ fontSize: 13, flexShrink: 0 }}>{layer.emoji}</span>
                    <span className="flex-1 truncate" style={{ fontSize: 13, fontWeight: 500, color: layer.visible ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.22)" }}>{layer.name}</span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button id={`tl-vis-${layer.id}`}  onClick={e=>{e.stopPropagation();toggleVis(layer.id)}}  style={{ padding: 2, borderRadius: 3, cursor: "pointer", color: layer.visible ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.18)", background: "transparent" }} onMouseEnter={e=>(e.currentTarget.style.color="white")} onMouseLeave={e=>(e.currentTarget.style.color=layer.visible?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.18)")}><Ic.Eye open={layer.visible}/></button>
                      <button id={`tl-lock-${layer.id}`} onClick={e=>{e.stopPropagation();toggleLock(layer.id)}} style={{ padding: 2, borderRadius: 3, cursor: "pointer", color: layer.locked ? "#2563ff" : "rgba(255,255,255,0.28)", background: "transparent" }}><Ic.Lock locked={layer.locked}/></button>
                      <button id={`tl-del-${layer.id}`}  onClick={e=>{e.stopPropagation();deleteLayer(layer.id)}} style={{ padding: 2, borderRadius: 3, cursor: "pointer", color: "rgba(255,255,255,0.18)", background: "transparent" }} onMouseEnter={e=>(e.currentTarget.style.color="#f87171")} onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,0.18)")}><Ic.Trash/></button>
                    </div>
                  </div>
                  {/* Sub-track sidebar rows */}
                  {layer.expanded && ALL_PROPERTIES.map(prop => (
                    <div key={prop} style={{ height: TRACK_ROW_H, flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.03)", display: "flex", alignItems: "center", paddingLeft: 32, paddingRight: 8, background: "rgba(0,0,0,0.12)", gap: 6 }}>
                      <div style={{ width: 4, height: 4, borderRadius: "50%", flexShrink: 0, background: layer.color, opacity: 0.6 }}/>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>{PROPERTY_LABELS[prop]}</span>
                      {PROPERTY_UNITS[prop] && <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginLeft: 1 }}>{PROPERTY_UNITS[prop]}</span>}
                    </div>
                  ))}
                </div>
              );
            })}
            <button onClick={addLayer} style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 12, height: 32, width: "100%", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.2)", background: "transparent", borderBottom: "1px solid rgba(255,255,255,0.04)" }} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color="#2563ff";(e.currentTarget as HTMLElement).style.background="rgba(37,99,255,0.03)";}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color="rgba(255,255,255,0.2)";(e.currentTarget as HTMLElement).style.background="transparent";}}>
              <Ic.Add/> Add Layer
            </button>
          </div>
        </div>

        {/* ── Timeline panel ───────────────────────────────────────── */}
        <div id="tl-scroll-area" style={{ flex: 1, overflowX: "auto", overflowY: "hidden", display: "flex", flexDirection: "column" }}>
          <div
            ref={timelineEl}
            style={{ width: rulerPx, flexShrink: 0, position: "relative" }}
            onPointerDown={onPanelDown}
            onPointerMove={onPanelMove}
            onPointerUp={onPanelUp}
          >
            <TimeRuler zoom={zoom} rulerPx={rulerPx}/>

            {layers.map(layer => (
              <div key={layer.id}>
                {/* Clip row */}
                <div style={{ height: CLIP_ROW_H, position: "relative", borderBottom: "1px solid rgba(255,255,255,0.04)", opacity: layer.visible ? 1 : 0.28, background: layer.id === selectedLayerId ? "rgba(37,99,255,0.025)" : "transparent" }}>
                  {Array.from({ length: TOTAL_DURATION + 1 }).map((_, i) => (
                    <div key={i} style={{ position: "absolute", inset: "0 auto 0 auto", left: (i / TOTAL_DURATION) * rulerPx, width: 1, background: i === 0 || i === TOTAL_DURATION ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)" }}/>
                  ))}
                  {layer.clips.map(clip => (
                    <ClipBar key={clip.id} clip={clip} color={layer.color} rulerPx={rulerPx} locked={layer.locked} onUpdate={(id,s,e) => updateClip(layer.id, id, s, e)}/>
                  ))}
                </div>

                {/* Sub-track rows */}
                {layer.expanded && ALL_PROPERTIES.map(prop => {
                  const track = layer.tracks.find(t => t.property === prop);
                  if (!track) return null;
                  return (
                    <div
                      key={prop}
                      style={{ height: TRACK_ROW_H, position: "relative", borderBottom: "1px solid rgba(255,255,255,0.03)", background: "rgba(0,0,0,0.15)", cursor: layer.locked ? "not-allowed" : "crosshair", opacity: layer.visible ? 1 : 0.28 }}
                      onDoubleClick={e => { if (!layer.locked) insertKf(layer.id, track.id, e.clientX); }}
                    >
                      {/* Track center line */}
                      <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "rgba(255,255,255,0.06)", pointerEvents: "none" }}/>
                      {/* Second grid lines */}
                      {Array.from({ length: TOTAL_DURATION + 1 }).map((_, i) => (
                        <div key={i} style={{ position: "absolute", insetBlock: 0, left: (i / TOTAL_DURATION) * rulerPx, width: 1, background: "rgba(255,255,255,0.03)", pointerEvents: "none" }}/>
                      ))}
                      {/* Diamond markers */}
                      {track.keyframes.map(kf => {
                        const isSelected = selectedKf?.kfId === kf.id && selectedKf?.trackId === track.id;
                        return (
                          <DiamondMarker
                            key={kf.id}
                            kf={kf}
                            rulerPx={rulerPx}
                            color={layer.color}
                            selected={isSelected}
                            locked={layer.locked}
                            onDragEnd={(kfId, newTime) => updateKfTime(layer.id, track.id, kfId, newTime)}
                            onSelect={(kfId, ax, ay) => setSelectedKf({ layerId: layer.id, trackId: track.id, kfId, anchorX: ax, anchorY: ay })}
                          />
                        );
                      })}
                      {/* Hint text when empty */}
                      {track.keyframes.length === 0 && !layer.locked && (
                        <span style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", fontSize: 9, color: "rgba(255,255,255,0.12)", pointerEvents: "none", whiteSpace: "nowrap" }}>dbl-click to add ◆</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Playhead needle */}
            <div style={{ position: "absolute", top: RULER_H, left: phX, bottom: 0, width: 1, transform: "translateX(-50%)", background: "linear-gradient(to bottom,#e8a63a,rgba(37,99,255,0.25))", boxShadow: "0 0 6px 1px rgba(232,166,58,0.22)", pointerEvents: "none", zIndex: 10 }}/>

            {/* Playhead drag handle */}
            <div
              id="tl-playhead"
              style={{ position: "absolute", top: 0, left: phX, width: 24, height: RULER_H, transform: "translateX(-50%)", cursor: "ew-resize", touchAction: "none", zIndex: 20, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 4 }}
              onPointerDown={onPhDown}
            >
              <div style={{ width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "9px solid #e8a63a", filter: "drop-shadow(0 2px 4px rgba(232,166,58,0.5))" }}/>
              <div style={{ width: 2, height: RULER_H - 14, background: "#e8a63a", boxShadow: "0 0 5px rgba(232,166,58,0.5)", borderRadius: "0 0 1px 1px" }}/>
            </div>
          </div>
        </div>
      </div>

      {/* ── Status bar ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.22)" }}>
        <div className="flex items-center gap-4">
          {[`${layers.length} layer${layers.length !== 1 ? "s" : ""}`, `${TOTAL_DURATION}s`, `${zoom}×`].map(t => (
            <span key={t} style={{ fontSize: 11, color: "rgba(255,255,255,0.22)" }}>{t}</span>
          ))}
          {selectedKf && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>◆ {formatTime(layers.flatMap(l=>l.tracks).flatMap(t=>t.keyframes).find(k=>k.id===selectedKf.kfId)?.time ?? 0)}</span>}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5" style={{ background: stateMeta.bg, border: `1px solid ${stateMeta.bd}` }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: stateMeta.dot, boxShadow: playState === "playing" ? `0 0 5px ${stateMeta.dot}` : "none" }}/>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: stateMeta.label }}>{playState}</span>
          </div>
          <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 13, fontWeight: 700, color: "#2563ff", letterSpacing: "0.05em" }}>{formatTime(currentTime)}</span>
          <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11, color: "rgba(255,255,255,0.18)" }}>/ {TOTAL_DURATION}.00s</span>
        </div>
      </div>

      {/* ── Easing picker popover ─────────────────────────────────────── */}
      {selectedKf && (() => {
        const kf = layers.flatMap(l => l.tracks).flatMap(t => t.keyframes).find(k => k.id === selectedKf.kfId);
        return kf ? (
          <EasingPickerPopover
            anchor={{ x: selectedKf.anchorX, y: selectedKf.anchorY }}
            currentEasing={kf.easing}
            onSelect={ease => setKfEasing(selectedKf.layerId, selectedKf.trackId, selectedKf.kfId, ease)}
            onClose={() => setSelectedKf(null)}
          />
        ) : null;
      })()}

      {/* ── Export modal ─────────────────────────────────────────────── */}
      {exportOpen && (
        <ExportModal
          script={generateGSAPScript(layers, TOTAL_DURATION)}
          onClose={() => setExportOpen(false)}
        />
      )}
    </div>
  );
}
