"use client";

import { IconLibraryPicker } from "@/components/IconLibraryPicker";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ColorField } from "@/components/builder/ColorField";
import { SegmentedField } from "@/components/builder/SegmentedField";
import { DynamicTextInput, DynamicTextarea, DynamicImagePicker } from "@/components/builder/DynamicTextField";

export interface RepeaterFieldConfig<T> {
  key: keyof T & string;
  label: string;
  type: "text" | "textarea" | "icon" | "image" | "select" | "richtext" | "boolean" | "color";
  options?: readonly string[];
  placeholder?: string;
  /** "select" only — renders SegmentedField's icon-button row instead of a plain dropdown, for alignment/position-flavored options (e.g. an icon-before/after field). */
  segmented?: boolean;
}

/**
 * A generic add/remove/reorder card editor for the Content-tab array props
 * shared by several otherwise-unrelated blocks (ScrollMarquee, IconBullets,
 * TimelineBullets, ShapeBullets, IconAccordion, StackedImages) — each block
 * still owns its own distinct item schema/type in packages/builder/registry;
 * this only factors out the repeated "list of cards with a few fields each"
 * UI shell, matching the existing ServiceItemsEditor/IconListEditor pattern
 * generalized instead of copy-pasted six times.
 */
export function SimpleRepeaterEditor<T extends Record<string, unknown>>({
  value,
  onChange,
  fields,
  defaultItem,
  itemLabel,
  addLabel = "+ Add item",
  imageCategory = "builder",
}: {
  value: T[];
  onChange: (items: T[]) => void;
  fields: RepeaterFieldConfig<T>[];
  defaultItem: T;
  itemLabel?: (item: T, index: number) => string;
  addLabel?: string;
  imageCategory?: string;
}) {
  function update(i: number, patch: Partial<T>) {
    onChange(value.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));
  }
  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }
  function move(i: number, direction: "up" | "down") {
    const target = direction === "up" ? i - 1 : i + 1;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[i], next[target]] = [next[target], next[i]];
    onChange(next);
  }

  return (
    <div>
      <label className="mb-2 block text-xs text-zinc-400">Items</label>
      <div className="flex flex-col gap-3">
        {value.map((item, i) => (
          <div key={i} className="rounded-lg border border-zinc-800 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wide text-zinc-600">{itemLabel ? itemLabel(item, i) : `Item ${i + 1}`}</span>
              <div className="flex items-center gap-2 text-zinc-400">
                <button type="button" title="Move up" onClick={() => move(i, "up")} className="hover:text-amber-400">
                  ↑
                </button>
                <button type="button" title="Move down" onClick={() => move(i, "down")} className="hover:text-amber-400">
                  ↓
                </button>
                <button type="button" onClick={() => remove(i)} className="text-red-400 hover:underline">
                  Remove
                </button>
              </div>
            </div>
            <div className="mt-2 flex flex-col gap-2">
              {fields.map((field) => {
                const raw = item[field.key];
                if (field.type === "icon") {
                  return <IconLibraryPicker key={field.key} value={typeof raw === "string" ? raw : ""} onChange={(v) => update(i, { [field.key]: v } as Partial<T>)} />;
                }
                if (field.type === "image") {
                  const url = typeof raw === "string" ? raw : "";
                  return (
                    <DynamicImagePicker
                      key={field.key}
                      value={url}
                      onChange={(v) => update(i, { [field.key]: v } as Partial<T>)}
                      category={imageCategory}
                    />
                  );
                }
                if (field.type === "select" && field.segmented) {
                  return (
                    <SegmentedField
                      key={field.key}
                      label={field.label}
                      value={typeof raw === "string" ? raw : ""}
                      onChange={(v) => update(i, { [field.key]: v } as Partial<T>)}
                      options={field.options ?? []}
                    />
                  );
                }
                if (field.type === "select") {
                  return (
                    <select
                      key={field.key}
                      value={typeof raw === "string" ? raw : ""}
                      onChange={(e) => update(i, { [field.key]: e.target.value } as Partial<T>)}
                      className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
                    >
                      {(field.options ?? []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  );
                }
                if (field.type === "boolean") {
                  return (
                    <label key={field.key} className="flex items-center gap-2 text-xs text-zinc-300">
                      <input type="checkbox" checked={Boolean(raw)} onChange={(e) => update(i, { [field.key]: e.target.checked } as Partial<T>)} />
                      {field.label}
                    </label>
                  );
                }
                if (field.type === "color") {
                  return (
                    <ColorField
                      key={field.key}
                      label={field.label}
                      value={typeof raw === "string" ? raw : ""}
                      onChange={(v) => update(i, { [field.key]: v } as Partial<T>)}
                    />
                  );
                }
                if (field.type === "richtext") {
                  return (
                    <div key={field.key}>
                      <label className="mb-1 block text-[11px] text-zinc-500">{field.label}</label>
                      <RichTextEditor value={typeof raw === "string" ? raw : ""} onChange={(v) => update(i, { [field.key]: v } as Partial<T>)} />
                    </div>
                  );
                }
                if (field.type === "textarea") {
                  return (
                    <DynamicTextarea
                      key={field.key}
                      value={typeof raw === "string" ? raw : ""}
                      onChange={(v) => update(i, { [field.key]: v } as Partial<T>)}
                      placeholder={field.placeholder ?? field.label}
                      rows={2}
                    />
                  );
                }
                return (
                  <DynamicTextInput
                    key={field.key}
                    value={typeof raw === "string" ? raw : ""}
                    onChange={(v) => update(i, { [field.key]: v } as Partial<T>)}
                    placeholder={field.placeholder ?? field.label}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...value, defaultItem])}
        className="mt-3 w-full rounded-lg border border-dashed border-zinc-700 py-2 text-xs text-amber-400 hover:border-amber-400/50 hover:underline"
      >
        {addLabel}
      </button>
    </div>
  );
}
