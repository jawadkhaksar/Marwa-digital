// Seeds the Insights articles as real Post rows (idempotent by slug), so
// the blog page has genuine content behind it rather than an empty grid.
import { BLOG_POSTS } from "./pages/blog.mjs";

function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(`--${name}`);
  const out = (i >= 0 ? process.argv[i + 1] : undefined) ?? fallback;
  if (!out) throw new Error(`Missing --${name}`);
  return out;
}

const API = arg("api", "http://localhost:4000").replace(/\/$/, "");
const EMAIL = arg("email");
const PASSWORD = arg("password");

const CATEGORIES = [
  { name: "Web Performance", slug: "web-performance", description: "Speed, Core Web Vitals and the engineering behind fast sites.", color: "#2563ff" },
  { name: "SEO", slug: "seo", description: "Technical SEO, content strategy and organic growth.", color: "#22c55e" },
  { name: "Conversion", slug: "conversion", description: "Research, testing and copy that turns visitors into customers.", color: "#f59e0b" },
  { name: "Brand Strategy", slug: "brand-strategy", description: "Positioning, identity and messaging.", color: "#ec4899" },
];

const POST_CATEGORY: Record<string, string> = {
  "why-your-website-speed-is-costing-you-revenue": "web-performance",
  "technical-seo-checklist-for-a-website-redesign": "seo",
  "how-to-write-website-copy-that-converts": "conversion",
  "signs-your-business-needs-a-website-redesign": "conversion",
  "what-a-brand-is-and-what-it-is-not": "brand-strategy",
  "conversion-rate-optimisation-where-to-start": "conversion",
};

const IMAGES: Record<string, string> = {
  "why-your-website-speed-is-costing-you-revenue": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1600&q=80",
  "technical-seo-checklist-for-a-website-redesign": "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1600&q=80",
  "how-to-write-website-copy-that-converts": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=80",
  "signs-your-business-needs-a-website-redesign": "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1600&q=80",
  "what-a-brand-is-and-what-it-is-not": "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1600&q=80",
  "conversion-rate-optimisation-where-to-start": "https://images.unsplash.com/photo-1531973576160-7125cd663d86?auto=format&fit=crop&w=1600&q=80",
};

async function main() {
  const loginRes = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!loginRes.ok) throw new Error(`Login failed (${loginRes.status})`);
  const { token } = (await loginRes.json()) as { token: string };
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  // Categories
  const existingCats = (await (await fetch(`${API}/api/admin/categories`, { headers })).json()) as { id: string; slug: string }[];
  const catIdBySlug = new Map(existingCats.map((c) => [c.slug, c.id]));
  for (const cat of CATEGORIES) {
    if (catIdBySlug.has(cat.slug)) continue;
    const res = await fetch(`${API}/api/admin/categories`, { method: "POST", headers, body: JSON.stringify(cat) });
    if (res.ok) {
      const created = (await res.json()) as { id: string };
      catIdBySlug.set(cat.slug, created.id);
      console.log(`category created  ${cat.slug}`);
    } else {
      console.warn(`category failed   ${cat.slug} (${res.status})`);
    }
  }

  // Posts
  const listed = (await (await fetch(`${API}/api/admin/posts?limit=100`, { headers })).json()) as { items: { id: string; slug: string }[] };
  const postIdBySlug = new Map(listed.items.map((p) => [p.slug, p.id]));

  let i = 0;
  for (const post of BLOG_POSTS) {
    i += 1;
    const catId = catIdBySlug.get(POST_CATEGORY[post.slug] ?? "");
    const publishedAt = new Date(Date.now() - i * 6 * 24 * 60 * 60 * 1000).toISOString();
    const payload = {
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      editorMode: "CLASSIC",
      content: post.content,
      featuredImage: IMAGES[post.slug] ?? null,
      status: "PUBLISHED",
      publishedAt,
      isFeatured: i === 1,
      metaTitle: post.metaTitle,
      metaDescription: post.metaDescription,
      categoryIds: catId ? [catId] : [],
      tagIds: [],
    };
    const id = postIdBySlug.get(post.slug);
    const res = id
      ? await fetch(`${API}/api/admin/posts/${id}`, { method: "PATCH", headers, body: JSON.stringify(payload) })
      : await fetch(`${API}/api/admin/posts`, { method: "POST", headers, body: JSON.stringify(payload) });
    console.log(`${res.ok ? (id ? "updated" : "created") : `FAILED (${res.status})`}  ${post.slug}`);
    if (!res.ok) console.warn((await res.text()).slice(0, 300));
  }
  console.log(`\nDone — ${BLOG_POSTS.length} articles seeded`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
