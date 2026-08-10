"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { api, type PostCard } from "@/lib/api";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { formatDate } from "../formatDate";
import { buildPostHref } from "@/lib/blogPermalink";
import { LayoutRenderer } from "@/components/builder/LayoutRenderer";

function ListRow({ post, dateFormat, permalinkStructure }: { post: PostCard; dateFormat?: string; permalinkStructure?: string }) {
  return (
    <Link href={buildPostHref(post, permalinkStructure || "/%postname%/")} className="group grid grid-cols-1 gap-6 py-10 first:pt-0 sm:grid-cols-2 sm:items-center">
      <div className="relative h-64 w-full overflow-hidden rounded-xl">
        {post.featuredImage ? (
          <Image src={resolveImageUrl(post.featuredImage)} alt={post.title} fill sizes="(min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="h-full w-full bg-ink-panel" />
        )}
      </div>
      <div>
        {post.categories[0] && <p className="text-xs font-medium uppercase tracking-[0.2em] text-foreground/40">{post.categories[0].name}</p>}
        <h2 className="mt-3 text-2xl font-light leading-snug text-foreground group-hover:text-gold md:text-3xl">{post.title}</h2>
        {post.excerpt && <p className="mt-4 text-sm leading-relaxed text-foreground/55">{post.excerpt}</p>}
        <div className="mt-5 flex items-center gap-3 text-xs text-foreground/40">
          {post.author && <span>{post.author.name}</span>}
          {post.publishedAt && <span>{formatDate(post.publishedAt, dateFormat)}</span>}
          {post.readingTime && (
            <span className="rounded-full border border-ink-border px-2.5 py-1 text-[10px] uppercase tracking-wide">{post.readingTime} min read</span>
          )}
        </div>
      </div>
    </Link>
  );
}

/**
 * Template B — Minimalist Luxury: a clean, wide 2-column list (not a card
 * grid), large imagery, subtle serif-weight typography, and simple numbered
 * pagination instead of "Load More".
 */
export function ArchiveTemplateB({
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
  const pageSize = postsPerPage ?? 6;
  const [posts, setPosts] = useState<PostCard[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // See TemplateA.tsx's identical pattern — needs to run synchronously so
    // the spinner shows before the request resolves, not after.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    api
      .getPosts({ page, limit: pageSize })
      .then((res) => {
        setPosts(res.items);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="bg-background text-foreground">
      <section className="mx-auto max-w-3xl px-6 pb-24 pt-20 md:px-0">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-gold">Marwa Digital Journal</p>
          <h1 className="mt-4 text-4xl font-light md:text-5xl">The Blog</h1>
          <p className="mx-auto mt-4 max-w-lg text-sm text-foreground/50">
            Considered writing on the work we do and the things we learn.
          </p>
        </div>

        {extraLayout != null && (
          <div className="mt-16">
            <LayoutRenderer blocks={extraLayout} showAddSectionBanner={false} />
          </div>
        )}

        <div className="mt-16 divide-y divide-ink-border">
          {posts.map((post) => (
            <ListRow key={post.id} post={post} dateFormat={dateFormat} permalinkStructure={permalinkStructure} />
          ))}
        </div>

        {!loading && posts.length === 0 && <p className="mt-10 text-center text-sm text-foreground/50">No articles found.</p>}

        {totalPages > 1 && (
          <div className="mt-16 flex items-center justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`h-9 w-9 rounded-full text-sm transition-colors ${
                  p === page ? "bg-gold text-white" : "text-foreground/50 hover:text-gold"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
