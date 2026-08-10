import Image from "next/image";
import Link from "next/link";
import type { Post, PostCard } from "@/lib/api";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { LayoutRenderer } from "@/components/builder/LayoutRenderer";
import { TableOfContentsBlock } from "@/components/builder/TableOfContentsBlock";
import { SocialShareBar } from "../SocialShareBar";
import { RelatedPostCard } from "./RelatedPostCard";
import { CtaSlot } from "./CtaSlot";
import { formatDate } from "../formatDate";

/**
 * Post Template C — Classic Reader Layout: a centered container, clean
 * header, inline featured image, sticky right-hand Table of Contents, and
 * a full-width CTA banner at the bottom. The original/default single-post
 * layout this Blog Engine shipped with.
 */
export function PostTemplateC({
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
      <div className="mx-auto max-w-3xl px-6 pt-8 md:px-12">
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

        <header className="mt-6">
          {category && (
            <span className="inline-block rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-black" style={{ background: category.color || "#2563ff" }}>
              {category.name}
            </span>
          )}
          <h1 className="mt-4 text-3xl font-extrabold leading-tight md:text-4xl">{post.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-foreground/60">
            {post.author && (
              <span className="flex items-center gap-2">
                {post.author.avatarUrl ? (
                  <Image src={resolveImageUrl(post.author.avatarUrl)} alt="" width={28} height={28} className="rounded-full object-cover" />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/20 text-xs font-bold text-gold">{post.author.name[0]}</span>
                )}
                {post.author.name}
              </span>
            )}
            {post.publishedAt && <span>· {formatDate(post.publishedAt, dateFormat)}</span>}
            {post.readingTime && <span>· {post.readingTime} min read</span>}
          </div>
        </header>
      </div>

      {post.featuredImage && (
        <div className="relative mx-auto mt-8 h-[320px] w-full max-w-5xl overflow-hidden rounded-2xl md:h-[440px]">
          <Image src={resolveImageUrl(post.featuredImage)} alt={post.title} fill priority sizes="(min-width: 1024px) 960px, 100vw" className="object-cover" />
        </div>
      )}

      <div className="mx-auto max-w-6xl px-6 py-10 md:px-12">
        <div className="grid gap-10 lg:grid-cols-[1fr_260px]">
          <article>
            {post.editorMode === "BUILDER" && post.layout ? (
              <LayoutRenderer blocks={post.layout} />
            ) : (
              <div className="tiptap-content max-w-none text-foreground/80" dangerouslySetInnerHTML={{ __html: post.content || "" }} />
            )}

            <div className="mt-10 flex items-center justify-between border-t border-ink-border pt-6">
              <span className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Share this article</span>
              <SocialShareBar url={canonical} title={post.title} />
            </div>

            {post.author && (
              <div className="mt-8 flex gap-4 rounded-2xl border border-ink-border bg-ink-panel p-6">
                {post.author.avatarUrl ? (
                  <Image src={resolveImageUrl(post.author.avatarUrl)} alt="" width={64} height={64} className="h-16 w-16 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gold/20 text-xl font-bold text-gold">{post.author.name[0]}</span>
                )}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gold">Written by</p>
                  <p className="mt-1 text-base font-bold">{post.author.name}</p>
                  {post.author.bio && <p className="mt-2 text-sm text-foreground/60">{post.author.bio}</p>}
                </div>
              </div>
            )}
          </article>

          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-ink-border bg-ink-panel p-5">
              <TableOfContentsBlock title="On This Page" />
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="text-xl font-extrabold md:text-2xl">Related Articles</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <RelatedPostCard key={p.id} post={p} dateFormat={dateFormat} permalinkStructure={permalinkStructure} />
              ))}
            </div>
          </section>
        )}
      </div>

      <CtaSlot ctaLayout={ctaLayout} />
    </div>
  );
}
