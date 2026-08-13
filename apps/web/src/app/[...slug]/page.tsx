import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { api, ApiError } from "@/lib/api";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LayoutRenderer } from "@/components/builder/LayoutRenderer";
import { getStyleClassesMap } from "@/components/builder/styleClassCache";
import { getTimedAnimationsMap } from "@/components/builder/timedAnimationCache";
import { siteTagDataFromSettings } from "@/components/builder/resolveDynamicTokens";
import { resolveActiveSiteTemplate } from "@/lib/resolveSiteTemplate";

export const dynamic = "force-dynamic";

async function loadPage(slug: string, previewToken?: string) {
  try {
    return await api.getPage(slug, previewToken);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadPage(slug.join("/"));
  if (!page) return { title: "Page not found" };

  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription ?? undefined,
    keywords: page.metaKeywords ?? undefined,
    openGraph: page.ogImage ? { images: [{ url: page.ogImage }] } : undefined,
    robots: { index: page.metaRobotsIndex, follow: page.metaRobotsFollow },
  };
}

export default async function CmsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const isBuilderPreview = resolvedSearchParams.__builder_preview === "1";
  const previewToken = typeof resolvedSearchParams.previewToken === "string" ? resolvedSearchParams.previewToken : undefined;
  const page = await loadPage(slug.join("/"), previewToken);
  if (!page) notFound();

  if (page.editorMode === "BUILDER") {
    const context = { kind: "page" as const, pageSlug: page.slug };
    // Header/footer templates are resolved here rather than left to the
    // components' own client fetch, so the real chrome is in the server HTML
    // instead of appearing a frame later.
    const [classesById, timedAnimationsById, settings, headerTemplate, footerTemplate] = await Promise.all([
      getStyleClassesMap(),
      getTimedAnimationsMap(),
      api.getSettings().catch(() => null),
      resolveActiveSiteTemplate("header", context).catch(() => null),
      resolveActiveSiteTemplate("footer", context).catch(() => null),
    ]);
    return (
      <>
        <SiteHeader solid context={context} initialTemplate={headerTemplate?.layout ?? null} />
        <main className="bg-background text-foreground">
          {page.headTags && <div dangerouslySetInnerHTML={{ __html: page.headTags }} />}
          {page.customCss && <style dangerouslySetInnerHTML={{ __html: page.customCss }} />}
          <LayoutRenderer
            blocks={page.layout}
            classesById={classesById}
            timedAnimationsById={timedAnimationsById}
            isBuilderPreview={isBuilderPreview}
            siteContext={siteTagDataFromSettings(settings)}
          />
          {/* A raw <script> tag here only executes once, on the initial SSR
              HTML parse — never again on a client-side re-render or Link
              navigation. next/script's id-tracked Script is what Next
              actually guarantees execution for. */}
          {page.customJs && <Script id={`custom-js-${page.slug}`} strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: page.customJs }} />}
        </main>
        <SiteFooter context={context} initialTemplate={footerTemplate?.layout ?? null} />
      </>
    );
  }

  // CLASSIC — unchanged from the pre-builder /pages/[slug] route this replaces.
  const containerClass = page.template === "full-width" ? "max-w-5xl" : page.template === "landing" ? "max-w-4xl" : "max-w-3xl";

  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground md:px-12">
      {page.headTags && <div dangerouslySetInnerHTML={{ __html: page.headTags }} />}
      {page.customCss && <style dangerouslySetInnerHTML={{ __html: page.customCss }} />}

      <div className={`mx-auto ${containerClass}`}>
        <Link href="/" className="text-sm text-foreground/50 hover:text-foreground">
          &larr; Back to Home
        </Link>

        <article className="mt-6">
          <h1 className="text-3xl font-bold md:text-4xl">{page.title}</h1>
          <div
            className="tiptap-content mt-6 text-foreground/70"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        </article>
      </div>

      {page.customJs && <Script id={`custom-js-${page.slug}`} strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: page.customJs }} />}
    </main>
  );
}
