const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Admin-uploaded media (Gallery/Fleet/Tours image pickers) is served from
 * the API at "/uploads/..." — a different origin than the web app. Seed/
 * bundled images ("/images/...") live in this app's own public folder and
 * should be left alone.
 */
export function resolveImageUrl(url: string): string {
  if (url.startsWith("http")) return url;
  if (url.startsWith("/uploads/")) return `${API_URL}${url}`;
  return url;
}
