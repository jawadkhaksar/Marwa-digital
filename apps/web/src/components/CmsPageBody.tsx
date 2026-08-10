import Script from "next/script";
import { LayoutRenderer } from "@/components/builder/LayoutRenderer";
import { getStyleClassesMap } from "@/components/builder/styleClassCache";
import { getTimedAnimationsMap } from "@/components/builder/timedAnimationCache";
import type { SiteTagData } from "@/components/builder/resolveDynamicTokens";
import type { Page } from "@/lib/api";

/**
 * Renders a regular CMS Page's own content (BUILDER blocks or CLASSIC rich
 * text) — the same BUILDER/CLASSIC branch [...slug]/page.tsx has always used
 * for a page at its own slug, extracted so a Page can also be rendered in
 * place of the built-in `/` or `/blog` route (Reading Settings → Homepage/
 * Posts page). This is body content ONLY — it never renders SiteHeader/
 * SiteFooter itself, regardless of editor mode. [...slug]/page.tsx always
 * wraps its own BUILDER branch with SiteHeader/SiteFooter too (Theme
 * Builder's Header/Footer only ever resolves inside those two components —
 * nothing renders it automatically), so every caller of this component must
 * do the same, not just its CLASSIC-mode callers.
 */
export async function CmsPageBody({
  page,
  isBuilderPreview = false,
  siteContext,
}: {
  page: Page;
  isBuilderPreview?: boolean;
  siteContext?: SiteTagData;
}) {
  if (page.editorMode === "BUILDER") {
    const [classesById, timedAnimationsById] = await Promise.all([getStyleClassesMap(), getTimedAnimationsMap()]);
    return (
      <>
        {page.headTags && <div dangerouslySetInnerHTML={{ __html: page.headTags }} />}
        {page.customCss && <style dangerouslySetInnerHTML={{ __html: page.customCss }} />}
        <LayoutRenderer blocks={page.layout} classesById={classesById} timedAnimationsById={timedAnimationsById} isBuilderPreview={isBuilderPreview} siteContext={siteContext} />
        {page.customJs && <Script id={`custom-js-${page.slug}`} strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: page.customJs }} />}
      </>
    );
  }

  const containerClass = page.template === "full-width" ? "max-w-5xl" : page.template === "landing" ? "max-w-4xl" : "max-w-3xl";

  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground md:px-12">
      {page.headTags && <div dangerouslySetInnerHTML={{ __html: page.headTags }} />}
      {page.customCss && <style dangerouslySetInnerHTML={{ __html: page.customCss }} />}
      <div className={`mx-auto ${containerClass}`}>
        <article className="mt-6">
          <h1 className="text-3xl font-bold md:text-4xl">{page.title}</h1>
          <div className="tiptap-content mt-6 text-foreground/70" dangerouslySetInnerHTML={{ __html: page.content }} />
        </article>
      </div>
      {page.customJs && <Script id={`custom-js-${page.slug}`} strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: page.customJs }} />}
    </main>
  );
}
