"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { api, type EmailTemplateListItem, type EmailTemplateDetail, type SiteSettings } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Admin-uploaded Site Logo lives on the API at /uploads/** — same small
// per-file resolver pattern as DashboardShell.tsx and settings/general/page.tsx.
function resolveUploadUrl(url: string): string {
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

/** Mirrors emailShell()'s own headerBrand logic in packages/api/src/lib/notifications.ts — real logo image when Settings has one, styled site name text otherwise. The live send uses a CID attachment instead of this URL (more reliable across mail clients), but for an in-browser preview a plain URL renders fine. */
function buildHeaderBrand(settings: SiteSettings | null): string {
  const siteName = settings?.siteName || "Marwa Digital";
  if (settings?.logoImage) {
    return `<img src="${resolveUploadUrl(settings.logoImage)}" alt="${siteName}" style="max-height:40px;max-width:200px;" />`;
  }
  return `<span style="color:#2563ff;font-size:22px;font-weight:700;">${siteName}</span>`;
}

// Realistic stand-ins for the structured-block placeholders (journey table,
// driver contact, etc.) that only ever get built from real booking data
// server-side — the preview substitutes these so an admin can see roughly
// what a real send looks like without needing a live booking.
const SAMPLE_VALUES: Record<string, string> = {
  customerName: "Sarah Mitchell",
  driverName: "Marco Huber",
  siteName: "Marwa Digital",
  bookingRef: "ET-DEMO4821",
  trackingUrl: "https://marwadigital.com/track/ET-DEMO4821",
  journeyAndReservation: `<table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
    <tr><td colspan="2" style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#999;padding-bottom:6px;">Journey</td></tr>
    <tr><td style="padding:4px 0;color:#666;">Pickup</td><td style="padding:4px 0;text-align:right;">Aug 15, 2026, 10:00 AM</td></tr>
    <tr><td style="padding:4px 0;color:#666;">Pickup address</td><td style="padding:4px 0;text-align:right;">Salzburg Airport (SZG)</td></tr>
    <tr><td colspan="2" style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#999;padding:12px 0 6px;">Reservation</td></tr>
    <tr><td style="padding:4px 0;color:#666;">Booking ref</td><td style="padding:4px 0;text-align:right;">ET-DEMO4821</td></tr>
    <tr><td style="padding:4px 0;color:#666;">Total fare</td><td style="padding:4px 0;text-align:right;">EUR 180.00</td></tr>
  </table>`,
  driverContact: `<table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
    <tr><td colspan="2" style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#999;padding-bottom:6px;">Your Driver</td></tr>
    <tr><td style="padding:4px 0;color:#666;">Name</td><td style="padding:4px 0;text-align:right;">Marco Huber</td></tr>
    <tr><td style="padding:4px 0;color:#666;">Phone</td><td style="padding:4px 0;text-align:right;"><a href="tel:+436601112233">+43 660 111 2233</a></td></tr>
  </table>`,
  customerContact: `<table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
    <tr><td colspan="2" style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#999;padding-bottom:6px;">Customer</td></tr>
    <tr><td style="padding:4px 0;color:#666;">Name</td><td style="padding:4px 0;text-align:right;">Sarah Mitchell</td></tr>
    <tr><td style="padding:4px 0;color:#666;">Phone</td><td style="padding:4px 0;text-align:right;"><a href="tel:+441234567890">+44 1234 567890</a></td></tr>
  </table>`,
  flightAndNotes: `<table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
    <tr><td colspan="2" style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#999;padding-bottom:6px;">Flight</td></tr>
    <tr><td style="padding:4px 0;color:#666;">Flight number</td><td style="padding:4px 0;text-align:right;">LH1234</td></tr>
  </table>`,
  reviewButtons: `<a href="#" style="display:inline-block;margin:0 8px 8px 0;padding:10px 20px;background:#2563ff;color:#000;text-decoration:none;border-radius:6px;font-weight:600;">Review us on Google</a>`,
  // EMAIL_SHELL's own variables — see packages/api/src/lib/emailTemplates.ts.
  // headerBrand isn't listed here — it's computed live from real Settings by
  // buildHeaderBrand() below, not a static sample, since it's exactly the
  // logo-vs-text distinction admins are previewing to check.
  contactEmail: "office@marwadigital.com",
  contactPhone: "+43 660 4949 358",
  contactPhoneTel: "+436604949358",
  year: String(new Date().getFullYear()),
};

const SAMPLE_SHELL_CONTENT = `<p>Hi Sarah Mitchell,</p><p>This is where each individual email's own message goes — the greeting, journey details, buttons, whatever that template's body contains.</p>`;

function renderTemplate(str: string, vars: Record<string, string>): string {
  return str.replace(/\{\{(\w+)\}\}/g, (match, key: string) => (key in vars ? vars[key] : match));
}

function wrapPreviewDoc(subject: string | null, innerHtml: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:16px;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#fff;">
      ${subject !== null ? `<div style="padding:8px 4px 16px;font-size:11px;color:#999;">Subject: <strong>${subject}</strong></div>` : ""}
      ${innerHtml}
    </div>
  </body></html>`;
}

/**
 * Editing an individual template previews it wrapped in the shared shell's
 * DEFAULT (a normal admin isn't usually editing both at once); editing the
 * shell itself previews its own markup directly with sample content filled
 * in, since it's the outermost layer and there's nothing further to wrap it in.
 */
function buildPreviewHtml(subject: string, bodyHtml: string, isShell: boolean, headerBrand: string): string {
  if (isShell) {
    const rendered = renderTemplate(bodyHtml, { ...SAMPLE_VALUES, content: SAMPLE_SHELL_CONTENT, headerBrand });
    return wrapPreviewDoc(null, rendered);
  }

  const body = renderTemplate(bodyHtml, SAMPLE_VALUES);
  const renderedSubject = renderTemplate(subject, SAMPLE_VALUES);
  const shell = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#222;">
      <div style="background:#111;padding:20px;text-align:center;">${headerBrand}</div>
      <div style="padding:24px;background:#fff;border:1px solid #eee;border-top:none;">
        ${body}
        <div style="border-top:1px solid #e5e7eb;margin-top:32px;padding-top:24px;text-align:center;font-size:14px;color:#6b7280;">
          <p style="margin:0 0 8px 0;">Need help with your booking?</p>
          <p style="margin:0;">Email: <a href="mailto:${SAMPLE_VALUES.contactEmail}" style="color:#2563ff;text-decoration:none;">${SAMPLE_VALUES.contactEmail}</a> &nbsp;|&nbsp; Phone: <a href="tel:${SAMPLE_VALUES.contactPhoneTel}" style="color:#2563ff;text-decoration:none;">${SAMPLE_VALUES.contactPhone}</a></p>
          <p style="margin-top:12px;font-size:12px;color:#9ca3af;">&copy; ${SAMPLE_VALUES.year} Marwa Digital. All rights reserved.</p>
        </div>
      </div>
    </div>`;
  return wrapPreviewDoc(renderedSubject, shell);
}

export default function EmailTemplatesPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <EmailTemplatesContent />
      </DashboardShell>
    </AuthGuard>
  );
}

function EmailTemplatesContent() {
  const [items, setItems] = useState<EmailTemplateListItem[] | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [detail, setDetail] = useState<EmailTemplateDetail | null>(null);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newName, setNewName] = useState("");
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  function loadList() {
    api.getEmailTemplates().then(setItems).catch((err) => setError(err.message));
  }

  useEffect(loadList, []);
  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDetail(null);
      return;
    }
    setSaved(false);
    setError(null);
    api
      .getEmailTemplate(selectedKey)
      .then((d) => {
        setDetail(d);
        setSubject(d.subject);
        setBodyHtml(d.bodyHtml);
        setActive(d.active);
      })
      .catch((err) => setError(err.message));
  }, [selectedKey]);

  const headerBrand = useMemo(() => buildHeaderBrand(settings), [settings]);
  const previewHtml = useMemo(
    () => buildPreviewHtml(subject, bodyHtml, detail?.isShell ?? false, headerBrand),
    [subject, bodyHtml, detail?.isShell, headerBrand]
  );

  async function save() {
    if (!selectedKey || !detail) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await api.saveEmailTemplate(selectedKey, { name: detail.isCustom ? detail.name : undefined, subject, bodyHtml, active });
      setDetail((d) => (d ? { ...d, subject: updated.subject, bodyHtml: updated.bodyHtml, active: updated.active, updatedAt: updated.updatedAt } : d));
      setSaved(true);
      loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  async function resetToDefault() {
    if (!selectedKey || !confirm("Revert this template to its built-in default? Your edits will be discarded.")) return;
    setSaving(true);
    try {
      await api.resetEmailTemplate(selectedKey);
      const d = await api.getEmailTemplate(selectedKey);
      setDetail(d);
      setSubject(d.subject);
      setBodyHtml(d.bodyHtml);
      setActive(d.active);
      loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset template");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustom() {
    if (!selectedKey || !confirm(`Delete the custom template "${selectedKey}"? This cannot be undone.`)) return;
    setSaving(true);
    try {
      await api.deleteEmailTemplate(selectedKey);
      setSelectedKey(null);
      loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete template");
    } finally {
      setSaving(false);
    }
  }

  async function createCustom(e: React.FormEvent) {
    e.preventDefault();
    const key = newKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    if (!key || !newName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.saveEmailTemplate(key, {
        name: newName.trim(),
        subject: "New subject — {{customerName}}",
        bodyHtml: "<p>Hi {{customerName}},</p>\n<p>Write your email content here.</p>",
        active: true,
      });
      setCreating(false);
      setNewKey("");
      setNewName("");
      loadList();
      setSelectedKey(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create template");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Email Templates</h1>
          <p className="mt-1 text-sm text-zinc-300">Edit the wording of every automatic email — booking confirmations, driver assignment, review requests.</p>
        </div>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-amber-400 hover:text-amber-400"
        >
          + New Custom Template
        </button>
      </div>

      {creating && (
        <form onSubmit={createCustom} className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Key (used by a developer to wire up a future trigger)</label>
            <input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="PAYMENT_REMINDER"
              className="w-56 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs uppercase focus:border-amber-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Payment Reminder"
              className="w-56 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
            />
          </div>
          <button type="submit" disabled={saving} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300 disabled:opacity-50">
            Create
          </button>
          <p className="w-full text-[11px] text-amber-400/80">
            This won&apos;t send anywhere on its own — a developer still needs to add code calling it by this key, same as the 4 built-in templates below.
          </p>
        </form>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-4 grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col gap-2">
          {!items && <p className="text-sm text-zinc-500">Loading…</p>}
          {items?.map((item) => (
            <button
              key={item.key}
              onClick={() => setSelectedKey(item.key)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                selectedKey === item.key ? "border-amber-400 bg-amber-400/5" : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-zinc-100">{item.name}</span>
                {!item.isShell && !item.active && <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">Inactive</span>}
              </div>
              <div className="mt-1 flex gap-1.5">
                {item.isShell && <span className="rounded bg-sky-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300">Shared</span>}
                {item.isCustom ? (
                  <span className="rounded bg-purple-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-purple-300">Custom</span>
                ) : item.isOverridden ? (
                  <span className="rounded bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">Edited</span>
                ) : (
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">Default</span>
                )}
              </div>
            </button>
          ))}
        </div>

        <div>
          {!detail && <p className="text-sm text-zinc-500">Select a template on the left to edit it.</p>}
          {detail && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-100">{detail.name}</h2>
                  <p className="mt-1 text-xs text-zinc-500">{detail.description}</p>
                </div>
                {!detail.isShell && (
                  <label className="flex shrink-0 items-center gap-2 text-xs text-zinc-300">
                    <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-amber-400" />
                    Active
                  </label>
                )}
              </div>

              {saved && <p className="mt-3 text-sm text-emerald-400">Saved.</p>}

              {!detail.isShell && (
                <div className="mt-4">
                  <label className="mb-1 block text-xs text-zinc-400">Subject</label>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                  />
                </div>
              )}

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_260px]">
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Body (HTML + {"{{variables}}"})</label>
                  <textarea
                    value={bodyHtml}
                    onChange={(e) => setBodyHtml(e.target.value)}
                    rows={16}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs leading-relaxed focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Available variables</h3>
                  {detail.variables.length === 0 && <p className="mt-2 text-xs text-zinc-600">None — this is a custom draft template.</p>}
                  <div className="mt-2 flex flex-col gap-2">
                    {detail.variables.map((v) => (
                      <div key={v.key}>
                        <code className="text-[11px] text-amber-300">{`{{${v.key}}}`}</code>
                        <p className="mt-0.5 text-[11px] text-zinc-500">{v.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="rounded-lg bg-amber-400 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-300 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button type="button" onClick={() => setShowPreview(true)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-amber-400 hover:text-amber-400">
                  Preview
                </button>
                {detail.hasDefault && (
                  <button type="button" onClick={resetToDefault} disabled={saving} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-500">
                    Reset to Default
                  </button>
                )}
                {detail.isCustom && (
                  <button type="button" onClick={deleteCustom} disabled={saving} className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-400 hover:bg-red-950">
                    Delete
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowPreview(false)}>
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-zinc-800 p-3">
              <span className="text-sm font-semibold text-zinc-200">Preview (sample data)</span>
              <button onClick={() => setShowPreview(false)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </div>
            <iframe srcDoc={previewHtml} title="Email preview" className="h-[70vh] w-full flex-1 bg-white" />
          </div>
        </div>
      )}
    </div>
  );
}
