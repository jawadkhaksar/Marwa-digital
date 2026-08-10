import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api, ApiError, type Post } from "@/lib/api";
import { SubPageHeader } from "@/components/SubPageHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { getBlogChromeLayout } from "@/lib/blogChrome";
import { matchPostFromParts, buildPostHref } from "@/lib/blogPermalink";
import { PostTemplateA } from "@/components/blog/post/TemplateA";
import { PostTemplateB } from "@/components/blog/post/TemplateB";
import { PostTemplateC } from "@/components/blog/post/TemplateC";
import { LayoutRenderer } from "@/components/builder/LayoutRenderer";
import { siteTagDataFromSettings } from "@/components/builder/resolveDynamicTokens";

export const dynamic = "force-dynamic";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

// Parses the catch-all's path segments against the saved Permalinks
// structure (Admin → Settings → Permalinks) and loads the matching post —
// shared by generateMetadata and the page component so both agree on
// exactly the same post for a given URL.
async function loadPostFromParts(parts: string[]) {
  const settings = await api.getSettings().catch(() => null);
  const structure = settings?.permalinkStructure || "/%postname%/";
  const key = matchPostFromParts(parts, structure);
  if (!key) return { post: null, settings };

  try {
    const post = "slug" in key ? await api.getPost(key.slug) : await api.getPostByNumber(key.postNumber);
    return { post, settings };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return { post: null, settings };
    throw err;
  }
}

function absoluteImage(url: string | null): string | undefined {
  if (!url) return undefined;
  const resolved = resolveImageUrl(url);
  return resolved.startsWith("http") ? resolved : `${WEB_URL}${resolved}`;
}

export async function generateMetadata({ params }: { params: Promise<{ parts: string[] }> }): Promise<Metadata> {
  const { parts } = await params;
  const { post } = await loadPostFromParts(parts);
  if (!post) return { title: "Post not found" };

  const image = absoluteImage(post.ogImage || post.featuredImage);
  return {
    title: post.metaTitle || post.title,
    description: post.metaDescription ?? post.excerpt ?? undefined,
    alternates: post.canonicalUrl ? { canonical: post.canonicalUrl } : undefined,
    openGraph: {
      title: post.metaTitle || post.title,
      description: post.metaDescription ?? post.excerpt ?? undefined,
      images: image ? [{ url: image }] : undefined,
      type: "article",
      publishedTime: post.publishedAt ?? undefined,
      authors: post.author ? [post.author.name] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.metaTitle || post.title,
      description: post.metaDescription ?? post.excerpt ?? undefined,
      images: image ? [image] : undefined,
    },
  };
}

function blogPostingSchema(post: Post, url: string) {
  const image = absoluteImage(post.ogImage || post.featuredImage);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.metaDescription ?? post.excerpt ?? undefined,
    image: image ? [image] : undefined,
    datePublished: post.publishedAt ?? undefined,
    dateModified: post.publishedAt ?? undefined,
    author: post.author ? { "@type": "Person", name: post.author.name } : undefined,
    publisher: { "@type": "Organization", name: "Marwa Digital", logo: { "@type": "ImageObject", url: `${WEB_URL}/images/logo.png` } },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ parts: string[] }> }) {
  const { parts } = await params;
  const { post, settings } = await loadPostFromParts(parts);
  if (!post) notFound();

  const structure = settings?.permalinkStructure || "/%postname%/";
  // The URL this exact post is actually reachable at, given the active
  // structure — not necessarily the URL the visitor used to get here (e.g.
  // an old bookmark under a since-changed structure still resolves via
  // matchPostFromParts above, but canonical always points at the current one).
  const activeHref = buildPostHref(post, structure);

  const [related, ctaLayout, singleTemplateLayout] = await Promise.all([
    api.getRelatedPosts(post.slug).catch(() => []),
    getBlogChromeLayout("blog_post_cta"),
    getBlogChromeLayout("blog_single"),
  ]);
  const canonical = post.canonicalUrl || `${WEB_URL}${activeHref}`;
  const template = settings?.blogPostTemplate || "A";
  const dateFormat = settings?.dateFormat;

  return (
    <>
      <SubPageHeader />
      <main className="bg-background text-foreground">
        {/* See apps/web/src/app/tours/[slug]/page.tsx for the same JSON-LD convention. */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingSchema(post, canonical)).replace(/</g, "\\u003c") }} />

        {singleTemplateLayout ? (
          <LayoutRenderer
            blocks={singleTemplateLayout}
            postContext={{ ...post, href: activeHref }}
            siteContext={siteTagDataFromSettings(settings)}
            showAddSectionBanner={false}
          />
        ) : template === "A" ? (
          <PostTemplateA post={post} related={related} canonical={canonical} ctaLayout={ctaLayout} dateFormat={dateFormat} permalinkStructure={structure} />
        ) : template === "B" ? (
          <PostTemplateB post={post} related={related} canonical={canonical} ctaLayout={ctaLayout} dateFormat={dateFormat} permalinkStructure={structure} />
        ) : (
          <PostTemplateC post={post} related={related} canonical={canonical} ctaLayout={ctaLayout} dateFormat={dateFormat} permalinkStructure={structure} />
        )}
      </main>
      <SiteFooter />
    </>
  );
}
