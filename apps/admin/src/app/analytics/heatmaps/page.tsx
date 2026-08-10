"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { api, type HeatmapPageSummary, type HeatmapClickPoint } from "@/lib/api";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

const DEVICES = [
  { value: "", label: "All Devices" },
  { value: "DESKTOP", label: "Desktop" },
  { value: "MOBILE", label: "Mobile" },
  { value: "TABLET", label: "Tablet" },
] as const;

/** Blue → green → yellow → red, the standard "cold to hot" density palette — a 256-entry lookup keyed by alpha/intensity, built once. */
function buildHeatLUT(): [number, number, number][] {
  const stops: [number, [number, number, number]][] = [
    [0.0, [0, 0, 255]],
    [0.35, [0, 255, 255]],
    [0.6, [0, 255, 0]],
    [0.8, [255, 255, 0]],
    [1.0, [255, 0, 0]],
  ];
  const lut: [number, number, number][] = [];
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let lo = stops[0];
    let hi = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) {
        lo = stops[s];
        hi = stops[s + 1];
        break;
      }
    }
    const span = hi[0] - lo[0] || 1;
    const localT = (t - lo[0]) / span;
    lut.push([lo[1][0] + (hi[1][0] - lo[1][0]) * localT, lo[1][1] + (hi[1][1] - lo[1][1]) * localT, lo[1][2] + (hi[1][2] - lo[1][2]) * localT]);
  }
  return lut;
}

const HEAT_LUT = buildHeatLUT();

function renderHeatmap(canvas: HTMLCanvasElement, clicks: HeatmapClickPoint[], width: number, height: number) {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  if (clicks.length === 0) return;

  const off = document.createElement("canvas");
  off.width = width;
  off.height = height;
  const octx = off.getContext("2d");
  if (!octx) return;

  const radius = 28;
  for (const c of clicks) {
    const x = (c.xPercent / 100) * width;
    const y = c.yPx;
    if (y < -radius || y > height + radius) continue;
    const gradient = octx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "rgba(0,0,0,0.28)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    octx.fillStyle = gradient;
    octx.beginPath();
    octx.arc(x, y, radius, 0, Math.PI * 2);
    octx.fill();
  }

  const imageData = octx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha === 0) continue;
    const [r, g, b] = HEAT_LUT[Math.min(255, alpha)];
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = Math.min(220, alpha * 2);
  }
  ctx.putImageData(imageData, 0, 0);
}

export default function HeatmapsPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <HeatmapsContent />
      </DashboardShell>
    </AuthGuard>
  );
}

function HeatmapsContent() {
  const [pages, setPages] = useState<HeatmapPageSummary[]>([]);
  const [path, setPath] = useState("");
  const [device, setDevice] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalClicks, setTotalClicks] = useState(0);
  const [maxYPx, setMaxYPx] = useState(0);
  const [clicks, setClicks] = useState<HeatmapClickPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    api
      .getHeatmapPages()
      .then((list) => {
        setPages(list);
        if (list.length > 0) setPath((p) => p || list[0].path);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load pages"));
  }, []);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await api.getHeatmap({ path, device: device || undefined, startDate: startDate || undefined, endDate: endDate || undefined });
        if (cancelled) return;
        setClicks(res.clicks);
        setTotalClicks(res.totalClicks);
        setMaxYPx(res.maxYPx);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load heatmap data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [path, device, startDate, endDate]);

  // Deep enough to cover the furthest recorded click, with headroom below —
  // see the module doc comment on why this is an approximation rather than
  // a pixel-perfect overlay (cross-origin iframe, no scrollHeight access).
  const overlayHeight = useMemo(() => Math.max(maxYPx + 400, 1200), [maxYPx]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const width = container.clientWidth;
    renderHeatmap(canvas, clicks, width, overlayHeight);
  }, [clicks, overlayHeight]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Click Heatmaps</h1>
      <p className="mt-1 text-sm text-zinc-300">
        Click density overlaid on a live preview of the page. Positions are approximate — the preview can&apos;t know the exact viewport height
        visitors saw, so it reserves enough room below the deepest recorded click.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div>
          <label className="mb-1 block text-[11px] text-zinc-500">Page</label>
          <select
            value={path}
            onChange={(e) => setPath(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm focus:border-amber-400 focus:outline-none"
          >
            {pages.length === 0 && <option value="">No pages with click data yet</option>}
            {pages.map((p) => (
              <option key={p.path} value={p.path}>
                {p.path} ({p.clicks})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-zinc-500">Device</label>
          <select
            value={device}
            onChange={(e) => setDevice(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm focus:border-amber-400 focus:outline-none"
          >
            {DEVICES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <div>
            <label className="mb-1 block text-[11px] text-zinc-500">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm focus:border-amber-400 focus:outline-none [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-zinc-500">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm focus:border-amber-400 focus:outline-none [color-scheme:dark]"
            />
          </div>
        </div>
        <div className="ml-auto flex gap-4 text-xs text-zinc-400">
          <span>
            <span className="font-semibold text-zinc-200">{totalClicks}</span> clicks
          </span>
          <span>
            Deepest click: <span className="font-semibold text-zinc-200">{maxYPx}px</span>
          </span>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {loading && <p className="mt-3 text-xs text-zinc-500">Loading…</p>}

      {path ? (
        <div ref={containerRef} className="relative mt-4 overflow-hidden rounded-xl border border-zinc-800" style={{ height: overlayHeight }}>
          <iframe src={`${WEB_URL}${path}`} title="Page preview" className="absolute inset-0 h-full w-full border-0 bg-white" />
          <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
        </div>
      ) : (
        <p className="mt-6 text-sm text-zinc-500">No pages have recorded clicks yet — visit the public site to generate heatmap data.</p>
      )}
    </div>
  );
}
