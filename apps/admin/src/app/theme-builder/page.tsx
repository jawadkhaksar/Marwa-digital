"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { ConditionsModal } from "@/components/theme-builder/ConditionsModal";
import { summarizeConditions } from "@/lib/siteTemplateSummary";
import { api, type SiteTemplate } from "@/lib/api";
import type { SiteTemplateType } from "@marwa/builder";

const PARTS: { type: SiteTemplateType; label: string; description: string }[] = [
  { type: "header", label: "Header", description: "Site navigation shown at the top of a page." },
  { type: "footer", label: "Footer", description: "Site info and links shown at the bottom of a page." },
  {
    type: "blog_archive_extra",
    label: "Blog Archive — Extra Section",
    description: "An editable block section shown on the /blog archive page (e.g. a newsletter signup). Only the active one is used — no page targeting needed.",
  },
  {
    type: "blog_post_cta",
    label: "Blog Post — CTA Banner",
    description: "An editable block section shown at the bottom of every blog post, replacing the default \"Ready to book?\" banner. Only the active one is used.",
  },
  {
    type: "blog_single",
    label: "Blog — Single Post",
    description: "A fully custom layout for every /blog/[slug] post, replacing the default post template. Use the dynamic Post Title/Featured Image/Content/Info blocks to pull each post's real data. Only the active one is used.",
  },
  {
    type: "blog_loop_item",
    label: "Blog — Loop Item (Card)",
    description: "A reusable single-card design (image, title, excerpt, button) selected from any Posts block's own settings and repeated once per post. Unlike the sections above, more than one can be active — each Posts block picks which card to use.",
  },
];

export default function ThemeBuilderPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <ThemeBuilderContent />
      </DashboardShell>
    </AuthGuard>
  );
}

function ThemeBuilderContent() {
  const router = useRouter();
  const [templates, setTemplates] = useState<SiteTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conditionsTarget, setConditionsTarget] = useState<SiteTemplate | null>(null);
  const [creating, setCreating] = useState<SiteTemplateType | null>(null);

  function load() {
    api
      .getSiteTemplates()
      .then(setTemplates)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load templates"))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(type: SiteTemplateType) {
    setCreating(type);
    try {
      const partLabel = PARTS.find((p) => p.type === type)?.label ?? type;
      const template = await api.createSiteTemplate({
        type,
        title: `New ${partLabel}`,
        conditions: [{ include: true, target: { kind: "entire_site" } }],
      });
      router.push(`/theme-builder/${template.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create template");
      setCreating(null);
    }
  }

  async function handleToggleActive(template: SiteTemplate) {
    await api.updateSiteTemplate(template.id, { active: !template.active });
    load();
  }

  async function handleDelete(template: SiteTemplate) {
    if (!confirm(`Delete "${template.title}"? This can't be undone.`)) return;
    await api.deleteSiteTemplate(template.id);
    load();
  }

  async function handleSaveConditions(conditions: SiteTemplate["conditions"]) {
    if (!conditionsTarget) return;
    await api.updateSiteTemplate(conditionsTarget.id, { conditions });
    load();
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold">Theme Builder</h1>
      <p className="mt-1 text-sm text-zinc-300">
        Design a custom Header or Footer and control exactly which pages it replaces the site&apos;s default one on.
      </p>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="mt-6 text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="mt-6 flex flex-col gap-8">
          {PARTS.map((part) => {
            const partTemplates = templates.filter((t) => t.type === part.type);
            return (
              <section key={part.type}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-100">{part.label}</h2>
                    <p className="text-xs text-zinc-500">{part.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCreate(part.type)}
                    disabled={creating === part.type}
                    className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-300 disabled:opacity-50"
                  >
                    {creating === part.type ? "Creating…" : `+ Add New ${part.label}`}
                  </button>
                </div>

                {partTemplates.length === 0 ? (
                  <p className="mt-3 rounded-lg border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-500">
                    {part.type === "header" || part.type === "footer"
                      ? `No custom ${part.label.toLowerCase()} templates yet — the site uses its default ${part.label.toLowerCase()}.`
                      : part.type === "blog_loop_item"
                        ? `No card designs yet — Posts Grid blocks fall back to a built-in card until you create one.`
                        : `No custom section yet — this slot is skipped until you add one and activate it.`}
                  </p>
                ) : (
                  <div className="mt-3 flex flex-col gap-2">
                    {partTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3"
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleActive(template)}
                          title={template.active ? "Active — click to disable" : "Disabled — click to enable"}
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${template.active ? "bg-emerald-400" : "bg-zinc-700"}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-zinc-100">{template.title}</p>
                          {(part.type === "header" || part.type === "footer") && (
                            <p className="truncate text-xs text-zinc-500">{summarizeConditions(template.conditions)}</p>
                          )}
                        </div>
                        {(part.type === "header" || part.type === "footer") && (
                          <button
                            type="button"
                            onClick={() => setConditionsTarget(template)}
                            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
                          >
                            Conditions
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => router.push(`/theme-builder/${template.id}`)}
                          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(template)}
                          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {conditionsTarget && (
        <ConditionsModal
          title={conditionsTarget.title}
          initialConditions={conditionsTarget.conditions}
          onClose={() => setConditionsTarget(null)}
          onSave={handleSaveConditions}
        />
      )}
    </div>
  );
}
