// Publishes the generated marketing pages to a running API.
//
//   npx tsx scripts/site/seed.mts --api https://... --email ... --password ...
//
// Idempotent: a page whose slug already exists is updated in place rather
// than duplicated, so this can be re-run after editing any page module.
import { homeMeta, homeLayout } from "./pages/home.mjs";
import { aboutMeta, aboutLayout } from "./pages/about.mjs";
import { servicesMeta, servicesLayout } from "./pages/services.mjs";
import { caseStudiesMeta, caseStudiesLayout } from "./pages/caseStudies.mjs";
import { contactMeta, contactLayout } from "./pages/contact.mjs";
import type { LayoutDocument } from "@marwa/builder";

interface PageSpec {
  slug: string;
  title: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  layout: LayoutDocument;
}

function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? process.argv[i + 1] : undefined;
  const out = v ?? process.env[name.toUpperCase().replace(/-/g, "_")] ?? fallback;
  if (!out) throw new Error(`Missing --${name}`);
  return out;
}

const API = arg("api", "http://localhost:4000").replace(/\/$/, "");
const EMAIL = arg("email");
const PASSWORD = arg("password");

async function login(): Promise<string> {
  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed (${res.status}): ${await res.text()}`);
  const body = (await res.json()) as { token?: string };
  if (!body.token) throw new Error("Login returned no token (is 2FA enabled on this account?)");
  return body.token;
}

async function upsert(token: string, spec: PageSpec): Promise<void> {
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const listRes = await fetch(`${API}/api/admin/pages`, { headers });
  if (!listRes.ok) throw new Error(`Listing pages failed (${listRes.status})`);
  const pages = (await listRes.json()) as { id: string; slug: string }[];
  const existing = pages.find((pg) => pg.slug === spec.slug);

  const payload = {
    title: spec.title,
    slug: spec.slug,
    editorMode: "BUILDER",
    layout: spec.layout,
    content: "",
    metaTitle: spec.metaTitle ?? null,
    metaDescription: spec.metaDescription ?? null,
    metaKeywords: spec.metaKeywords ?? null,
    published: true,
  };

  const res = existing
    ? await fetch(`${API}/api/admin/pages/${existing.id}`, { method: "PATCH", headers, body: JSON.stringify(payload) })
    : await fetch(`${API}/api/admin/pages`, { method: "POST", headers, body: JSON.stringify(payload) });

  if (!res.ok) throw new Error(`${existing ? "Update" : "Create"} "${spec.slug}" failed (${res.status}): ${await res.text()}`);
  const node = spec.layout.nodes.length;
  console.log(`${existing ? "updated" : "created"}  /${spec.slug}  (${node} sections)`);
}

const SPECS: PageSpec[] = [
  { ...homeMeta, layout: homeLayout() },
  { ...aboutMeta, layout: aboutLayout() },
  { ...servicesMeta, layout: servicesLayout() },
  { ...caseStudiesMeta, layout: caseStudiesLayout() },
  { ...contactMeta, layout: contactLayout() },
];

async function main() {
  const token = await login();
  for (const spec of SPECS) await upsert(token, spec);
  console.log(`\nDone — ${SPECS.length} page(s) published to ${API}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
