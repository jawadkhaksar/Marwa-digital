"use client";

import { useState } from "react";
import type { SliderSlide } from "@marwa/builder";
import { MediaLibraryModal } from "@/components/ImagePicker";
import { DynamicTextInput } from "@/components/builder/DynamicTextField";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
function displayUrl(url: string) {
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

/**
 * Slides are richer than Gallery's plain `images: string[]` (each has an
 * optional heading/subheading/button on top of the image), so the generic
 * describePropsSchema/PropField system would fall back to a raw JSON
 * textarea for this field — workable but not the "modern" editing
 * experience the rest of the panel has. This gives each slide its own
 * expandable card instead, matching the ImagePicker/IconLibraryPicker
 * pattern already used for other rich fields.
 */
export function SlidesEditor({ value, onChange }: { value: SliderSlide[]; onChange: (slides: SliderSlide[]) => void }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [pickerForIndex, setPickerForIndex] = useState<number | null>(null);

  function updateSlide(index: number, patch: Partial<SliderSlide>) {
    onChange(value.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addSlide() {
    const next = [...value, { image: "" }];
    onChange(next);
    setExpandedIndex(next.length - 1);
  }

  function removeSlide(index: number) {
    onChange(value.filter((_, i) => i !== index));
    setExpandedIndex(null);
  }

  function moveSlide(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    setExpandedIndex(target);
  }

  return (
    <div>
      <label className="mb-1 block text-xs text-zinc-400">Slides</label>
      <div className="flex flex-col gap-2">
        {value.map((slide, i) => (
          <div key={i} className="rounded-lg border border-zinc-700 bg-zinc-950">
            <div className="flex items-center gap-2 p-2">
              <button
                type="button"
                onClick={() => setPickerForIndex(i)}
                className="h-12 w-16 shrink-0 overflow-hidden rounded border border-zinc-700 bg-zinc-900"
                title="Change image"
              >
                {slide.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={displayUrl(slide.image)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-[10px] text-zinc-600">No image</span>
                )}
              </button>
              <button type="button" onClick={() => setExpandedIndex(expandedIndex === i ? null : i)} className="min-w-0 flex-1 truncate text-left text-xs text-zinc-200">
                {slide.heading || `Slide ${i + 1}`}
              </button>
              <div className="flex shrink-0 items-center gap-0.5 text-zinc-400">
                <button type="button" title="Move up" onClick={() => moveSlide(i, "up")} className="flex h-6 w-6 items-center justify-center rounded hover:bg-zinc-800 hover:text-amber-400">
                  ↑
                </button>
                <button type="button" title="Move down" onClick={() => moveSlide(i, "down")} className="flex h-6 w-6 items-center justify-center rounded hover:bg-zinc-800 hover:text-amber-400">
                  ↓
                </button>
                <button type="button" title="Delete" onClick={() => removeSlide(i)} className="flex h-6 w-6 items-center justify-center rounded hover:bg-zinc-800 hover:text-red-400">
                  ✕
                </button>
              </div>
            </div>

            {expandedIndex === i && (
              <div className="flex flex-col gap-2 border-t border-zinc-800 p-2">
                <div>
                  <label className="mb-1 block text-[11px] text-zinc-500">Heading</label>
                  <DynamicTextInput
                    value={slide.heading ?? ""}
                    onChange={(v) => updateSlide(i, { heading: v })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-zinc-500">Subheading</label>
                  <DynamicTextInput
                    value={slide.subheading ?? ""}
                    onChange={(v) => updateSlide(i, { subheading: v })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] text-zinc-500">Button Label</label>
                    <DynamicTextInput
                      value={slide.buttonLabel ?? ""}
                      onChange={(v) => updateSlide(i, { buttonLabel: v })}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-zinc-500">Button URL</label>
                    <DynamicTextInput
                      value={slide.buttonUrl ?? ""}
                      onChange={(v) => updateSlide(i, { buttonUrl: v })}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={addSlide}
          className="rounded-lg border border-dashed border-zinc-700 py-2 text-xs text-zinc-400 hover:border-amber-400 hover:text-amber-400"
        >
          + Add Slide
        </button>
      </div>

      {pickerForIndex !== null && (
        <MediaLibraryModal
          category="builder"
          onSelect={(url) => {
            updateSlide(pickerForIndex, { image: url });
            setPickerForIndex(null);
          }}
          onClose={() => setPickerForIndex(null)}
        />
      )}
    </div>
  );
}
