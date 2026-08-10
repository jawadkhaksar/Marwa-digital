"use client";

import { useState } from "react";
import { X, Plus, ChevronDown } from "lucide-react";
import type { StyleClass } from "@/lib/api";

export type PseudoState = "normal" | "hover" | "focus" | "active" | "visited";

const PSEUDO_STATES: PseudoState[] = ["normal", "hover", "focus", "active", "visited"];

/**
 * The panel-global "Selector & State" header (Phase 2b) — replaces the old
 * per-accordion Normal/Hover badge with one control that applies across
 * every accordion on the Style tab. `activeSelectorId` (owned by
 * PropertyPanel) is null when editing the element itself; picking a chip
 * below sets it to a StyleClass id, at which point every field on the panel
 * reads/writes that class's own style instead — see PropertyPanel's
 * `binding()`/`commitStyle`.
 */
export function SelectorStateHeader({
  attachedClassIds,
  allClasses,
  activeSelectorId,
  onSelectTarget,
  onAttachClass,
  onDetachClass,
  onCreateClass,
  pseudoState,
  onPseudoStateChange,
}: {
  attachedClassIds: string[];
  allClasses: StyleClass[];
  activeSelectorId: string | null;
  onSelectTarget: (id: string | null) => void;
  onAttachClass: (id: string) => void;
  onDetachClass: (id: string) => void;
  onCreateClass: (name: string) => Promise<StyleClass>;
  pseudoState: PseudoState;
  onPseudoStateChange: (state: PseudoState) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");

  const attached = attachedClassIds.map((id) => allClasses.find((c) => c.id === id)).filter((c): c is StyleClass => Boolean(c));
  const selectorCount = attached.length + 1; // +1 for the element itself
  const activeClass = activeSelectorId ? attached.find((c) => c.id === activeSelectorId) : undefined;

  const matches = allClasses.filter((c) => !attachedClassIds.includes(c.id) && c.name.toLowerCase().includes(query.toLowerCase()));
  const exactMatch = allClasses.find((c) => c.name.toLowerCase() === query.trim().toLowerCase());

  async function handlePick(cls: StyleClass) {
    onAttachClass(cls.id);
    onSelectTarget(cls.id);
    setAdding(false);
    setQuery("");
  }

  async function handleCreate() {
    const name = query.trim();
    if (!name) return;
    const created = exactMatch ?? (await onCreateClass(name));
    await handlePick(created);
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Style Selector</span>
        <span className="text-[10px] text-zinc-500">
          Inheriting {selectorCount} selector{selectorCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onSelectTarget(null)}
          className={`rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
            !activeSelectorId ? "border-amber-400/60 bg-amber-400/10 text-amber-300" : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
          }`}
          title="Edit this element's own style"
        >
          This element
        </button>

        {attached.map((cls) => (
          <span
            key={cls.id}
            className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
              activeSelectorId === cls.id ? "border-amber-400/60 bg-amber-400/10 text-amber-300" : "border-zinc-800 bg-zinc-900 text-zinc-300"
            }`}
          >
            <button type="button" onClick={() => onSelectTarget(cls.id)} className="font-mono">
              {cls.name}
            </button>
            <button type="button" onClick={() => onDetachClass(cls.id)} title="Detach class" className="text-zinc-500 hover:text-red-400">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        <div className="relative">
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="flex items-center gap-1 rounded-md border border-dashed border-zinc-700 px-2 py-1 text-[11px] text-zinc-400 hover:border-amber-400/60 hover:text-amber-300"
          >
            <Plus className="h-3 w-3" /> Add class
          </button>
          {adding && (
            <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-zinc-800 bg-zinc-900 p-2 shadow-xl">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") setAdding(false);
                }}
                placeholder="Search or create a class…"
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-100 focus:border-amber-400/80 focus:outline-none"
              />
              <div className="mt-1.5 max-h-40 overflow-y-auto">
                {matches.map((cls) => (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => handlePick(cls)}
                    className="block w-full rounded px-2 py-1 text-left font-mono text-[11px] text-zinc-300 hover:bg-zinc-800"
                  >
                    {cls.name}
                  </button>
                ))}
                {query.trim() && !exactMatch && (
                  <button
                    type="button"
                    onClick={handleCreate}
                    className="mt-1 block w-full rounded px-2 py-1 text-left text-[11px] text-amber-400 hover:bg-amber-400/10"
                  >
                    + Create &quot;{query.trim()}&quot;
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {activeClass && (
        <p className="rounded-md border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-[11px] text-amber-300">
          Editing class &quot;{activeClass.name}&quot; — changes apply everywhere this class is used.
        </p>
      )}

      <div className="flex items-center justify-between border-t border-zinc-800/80 pt-2">
        <div className="relative">
          <select
            value={pseudoState}
            onChange={(e) => onPseudoStateChange(e.target.value as PseudoState)}
            className="appearance-none rounded-md border border-zinc-800 bg-zinc-900 py-1 pl-2 pr-6 text-[11px] font-medium capitalize text-zinc-200 focus:border-amber-400/80 focus:outline-none"
          >
            {PSEUDO_STATES.map((s) => (
              <option key={s} value={s}>
                {s === "normal" ? "Normal" : `:${s}`}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-500" />
        </div>
        <button
          type="button"
          disabled
          title="Site-wide CSS-variable theme modes aren't built yet — this is a placeholder for a future release."
          className="flex items-center gap-1 rounded-md border border-zinc-800 px-2 py-1 text-[11px] text-zinc-600 opacity-60"
        >
          <Plus className="h-3 w-3" /> Variable modes
        </button>
      </div>
    </div>
  );
}
