"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { api, type Post, type PostStatus, type Category } from "@/lib/api";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

const STATUS_LABELS: Record<PostStatus, string> = { DRAFT: "Draft", PUBLISHED: "Published", SCHEDULED: "Scheduled", STAGED: "Staged / Preview Ready" };
const STATUS_COLORS: Record<PostStatus, string> = {
  DRAFT: "text-zinc-500",
  PUBLISHED: "text-emerald-400",
  SCHEDULED: "text-amber-400",
  STAGED: "text-amber-300",
};

export default function AllPostsPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <AllPostsContent />
      </DashboardShell>
    </AuthGuard>
  );
}

function AllPostsContent() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState<PostStatus | "">("");
  const [categoryId, setCategoryId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const limit = 20;

  const load = useCallback(() => {
    setLoading(true);
    api
      .getPosts({ page, limit, search: search || undefined, status: status || undefined, categoryId: categoryId || undefined })
      .then((res) => {
        setPosts(res.items);
        setTotal(res.total);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load posts"))
      .finally(() => setLoading(false));
  }, [page, search, status, categoryId]);

  // load() flips setLoading(true) synchronously before its fetch starts —
  // same "spinner before the request resolves" pattern as the blog archive
  // templates in apps/web.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, [load]);
  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    // Clears the row-selection checkboxes whenever the filters/page change
    // out from under them — a real "reset derived UI state when its inputs
    // change" sync, not something with a non-effect alternative here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(new Set());
  }, [page, search, status, categoryId]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === posts.length ? new Set() : new Set(posts.map((p) => p.id))));
  }

  async function runBulk(action: "publish" | "draft" | "delete") {
    if (selected.size === 0) return;
    if (action === "delete" && !confirm(`Delete ${selected.size} post(s)? This cannot be undone.`)) return;
    try {
      await api.bulkPosts(Array.from(selected), action);
      setSelected(new Set());
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk action failed");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this post?")) return;
    try {
      await api.deletePost(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete post");
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">All Posts</h1>
        <Link href="/blog/posts/new" className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300">
          + Add New Post
        </Link>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <form onSubmit={submitSearch} className="flex items-center gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search title or excerpt…"
            className="w-64 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm focus:border-amber-400 focus:outline-none"
          />
          <button type="submit" className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800">
            Search
          </button>
        </form>

        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as PostStatus | "");
          }}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          {(Object.keys(STATUS_LABELS) as PostStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <select
          value={categoryId}
          onChange={(e) => {
            setPage(1);
            setCategoryId(e.target.value);
          }}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {selected.size > 0 && (
          <div className="ml-auto flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs">
            <span className="text-amber-300">{selected.size} selected</span>
            <button onClick={() => runBulk("publish")} className="text-emerald-400 hover:underline">
              Publish
            </button>
            <span className="text-zinc-600">|</span>
            <button onClick={() => runBulk("draft")} className="text-zinc-300 hover:underline">
              Draft
            </button>
            <span className="text-zinc-600">|</span>
            <button onClick={() => runBulk("delete")} className="text-red-400 hover:underline">
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400">
            <tr>
              <th className="px-4 py-3">
                <input type="checkbox" checked={posts.length > 0 && selected.size === posts.length} onChange={toggleSelectAll} />
              </th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Categories</th>
              <th className="px-4 py-3">Author</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && posts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  No posts found.
                </td>
              </tr>
            )}
            {posts.map((p) => (
              <tr key={p.id} className="group border-t border-zinc-800 hover:bg-zinc-900/60">
                <td className="px-4 py-3 align-top">
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelected(p.id)} />
                </td>
                <td className="px-4 py-3">
                  <Link href={`/blog/posts/${p.id}`} className="font-semibold text-amber-400 hover:underline">
                    {p.title}
                  </Link>
                  <div className="mt-1 flex gap-2 text-xs text-zinc-500 opacity-0 transition-opacity group-hover:opacity-100">
                    <Link href={`/blog/posts/${p.id}`} className="hover:text-amber-400 hover:underline">
                      Edit
                    </Link>
                    <span>|</span>
                    <a href={`${WEB_URL}/blog/${p.slug}`} target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 hover:underline">
                      View
                    </a>
                    <span>|</span>
                    <button onClick={() => handleDelete(p.id)} className="hover:text-red-400 hover:underline">
                      Delete
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <span className={STATUS_COLORS[p.status]}>{STATUS_LABELS[p.status]}</span>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-wrap gap-1">
                    {p.categories.map((c) => (
                      <span key={c.id} className="rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300">
                        {c.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 align-top text-zinc-400">{p.author?.name ?? "—"}</td>
                <td className="px-4 py-3 align-top text-zinc-400">
                  {p.publishedAt
                    ? new Date(p.publishedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-zinc-500">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
