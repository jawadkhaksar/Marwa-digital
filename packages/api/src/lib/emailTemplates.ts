import fs from "fs";
import path from "path";
import { prisma } from "@marwa/db";

// Admin-editable registry for the transactional emails this CMS sends. Each
// entry's defaultSubject/defaultBody is the exact content that gets sent
// today — an admin who never opens Admin → Email Templates gets
// byte-identical output, since the senders fall back to these defaults
// whenever no active EmailTemplate row exists for that key (see the
// DB-first/fallback pattern used for SMTP settings elsewhere in this
// codebase).
//
// Every {{variable}} below is plain text, safe for an admin to move around
// or drop. (The transport platform this CMS was extracted from also had
// structured-block placeholders that expanded to code-rendered booking
// tables; nothing here needs them.)

export interface EmailTemplateVariable {
  key: string;
  description: string;
}

export interface EmailTemplateDef {
  key: string;
  name: string;
  description: string;
  defaultSubject: string;
  defaultBody: string;
  variables: EmailTemplateVariable[];
  // True only for EMAIL_SHELL — it has no subject of its own (it wraps
  // every other template's already-rendered subject/body, it doesn't send
  // anything by itself).
  noSubject?: boolean;
}

export const EMAIL_TEMPLATE_DEFS: EmailTemplateDef[] = [
  {
    key: "EMAIL_SHELL",
    name: "Header & Footer (Shared)",
    description:
      "Wraps every email below — the dark logo band at the top and the support-contact footer at the bottom. Editing this changes all of them at once. {{content}} marks where each individual email's own body gets inserted.",
    defaultSubject: "",
    noSubject: true,
    defaultBody: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#222;">
  <div style="background:#111;padding:20px;text-align:center;">
    {{headerBrand}}
  </div>
  <div style="padding:24px;background:#fff;border:1px solid #eee;border-top:none;">
    {{content}}
    <div style="border-top:1px solid #e5e7eb;margin-top:32px;padding-top:24px;text-align:center;font-size:14px;color:#6b7280;">
      <p style="margin:0 0 8px 0;">Need help?</p>
      <p style="margin:0;">
        Email: <a href="mailto:{{contactEmail}}" style="color:#2563ff;text-decoration:none;">{{contactEmail}}</a>
        &nbsp;|&nbsp;
        Phone: <a href="tel:{{contactPhoneTel}}" style="color:#2563ff;text-decoration:none;">{{contactPhone}}</a>
      </p>
      <p style="margin-top:12px;font-size:12px;color:#9ca3af;">&copy; {{year}} {{siteName}}. All rights reserved.</p>
    </div>
  </div>
</div>`,
    variables: [
      { key: "content", description: "The individual email's own subject-specific body. Required — this is where each email's actual message goes." },
      { key: "headerBrand", description: "The logo image (if one is set in Settings → General) or the site name as gold text — computed automatically, not separately editable." },
      { key: "siteName", description: "Site name (Settings → General)." },
      { key: "contactEmail", description: "Support email (Settings → General → Contact Email)." },
      { key: "contactPhone", description: "Support phone, formatted for display (Settings → General → Contact Phone)." },
      { key: "contactPhoneTel", description: "Same phone number stripped to digits/+ only, for the tel: link href." },
      { key: "year", description: "Current year, for the copyright line." },
    ],
  },
  {
    key: "CONTACT_INQUIRY",
    name: "Contact Inquiry Notification",
    description:
      "Sent to the site's own inbox whenever a visitor submits the Contact form. The recipient is INQUIRY_NOTIFY_EMAIL, falling back to Settings → General → Contact Email.",
    defaultSubject: "New contact inquiry — {{name}}",
    defaultBody: `<p>A new inquiry was submitted on {{siteName}}.</p>
<table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
  <tr><td style="padding:4px 0;color:#666;">Name</td><td style="padding:4px 0;text-align:right;">{{name}}</td></tr>
  <tr><td style="padding:4px 0;color:#666;">Email</td><td style="padding:4px 0;text-align:right;">{{email}}</td></tr>
  <tr><td style="padding:4px 0;color:#666;">Phone</td><td style="padding:4px 0;text-align:right;">{{phone}}</td></tr>
  <tr><td style="padding:4px 0;color:#666;">Received</td><td style="padding:4px 0;text-align:right;">{{receivedAt}}</td></tr>
</table>
<p style="margin-top:20px;"><strong>Message:</strong><br/>{{message}}</p>`,
    variables: [
      { key: "siteName", description: "Site name (Settings → General)." },
      { key: "name", description: "The visitor's name." },
      { key: "email", description: "The visitor's email address." },
      { key: "phone", description: "The visitor's phone number, or an em-dash if they left it blank." },
      { key: "message", description: "The message body they typed, or an em-dash if empty." },
      { key: "receivedAt", description: "When the inquiry was submitted." },
    ],
  },
  {
    key: "PASSWORD_RESET",
    name: "Admin Password Reset",
    description: "Sent to a staff member (Admin/Editor) when they request a password reset from the admin login screen.",
    defaultSubject: "Reset your {{siteName}} admin password",
    defaultBody: `<p>Hi {{name}},</p>
<p>We received a request to reset the password on your {{siteName}} admin account. This link expires in {{expiresIn}}.</p>
<p style="margin:24px 0;"><a href="{{resetUrl}}" style="display:inline-block;background:#2563ff;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Reset Password</a></p>
<p style="font-size:13px;color:#666;">If you didn't request this, you can safely ignore this email — your password will stay unchanged.</p>`,
    variables: [
      { key: "name", description: "The account holder's name." },
      { key: "resetUrl", description: "The one-time reset link (valid for 1 hour)." },
      { key: "expiresIn", description: "Human-readable expiration window, e.g. \"1 hour\"." },
    ],
  },
];

export const KNOWN_EMAIL_TEMPLATE_KEYS = EMAIL_TEMPLATE_DEFS.map((d) => d.key);

export function getEmailTemplateDef(key: string): EmailTemplateDef | undefined {
  return EMAIL_TEMPLATE_DEFS.find((d) => d.key === key);
}

/** `{{key}}` -> vars[key]; a placeholder with no matching var is left as-is (a visible typo beats a silently vanished block). */
export function renderTemplate(str: string, vars: Record<string, string>): string {
  return str.replace(/\{\{(\w+)\}\}/g, (match, key: string) => (key in vars ? vars[key] : match));
}

/**
 * The admin's saved override for `key` if one exists and is active, else this
 * def's own defaults — the single source of truth either way, so there's no
 * separately-maintained hardcoded copy elsewhere to drift out of sync.
 */
export async function resolveEmailTemplate(key: string): Promise<{ subject: string; bodyHtml: string }> {
  const row = await prisma.emailTemplate.findUnique({ where: { key } });
  if (row?.active) return { subject: row.subject, bodyHtml: row.bodyHtml };

  const def = getEmailTemplateDef(key);
  if (!def) throw new Error(`Unknown email template key: ${key}`);
  return { subject: def.defaultSubject, bodyHtml: def.defaultBody };
}

/** An /uploads/** setting value resolved to a real path on disk, or null if it isn't one / doesn't exist. */
function resolveLocalUploadPath(url: string | null | undefined): string | null {
  if (!url || !url.startsWith("/uploads/")) return null;
  const abs = path.join(process.cwd(), url.replace(/^\//, ""));
  return fs.existsSync(abs) ? abs : null;
}

export async function getBranding(): Promise<{
  siteName: string;
  logoUrl: string | null;
  logoLocalPath: string | null;
  contactEmail: string;
  contactPhone: string;
}> {
  const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
  const logoImage = settings?.logoImage ?? null;
  return {
    siteName: settings?.siteName || "Marwa Digital",
    // A real public URL (Vercel Blob, or any external image) can be
    // referenced directly in the email HTML — only a local /uploads/**
    // path (local dev / no Blob configured) needs the CID-attachment
    // workaround below, since a recipient's mail client can't reach localhost.
    logoUrl: logoImage && logoImage.startsWith("http") ? logoImage : null,
    logoLocalPath: resolveLocalUploadPath(logoImage),
    contactEmail: settings?.contactEmail || "hello@marwadigital.com",
    contactPhone: settings?.contactPhone || "",
  };
}

/**
 * Embeds the logo as an inline CID attachment rather than a URL — a URL
 * pointing at localhost (or any non-public host) won't load when the
 * recipient's mail client fetches it, but an inline attachment always renders.
 * Only relevant for `logoLocalPath` (local dev) — a real `logoUrl` is
 * referenced directly instead, see renderBrandedEmail below.
 */
export function logoAttachment(logoLocalPath: string | null): { filename: string; content: Buffer; cid: string }[] {
  if (!logoLocalPath) return [];
  try {
    return [{ filename: "logo.png", content: fs.readFileSync(logoLocalPath), cid: "logo" }];
  } catch {
    return [];
  }
}

/**
 * Renders `key`'s subject/body with `vars`, then wraps the body in the shared
 * EMAIL_SHELL template (Admin → Email Templates → "Header & Footer (Shared)")
 * — the logo band and the support-contact footer, admin-editable there via
 * the exact same {{variable}} mechanism.
 */
export async function renderBrandedEmail(
  key: string,
  vars: Record<string, string>
): Promise<{ subject: string; html: string; attachments: { filename: string; content: Buffer; cid: string }[] }> {
  const { siteName, logoUrl, logoLocalPath, contactEmail, contactPhone } = await getBranding();
  const template = await resolveEmailTemplate(key);
  const body = renderTemplate(template.bodyHtml, { siteName, ...vars });

  const headerBrand = logoUrl
    ? `<img src="${logoUrl}" alt="${siteName}" style="max-height:40px;max-width:200px;" />`
    : logoLocalPath
      ? `<img src="cid:logo" alt="${siteName}" style="max-height:40px;max-width:200px;" />`
      : `<span style="color:#2563ff;font-size:22px;font-weight:700;">${siteName}</span>`;

  const shell = await resolveEmailTemplate("EMAIL_SHELL");
  return {
    subject: renderTemplate(template.subject, { siteName, ...vars }),
    html: renderTemplate(shell.bodyHtml, {
      content: body,
      headerBrand,
      siteName,
      contactEmail,
      contactPhone,
      contactPhoneTel: contactPhone.replace(/[^+\d]/g, ""),
      year: String(new Date().getFullYear()),
    }),
    attachments: logoAttachment(logoLocalPath),
  };
}
