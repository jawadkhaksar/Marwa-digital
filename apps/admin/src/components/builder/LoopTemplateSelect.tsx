"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type SiteTemplate } from "@/lib/api";

/**
 * "Select Loop Template" dropdown for the `Posts` block's `loopTemplateId`
 * field — lists every active "blog_loop_item" SiteTemplate (a reusable
 * card design built once in Theme Builder, then repeated per post). No
 * other PropertyPanel field fetches SiteTemplates for a dropdown — every
 * other special-cased field here (SimpleRepeaterEditor, TableEditor, ...)
 * edits data that already lives on the node itself. This one is genuinely
 * bespoke: the choices are dynamic admin content elsewhere in the system,
 * not something a `z.enum` in the schema could express.
 */
export function LoopTemplateSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [templates, setTemplates] = useState<SiteTemplate[] | null>(null);

  useEffect(() => {
    api
      .getSiteTemplates("blog_loop_item")
      .then((all) => setTemplates(all.filter((t) => t.active)))
      .catch(() => setTemplates([]));
  }, []);

  return (
    <div>
      <label className="mb-1 block text-xs text-zinc-400">Select Loop Template</label>
      {templates === null ? (
        <p className="text-xs text-zinc-500">Loading card designs…</p>
      ) : templates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 p-3 text-xs text-zinc-500">
          No card designs yet — this block will use its built-in card until you create one.{" "}
          <Link href="/theme-builder" target="_blank" className="text-amber-400 hover:underline">
            Design one in Theme Builder
          </Link>
          .
        </div>
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
        >
          <option value="">None (use built-in card)</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
