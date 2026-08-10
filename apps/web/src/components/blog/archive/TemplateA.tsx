"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { api, type PostCard, type BlogCategory } from "@/lib/api";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { formatDate } from "../formatDate";
import { buildPostHref } from "@/lib/blogPermalink";
import { LayoutRenderer } from "@/components/builder/LayoutRenderer";

function PostCardView({ post, dateFormat, permalinkStructure }: { post: PostCard; dateFormat?: string; permalinkStructure?: string }) {
  return (
    <Link
      href={buildPostHref(post, permalinkStructure || "/%postname%/")}
      className="group flex flex-col overflow-hidden rounded-2xl border border-ink-border bg-ink-panel transition-colors hover:border-gold/40"
    >
      <div className="relative h-48 w-full overflow-hidden">
        {post.featuredImage ? (
          <Image
            src={resolveImageUrl(post.featuredImage)}
            alt={post.title}
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-ink" />
        )}
        {post.categories[0] && (
          <span
            className="absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-black"
            style={{ background: post.categories[0].color || "#2563ff" }}
          >
            {post.categories[0].name}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-lg font-bold text-foreground group-hover:text-gold">{post.title}</h3>
        {post.excerpt && <p className="line-clamp-2 text-sm text-foreground/60">{post.excerpt}</p>}
        <div className="mt-auto flex items-center gap-3 pt-3 text-xs text-foreground/50">
          {post.author?.avatarUrl ? (
            <Image src={resolveImageUrl(post.author.avatarUrl)} alt="" width={24} height={24} className="rounded-full object-cover" />
          ) : (
            post.author && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold/20 text-[10px] font-bold text-gold">{post.author.name[0]}</span>
          )}
          {post.author && <span>{post.author.name}</span>}
          {post.readingTime && <span>· {post.readingTime} min read</span>}
          {post.publishedAt && <span>· {formatDate(post.publishedAt, dateFormat)}</span>}
        </div>
      </div>
    </Link>
  );
}

/**
 * Template A — Modern Editorial / Magazine: big split hero for the
 * newest featured post, a sticky category-pill + search filter bar, and a
 * 3-column card grid below.
 */
export function ArchiveTemplateA({
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
  const pageSize = postsPerPage ?? 9;
  const [featured, setFeatured] = useState<PostCard | null>(null);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [posts, setPosts] = useState<PostCard[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getFeaturedPost().then(setFeatured).catch(() => {});
    api.getBlogCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    // Flips the loading indicator back on for every re-fetch this effect
    // triggers (search/category changed) — the initial mount's fetch
    // already starts from `loading`'s own true default, so this only
    // matters for the ones after. Genuinely needs to run synchronously
    // (not from inside the request's own callback) so the spinner shows
    // before the network round-trip, not after it resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    api
      .getPosts({ page: 1, limit: pageSize, search: search || undefined, category: activeCategory || undefined })
      .then((res) => {
        setPosts(res.items);
        setHasMore(res.hasMore);
        setPage(1);
      })
      .finally(() => setLoading(false));
  }, [search, activeCategory, pageSize]);

  function loadMore() {
    const nextPage = page + 1;
    api.getPosts({ page: nextPage, limit: pageSize, search: search || undefined, category: activeCategory || undefined }).then((res) => {
      setPosts((prev) => [...prev, ...res.items]);
      setHasMore(res.hasMore);
      setPage(nextPage);
    });
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput.trim());
  }

  return (
    <div className="bg-background text-foreground">
      {featured && (
        <section className="relative h-[46vh] min-h-[340px] w-full overflow-hidden">
          {featured.featuredImage && (
            <Image src={resolveImageUrl(featured.featuredImage)} alt={featured.title} fill priority sizes="100vw" className="object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" />
          <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-end px-6 pb-10 md:px-12">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold">Featured Article</p>
            <Link href={buildPostHref(featured, permalinkStructure || "/%postname%/")} className="mt-3 max-w-3xl text-2xl font-extrabold hover:text-gold md:text-4xl">
              {featured.title}
            </Link>
            {featured.excerpt && <p className="mt-3 max-w-2xl text-sm text-white/80 md:text-base">{featured.excerpt}</p>}
            <Link
              href={buildPostHref(featured, permalinkStructure || "/%postname%/")}
              className="mt-5 w-fit rounded-full bg-gold px-6 py-3 text-xs font-semibold text-white hover:bg-gold-dark"
            >
              Read Article
            </Link>
          </div>
        </section>
      )}

      <div className="sticky top-16 z-20 border-b border-ink-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 py-4 md:px-12">
          <form onSubmit={submitSearch} className="flex w-full max-w-md items-center gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search articles…"
              className="w-full rounded-full border border-ink-border bg-input-bg px-4 py-2 text-sm outline-none focus:border-gold"
            />
            <button type="submit" className="shrink-0 rounded-full bg-gold px-4 py-2 text-xs font-semibold text-white hover:bg-gold-dark">
              Search
            </button>
          </form>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setActiveCategory("")}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                activeCategory === "" ? "bg-gold text-white" : "border border-ink-border text-foreground/70 hover:border-gold"
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.slug)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                  activeCategory === c.slug ? "bg-gold text-white" : "border border-ink-border text-foreground/70 hover:border-gold"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-6 py-12 md:px-12">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold md:text-4xl">Marwa Digital Blog</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-foreground/60 md:text-base">
            Articles, guides, and updates from the team.
          </p>
        </div>

        {extraLayout != null && (
          <div className="mt-10">
            <LayoutRenderer blocks={extraLayout} showAddSectionBanner={false} />
          </div>
        )}

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCardView key={post.id} post={post} dateFormat={dateFormat} permalinkStructure={permalinkStructure} />
          ))}
        </div>

        {!loading && posts.length === 0 && <p className="mt-10 text-center text-sm text-foreground/50">No articles found.</p>}

        {hasMore && (
          <div className="mt-10 flex justify-center">
            <button onClick={loadMore} className="rounded-full border border-ink-border px-6 py-3 text-sm font-semibold hover:border-gold hover:text-gold">
              Load More
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
