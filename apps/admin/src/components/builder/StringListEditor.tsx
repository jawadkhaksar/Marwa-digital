"use client";

import { DynamicTextInput } from "@/components/builder/DynamicTextField";

/**
 * A plain list of single-line strings (Service Card's "Features" bullet
 * list, and any future block needing the same shape) — reorder/add/remove,
 * no sub-fields. Simpler than FieldsEditor/SlidesEditor since each item is
 * just text, not an object; skips the generic describePropsSchema JSON-
 * textarea fallback a bare `z.array(z.string())` prop would otherwise get.
 */
export function StringListEditor({ label, value, onChange, placeholder }: { label?: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  function update(index: number, next: string) {
    onChange(value.map((v, i) => (i === index ? next : v)));
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function move(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function add() {
    onChange([...value, ""]);
  }

  return (
    <div>
      {label && <label className="mb-1 block text-xs text-zinc-400">{label}</label>}
      <div className="flex flex-col gap-1.5">
        {value.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="min-w-0 flex-1">
              <DynamicTextInput
                value={item}
                placeholder={placeholder}
                onChange={(v) => update(i, v)}
                className="w-full min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs"
              />
            </div>
            <button type="button" title="Move up" onClick={() => move(i, "up")} className="shrink-0 text-zinc-400 hover:text-amber-400">
              ↑
            </button>
            <button type="button" title="Move down" onClick={() => move(i, "down")} className="shrink-0 text-zinc-400 hover:text-amber-400">
              ↓
            </button>
            <button type="button" title="Remove" onClick={() => remove(i)} className="shrink-0 text-red-400 hover:text-red-300">
              ✕
            </button>
          </div>
        ))}
        <button type="button" onClick={add} className="rounded-lg border border-dashed border-zinc-700 py-1.5 text-[11px] text-zinc-400 hover:border-amber-400 hover:text-amber-400">
          + Add Item
        </button>
      </div>
    </div>
  );
}
