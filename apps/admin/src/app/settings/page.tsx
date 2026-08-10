"use client";

import { useEffect, useState } from "react";
import { PhoneInputWithCountry } from "@marwa/builder/react";
import { isValidPhone } from "@marwa/builder";
import { AuthGuard } from "@/components/AuthGuard";
import { RequireAdmin } from "@/components/RequireAdmin";
import { DashboardShell } from "@/components/DashboardShell";
import { ImagePicker } from "@/components/ImagePicker";
import { api, type SiteSettings } from "@/lib/api";

export default function SettingsPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <RequireAdmin>
          <SettingsContent />
        </RequireAdmin>
      </DashboardShell>
    </AuthGuard>
  );
}

function SettingsContent() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getSettings().then(setSettings).catch((err) => setError(err.message));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    if (settings.contactPhone && !isValidPhone(settings.contactPhone)) {
      setError("Contact Phone is not a valid phone number.");
      return;
    }
    if (settings.whatsappNumber && !isValidPhone(settings.whatsappNumber)) {
      setError("WhatsApp Number is not a valid phone number.");
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return <p className="text-sm text-zinc-500">Loading…</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-zinc-300">General site information used across the public website.</p>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {saved && <p className="mt-3 text-sm text-emerald-400">Settings saved.</p>}

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div>
          <label className="mb-1 block text-xs text-zinc-400">
            Site Logo <span className="text-zinc-600">(shown in header &amp; footer — leave empty to use the default mark)</span>
          </label>
          <ImagePicker
            images={settings.logoImage ? [settings.logoImage] : []}
            onChange={(images) => setSettings({ ...settings, logoImage: images[images.length - 1] ?? null })}
            category="branding"
          />
        </div>
        <Field label="Site Name" value={settings.siteName} onChange={(v) => setSettings({ ...settings, siteName: v })} />
        <Field label="Tagline" value={settings.tagline} onChange={(v) => setSettings({ ...settings, tagline: v })} />
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Description</label>
          <textarea
            value={settings.description}
            onChange={(e) => setSettings({ ...settings, description: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact Email" value={settings.contactEmail} onChange={(v) => setSettings({ ...settings, contactEmail: v })} />
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Contact Phone</label>
            <PhoneInputWithCountry value={settings.contactPhone} onChange={(v) => setSettings({ ...settings, contactPhone: v })} showFlag={false} />
          </div>
          <Field label="Response Time (e.g. Under 24 Hours)" value={settings.contactResponseTime} onChange={(v) => setSettings({ ...settings, contactResponseTime: v })} />
          <div>
            <label className="mb-1 block text-xs text-zinc-400">WhatsApp Number</label>
            <PhoneInputWithCountry
              value={settings.whatsappNumber ?? ""}
              onChange={(v) => setSettings({ ...settings, whatsappNumber: v || null })}
              showFlag={false}
            />
          </div>
        </div>
        <p className="-mt-3 text-xs text-zinc-500">
          WhatsApp Number powers the floating chat button on every public page. Include the country code, no spaces or
          symbols other than a leading +. Leave empty to hide the button.
        </p>
        <Field label="Contact Address" value={settings.contactAddress} onChange={(v) => setSettings({ ...settings, contactAddress: v })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Facebook URL" value={settings.facebookUrl ?? ""} onChange={(v) => setSettings({ ...settings, facebookUrl: v || null })} />
          <Field label="Instagram URL" value={settings.instagramUrl ?? ""} onChange={(v) => setSettings({ ...settings, instagramUrl: v || null })} />
          <Field label="Twitter URL" value={settings.twitterUrl ?? ""} onChange={(v) => setSettings({ ...settings, twitterUrl: v || null })} />
          <Field label="YouTube URL" value={settings.youtubeUrl ?? ""} onChange={(v) => setSettings({ ...settings, youtubeUrl: v || null })} />
          <Field label="LinkedIn URL" value={settings.linkedinUrl ?? ""} onChange={(v) => setSettings({ ...settings, linkedinUrl: v || null })} />
        </div>

        <h2 className="mt-4 border-t border-zinc-800 pt-4 text-lg font-semibold">Footer</h2>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">
            Copyright Text <span className="text-zinc-600">(use {"{year}"} and {"{siteName}"} as placeholders)</span>
          </label>
          <input
            type="text"
            value={settings.footerCopyrightText}
            onChange={(e) => setSettings({ ...settings, footerCopyrightText: e.target.value })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
          />
        </div>

        <h2 className="mt-4 border-t border-zinc-800 pt-4 text-lg font-semibold">Site-Wide Animation</h2>
        <div className="flex flex-col gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3">
          <label className="flex items-center justify-between text-sm text-zinc-300">
            <span>
              Smooth Scroll <span className="text-zinc-600">— buttery inertial scrolling across the whole site (Lenis)</span>
            </span>
            <input
              type="checkbox"
              checked={settings.smoothScrollEnabled}
              onChange={(e) => setSettings({ ...settings, smoothScrollEnabled: e.target.checked })}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-amber-400 focus:ring-amber-400"
            />
          </label>
          <label className="flex items-center justify-between text-sm text-zinc-300">
            <span>
              Custom Cursor <span className="text-zinc-600">— a gold dot that trails the mouse and grows over links/buttons</span>
            </span>
            <input
              type="checkbox"
              checked={settings.customCursorEnabled}
              onChange={(e) => setSettings({ ...settings, customCursorEnabled: e.target.checked })}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-amber-400 focus:ring-amber-400"
            />
          </label>
          <label className="flex items-center justify-between text-sm text-zinc-300">
            <span>
              Cursor Glow <span className="text-zinc-600">— a soft gold radial glow that follows the mouse</span>
            </span>
            <input
              type="checkbox"
              checked={settings.cursorGlowEnabled}
              onChange={(e) => setSettings({ ...settings, cursorGlowEnabled: e.target.checked })}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-amber-400 focus:ring-amber-400"
            />
          </label>
        </div>

        <h2 className="mt-4 border-t border-zinc-800 pt-4 text-lg font-semibold">Integrations</h2>

        <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-4">
          <h3 className="text-sm font-semibold text-zinc-200">reCAPTCHA</h3>
          <p className="mt-1 text-xs text-zinc-500">Protects Form blocks from spam/abuse while letting real visitors through.</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Site Key" value={settings.recaptchaV2SiteKey ?? ""} onChange={(v) => setSettings({ ...settings, recaptchaV2SiteKey: v || null })} />
            <Field label="Secret Key" value={settings.recaptchaV2SecretKey ?? ""} onChange={(v) => setSettings({ ...settings, recaptchaV2SecretKey: v || null })} />
          </div>
        </div>

        <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-4">
          <h3 className="text-sm font-semibold text-zinc-200">reCAPTCHA V3</h3>
          <p className="mt-1 text-xs text-zinc-500">Invisible, score-based — no widget shown, runs automatically on submit.</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Site Key" value={settings.recaptchaV3SiteKey ?? ""} onChange={(v) => setSettings({ ...settings, recaptchaV3SiteKey: v || null })} />
            <Field label="Secret Key" value={settings.recaptchaV3SecretKey ?? ""} onChange={(v) => setSettings({ ...settings, recaptchaV3SecretKey: v || null })} />
          </div>
          <div className="mt-3 max-w-[200px]">
            <Field label="Score Threshold (0–1, default 0.5)" value={settings.recaptchaV3ScoreThreshold} onChange={(v) => setSettings({ ...settings, recaptchaV3ScoreThreshold: v })} />
          </div>
        </div>

        <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-4">
          <h3 className="text-sm font-semibold text-zinc-200">Outgoing Email (SMTP)</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Sends contact inquiries and form submission notifications through your own mailbox — e.g. a Hostinger or A2Hosting webmail account.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="SMTP Host" value={settings.smtpHost ?? ""} onChange={(v) => setSettings({ ...settings, smtpHost: v || null })} placeholder="smtp.hostinger.com" />
            <Field label="SMTP Port" value={settings.smtpPort ?? ""} onChange={(v) => setSettings({ ...settings, smtpPort: v || null })} placeholder="465" />
            <Field label="Username" value={settings.smtpUser ?? ""} onChange={(v) => setSettings({ ...settings, smtpUser: v || null })} placeholder="hello@marwadigital.com" />
            <Field label="Password" type="password" value={settings.smtpPassword ?? ""} onChange={(v) => setSettings({ ...settings, smtpPassword: v || null })} />
            <Field label="From Email" value={settings.smtpFromEmail ?? ""} onChange={(v) => setSettings({ ...settings, smtpFromEmail: v || null })} placeholder="hello@marwadigital.com" />
            <Field label="From Name" value={settings.smtpFromName ?? ""} onChange={(v) => setSettings({ ...settings, smtpFromName: v || null })} placeholder="Marwa Digital" />
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={settings.smtpSecure}
              onChange={(e) => setSettings({ ...settings, smtpSecure: e.target.checked })}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-950"
            />
            Use SSL/TLS (enable for port 465, disable for port 587/25)
          </label>
        </div>

        <div className="border-t border-zinc-800 pt-4">
          <h2 className="text-sm font-semibold text-zinc-100">Blog Templates</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Choose which of the 3 layout variants /blog and /blog/[slug] render. The archive/post content stays the
            same either way — only the layout changes. See Theme Builder to edit the newsletter/CTA sections these
            templates can show.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Blog Archive Template</label>
              <select
                value={settings.blogArchiveTemplate}
                onChange={(e) => setSettings({ ...settings, blogArchiveTemplate: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              >
                <option value="A">A — Modern Editorial</option>
                <option value="B">B — Minimalist Luxury</option>
                <option value="C">C — Dynamic Alpine Grid</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Single Post Template</label>
              <select
                value={settings.blogPostTemplate}
                onChange={(e) => setSettings({ ...settings, blogPostTemplate: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              >
                <option value="A">A — Full-Width Hero</option>
                <option value="B">B — Split Column Clean</option>
                <option value="C">C — Classic Reader</option>
              </select>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-2 w-fit rounded-lg bg-amber-400 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-300 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "password" | "number";
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-zinc-400">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
      />
    </div>
  );
}
