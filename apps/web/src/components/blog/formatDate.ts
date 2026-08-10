import { formatWithTokens } from "@/lib/wpDateFormat";

// `format` is the site's saved dateFormat setting (Admin → Settings →
// General), threaded down from the /blog and /blog/[...parts] server pages.
// Falls back to the original hardcoded long-form date when it's absent —
// callers that haven't been updated to pass it, or a settings fetch that
// failed, still render exactly as before.
export function formatDate(iso: string | null, format?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (format) return formatWithTokens(date, format);
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}
