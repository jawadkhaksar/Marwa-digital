// Installs a brand wordmark as the site logo.
//
// Delivered as an inline SVG data URI rather than an uploaded file on
// purpose: media uploads need a Vercel Blob write token that isn't
// configured yet, and the header shouldn't stay logo-less waiting on that.
// SiteSettings.logoImage is just a string the header renders as an <img>
// src, and the site's CSP already allows `data:` images — so this works
// today and can be replaced by a real upload later with no code change.
import { T } from "./kit.mjs";

function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(`--${name}`);
  const out = (i >= 0 ? process.argv[i + 1] : undefined) ?? fallback;
  if (!out) throw new Error(`Missing --${name}`);
  return out;
}

const API = arg("api", "http://localhost:4000").replace(/\/$/, "");
const EMAIL = arg("email");
const PASSWORD = arg("password");

/**
 * Wordmark: a rounded electric-blue→purple tile carrying an "M" monogram,
 * set beside the company name with "Digital" in the accent colour.
 * Dark ink type, since the site now ships light.
 */
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="52" viewBox="0 0 240 52" fill="none" role="img" aria-label="Marwa Digital">
  <defs>
    <linearGradient id="mdg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${T.accent}"/>
      <stop offset="100%" stop-color="${T.violet}"/>
    </linearGradient>
  </defs>
  <rect x="1" y="8" width="36" height="36" rx="11" fill="url(#mdg)"/>
  <path d="M10 34V18h3.4l4.6 8.2 4.6-8.2H26v16h-3.2V23.6L18.6 31h-1.2L13 23.6V34H10z" fill="#ffffff"/>
  <text x="48" y="33" font-family="system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-size="20" font-weight="700" letter-spacing="-0.4" fill="${T.text}">Marwa</text>
  <text x="126" y="33" font-family="system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-size="20" font-weight="700" letter-spacing="-0.4" fill="${T.accent}">Digital</text>
</svg>`;

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="fg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${T.accent}"/>
      <stop offset="100%" stop-color="${T.violet}"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="16" fill="url(#fg)"/>
  <path d="M16 46V18h6l10 15 10-15h6v28h-7V30L32 44h-1L21 30v16h-5z" fill="#ffffff"/>
</svg>`;

const toDataUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg.trim(), "utf8").toString("base64")}`;

async function main() {
  const loginRes = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!loginRes.ok) throw new Error(`Login failed (${loginRes.status})`);
  const { token } = (await loginRes.json()) as { token: string };

  const res = await fetch(`${API}/api/admin/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ logoImage: toDataUri(LOGO_SVG), siteIcon: toDataUri(FAVICON_SVG) }),
  });
  if (!res.ok) throw new Error(`Updating settings failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  console.log("Logo and favicon installed.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
