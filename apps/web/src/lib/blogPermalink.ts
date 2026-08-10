// Permalinks (Admin → Settings → Permalinks) — a WordPress-style structure
// string, always /blog-relative (this site's blog lives at a fixed /blog
// route, unlike WordPress where permalinks apply at the site root). Two
// halves: buildPostHref turns a post + the saved structure into a real href
// every internal Link uses; matchPostFromParts is the reverse — apps/web's
// `/blog/[...parts]` catch-all route parses an incoming request's segments
// back into a lookup key using the exact same structure.
//
// A structure must contain %postname% or %post_id% somewhere to be
// resolvable — the other tokens (%year%/%monthnum%/%day%/%category%/etc.)
// only shape the URL's appearance and are validated-but-ignored on the way
// back in (matching WordPress's own permalink rules, which have the same
// requirement).

export interface PermalinkPost {
  slug: string;
  postNumber: number;
  publishedAt: string | null;
  categories?: { slug: string }[];
  author?: { name: string } | null;
}

const TOKEN_RE = /%(year|monthnum|day|hour|minute|second|post_id|postname|category|author)%/g;

function slugifyAuthor(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "admin";
}

function dateParts(publishedAt: string | null) {
  const d = publishedAt ? new Date(publishedAt) : new Date();
  return {
    year: String(d.getFullYear()),
    monthnum: String(d.getMonth() + 1).padStart(2, "0"),
    day: String(d.getDate()).padStart(2, "0"),
    hour: String(d.getHours()).padStart(2, "0"),
    minute: String(d.getMinutes()).padStart(2, "0"),
    second: String(d.getSeconds()).padStart(2, "0"),
  };
}

export function buildPostHref(post: PermalinkPost, structure: string): string {
  const parts = dateParts(post.publishedAt);
  const replaced = structure.replace(TOKEN_RE, (_match, token: string) => {
    switch (token) {
      case "year":
        return parts.year;
      case "monthnum":
        return parts.monthnum;
      case "day":
        return parts.day;
      case "hour":
        return parts.hour;
      case "minute":
        return parts.minute;
      case "second":
        return parts.second;
      case "post_id":
        return String(post.postNumber);
      case "postname":
        return post.slug;
      case "category":
        return post.categories?.[0]?.slug ?? "uncategorized";
      case "author":
        return post.author?.name ? slugifyAuthor(post.author.name) : "admin";
      default:
        return "";
    }
  });
  return `/blog${replaced}`;
}

export type PostLookupKey = { slug: string } | { postNumber: number };

const NUMERIC_TOKENS = new Set(["%year%", "%monthnum%", "%day%", "%hour%", "%minute%", "%second%"]);

export function matchPostFromParts(parts: string[], structure: string): PostLookupKey | null {
  const structureParts = structure.split("/").filter(Boolean);
  if (structureParts.length !== parts.length) return null;

  let slug: string | undefined;
  let postNumber: number | undefined;

  for (let i = 0; i < structureParts.length; i++) {
    const token = structureParts[i];
    const value = decodeURIComponent(parts[i]);

    if (token === "%postname%") {
      slug = value;
    } else if (token === "%post_id%") {
      if (!/^\d+$/.test(value)) return null;
      postNumber = Number(value);
    } else if (NUMERIC_TOKENS.has(token)) {
      if (!/^\d{1,4}$/.test(value)) return null;
    } else if (token === "%category%" || token === "%author%") {
      if (!value) return null;
    } else {
      // Literal path segment (e.g. "archives", "p") — must match exactly.
      if (token !== value) return null;
    }
  }

  if (slug) return { slug };
  if (postNumber !== undefined) return { postNumber };
  return null;
}
