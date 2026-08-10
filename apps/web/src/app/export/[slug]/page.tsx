import { notFound } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { buildExportAssets } from "@/components/builder/exportPage";

export const dynamic = "force-dynamic";

async function loadPage(slug: string) {
  try {
    return await api.getPage(slug);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/**
 * A standalone-shaped render of a page's block tree: no SiteHeader/
 * SiteFooter, no PreviewBridge/MotionPathScrollBinder/builder chrome, one
 * aggregated `<style>` instead of per-block tags, one GSAP `<script>`
 * instead of AnimatedBox's React runtime. Still sits inside the site's own
 * root layout (fonts, globals.css reset) — extracting just this page's own
 * output for a non-Next host means lifting the three exr-export-* marked
 * pieces below, not the whole document.
 */
export default async function ExportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await loadPage(slug);
  if (!page) notFound();
  if (page.editorMode !== "BUILDER") notFound();

  const { elements, css, js } = buildExportAssets(page.layout);

  return (
    <>
      <style id="exr-export-css" dangerouslySetInnerHTML={{ __html: css }} />
      <div id="exr-export-root">{elements}</div>
      <script id="exr-export-js" dangerouslySetInnerHTML={{ __html: js }} />
    </>
  );
}
