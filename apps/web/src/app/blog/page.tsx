import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SubPageHeader } from "@/components/SubPageHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CmsPageBody } from "@/components/CmsPageBody";
import { api, ApiError } from "@/lib/api";
import { getBlogChromeLayout } from "@/lib/blogChrome";
import { siteTagDataFromSettings } from "@/components/builder/resolveDynamicTokens";
import { ArchiveTemplateA } from "@/components/blog/archive/TemplateA";
import { ArchiveTemplateB } from "@/components/blog/archive/TemplateB";
import { ArchiveTemplateC } from "@/components/blog/archive/TemplateC";

export const dynamic = "force-dynamic";

const DEFAULT_METADATA: Metadata = {
  title: "Blog | Marwa Digital",
  description: "Articles, guides, and updates from the team.",
};

/** A slug that's been unpublished/deleted since being picked in Reading Settings falls back to the built-in blog archive rather than 404ing the whole route. */
async function loadPostsPage(slug: string) {
  try {
    return await api.getPage(slug);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

// Reading Settings → Posts page: an admin-chosen regular Page can render at
// /blog instead of the built-in archive — same metaTitle/metaDescription
// override pattern as [...slug]/page.tsx and the homepage.
export async function generateMetadata(): Promise<Metadata> {
  const settings = await api.getSettings().catch(() => null);
  const page = settings?.postsPageSlug ? await loadPostsPage(settings.postsPageSlug) : null;
  if (!page) return DEFAULT_METADATA;
  const hasMetaOverride = page.metaTitle || page.metaDescription;
  return {
    ...(hasMetaOverride
      ? {
          title: page.metaTitle || DEFAULT_METADATA.title,
          description: page.metaDescription ?? DEFAULT_METADATA.description,
          keywords: page.metaKeywords ?? undefined,
          openGraph: page.ogImage ? { images: [{ url: page.ogImage }] } : undefined,
        }
      : DEFAULT_METADATA),
    robots: { index: page.metaRobotsIndex, follow: page.metaRobotsFollow },
  };
}

export default async function BlogIndexPage() {
  const [settings, extraLayout] = await Promise.all([
    api.getSettings().catch(() => null),
    getBlogChromeLayout("blog_archive_extra"),
  ]);

  if (settings?.postsPageSlug) {
    const chosenPage = await loadPostsPage(settings.postsPageSlug);
    if (chosenPage) {
      // Same fix as the homepage's equivalent branch (apps/web/src/app/page.tsx):
      // Theme Builder's Header/Footer only ever resolves inside SiteHeader/
      // SiteFooter themselves — always mounting them here, regardless of
      // editor mode, is what actually lets it apply on /blog too.
      const context = { kind: "page" as const, pageSlug: chosenPage.slug };
      return (
        <>
          <SiteHeader solid context={context} />
          <CmsPageBody page={chosenPage} siteContext={siteTagDataFromSettings(settings)} />
          <SiteFooter context={context} />
        </>
      );
    }
  }

  const template = settings?.blogArchiveTemplate || "A";

  return (
    <>
      <SubPageHeader />
      <main>
        {template === "B" ? (
          <ArchiveTemplateB extraLayout={extraLayout} dateFormat={settings?.dateFormat} postsPerPage={settings?.postsPerPage} permalinkStructure={settings?.permalinkStructure} />
        ) : template === "C" ? (
          <ArchiveTemplateC extraLayout={extraLayout} dateFormat={settings?.dateFormat} postsPerPage={settings?.postsPerPage} permalinkStructure={settings?.permalinkStructure} />
        ) : (
          <ArchiveTemplateA extraLayout={extraLayout} dateFormat={settings?.dateFormat} postsPerPage={settings?.postsPerPage} permalinkStructure={settings?.permalinkStructure} />
        )}
      </main>
      <SiteFooter />
    </>
  );
}
