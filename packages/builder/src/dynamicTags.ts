// Shared catalog for the Global Dynamic Tags system — the `{{tag.key}}`
// token grammar, the list of available tags (admin's picker UI reads this
// directly), and token-detection helpers used by BOTH apps/admin (to decide
// whether an image field currently holds a token vs a real path) and
// apps/web (to resolve tokens at render time — see resolveDynamicTokens.ts).
// Deliberately small: only "post" and "site" categories exist because
// they're the only ones backed by real data today (postContext, already
// threaded through LayoutRenderer; site settings, one small new fetch).
// Every other Elementor-style category (Archive Meta, Author Meta,
// Comments, Request Parameter, Shortcode, User Info, Post Custom Field) has
// no underlying data source in this app yet — add its tags here once its
// data source exists, not before (a tag that always resolves to nothing is
// worse than not offering it).

export type DynamicTagCategory = "post" | "site";

export interface DynamicTagDef {
  key: string;
  label: string;
  category: DynamicTagCategory;
  /** True for tags whose resolved value is itself an image path — used to
   *  filter the picker shown on Image fields down to ones that make sense
   *  there (post.title on an image field would just be a broken src). */
  isImage?: boolean;
}

export const DYNAMIC_TAGS: DynamicTagDef[] = [
  { key: "post.title", label: "Post Title", category: "post" },
  { key: "post.excerpt", label: "Post Excerpt", category: "post" },
  { key: "post.permalink", label: "Post URL", category: "post" },
  { key: "post.publishedAt", label: "Post Date", category: "post" },
  { key: "post.author", label: "Author Name", category: "post" },
  { key: "post.featuredImage", label: "Featured Image", category: "post", isImage: true },
  { key: "site.title", label: "Site Title", category: "site" },
  { key: "site.tagline", label: "Site Tagline", category: "site" },
  { key: "site.url", label: "Site URL", category: "site" },
  { key: "site.logoImage", label: "Site Logo", category: "site", isImage: true },
  { key: "site.currentDateTime", label: "Current Date/Time", category: "site" },
];

export const DYNAMIC_TAG_CATEGORY_LABELS: Record<DynamicTagCategory, string> = {
  post: "Post",
  site: "Site",
};

export function getDynamicTagLabel(key: string): string {
  return DYNAMIC_TAGS.find((t) => t.key === key)?.label ?? key;
}

/** Matches every `{{tag.key}}` occurrence within a larger string — the
 *  resolver's substring-replace pattern (text/textarea fields mix tokens
 *  with static text, e.g. "Read {{post.title}} now"). */
export const DYNAMIC_TOKEN_GLOBAL_RE = /\{\{\s*([\w.]+)\s*\}\}/g;

/** Matches ONLY a string that is entirely one token, nothing else — image
 *  fields are whole-value-only (a src can't sensibly be half-token). */
export const DYNAMIC_TOKEN_WHOLE_RE = /^\{\{\s*([\w.]+)\s*\}\}$/;

export function isDynamicToken(value: unknown): value is string {
  return typeof value === "string" && DYNAMIC_TOKEN_WHOLE_RE.test(value);
}

export function extractDynamicTagKey(value: string): string | null {
  const m = value.match(DYNAMIC_TOKEN_WHOLE_RE);
  return m ? m[1] : null;
}
