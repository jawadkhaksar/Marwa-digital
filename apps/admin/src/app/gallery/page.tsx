"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { api, type MediaAsset, type MediaUsageRef } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const CATEGORIES = ["hero", "vehicle", "tour", "service", "general"];

// Mirrors packages/api/src/lib/mediaConversion.ts's needsWebpConversion —
// webp is already the target format, svg is vector (a raster re-encode
// would only make it worse), and pdf isn't an image sharp can convert.
// `mimeType` is reliable for this check on every row (backfilled for
// pre-existing assets, set at upload time, and set again on conversion),
// so there's no need to parse `url`'s extension here too.
const NON_CONVERTIBLE_MIME_TYPES = new Set(["image/webp", "image/svg+xml", "application/pdf"]);

function formatUsageRef(ref: MediaUsageRef): string {
  const kind = { page: "Page", post: "Post", setting: "Site Settings", "collection-item": "Collection Item" }[ref.type];
  return ref.field ? `${kind}: ${ref.label} (${ref.field})` : `${kind}: ${ref.label}`;
}

// Best-effort usage lookup — if the check itself fails (network hiccup,
// etc.) the caller proceeds without a warning rather than blocking the
// action entirely on this being unreachable.
async function describeUsageWarning(mediaId: string): Promise<string> {
  try {
    const { usages } = await api.getMediaUsage(mediaId);
    if (usages.length === 0) return "";
    const preview = usages.slice(0, 6).map(formatUsageRef);
    const more = usages.length > preview.length ? `\n…and ${usages.length - preview.length} more` : "";
    return `\n\nThis file is currently used in ${usages.length} place${usages.length === 1 ? "" : "s"}:\n${preview.join("\n")}${more}`;
  } catch {
    return "";
  }
}

function isConvertible(asset: MediaAsset): boolean {
  return !NON_CONVERTIBLE_MIME_TYPES.has(asset.mimeType);
}

export default function GalleryPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <GalleryContent />
      </DashboardShell>
    </AuthGuard>
  );
}

type Notice = { kind: "success" | "error"; text: string };

function RefreshIcon({ spinning }: { spinning?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-3.5 w-3.5 shrink-0 ${spinning ? "animate-spin" : ""}`}
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function GalleryContent() {
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [category, setCategory] = useState("general");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [convertingIds, setConvertingIds] = useState<Set<string>>(new Set());
  const [bulkConverting, setBulkConverting] = useState(false);
  const [altTextingIds, setAltTextingIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleGenerateAltText(asset: MediaAsset) {
    setAltTextingIds((prev) => new Set(prev).add(asset.id));
    setError(null);
    try {
      const result = await api.aiGenerateAltText(asset.id);
      setMedia((prev) => prev.map((m) => (m.id === asset.id ? { ...m, altText: result.altText } : m)));
      setNotice({ kind: "success", text: `Alt text generated for ${asset.filename}.` });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate alt text");
    } finally {
      setAltTextingIds((prev) => {
        const next = new Set(prev);
        next.delete(asset.id);
        return next;
      });
    }
  }

  const load = useCallback(() => {
    api.getMedia().then(setMedia).catch((err) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  // Success notices clear themselves; errors stay until the next action so
  // they're not missed.
  useEffect(() => {
    if (notice?.kind !== "success") return;
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await api.uploadMedia(file, category);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id: string, filename: string) {
    const usageWarning = await describeUsageWarning(id);
    if (!confirm(`Delete "${filename}"?${usageWarning}`)) return;
    try {
      await api.deleteMedia(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete image");
    }
  }

  async function handleConvertOne(asset: MediaAsset) {
    const usageWarning = await describeUsageWarning(asset.id);
    if (
      usageWarning &&
      !confirm(
        `Convert "${asset.filename}" to WebP?${usageWarning}\n\nThis gets a new URL — those places will keep pointing at the old (now-deleted) file until re-selected.`
      )
    )
      return;

    setNotice(null);
    setConvertingIds((prev) => new Set(prev).add(asset.id));
    try {
      const result = await api.convertMediaToWebp(asset.id);
      setNotice(
        result.converted
          ? { kind: "success", text: `Converted "${asset.filename}" to WebP.` }
          : { kind: "success", text: `"${asset.filename}" was already WebP/SVG.` }
      );
      load();
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : `Failed to convert "${asset.filename}".` });
    } finally {
      setConvertingIds((prev) => {
        const next = new Set(prev);
        next.delete(asset.id);
        return next;
      });
    }
  }

  async function handleConvertAll() {
    const count = media.filter(isConvertible).length;
    if (count === 0) return;
    if (
      !confirm(
        `Convert ${count} legacy image${count === 1 ? "" : "s"} to WebP? Originals will be replaced on disk — this can't be undone.\n\n` +
          "Each converted image gets a new URL. If one is currently set as your Site Logo/Icon or placed on a page, that reference will keep pointing at the old (now-deleted) file and will need to be re-selected afterward — same as deleting an image that's still in use."
      )
    )
      return;

    setNotice(null);
    setBulkConverting(true);
    try {
      const result = await api.convertAllMediaToWebp();
      const parts = [`${result.converted} converted`];
      if (result.skipped > 0) parts.push(`${result.skipped} already WebP/SVG`);
      if (result.failed > 0) parts.push(`${result.failed} failed`);
      setNotice({ kind: result.failed > 0 ? "error" : "success", text: parts.join(", ") + "." });
      load();
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : "Bulk conversion failed" });
    } finally {
      setBulkConverting(false);
    }
  }

  const convertibleCount = media.filter(isConvertible).length;
  const anyConverting = bulkConverting || convertingIds.size > 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Gallery</h1>
          <p className="mt-1 text-sm text-zinc-300">Upload images used across the site (hero, fleet, tours, services).</p>
        </div>
        {convertibleCount > 0 && (
          <button
            type="button"
            onClick={handleConvertAll}
            disabled={anyConverting}
            title="Re-encode every non-WebP image on disk to WebP (quality 82, max 1920px wide)"
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-400/20 disabled:opacity-50"
          >
            <RefreshIcon spinning={bulkConverting} />
            {bulkConverting ? "Converting…" : `Convert All Existing Images to WebP (${convertibleCount})`}
          </button>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} className="text-sm" />
        {uploading && <span className="text-xs text-zinc-400">Uploading…</span>}
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {notice && <p className={`mt-3 text-sm ${notice.kind === "success" ? "text-emerald-400" : "text-red-400"}`}>{notice.text}</p>}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {media.length === 0 && <p className="text-sm text-zinc-500">No images uploaded yet.</p>}
        {media.map((m) => {
          const convertible = isConvertible(m);
          const converting = convertingIds.has(m.id);
          return (
            <div key={m.id} className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
              {/* Uploaded assets are outside Next's static build, so a plain <img> is correct here. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${API_URL}${m.url}`} alt={m.filename} className="h-32 w-full object-cover" />
              <div className="p-2">
                <p className="truncate text-xs text-zinc-400">{m.filename}</p>
                <p className="text-[10px] text-zinc-600">
                  {m.category} <span className="text-zinc-700">·</span> {m.mimeType.replace("image/", "").toUpperCase()}
                </p>
                <p className={`mt-1 truncate text-[10px] ${m.altText ? "text-zinc-500" : "text-zinc-700 italic"}`} title={m.altText ?? undefined}>
                  {m.altText || "No alt text"}
                </p>
              </div>
              <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => handleGenerateAltText(m)}
                  disabled={altTextingIds.has(m.id)}
                  title="Generate SEO alt text with AI"
                  className="flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-xs text-amber-300 hover:bg-black/85 disabled:opacity-60"
                >
                  {altTextingIds.has(m.id) ? "…" : "✨ Alt Text"}
                </button>
                {convertible && (
                  <button
                    onClick={() => handleConvertOne(m)}
                    disabled={converting || bulkConverting}
                    title="Convert to WebP — this gets a new URL, so re-select it anywhere it's already placed (Site Logo, a page, etc.)"
                    className="flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-xs text-amber-300 hover:bg-black/85 disabled:opacity-60"
                  >
                    <RefreshIcon spinning={converting} />
                    {converting ? "" : "WebP"}
                  </button>
                )}
                <button
                  onClick={() => handleDelete(m.id, m.filename)}
                  disabled={converting}
                  className="rounded-full bg-black/70 px-2 py-1 text-xs text-red-400 hover:bg-black/85 disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
