"use client";

import { useState } from "react";
import type { IconListItem } from "@marwa/builder";
import { IconLibraryPicker } from "@/components/IconLibraryPicker";
import { DynamicTextInput } from "@/components/builder/DynamicTextField";

/**
 * Same add/remove/reorder + expand-per-item shape as SlidesEditor/FieldsEditor
 * — each item has an icon (react-icons, via IconLibraryPicker) + text + an
 * optional link, richer than StringListEditor's plain strings so it needs
 * its own card-based editor rather than falling back to a raw JSON textarea.
 */
export function IconListEditor({ value, onChange }: { value: IconListItem[]; onChange: (items: IconListItem[]) => void }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  function updateItem(index: number, patch: Partial<IconListItem>) {
    onChange(value.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addItem() {
    const next = [...value, { text: `List Item #${value.length + 1}`, icon: "FaCircle", href: "", openInNewTab: false }];
    onChange(next);
    setExpandedIndex(next.length - 1);
  }

  function duplicateItem(index: number) {
    const next = [...value];
    next.splice(index + 1, 0, { ...value[index] });
    onChange(next);
    setExpandedIndex(index + 1);
  }

  function removeItem(index: number) {
    onChange(value.filter((_, i) => i !== index));
    setExpandedIndex(null);
  }

  function moveItem(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    setExpandedIndex(target);
  }

  return (
    <div>
      <label className="mb-1 block text-xs text-zinc-400">Items</label>
      <div className="flex flex-col gap-2">
        {value.map((item, i) => (
          <div key={i} className="rounded-lg border border-zinc-700 bg-zinc-950">
            <div className="flex items-center gap-2 p-2">
              <button type="button" onClick={() => setExpandedIndex(expandedIndex === i ? null : i)} className="min-w-0 flex-1 truncate text-left text-xs text-zinc-200">
                {item.text || `List Item #${i + 1}`}
              </button>
              <div className="flex shrink-0 items-center gap-0.5 text-zinc-400">
                <button type="button" title="Move up" onClick={() => moveItem(i, "up")} className="flex h-6 w-6 items-center justify-center rounded hover:bg-zinc-800 hover:text-amber-400">
                  ↑
                </button>
                <button type="button" title="Move down" onClick={() => moveItem(i, "down")} className="flex h-6 w-6 items-center justify-center rounded hover:bg-zinc-800 hover:text-amber-400">
                  ↓
                </button>
                <button type="button" title="Duplicate" onClick={() => duplicateItem(i)} className="flex h-6 w-6 items-center justify-center rounded hover:bg-zinc-800 hover:text-amber-400">
                  ⧉
                </button>
                <button type="button" title="Delete" onClick={() => removeItem(i)} className="flex h-6 w-6 items-center justify-center rounded hover:bg-zinc-800 hover:text-red-400">
                  ✕
                </button>
              </div>
            </div>

            {expandedIndex === i && (
              <div className="flex flex-col gap-2 border-t border-zinc-800 p-2">
                <div>
                  <label className="mb-1 block text-[11px] text-zinc-500">Text</label>
                  <DynamicTextInput
                    value={item.text}
                    onChange={(v) => updateItem(i, { text: v })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs"
                  />
                </div>
                <IconLibraryPicker value={item.icon} onChange={(v) => updateItem(i, { icon: v })} />
                <div>
                  <label className="mb-1 block text-[11px] text-zinc-500">Link URL</label>
                  <DynamicTextInput
                    value={item.href ?? ""}
                    onChange={(v) => updateItem(i, { href: v })}
                    placeholder="https://…"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-zinc-400">
                  <input type="checkbox" checked={Boolean(item.openInNewTab)} onChange={(e) => updateItem(i, { openInNewTab: e.target.checked })} />
                  Open in new tab
                </label>
              </div>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={addItem}
          className="rounded-lg border border-dashed border-zinc-700 py-2 text-xs text-zinc-400 hover:border-amber-400 hover:text-amber-400"
        >
          + Add Item
        </button>
      </div>
    </div>
  );
}
