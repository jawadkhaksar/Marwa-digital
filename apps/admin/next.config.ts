import type { NextConfig } from "next";

const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000");
// NEXT_PUBLIC_WEB_URL is what every component in this app already reads to
// build preview/"View Live" links, so it's accepted here too — the CSP
// below has to allowlist exactly the origin those components frame, and
// requiring a second, separately-set WEB_URL to stay in sync with it was a
// silent footgun (the builder canvas just renders blank when they differ).
const webUrl = process.env.WEB_URL ?? process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

// Dev-mode Next/React needs eval() for Fast Refresh and error-overlay stack
// reconstruction — never needed (or included) in a production build.
const isDev = process.env.NODE_ENV !== "production";

const CSP = [
  "default-src 'self'",
  // translate-pa.googleapis.com/translate.google*: the embedded live-preview
  // iframe renders apps/web, which loads the Google Translate widget — its
  // script/XHR calls are still subject to the PARENT (admin) frame's policy
  // in some Chrome-reported cases, so both are allowlisted here too, not
  // just in apps/web/next.config.ts.
  // https://maps.googleapis.com: the builder's Google Maps block renders
  // inside the embedded live-preview iframe, whose script loads are still
  // subject to this parent frame's policy in some Chrome-reported cases.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://maps.googleapis.com https://translate.google.com https://translate.googleapis.com https://translate-pa.googleapis.com https://www.gstatic.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.gstatic.com",
  // The builder's Typography controls preview real Google Fonts (Poppins,
  // Inter, …) on the canvas — without an explicit font-src these fall back
  // to `default-src 'self'` and every webfont request is blocked, so the
  // font picker silently previews nothing.
  "font-src 'self' https://fonts.gstatic.com data:",
  // Admins paste external image URLs (OG banners, gallery) and view
  // uploads served cross-origin from the API (plain http:// in local dev,
  // which the bare `https:` wildcard alone doesn't match) — both need to render.
  `img-src 'self' data: blob: https: ${apiUrl.origin}`,
  `connect-src 'self' ${apiUrl.origin} https://maps.googleapis.com https://translate.googleapis.com https://translate-pa.googleapis.com`,
  // The builder's live-preview canvas embeds apps/web in an <iframe>
  // (see app/builder/[pageId]/page.tsx and app/theme-builder/[id]/page.tsx).
  `frame-src ${webUrl}`,
  // Nothing should ever frame the admin dashboard itself.
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@marwa/builder"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
