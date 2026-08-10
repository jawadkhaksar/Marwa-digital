import { api, type PostCard, type PostContextData } from "@/lib/api";
import { LayoutRenderer } from "@/components/builder/LayoutRenderer";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { formatDate } from "@/components/blog/formatDate";
import { buildPostHref } from "@/lib/blogPermalink";
import { siteTagDataFromSettings } from "@/components/builder/resolveDynamicTokens";

/**
 * The real "Posts Grid" widget — an async Server Component (same pattern as
 * TemplateBlock.tsx, which this deliberately mirrors as its own file rather
 * than living inline in blockComponents.tsx: recursing LayoutRenderer here
 * would be a circular import, since blockComponents.tsx is what
 * LayoutRenderer.tsx imports FROM directly).
 *
 * Two rendering paths:
 * - `loopTemplateId` set (an admin designed a card in Theme Builder, type
 *   "blog_loop_item") → that template's own layout is repeated once per
 *   post, each repetition getting that post's own data via `postContext` —
 *   the same PostTitle/PostFeaturedImage/PostContent/PostExcerpt/PostInfo
 *   blocks built for the single-post template "just work" inside a card,
 *   zero extra code needed for that half.
 * - No `loopTemplateId` (or its template can't be found) → DefaultPostCard
 *   below, using the SAME real post data — this is what replaces the old
 *   "Sample Item 1..12" placeholder shell.
 */
export async function PostsBlock({
  columns,
  itemCount,
  showExcerpt,
  showDate,
  cardBackground,
  titleColor,
  loopTemplateId,
}: {
  columns?: string;
  itemCount?: string;
  showExcerpt?: boolean;
  showDate?: boolean;
  cardBackground?: string;
  titleColor?: string;
  loopTemplateId?: string;
}) {
  const [{ items }, settings] = await Promise.all([
    api.getPosts({ limit: Number(itemCount) || 3 }).catch(() => ({ items: [] as PostCard[], total: 0, page: 1, limit: 0, hasMore: false })),
    api.getSettings().catch(() => null),
  ]);

  if (items.length === 0) {
    return <p style={{ fontSize: "13px", color: "#999" }}>No posts published yet.</p>;
  }

  const structure = settings?.permalinkStructure || "/%postname%/";
  const postsWithHref: PostContextData[] = items.map((item) => ({ ...item, href: buildPostHref(item, structure) }));

  const gridStyle = { display: "grid", gridTemplateColumns: `repeat(${Number(columns) || 3}, minmax(0, 1fr))`, gap: "20px" };

  if (loopTemplateId) {
    let template;
    try {
      template = await api.getSiteTemplate(loopTemplateId);
    } catch {
      template = null;
    }
    if (template) {
      const siteContext = siteTagDataFromSettings(settings);
      return (
        <div style={gridStyle}>
          {postsWithHref.map((post) => (
            <LayoutRenderer key={post.id} blocks={template.layout} postContext={post} siteContext={siteContext} showAddSectionBanner={false} />
          ))}
        </div>
      );
    }
  }

  return (
    <div style={gridStyle}>
      {postsWithHref.map((post) => (
        <DefaultPostCard key={post.id} post={post} showExcerpt={showExcerpt} showDate={showDate} cardBackground={cardBackground} titleColor={titleColor} dateFormat={settings?.dateFormat} />
      ))}
    </div>
  );
}

function DefaultPostCard({
  post,
  showExcerpt,
  showDate,
  cardBackground,
  titleColor,
  dateFormat,
}: {
  post: PostContextData;
  showExcerpt?: boolean;
  showDate?: boolean;
  cardBackground?: string;
  titleColor?: string;
  dateFormat?: string;
}) {
  return (
    <a href={post.href} style={{ display: "block", borderRadius: "12px", background: `var(--exr-cardBackground, ${cardBackground || "transparent"})`, overflow: "hidden" }}>
      {post.featuredImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={resolveImageUrl(post.featuredImage)} alt={post.title} style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
      ) : (
        <div style={{ aspectRatio: "16/9", background: "rgba(0,0,0,0.06)" }} />
      )}
      <div style={{ padding: cardBackground ? "16px" : "16px 0" }}>
        {showDate && post.publishedAt && <div style={{ fontSize: "11px", color: "#999", marginBottom: "4px" }}>{formatDate(post.publishedAt, dateFormat)}</div>}
        <div style={{ color: `var(--exr-titleColor, ${titleColor || "inherit"})`, fontWeight: 700 }}>{post.title}</div>
        {showExcerpt && post.excerpt && <p style={{ fontSize: "13px", color: "#999", marginTop: "6px" }}>{post.excerpt}</p>}
      </div>
    </a>
  );
}
