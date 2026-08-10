"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { api, type PostCard } from "@/lib/api";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { formatDate } from "../formatDate";
import { buildPostHref } from "@/lib/blogPermalink";
import { LayoutRenderer } from "@/components/builder/LayoutRenderer";

function BentoCard({ post, large, permalinkStructure }: { post: PostCard; large?: boolean; permalinkStructure?: string }) {
  return (
    <Link
      href={buildPostHref(post, permalinkStructure || "/%postname%/")}
      className={`group relative overflow-hidden rounded-2xl ${large ? "row-span-2 min-h-[420px]" : "min-h-[200px]"}`}
    >
      {post.featuredImage ? (
        <Image src={resolveImageUrl(post.featuredImage)} alt={post.title} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
      ) : (
        <div className="absolute inset-0 bg-ink-panel" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5">
        {post.categories[0] && (
          <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-black" style={{ background: post.categories[0].color || "#2563ff" }}>
            {post.categories[0].name}
          </span>
        )}
        <h3 className={`mt-2 font-bold text-white group-hover:text-gold ${large ? "text-2xl" : "text-base"}`}>{post.title}</h3>
      </div>
    </Link>
  );
}

function StreamRow({ post, dateFormat, permalinkStructure }: { post: PostCard; dateFormat?: string; permalinkStructure?: string }) {
  return (
    <Link href={buildPostHref(post, permalinkStructure || "/%postname%/")} className="group flex gap-4 rounded-xl border border-ink-border bg-ink-panel p-4 transition-colors hover:border-gold/40">
      <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg">
        {post.featuredImage ? (
          <Image src={resolveImageUrl(post.featuredImage)} alt={post.title} fill sizes="112px" className="object-cover" />
        ) : (
          <div className="h-full w-full bg-ink" />
        )}
      </div>
      <div className="min-w-0">
        <h4 className="truncate text-sm font-bold text-foreground group-hover:text-gold">{post.title}</h4>
        {post.excerpt && <p className="mt-1 line-clamp-2 text-xs text-foreground/55">{post.excerpt}</p>}
        <p className="mt-2 text-[11px] text-foreground/40">
          {post.publishedAt && formatDate(post.publishedAt, dateFormat)}
          {post.readingTime && ` · ${post.readingTime} min read`}
        </p>
      </div>
    </Link>
  );
}

/**
 * Template C — Dynamic Alpine Grid: a bento-style featured block up top
 * (one large + two stacked cards), then a 2-column layout below — the main
 * post stream on the left, a sidebar (Recent Posts + an editable
 * newsletter/promo slot) on the right.
 */
export function ArchiveTemplateC({
  extraLayout,
  dateFormat,
  postsPerPage,
  permalinkStructure,
}: {
  extraLayout?: unknown;
  dateFormat?: string;
  postsPerPage?: number;
  permalinkStructure?: string;
}) {
  // Floored at 3 regardless of the setting — the bento header above the
  // stream always needs its 3 slots filled.
  const pageSize = Math.max(postsPerPage ?? 13, 3);
  const [posts, setPosts] = useState<PostCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getPosts({ page: 1, limit: pageSize })
      .then((res) => setPosts(res.items))
      .finally(() => setLoading(false));
  }, [pageSize]);

  const bento = posts.slice(0, 3);
  const stream = posts.slice(3);
  const recent = posts.slice(0, 5);

  return (
    <div className="bg-background text-foreground">
      <section className="mx-auto max-w-6xl px-6 py-12 md:px-12">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold">Alpine Journal</p>
          <h1 className="mt-3 text-3xl font-extrabold md:text-4xl">Marwa Digital Blog</h1>
        </div>

        {bento.length > 0 && (
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 md:grid-rows-2">
            {bento[0] && <BentoCard post={bento[0]} large permalinkStructure={permalinkStructure} />}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:contents">
              {bento[1] && <BentoCard post={bento[1]} permalinkStructure={permalinkStructure} />}
              {bento[2] && <BentoCard post={bento[2]} permalinkStructure={permalinkStructure} />}
            </div>
          </div>
        )}

        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-4">
            {!loading && stream.length === 0 && posts.length === 0 && <p className="text-sm text-foreground/50">No articles found.</p>}
            {stream.map((post) => (
              <StreamRow key={post.id} post={post} dateFormat={dateFormat} permalinkStructure={permalinkStructure} />
            ))}
          </div>

          <aside className="flex flex-col gap-6">
            <div className="rounded-2xl border border-ink-border bg-ink-panel p-5">
              <h3 className="text-xs font-bold uppercase tracking-wide text-gold">Recent Posts</h3>
              <div className="mt-4 flex flex-col gap-3">
                {recent.map((post) => (
                  <Link key={post.id} href={buildPostHref(post, permalinkStructure || "/%postname%/")} className="block text-sm font-medium text-foreground/80 hover:text-gold">
                    {post.title}
                  </Link>
                ))}
              </div>
            </div>

            {extraLayout != null ? (
              <div className="rounded-2xl border border-ink-border bg-ink-panel p-1">
                <LayoutRenderer blocks={extraLayout} showAddSectionBanner={false} />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-ink-border p-5 text-center text-xs text-foreground/40">
                Add a newsletter signup or promo here from Theme Builder → Blog Archive — Extra Section.
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}
