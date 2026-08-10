import { notFound } from "next/navigation";
import { api, ApiError, type PostContextData, type SiteSettings } from "@/lib/api";
import { LayoutRenderer } from "@/components/builder/LayoutRenderer";
import { buildPostHref } from "@/lib/blogPermalink";
import { siteTagDataFromSettings } from "@/components/builder/resolveDynamicTokens";

export const dynamic = "force-dynamic";

/** Best-effort — a "blog_single"/"blog_loop_item" template's preview is far
 *  more useful with real sample data than the dynamic blocks' own
 *  empty-state placeholders, but this is purely cosmetic for the editor
 *  canvas, so any failure (no posts yet, a fetch error) just falls back to
 *  no postContext rather than breaking the preview. Takes `settings` in
 *  (rather than fetching its own copy) so the caller can also build
 *  `siteContext` from the exact same fetch — every template preview
 *  benefits from `{{site.*}}` tags resolving, not just blog templates. */
async function loadSamplePost(settings: SiteSettings | null): Promise<PostContextData | undefined> {
  try {
    const { items } = await api.getPosts({ limit: 1 });
    if (!items[0]) return undefined;
    const post = await api.getPost(items[0].slug);
    const structure = settings?.permalinkStructure || "/%postname%/";
    return { ...post, href: buildPostHref(post, structure) };
  } catch {
    return undefined;
  }
}

/**
 * Standalone render target for one Header/Footer/blog-chrome template —
 * nothing links here from real navigation. Exists purely so the admin Theme
 * Builder's template editor (apps/admin/src/app/theme-builder/[id]/page.tsx)
 * has a real URL to point its live-preview iframe at, exactly like the main
 * page builder points its iframe at a page's own `/{slug}` route.
 */
export default async function TemplatePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let template;
  try {
    template = await api.getSiteTemplate(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return notFound();
    throw err;
  }

  const settings = await api.getSettings().catch(() => null);
  const postContext =
    template.type === "blog_single" || template.type === "blog_loop_item" ? await loadSamplePost(settings) : undefined;

  return <LayoutRenderer blocks={template.layout} isBuilderPreview postContext={postContext} siteContext={siteTagDataFromSettings(settings)} />;
}
