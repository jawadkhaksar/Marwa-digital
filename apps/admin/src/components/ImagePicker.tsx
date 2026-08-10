"use client";

import { useEffect, useRef, useState } from "react";
import { api, type MediaAsset } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

// Admin-uploaded images live on the API ("/uploads/...") — everything else
// ("/images/...") is a seed/bundled asset served from the web app's own
// public folder, not the API, so it needs the web app's origin instead.
// Exported since MediaLibraryModal's onSelect hands callers the raw stored
// url (not resolved to an absolute one) — anything that renders it directly
// as an <img src>/background outside this file needs to resolve it first,
// same as RichTextEditor.tsx does for images inserted into the WYSIWYG.
export function displayUrl(url: string) {
  if (url.startsWith("http")) return url;
  return url.startsWith("/uploads/") ? `${API_URL}${url}` : `${WEB_URL}${url}`;
}

export function ImagePicker({
  label = "Images",
  images,
  onChange,
  category,
}: {
  label?: string;
  images: string[];
  onChange: (urls: string[]) => void;
  category: string;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  function remove(url: string) {
    onChange(images.filter((u) => u !== url));
  }

  function makePrimary(url: string) {
    onChange([url, ...images.filter((u) => u !== url)]);
  }

  function selectFromGallery(url: string) {
    if (!images.includes(url)) onChange([...images, url]);
    setPickerOpen(false);
  }

  return (
    <div>
      <label className="mb-1 block text-xs text-zinc-400">{label}</label>
      <div className="flex flex-wrap gap-2">
        {images.map((url, i) => (
          <div key={url} className="group relative h-20 w-28 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950">
            {/* Uploaded assets are outside Next's static build, so a plain <img> is correct here. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={displayUrl(url)} alt="" className="h-full w-full object-cover" />
            {i === 0 && (
              <span className="absolute left-1 top-1 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-semibold text-white">Primary</span>
            )}
            <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
              {i !== 0 && (
                <button
                  type="button"
                  onClick={() => makePrimary(url)}
                  className="rounded bg-white/10 px-1.5 py-1 text-[10px] text-white hover:bg-white/20"
                >
                  Make Primary
                </button>
              )}
              <button
                type="button"
                onClick={() => remove(url)}
                className="rounded bg-red-500/80 px-1.5 py-1 text-[10px] text-white hover:bg-red-500"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex h-20 w-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-700 text-center text-[11px] text-zinc-400 hover:border-amber-400 hover:text-amber-400"
        >
          + Add Image
        </button>
      </div>

      {pickerOpen && (
        <MediaLibraryModal category={category} onSelect={selectFromGallery} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  );
}

/**
 * Upload-or-pick-from-gallery modal, self-contained so it can be reused
 * anywhere a single image URL is needed (e.g. the builder's rich-text "Add
 * Media" button) without pulling in ImagePicker's multi-image field UI.
 */
export function MediaLibraryModal({
  category,
  onSelect,
  onClose,
}: {
  category: string;
  onSelect: (url: string) => void;
  onClose: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const media = await api.uploadMedia(file, category);
      onSelect(media.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getMedia()
      .then(setMedia)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load gallery"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <h3 className="font-semibold">Add Image</h3>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="border-b border-zinc-800 p-4">
          <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300">
            {uploading ? "Uploading…" : "Upload New Image"}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} disabled={uploading} />
          </label>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>

        <div className="overflow-y-auto p-4">
          <p className="mb-2 text-xs text-zinc-400">Or choose from your existing gallery</p>
          {loading && <p className="text-sm text-zinc-500">Loading…</p>}
          {loadError && <p className="text-sm text-red-400">{loadError}</p>}
          {!loading && !loadError && media.length === 0 && (
            <p className="text-sm text-zinc-500">No images in the gallery yet. Upload one above.</p>
          )}
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {media.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelect(m.url)}
                className="group overflow-hidden rounded-lg border border-zinc-700 hover:border-amber-400"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={displayUrl(m.url)} alt={m.filename} className="h-20 w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
