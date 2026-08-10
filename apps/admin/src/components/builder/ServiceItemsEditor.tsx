"use client";

import { useRef } from "react";
import { DynamicTextInput, DynamicImagePicker } from "@/components/builder/DynamicTextField";
import { DynamicTagButton } from "@/components/builder/DynamicTagButton";

export interface ServiceItem {
  /** May contain the tiny **bold** / [label](url) markdown subset — see
   * renderInlineMarkdown in apps/web's Services.tsx for how it's parsed. */
  title: string;
  description: string;
  /** Each entry may also contain that same **bold** / [label](url) subset. */
  features: string[];
  image: string;
  highlighted: boolean;
  badge?: string;
  readMoreUrl?: string;
  bookNowUrl?: string;
}

/**
 * The Services carousel's per-card editor — moved here (was inline in
 * apps/admin's Homepage settings page as ServiceCardsEditor) once the
 * "Services" block gained real per-instance content in the builder,
 * superseding that page's own copy of this same editor.
 */

// Wraps the textarea's current selection in **bold** or [label](url) syntax
// rather than opening a full rich-text editor — the frontend
// (renderInlineMarkdown in apps/web's Services.tsx) only ever needs to
// understand these two patterns, so a full Tiptap instance per bullet would
// be a lot of editor chrome for two formatting options. Selecting no text
// before clicking falls back to a placeholder the admin can type over.
function wrapSelection(el: HTMLTextAreaElement, value: string, onChange: (next: string) => void, mode: "bold" | "link") {
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? value.length;
  const selected = value.slice(start, end) || (mode === "bold" ? "bold text" : "link text");

  let inserted: string;
  if (mode === "bold") {
    inserted = `**${selected}**`;
  } else {
    const url = window.prompt("Link URL (e.g. https://... or /booking)", "https://");
    if (!url) return;
    inserted = `[${selected}](${url})`;
  }

  const next = value.slice(0, start) + inserted + value.slice(end);
  onChange(next);
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(start + inserted.length, start + inserted.length);
  });
}

function FormatToolbar({ targetRef, value, onChange }: { targetRef: React.RefObject<HTMLTextAreaElement | null>; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mt-2 flex items-center gap-1.5">
      <button
        type="button"
        title="Bold the selected text"
        onClick={() => targetRef.current && wrapSelection(targetRef.current, value, onChange, "bold")}
        className="rounded border border-zinc-700 px-2 py-0.5 text-[11px] font-bold text-zinc-300 hover:border-amber-400 hover:text-amber-400"
      >
        B
      </button>
      <button
        type="button"
        title="Link the selected text"
        onClick={() => targetRef.current && wrapSelection(targetRef.current, value, onChange, "link")}
        className="rounded border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300 underline hover:border-amber-400 hover:text-amber-400"
      >
        Link
      </button>
      <DynamicTagButton inputRef={targetRef} currentValue={value} onInsert={(next) => onChange(next)} />
      <span className="text-[10px] text-zinc-600">select text, then click</span>
    </div>
  );
}

export function ServiceItemsEditor({ value, onChange }: { value: ServiceItem[]; onChange: (items: ServiceItem[]) => void }) {
  const descRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});
  const featuresRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});

  function update(i: number, patch: Partial<ServiceItem>) {
    onChange(value.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function updateFeatures(i: number, text: string) {
    update(i, {
      features: text
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    });
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
      <div className="mb-2 flex items-center justify-between">
        <label className="text-xs text-zinc-400">Cards</label>
        <button
          type="button"
          onClick={() =>
            onChange([...value, { title: "", description: "", features: [], image: "", highlighted: false, badge: "", readMoreUrl: "", bookNowUrl: "" }])
          }
          className="text-xs text-amber-400 hover:underline"
        >
          + Add card
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {/* descRefs.current[i]/featuresRefs.current[i] below are read to
            build a plain-object ref wrapper forwarded to FormatToolbar,
            which only ever reads .current inside its own click handlers
            (never during render) — a real ref-value read during render
            never happens, but the rule can't verify that through the
            wrapper-object indirection. */}
        {/* eslint-disable-next-line react-hooks/refs */}
        {value.map((service, i) => (
          <div key={i} className="rounded-lg border border-zinc-800 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wide text-zinc-600">Card {i + 1}</span>
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
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <DynamicTextInput
                value={service.title}
                onChange={(v) => update(i, { title: v })}
                placeholder="Card title"
                className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
              />
              <DynamicTextInput
                value={service.badge ?? ""}
                onChange={(v) => update(i, { badge: v })}
                placeholder="Badge (e.g. Top Rated)"
                className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div className="mt-2">
              <DynamicImagePicker value={service.image} onChange={(v) => update(i, { image: v })} category="services" />
            </div>
            <textarea
              ref={(el) => {
                descRefs.current[i] = el;
              }}
              value={service.description}
              onChange={(e) => update(i, { description: e.target.value })}
              placeholder="Description"
              rows={2}
              className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
            />
            <FormatToolbar targetRef={{ current: descRefs.current[i] ?? null }} value={service.description} onChange={(v) => update(i, { description: v })} />
            <textarea
              ref={(el) => {
                featuresRefs.current[i] = el;
              }}
              value={service.features.join("\n")}
              onChange={(e) => updateFeatures(i, e.target.value)}
              placeholder="Feature bullets, one per line"
              rows={3}
              className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
            />
            <FormatToolbar
              targetRef={{ current: featuresRefs.current[i] ?? null }}
              value={service.features.join("\n")}
              onChange={(v) => updateFeatures(i, v)}
            />
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <DynamicTextInput
                value={service.readMoreUrl ?? ""}
                onChange={(v) => update(i, { readMoreUrl: v })}
                placeholder="Read More link (e.g. /services/airport-transfers)"
                className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
              />
              <DynamicTextInput
                value={service.bookNowUrl ?? ""}
                onChange={(v) => update(i, { bookNowUrl: v })}
                placeholder="Book Now link (e.g. /contact)"
                className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
              />
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
              <input type="checkbox" checked={service.highlighted} onChange={(e) => update(i, { highlighted: e.target.checked })} />
              Highlighted (gold border)
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
