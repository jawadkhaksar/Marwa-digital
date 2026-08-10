// Builds the site's header and footer navigation so the generated pages are
// actually reachable. Idempotent: an existing menu of the same name is
// reused and its items replaced, rather than accumulating duplicates.

function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(`--${name}`);
  const out = (i >= 0 ? process.argv[i + 1] : undefined) ?? fallback;
  if (!out) throw new Error(`Missing --${name}`);
  return out;
}

const API = arg("api", "http://localhost:4000").replace(/\/$/, "");
const EMAIL = arg("email");
const PASSWORD = arg("password");

interface Item {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
}

const HEADER: Item[] = [
  { label: "Home", href: "/home" },
  {
    label: "Services",
    href: "/services",
    children: [
      { label: "Web Design", href: "/services#web-design" },
      { label: "Web Development", href: "/services#web-development" },
      { label: "SEO & Content", href: "/services#seo" },
      { label: "E-commerce", href: "/services#ecommerce" },
      { label: "Branding", href: "/services#branding" },
      { label: "Product & UX", href: "/services#product-ux" },
    ],
  },
  { label: "Case Studies", href: "/case-studies" },
  { label: "About", href: "/about" },
  { label: "Pricing", href: "/pricing" },
  { label: "Insights", href: "/insights" },
  { label: "Contact", href: "/contact" },
];

const FOOTER: Item[] = [
  { label: "Services", href: "/services" },
  { label: "Case Studies", href: "/case-studies" },
  { label: "About Us", href: "/about" },
  { label: "Pricing", href: "/pricing" },
  { label: "Insights", href: "/insights" },
  { label: "Contact", href: "/contact" },
];

async function main() {
  const loginRes = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!loginRes.ok) throw new Error(`Login failed (${loginRes.status})`);
  const { token } = (await loginRes.json()) as { token: string };
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const menus = (await (await fetch(`${API}/api/admin/menus`, { headers })).json()) as { id: string; name: string }[];

  async function buildMenu(name: string, items: Item[], location: "header" | "footer") {
    let menu = menus.find((m) => m.name === name);
    if (!menu) {
      const res = await fetch(`${API}/api/admin/menus`, { method: "POST", headers, body: JSON.stringify({ name }) });
      if (!res.ok) throw new Error(`Creating menu "${name}" failed (${res.status}): ${await res.text()}`);
      menu = (await res.json()) as { id: string; name: string };
      console.log(`menu created   ${name}`);
    } else {
      // Replace the existing items so re-runs don't stack duplicates.
      const full = (await (await fetch(`${API}/api/admin/menus/${menu.id}`, { headers })).json()) as { items?: { id: string }[] };
      for (const it of full.items ?? []) {
        await fetch(`${API}/api/admin/menus/${menu.id}/items/${it.id}`, { method: "DELETE", headers });
      }
      console.log(`menu reused    ${name} (items reset)`);
    }

    let order = 0;
    for (const item of items) {
      const res = await fetch(`${API}/api/admin/menus/${menu.id}/items`, {
        method: "POST",
        headers,
        body: JSON.stringify({ label: item.label, href: item.href, order: order++, active: true }),
      });
      if (!res.ok) {
        console.warn(`  item failed  ${item.label} (${res.status})`);
        continue;
      }
      const parent = (await res.json()) as { id: string };
      for (const child of item.children ?? []) {
        const cRes = await fetch(`${API}/api/admin/menus/${menu.id}/items`, {
          method: "POST",
          headers,
          body: JSON.stringify({ label: child.label, href: child.href, parentId: parent.id, order: order++, active: true }),
        });
        if (!cRes.ok) console.warn(`    child failed ${child.label} (${cRes.status})`);
      }
    }

    const patch = await fetch(`${API}/api/admin/menus/${menu.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(location === "header" ? { showInHeader: true } : { showInFooter: true }),
    });
    if (!patch.ok) console.warn(`  assigning ${location} location failed (${patch.status})`);

    if (location === "header") {
      // SiteHeader's own nav renders whichever menu SiteSettings points at.
      const sRes = await fetch(`${API}/api/admin/settings`, { method: "PATCH", headers, body: JSON.stringify({ primaryMenuId: menu.id }) });
      if (!sRes.ok) console.warn(`  setting primaryMenuId failed (${sRes.status})`);
    }
    console.log(`  ${items.length} top-level items -> ${location}`);
  }

  await buildMenu("Main Navigation", HEADER, "header");
  await buildMenu("Footer Navigation", FOOTER, "footer");
  console.log("\nNavigation configured.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
