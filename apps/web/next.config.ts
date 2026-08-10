import type { NextConfig } from "next";

// Admin-uploaded media (vehicles, tours, pages, gallery) is served from the
// API host, not bundled with the web app — needs an explicit remotePattern
// for next/image to optimize it. `images.domains` is deprecated in Next 16.
const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000");
const adminUrl = process.env.ADMIN_URL ?? "http://localhost:3001";

// Dev-mode Next/React needs eval() for Fast Refresh and error-overlay stack
// reconstruction — never needed (or included) in a production build.
const isDev = process.env.NODE_ENV !== "production";

// Third-party origins this site actually loads scripts/frames/data from —
// Google Maps (booking address autocomplete), Google Translate (De/En
// switcher), reCAPTCHA (Form block), Stripe/PayPal (checkout), Google Fonts.
const CSP = [
  "default-src 'self'",
  // 'unsafe-inline' is required for the no-flash-theme boot script in
  // layout.tsx and Next's own inline hydration scripts — a nonce-based CSP
  // would be tighter but needs per-request nonce plumbing through every
  // inline <Script>, which is a separate, larger change. Remote-script
  // injection (the more common XSS payload) is still blocked by the origin
  // allowlist below.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://maps.googleapis.com https://translate.google.com https://translate.googleapis.com https://translate-pa.googleapis.com https://www.google.com https://www.gstatic.com https://js.stripe.com https://www.paypal.com https://www.paypalobjects.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.gstatic.com",
  // Google Translate's widget injects its own resources (translated-page
  // proxy, flags/icons) from a shifting set of translate.google*/gstatic
  // paths beyond what's worth enumerating exactly — and the API's own
  // uploaded images (`apiUrl.origin`) need explicit listing since that's
  // plain http:// in local dev, which the bare `https:` wildcard won't match.
  `img-src 'self' data: blob: https: ${apiUrl.origin}`,
  "font-src 'self' https://fonts.gstatic.com data:",
  `connect-src 'self' ${apiUrl.origin} https://maps.googleapis.com https://translate.googleapis.com https://translate-pa.googleapis.com https://translate.google.com https://www.google.com https://www.gstatic.com https://api.stripe.com`,
  "frame-src https://js.stripe.com https://www.paypal.com https://www.google.com",
  // The admin's Visual Builder embeds this site in a live-preview <iframe>
  // (apps/admin/src/app/builder/[pageId]/page.tsx) — a blanket 'none'/DENY
  // here would silently break that. Nothing else should ever frame this site.
  `frame-ancestors 'self' ${adminUrl}`,
  "object-src 'none'",
  "base-uri 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // No X-Frame-Options here — it has no per-origin allowlist (only
  // DENY/SAMEORIGIN), so it can't express "admin may frame this, no one
  // else." frame-ancestors above is the modern replacement and takes
  // precedence in every browser that still honors X-Frame-Options too.
];

const nextConfig: NextConfig = {
  transpilePackages: ["@marwa/builder"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      {
        protocol: apiUrl.protocol.replace(":", "") as "http" | "https",
        hostname: apiUrl.hostname,
        port: apiUrl.port,
        pathname: "/uploads/**",
      },
    ],
    // Next 16 blocks image-optimizer fetches to any hostname resolving to a
    // private/local IP by default (e.g. localhost -> 127.0.0.1). The API is
    // same-machine in dev, so this is safe here.
    dangerouslyAllowLocalIP: true,
  },
  async redirects() {
    return [{ source: "/pages/:slug", destination: "/:slug", permanent: true }];
  },
};

export default nextConfig;
