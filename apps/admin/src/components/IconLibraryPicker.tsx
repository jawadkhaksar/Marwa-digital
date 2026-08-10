"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { IconType } from "react-icons";
import { api, type MediaAsset } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function displayUrl(url: string) {
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

/** Same value-shape detection as apps/web's resolveIconValue (kept separate — this is a preview-only concern, not shared render logic across the two Next apps). */
function detectKind(value: string): "inline" | "file" | "name" {
  const v = value.trim();
  if (v.startsWith("<svg")) return "inline";
  if (/^(https?:|data:|\/)/i.test(v)) return "file";
  return "name";
}

// Loaded lazily (only once the modal actually opens) via a plain dynamic
// import rather than a static named import — react-icons/fa6 exports ~2000
// components, and a static `import { FaStar, FaCar, ... }` would mean
// picking the names ahead of time defeats the point of a searchable
// library. The cost is that this chunk is never tree-shaken, but it's
// admin-only and code-split behind this one modal.
let iconModulePromise: Promise<Record<string, IconType>> | null = null;
function loadIconModule() {
  if (!iconModulePromise) {
    iconModulePromise = import("react-icons/fa6").then((m) => m as unknown as Record<string, IconType>);
  }
  return iconModulePromise;
}

const RESULT_CAP = 200;

export function IconLibraryPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [icons, setIcons] = useState<Record<string, IconType> | null>(null);

  // Loaded on mount (not just when the modal opens) so the small preview box
  // above shows the actual selected glyph immediately rather than raw text.
  useEffect(() => {
    loadIconModule().then(setIcons);
  }, []);

  const kind = value ? detectKind(value) : "name";
  const SelectedIcon = kind === "name" ? icons?.[value] : undefined;

  return (
    <div>
      <label className="mb-1 block text-xs text-zinc-400">Icon</label>
      <div className="flex h-24 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950">
        {kind === "inline" && value ? (
          <div className="h-10 w-10 text-zinc-200 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: value }} />
        ) : kind === "file" && value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayUrl(value)} alt="" className="h-10 w-10 object-contain" />
        ) : SelectedIcon ? (
          <SelectedIcon size={40} className="text-zinc-200" />
        ) : (
          <span className="px-2 text-center text-[11px] text-zinc-600">{value || "No icon selected"}</span>
        )}
      </div>
      <div className={`mt-2 grid gap-1.5 ${value ? "grid-cols-3" : "grid-cols-2"}`}>
        <button
          type="button"
          onClick={() => setLibraryOpen(true)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
        >
          Icon Library
        </button>
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
        >
          Upload SVG
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            title="Remove the icon entirely"
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-zinc-700"
          >
            Clear
          </button>
        )}
      </div>

      {libraryOpen && <IconLibraryModal icons={icons} value={value} onChange={onChange} onClose={() => setLibraryOpen(false)} />}
      {uploadOpen && <UploadSvgModal value={value} onChange={onChange} onClose={() => setUploadOpen(false)} />}
    </div>
  );
}

function IconLibraryModal({
  icons,
  value,
  onChange,
  onClose,
}: {
  icons: Record<string, IconType> | null;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const allNames = useMemo(() => (icons ? Object.keys(icons) : []), [icons]);
  const names = useMemo(() => {
    if (!query.trim()) return allNames.slice(0, RESULT_CAP);
    const q = query.trim().toLowerCase();
    return allNames.filter((n) => n.toLowerCase().includes(q)).slice(0, RESULT_CAP);
  }, [allNames, query]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <h3 className="font-semibold">Icon Library</h3>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white">
            ✕
          </button>
        </div>
        <div className="border-b border-zinc-800 p-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name…"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            autoFocus
          />
        </div>
        <div className="overflow-y-auto p-4">
          {!icons && <p className="text-sm text-zinc-500">Loading icon library…</p>}
          {icons && names.length === 0 && <p className="text-sm text-zinc-500">No icons match &quot;{query}&quot;.</p>}
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
            {names.map((name) => {
              const Cmp = icons![name];
              return (
                <button
                  key={name}
                  type="button"
                  title={name}
                  onClick={() => {
                    onChange(name);
                    onClose();
                  }}
                  className={`flex h-14 items-center justify-center rounded-lg border ${
                    value === name ? "border-amber-400 bg-amber-400/10" : "border-zinc-700 hover:border-zinc-500"
                  }`}
                >
                  <Cmp size={18} className="text-zinc-200" />
                </button>
              );
            })}
          </div>
          {icons && names.length === RESULT_CAP && (
            <p className="mt-3 text-center text-[11px] text-zinc-500">Showing first {RESULT_CAP} matches — refine your search for more.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * "Upload SVG" tab — two ways to supply a custom icon, both landing in the
 * same plain `icon` string field the preset library already uses (see
 * resolveIconValue in apps/web/src/lib/iconLibrary.ts for how the renderer
 * tells the three shapes apart): upload a file (reuses the same
 * `api.uploadMedia` endpoint ImagePicker uses — it already accepts
 * `image/svg+xml`), or paste raw `<svg>...</svg>` markup directly.
 */
function UploadSvgModal({ value, onChange, onClose }: { value: string; onChange: (value: string) => void; onClose: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [pasted, setPasted] = useState(detectKind(value) === "inline" ? value : "");

  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getMedia()
      .then((all) => setMedia(all.filter((m) => m.filename.toLowerCase().endsWith(".svg"))))
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load gallery"))
      .finally(() => setLoading(false));
  }, []);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await api.uploadMedia(file, "icons");
      onChange(uploaded.url);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function applyPasted() {
    const trimmed = pasted.trim();
    if (!trimmed.startsWith("<svg")) {
      setError('Paste a full <svg>...</svg> element.');
      return;
    }
    onChange(trimmed);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <h3 className="font-semibold">Upload SVG</h3>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          <div className="border-b border-zinc-800 pb-4">
            <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300">
              {uploading ? "Uploading…" : "Upload .svg File"}
              <input ref={fileRef} type="file" accept="image/svg+xml,.svg" className="hidden" onChange={onFile} disabled={uploading} />
            </label>

            {!loading && !loadError && media.length > 0 && (
              <>
                <p className="mb-2 mt-4 text-xs text-zinc-400">Or choose a previously uploaded SVG</p>
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                  {media.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      title={m.filename}
                      onClick={() => {
                        onChange(m.url);
                        onClose();
                      }}
                      className="flex h-14 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 p-2 hover:border-amber-400"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={displayUrl(m.url)} alt={m.filename} className="h-full w-full object-contain" />
                    </button>
                  ))}
                </div>
              </>
            )}
            {loading && <p className="mt-3 text-sm text-zinc-500">Loading gallery…</p>}
            {loadError && <p className="mt-3 text-sm text-red-400">{loadError}</p>}
          </div>

          <div className="pt-4">
            <p className="mb-2 text-xs text-zinc-400">Or paste raw SVG code</p>
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder="<svg viewBox=&quot;0 0 24 24&quot;>...</svg>"
              rows={5}
              spellCheck={false}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs"
            />
            <button
              type="button"
              onClick={applyPasted}
              disabled={!pasted.trim()}
              className="mt-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
            >
              Use This SVG
            </button>
          </div>

          {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}
