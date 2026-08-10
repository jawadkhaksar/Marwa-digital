"use client";

import { useEffect, useState } from "react";
import type { SiteTemplateCondition, SiteTemplateTargetKind } from "@marwa/builder";
import { api, type Page } from "@/lib/api";

// Reserved slugs that already have their own dedicated condition kinds
// ("Home Page" / "Contact Page") — hidden from the plain Page picker so
// there's exactly one obvious way to target each of them.
const CORE_OVERRIDE_SLUGS = new Set(["core-home", "core-contact"]);

const TARGET_KIND_OPTIONS: { value: SiteTemplateTargetKind; label: string }[] = [
  { value: "entire_site", label: "Entire Site" },
  { value: "home", label: "Home Page" },
  { value: "contact", label: "Contact Page" },
  { value: "all_pages", label: "All Pages" },
  { value: "page", label: "Page" },
];

function defaultTargetFor(kind: SiteTemplateTargetKind): SiteTemplateCondition["target"] {
  switch (kind) {
    case "page":
      return { kind: "page", pageSlug: "" };
    default:
      return { kind };
  }
}

export function ConditionsModal({
  title,
  initialConditions,
  onClose,
  onSave,
}: {
  title: string;
  initialConditions: SiteTemplateCondition[];
  onClose: () => void;
  onSave: (conditions: SiteTemplateCondition[]) => Promise<void>;
}) {
  const [conditions, setConditions] = useState<SiteTemplateCondition[]>(
    initialConditions.length > 0 ? initialConditions : [{ include: true, target: { kind: "entire_site" } }]
  );
  const [pages, setPages] = useState<Page[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getPages().then(setPages).catch(() => {});
  }, []);

  const selectablePages = pages.filter((p) => !CORE_OVERRIDE_SLUGS.has(p.slug));

  function updateCondition(index: number, updater: (c: SiteTemplateCondition) => SiteTemplateCondition) {
    setConditions((list) => list.map((c, i) => (i === index ? updater(c) : c)));
  }

  function removeCondition(index: number) {
    setConditions((list) => list.filter((_, i) => i !== index));
  }

  function addCondition() {
    setConditions((list) => [...list, { include: true, target: { kind: "entire_site" } }]);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave(conditions);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save conditions");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">Edit Conditions — {title}</h2>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white">
            ✕
          </button>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Decide which pages this template applies to. The most specific matching Include wins; an Exclude at the same or higher specificity always removes it.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          {conditions.map((condition, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
              <select
                value={condition.include ? "include" : "exclude"}
                onChange={(e) => updateCondition(index, (c) => ({ ...c, include: e.target.value === "include" }))}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
              >
                <option value="include">Include</option>
                <option value="exclude">Exclude</option>
              </select>

              <select
                value={condition.target.kind}
                onChange={(e) => updateCondition(index, (c) => ({ ...c, target: defaultTargetFor(e.target.value as SiteTemplateTargetKind) }))}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
              >
                {TARGET_KIND_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {condition.target.kind === "page" && (
                <select
                  value={condition.target.pageSlug}
                  onChange={(e) => {
                    const page = selectablePages.find((p) => p.slug === e.target.value);
                    updateCondition(index, (c) => ({ ...c, target: { kind: "page", pageSlug: e.target.value, pageTitle: page?.title } }));
                  }}
                  className="min-w-[160px] rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
                >
                  <option value="">Select a page…</option>
                  {selectablePages.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.title}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={() => removeCondition(index)}
                disabled={conditions.length === 1}
                title={conditions.length === 1 ? "At least one condition is required" : "Remove condition"}
                className="ml-auto text-zinc-500 hover:text-red-400 disabled:opacity-30 disabled:hover:text-zinc-500"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addCondition}
          className="mt-3 rounded-lg border border-dashed border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-amber-400 hover:text-amber-400"
        >
          + Add Condition
        </button>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || conditions.some((c) => c.target.kind === "page" && !c.target.pageSlug)}
            className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Conditions"}
          </button>
        </div>
      </div>
    </div>
  );
}
