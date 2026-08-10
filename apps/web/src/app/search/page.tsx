import type { Metadata } from "next";
import { SubPageHeader } from "@/components/SubPageHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { api } from "@/lib/api";
import { buildPostHref } from "@/lib/blogPermalink";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search | Marwa Digital",
  robots: { index: false, follow: true },
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const [results, settings] = await Promise.all([
    query ? api.search(query).catch(() => ({ query, posts: [], pages: [] })) : Promise.resolve({ query: "", posts: [], pages: [] }),
    api.getSettings().catch(() => null),
  ]);

  const structure = settings?.permalinkStructure || "/%postname%/";
  const totalResults = results.posts.length + results.pages.length;

  return (
    <>
      <SubPageHeader />
      <main className="mx-auto max-w-3xl px-6 py-16 md:px-8">
        <h1 className="text-3xl font-bold">Search</h1>

        <form action="/search" method="get" className="mt-6 flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search the site..."
            className="w-full rounded-full border border-black/10 bg-black/[0.03] px-5 py-3 text-sm focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/[0.05]"
          />
          <button type="submit" className="shrink-0 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700">
            Search
          </button>
        </form>

        {query && (
          <p className="mt-6 text-sm text-black/50 dark:text-white/50">
            {totalResults === 0 ? `No results for "${query}".` : `${totalResults} result${totalResults === 1 ? "" : "s"} for "${query}".`}
          </p>
        )}

        {totalResults > 0 && (
          <div className="mt-6 flex flex-col divide-y divide-black/10 dark:divide-white/10">
            {results.posts.map((post) => (
              <a key={post.slug} href={buildPostHref(post, structure)} className="block py-5 first:pt-0">
                <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">Blog Post</span>
                <h2 className="mt-1 text-lg font-semibold">{post.title}</h2>
                {post.excerpt && <p className="mt-1 text-sm text-black/60 dark:text-white/60">{post.excerpt}</p>}
              </a>
            ))}
            {results.pages.map((page) => (
              <a key={page.slug} href={`/${page.slug}`} className="block py-5 first:pt-0">
                <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">Page</span>
                <h2 className="mt-1 text-lg font-semibold">{page.title}</h2>
                {page.metaDescription && <p className="mt-1 text-sm text-black/60 dark:text-white/60">{page.metaDescription}</p>}
              </a>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
