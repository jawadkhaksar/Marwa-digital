import type { MetadataRoute } from "next";
import { api } from "@/lib/api";
import { CORE_OVERRIDE_SLUGS } from "@/lib/coreLayoutOverride";
import { buildPostHref } from "@/lib/blogPermalink";

const FALLBACK_SITE_URL = "https://marwadigital.com";

// core-home is a Page row that overrides "/" in place — it isn't routable at
// "/[slug]" itself. /contact has no such reservation any more: it's an
// ordinary Page (slug "contact") and is picked up by pageRoutes below like
// any other page.
const RESERVED_SLUGS = new Set<string>(Object.values(CORE_OVERRIDE_SLUGS));

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [pages, settings] = await Promise.all([api.getPages(), api.getSettings().catch(() => null)]);
  const siteUrl = settings?.siteUrl || FALLBACK_SITE_URL;

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/blog`, changeFrequency: "daily", priority: 0.8 },
  ];

  // Not paginated by the archive's own postsPerPage setting — a sitemap
  // needs every published post regardless of how the archive page displays
  // them, so this loops the listing endpoint's own max page size (50)
  // until there's nothing left.
  const posts: Awaited<ReturnType<typeof api.getPosts>>["items"] = [];
  for (let page = 1; ; page++) {
    const res = await api.getPosts({ page, limit: 50 });
    posts.push(...res.items);
    if (!res.hasMore) break;
  }
  const structure = settings?.permalinkStructure || "/%postname%/";

  const pageRoutes: MetadataRoute.Sitemap = pages
    .filter((page) => !RESERVED_SLUGS.has(page.slug))
    .map((page) => ({
      url: `${siteUrl}/${page.slug}`,
      lastModified: page.updatedAt,
      changeFrequency: "monthly",
      priority: 0.6,
    }));

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteUrl}${buildPostHref(post, structure)}`,
    lastModified: post.publishedAt ?? undefined,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...pageRoutes, ...postRoutes];
}
