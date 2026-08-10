// ─────────────────────────────────────────────────────────────────────────────
// timelineTypes.ts
// Shared TypeScript interfaces & constants for the Animation Timeline Editor.
// ─────────────────────────────────────────────────────────────────────────────

// ── Property sub-track keys ───────────────────────────────────────────────────

export type PropertyKey = "opacity" | "x" | "y" | "scale" | "rotate";

export const ALL_PROPERTIES: PropertyKey[] = ["opacity", "x", "y", "scale", "rotate"];

export const PROPERTY_LABELS: Record<PropertyKey, string> = {
  opacity: "Opacity",
  x: "X",
  y: "Y",
  scale: "Scale",
  rotate: "Rotate",
};

export const PROPERTY_UNITS: Record<PropertyKey, string> = {
  opacity: "",
  x: "px",
  y: "px",
  scale: "×",
  rotate: "°",
};

export const PROPERTY_DEFAULTS: Record<PropertyKey, number> = {
  opacity: 1,
  x: 0,
  y: 0,
  scale: 1,
  rotate: 0,
};

// ── GSAP Easing ───────────────────────────────────────────────────────────────

export type GsapEasing =
  | "none"
  | "power1.out"
  | "power2.inOut"
  | "power3.out"
  | "back.out(1.7)"
  | "bounce.out"
  | "elastic.out(1,0.3)";

export const GSAP_EASINGS: GsapEasing[] = [
  "none",
  "power1.out",
  "power2.inOut",
  "power3.out",
  "back.out(1.7)",
  "bounce.out",
  "elastic.out(1,0.3)",
];

/**
 * SVG path data (24×24 viewBox).
 * Coordinate convention: (2,22) = bottom-left = t=0 progress=0
 *                         (22,2) = top-right  = t=1 progress=1
 * Time flows left→right; progress flows bottom→top.
 */
export const EASING_CURVES: Record<GsapEasing, string> = {
  "none":               "M 2 22 L 22 2",
  "power1.out":         "M 2 22 Q 4 4 22 2",
  "power2.inOut":       "M 2 22 C 10 22 14 2 22 2",
  "power3.out":         "M 2 22 Q 2 6 22 2",
  "back.out(1.7)":      "M 2 22 C 20 22 26 -3 22 2",
  "bounce.out":         "M 2 22 L 7 4 C 8 18 10 4 12 10 C 14 16 16 4 18 8 L 22 2",
  "elastic.out(1,0.3)": "M 2 22 C 4 22 5 -3 8 4 C 11 11 15 20 18 -2 L 22 2",
};

// ── Core data interfaces ──────────────────────────────────────────────────────

export interface PropertyKeyframe {
  id: string;
  time: number;        // seconds into the timeline
  value: number;       // per PROPERTY_DEFAULTS for unit context
  easing: GsapEasing;  // easing from this kf → the next one
}

export interface PropertyTrack {
  id: string;
  property: PropertyKey;
  keyframes: PropertyKeyframe[];
}

export interface LayerClip {
  id: string;
  start: number;  // seconds
  end: number;    // seconds
  label?: string;
}

// ── CSS Variable & Clip-Path sub-tracks ──────────────────────────────────────
// Mirrors apps/admin's timelineTypes.ts — see that file's comment. Needed
// here too since PreviewBridge forwards scrub messages straight into this
// module's `applyTracksToDOM`.

export interface CssVarKeyframe {
  id: string;
  time: number;
  value: string;
  easing: GsapEasing;
}

export interface CssVarTrack {
  id: string;
  varName: string;
  keyframes: CssVarKeyframe[];
}

export type ClipShape = "circle" | "inset" | "polygon";

export interface ClipPathKeyframe {
  id: string;
  time: number;
  value: string;
  easing: GsapEasing;
}

export interface ClipPathTrack {
  id: string;
  shape: ClipShape;
  keyframes: ClipPathKeyframe[];
}

export interface LayerTrack {
  id: string;
  name: string;
  color: string;
  emoji: string;
  visible: boolean;
  locked: boolean;
  expanded: boolean;      // whether sub-tracks are shown
  clips: LayerClip[];     // duration bars on the main row
  tracks: PropertyTrack[]; // per-property animation sub-tracks
  cssVarTracks: CssVarTrack[];
  clipPathTracks: ClipPathTrack[];
  scrollTrigger?: boolean;
}
