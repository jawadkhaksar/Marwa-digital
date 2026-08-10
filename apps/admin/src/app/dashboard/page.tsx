"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { api, type Page, type Post } from "@/lib/api";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <DashboardContent />
      </DashboardShell>
    </AuthGuard>
  );
}

/** Newest first, by whichever timestamp the record actually carries. */
function byNewest<T extends { updatedAt?: string; createdAt?: string }>(a: T, b: T): number {
  return new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
}

function DashboardContent() {
  const [pages, setPages] = useState<Page[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [unreadForms, setUnreadForms] = useState(0);
  const [newInquiries, setNewInquiries] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Each call is independently optional — one failing endpoint shouldn't
    // blank the whole dashboard, so the error is surfaced but the tiles that
    // did load still render.
    Promise.all([
      api.getPages(),
      api.getPosts({ limit: 5 }),
      api.getFormSubmissions(),
      api.getInquiries(),
    ])
      .then(([pageList, postList, submissions, inquiries]) => {
        setPages(pageList);
        setPosts(postList.items);
        setUnreadForms(submissions.filter((s) => !s.read).length);
        setNewInquiries(inquiries.filter((i) => i.status === "NEW").length);
      })
      .catch((err) => setError(err.message));
  }, []);

  const recentPages = [...pages].sort(byNewest).slice(0, 6);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pages" value={String(pages.length)} href="/pages" />
        <StatCard label="Published Pages" value={String(pages.filter((p) => p.published).length)} href="/pages" />
        <StatCard label="Unread Form Submissions" value={String(unreadForms)} href="/form-submissions" />
        <StatCard label="New Inquiries" value={String(newInquiries)} href="/inquiries" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Recently Edited Pages</h2>
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900 text-zinc-400">
                <tr>
                  <th className="px-4 py-2">Title</th>
                  <th className="px-4 py-2">Slug</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {recentPages.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                      No pages yet — <Link href="/pages" className="text-amber-400 hover:underline">create your first one</Link>.
                    </td>
                  </tr>
                )}
                {recentPages.map((p) => (
                  <tr key={p.id} className="border-t border-zinc-800">
                    <td className="px-4 py-2">{p.title}</td>
                    <td className="px-4 py-2 font-mono text-xs text-zinc-400">/{p.slug}</td>
                    <td className="px-4 py-2">{p.published ? "Published" : "Draft"}</td>
                    <td className="px-4 py-2 text-right">
                      <Link href={`/builder/${p.id}`} className="text-amber-400 hover:underline">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Latest Posts</h2>
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900 text-zinc-400">
                <tr>
                  <th className="px-4 py-2">Title</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {posts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-zinc-500">
                      No posts yet — <Link href="/blog/posts/new" className="text-amber-400 hover:underline">write your first one</Link>.
                    </td>
                  </tr>
                )}
                {posts.map((p) => (
                  <tr key={p.id} className="border-t border-zinc-800">
                    <td className="px-4 py-2">{p.title}</td>
                    <td className="px-4 py-2">{p.status}</td>
                    <td className="px-4 py-2 text-right">
                      <Link href={`/blog/posts/${p.id}`} className="text-amber-400 hover:underline">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-amber-400/50">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </Link>
  );
}
