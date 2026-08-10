import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LayoutRenderer } from "@/components/builder/LayoutRenderer";
import { getStyleClassesMap } from "@/components/builder/styleClassCache";
import { CmsPageBody } from "@/components/CmsPageBody";
import { CORE_OVERRIDE_SLUGS, getCoreLayoutOverride, getCoreOverridePage } from "@/lib/coreLayoutOverride";
import { api, ApiError } from "@/lib/api";
import { getBlogChromeLayout } from "@/lib/blogChrome";
import { siteTagDataFromSettings } from "@/components/builder/resolveDynamicTokens";
import { ArchiveTemplateA } from "@/components/blog/archive/TemplateA";
import { ArchiveTemplateB } from "@/components/blog/archive/TemplateB";
import { ArchiveTemplateC } from "@/components/blog/archive/TemplateC";

export const dynamic = "force-dynamic";

/** A slug that's been unpublished/deleted since being picked in Reading Settings falls back to the built-in homepage rather than 404ing the whole site. */
async function loadHomepagePage(slug: string) {
  try {
    return await api.getPage(slug);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

// The homepage was silently inheriting the generic root-layout title/
// description with no way to change either without editing code — same
// metaTitle/metaDescription/ogImage override pattern already used by
// [...slug]/page.tsx and tours/[slug]/page.tsx. Reading Settings → Homepage
// (an admin-chosen regular Page) takes priority over the older reserved
// "core-home" slug override when both are somehow set, matching the same
// priority order the render logic below uses.
export async function generateMetadata(): Promise<Metadata> {
  const settings = await api.getSettings().catch(() => null);
  const chosenPage =
    settings?.homepageDisplay === "static" && settings.homepagePageSlug ? await loadHomepagePage(settings.homepagePageSlug) : null;
  const page = chosenPage ?? (await getCoreOverridePage(CORE_OVERRIDE_SLUGS.home));
  if (!page) return {};
  const hasMetaOverride = page.metaTitle || page.metaDescription;
  return {
    ...(hasMetaOverride
      ? {
          title: page.metaTitle || undefined,
          description: page.metaDescription ?? undefined,
          keywords: page.metaKeywords ?? undefined,
          openGraph: page.ogImage ? { images: [{ url: page.ogImage }] } : undefined,
        }
      : {}),
    robots: { index: page.metaRobotsIndex, follow: page.metaRobotsFollow },
  };
}

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const isBuilderPreview = (await searchParams).__builder_preview === "1";
  const settings = await api.getSettings().catch(() => null);

  // Reading Settings → "Your homepage displays: Your latest posts" — this
  // takes priority over a Builder override below, same as WordPress: the
  // radio choice on that screen is authoritative over whatever content type
  // the front page would otherwise show.
  if (settings?.homepageDisplay === "posts") {
    const extraLayout = await getBlogChromeLayout("blog_archive_extra");
    const template = settings.blogArchiveTemplate || "A";
    return (
      <>
        <SiteHeader context={{ kind: "home" }} />
        <main>
          {template === "B" ? (
            <ArchiveTemplateB extraLayout={extraLayout} dateFormat={settings.dateFormat} postsPerPage={settings.postsPerPage} permalinkStructure={settings.permalinkStructure} />
          ) : template === "C" ? (
            <ArchiveTemplateC extraLayout={extraLayout} dateFormat={settings.dateFormat} postsPerPage={settings.postsPerPage} permalinkStructure={settings.permalinkStructure} />
          ) : (
            <ArchiveTemplateA extraLayout={extraLayout} dateFormat={settings.dateFormat} postsPerPage={settings.postsPerPage} permalinkStructure={settings.permalinkStructure} />
          )}
        </main>
        <SiteFooter context={{ kind: "home" }} />
      </>
    );
  }

  // Reading Settings → Homepage: an admin-chosen regular Page renders at `/`
  // instead of the built-in homepage — takes priority over the older
  // "Convert to Builder" core-home override below (which itself only
  // existed as a workaround for not having this exact feature).
  if (settings?.homepageDisplay === "static" && settings.homepagePageSlug) {
    const chosenPage = await loadHomepagePage(settings.homepagePageSlug);
    if (chosenPage) {
      // Theme Builder's custom Header/Footer (Settings → Theme Builder) only
      // ever resolves *inside* the <SiteHeader>/<SiteFooter> components
      // themselves (a client-side fetch + Include-condition match, see
      // resolveActiveSiteTemplate) — nothing else renders it automatically,
      // including LayoutRenderer. A BUILDER page's own layout only carries
      // SiteLogo/NavMenu *blocks* if an admin manually placed them there,
      // which isn't how the Theme Builder mechanism works — always
      // mounting SiteHeader/SiteFooter here (matching [...slug]/page.tsx's
      // own BUILDER branch) is what actually lets it apply, same as it does
      // on every other page on the site.
      return (
        <>
          <SiteHeader context={{ kind: "home" }} />
          <CmsPageBody page={chosenPage} isBuilderPreview={isBuilderPreview} siteContext={siteTagDataFromSettings(settings)} />
          <SiteFooter context={{ kind: "home" }} />
        </>
      );
    }
  }

  const override = await getCoreLayoutOverride(CORE_OVERRIDE_SLUGS.home);
  if (override) {
    // Same fix as the branch above — this "Convert to Builder" override was
    // rendering with no SiteHeader/SiteFooter at all, so a Theme Builder
    // Header/Footer could never show on the homepage specifically (every
    // other page goes through [...slug]/page.tsx, which already wraps
    // correctly) — this was the actual bug being reported, predating the
    // Homepage-picker feature above.
    return (
      <>
        <SiteHeader context={{ kind: "home" }} />
        <LayoutRenderer blocks={override} classesById={await getStyleClassesMap()} isBuilderPreview={isBuilderPreview} siteContext={siteTagDataFromSettings(settings)} />
        <SiteFooter context={{ kind: "home" }} />
      </>
    );
  }

  // Nothing is configured yet: there is no hand-coded homepage to fall back
  // to any more, so point the admin at the two screens that actually set one
  // rather than rendering a blank page.
  return (
    <>
      <SiteHeader context={{ kind: "home" }} />
      <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <h1 className="text-3xl font-bold">No homepage set yet</h1>
        <p className="max-w-md text-sm opacity-70">
          Build a page in the admin, then choose it under <strong>Settings → Reading → Homepage</strong> to render it
          here.
        </p>
        <Link href="/blog" className="text-sm underline underline-offset-4">
          Browse the blog instead
        </Link>
      </main>
      <SiteFooter context={{ kind: "home" }} />
    </>
  );
}
