import { api } from "@/lib/api";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { buildPostHref } from "@/lib/blogPermalink";

export const dynamic = "force-dynamic";

function escapeXml(input: string): string {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function absoluteUrl(base: string, path: string): string {
  if (path.startsWith("http")) return path;
  return `${base}${path}`;
}

// Reading Settings → "Syndication feeds show the most recent X items" /
// "For each post in a feed, include: Full text | Excerpt".
export async function GET() {
  const settings = await api.getSettings().catch(() => null);
  const siteUrl = settings?.siteUrl || "https://marwadigital.com";
  const siteName = settings?.siteName || "Marwa Digital";
  const description = settings?.description || "";
  const structure = settings?.permalinkStructure || "/%postname%/";
  const itemCount = settings?.feedItemCount || 10;

  const { items } = await api.getPosts({ page: 1, limit: Math.min(itemCount, 50) });

  const entries = await Promise.all(
    items.map(async (post) => {
      const link = absoluteUrl(siteUrl, buildPostHref(post, structure));
      const pubDate = post.publishedAt ? new Date(post.publishedAt).toUTCString() : new Date().toUTCString();
      let content = post.excerpt ?? "";
      if (settings?.feedContentMode === "full") {
        const full = await api.getPost(post.slug).catch(() => null);
        if (full) content = full.editorMode === "CLASSIC" ? full.content ?? "" : full.excerpt ?? "";
      }
      const image = post.featuredImage ? `<figure><img src="${escapeXml(resolveImageUrl(post.featuredImage))}" alt="" /></figure>` : "";

      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      ${post.author ? `<dc:creator>${escapeXml(post.author.name)}</dc:creator>` : ""}
      <description><![CDATA[${image}${content}]]></description>
    </item>`;
    })
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(siteName)}</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>${escapeXml(description)}</description>
    <language>${escapeXml(settings?.siteLanguage || "en")}</language>
    <atom:link href="${escapeXml(siteUrl)}/feed.xml" rel="self" type="application/rss+xml" />
${entries.join("\n")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
