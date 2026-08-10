const WORDS_PER_MINUTE = 200;

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ");
}

/** Recursively collects every string value in a builder LayoutDocument's node props — a
 * heuristic, not a real text extractor: it picks up genuine copy (headings, rich text,
 * descriptions) along with a few incidental strings (hrefs, color hex codes, icon keys),
 * which is an acceptable trade-off for a reading-time *estimate* rather than exact. */
function collectLayoutText(value: unknown, out: string[]): void {
  if (typeof value === "string") {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectLayoutText(item, out);
  } else if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) collectLayoutText(v, out);
  }
}

/** Estimated reading time in whole minutes (minimum 1) from either CLASSIC HTML content or a BUILDER layout tree. */
export function calculateReadingTime(content: string | null | undefined, layout: unknown): number {
  const text = content ? stripHtml(content) : "";
  const layoutStrings: string[] = [];
  if (layout) collectLayoutText(layout, layoutStrings);
  const combined = `${text} ${layoutStrings.join(" ")}`;
  const words = combined.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
