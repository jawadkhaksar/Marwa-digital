import Image from "next/image";
import Link from "next/link";
import type { Post, PostCard } from "@/lib/api";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { LayoutRenderer } from "@/components/builder/LayoutRenderer";
import { SocialShareBar } from "../SocialShareBar";
import { RelatedPostCard } from "./RelatedPostCard";
import { CtaSlot } from "./CtaSlot";
import { formatDate } from "../formatDate";

/**
 * Post Template B — Split Column Clean: a sticky left column carrying the
 * title, meta, author bio, and share links; the article body (with the
 * featured image inline, not a full-bleed hero) and related posts live in
 * the right column.
 */
export function PostTemplateB({
  post,
  related,
  canonical,
  ctaLayout,
  dateFormat,
  permalinkStructure,
}: {
  post: Post;
  related: PostCard[];
  canonical: string;
  ctaLayout?: unknown;
  dateFormat?: string;
  permalinkStructure?: string;
}) {
  const category = post.categories[0];

  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 pt-8 md:px-12">
        <nav className="flex flex-wrap items-center gap-1.5 text-xs text-foreground/50">
          <Link href="/" className="hover:text-gold">
            Home
          </Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-gold">
            Blog
          </Link>
          {category && (
            <>
              <span>/</span>
              <Link href={`/blog?category=${category.slug}`} className="hover:text-gold">
                {category.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-foreground/70">{post.title}</span>
        </nav>

        <div className="mt-8 grid gap-12 lg:grid-cols-[320px_1fr]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            {category && (
              <span className="inline-block rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-black" style={{ background: category.color || "#2563ff" }}>
                {category.name}
              </span>
            )}
            <h1 className="mt-4 text-2xl font-extrabold leading-tight md:text-3xl">{post.title}</h1>
            <p className="mt-3 text-xs text-foreground/50">
              {post.publishedAt && formatDate(post.publishedAt, dateFormat)}
              {post.readingTime && ` · ${post.readingTime} min read`}
            </p>

            {post.author && (
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-ink-border bg-ink-panel p-4">
                {post.author.avatarUrl ? (
                  <Image src={resolveImageUrl(post.author.avatarUrl)} alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/20 text-sm font-bold text-gold">{post.author.name[0]}</span>
                )}
                <div>
                  <p className="text-sm font-bold">{post.author.name}</p>
                  {post.author.bio && <p className="mt-1 text-xs text-foreground/55">{post.author.bio}</p>}
                </div>
              </div>
            )}

            <div className="mt-6">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-foreground/40">Share this article</p>
              <SocialShareBar url={canonical} title={post.title} />
            </div>
          </aside>

          <article>
            {post.featuredImage && (
              <div className="relative mb-8 h-[280px] w-full overflow-hidden rounded-2xl md:h-[380px]">
                <Image src={resolveImageUrl(post.featuredImage)} alt={post.title} fill priority sizes="(min-width: 1024px) 760px, 100vw" className="object-cover" />
              </div>
            )}

            {post.editorMode === "BUILDER" && post.layout ? (
              <LayoutRenderer blocks={post.layout} />
            ) : (
              <div className="tiptap-content max-w-none text-foreground/80" dangerouslySetInnerHTML={{ __html: post.content || "" }} />
            )}

            {related.length > 0 && (
              <section className="mt-16">
                <h2 className="text-xl font-extrabold md:text-2xl">Related Articles</h2>
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  {related.map((p) => (
                    <RelatedPostCard key={p.id} post={p} dateFormat={dateFormat} permalinkStructure={permalinkStructure} />
                  ))}
                </div>
              </section>
            )}
          </article>
        </div>
      </div>

      <div className="mt-16">
        <CtaSlot ctaLayout={ctaLayout} />
      </div>
    </div>
  );
}
