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
 * Post Template A — Full-Width Hero Header: a massive full-bleed hero image
 * behind the title, a floating author card overlapping the hero's bottom
 * edge, a sticky Table of Contents rail on the left, and a sticky social
 * share rail on the right.
 */
export function PostTemplateA({
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
      <section className="relative h-[70vh] min-h-[440px] w-full overflow-hidden">
        {post.featuredImage ? (
          <Image src={resolveImageUrl(post.featuredImage)} alt={post.title} fill priority sizes="100vw" className="object-cover" />
        ) : (
          <div className="absolute inset-0 bg-ink-panel" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />

        <nav className="absolute left-0 right-0 top-6 z-10 mx-auto flex max-w-4xl flex-wrap items-center gap-1.5 px-6 text-xs text-white/60 md:px-12">
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
          <span className="text-white/85">{post.title}</span>
        </nav>

        <div className="relative z-10 mx-auto flex h-full max-w-4xl flex-col items-center justify-end px-6 pb-20 text-center md:px-12">
          {category && (
            <span className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-black" style={{ background: category.color || "#2563ff" }}>
              {category.name}
            </span>
          )}
          <h1 className="mt-4 text-3xl font-extrabold leading-tight text-white md:text-5xl">{post.title}</h1>
        </div>
      </section>

      {post.author && (
        <div className="relative z-20 mx-auto -mt-10 flex w-fit -translate-y-0 items-center gap-4 rounded-2xl border border-ink-border bg-ink-panel/95 px-6 py-4 shadow-xl backdrop-blur">
          {post.author.avatarUrl ? (
            <Image src={resolveImageUrl(post.author.avatarUrl)} alt="" width={48} height={48} className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/20 text-lg font-bold text-gold">{post.author.name[0]}</span>
          )}
          <div className="text-left">
            <p className="text-sm font-bold">{post.author.name}</p>
            <p className="text-xs text-foreground/50">
              {post.publishedAt && formatDate(post.publishedAt, dateFormat)}
              {post.readingTime && ` · ${post.readingTime} min read`}
            </p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-6 py-16 md:px-12">
        <div className="grid gap-10 lg:grid-cols-[220px_1fr_80px]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-ink-border bg-ink-panel p-5">
              <TableOfContentsBlock title="On This Page" />
            </div>
          </aside>

          <article className="mx-auto w-full max-w-2xl">
            {post.editorMode === "BUILDER" && post.layout ? (
              <LayoutRenderer blocks={post.layout} />
            ) : (
              <div className="tiptap-content max-w-none text-foreground/80" dangerouslySetInnerHTML={{ __html: post.content || "" }} />
            )}

            {post.author?.bio && (
              <div className="mt-10 rounded-2xl border border-ink-border bg-ink-panel p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-gold">Written by {post.author.name}</p>
                <p className="mt-2 text-sm text-foreground/60">{post.author.bio}</p>
              </div>
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

          <div className="hidden lg:block">
            <div className="sticky top-24">
              <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-wide text-foreground/40">Share</p>
              <div className="flex flex-col items-center">
                <SocialShareBar url={canonical} title={post.title} vertical />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex justify-center lg:hidden">
          <SocialShareBar url={canonical} title={post.title} />
        </div>
      </div>

      <CtaSlot ctaLayout={ctaLayout} />
    </div>
  );
}
