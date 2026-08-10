"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { clearToken, api, type SiteSettings } from "@/lib/api";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useActiveOrganization } from "@/lib/useActiveOrganization";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";

type DashboardBranding = Pick<SiteSettings, "siteName" | "logoImage">;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Admin-uploaded Site Logo lives on the API at /uploads/** — same small
// per-file resolver pattern as settings/general/page.tsx and layout.tsx,
// this app has no shared image-resolution helper yet.
function resolveUploadUrl(url: string): string {
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

const BLOG_SUBNAV: { href: string; label: string }[] = [
  { href: "/blog/posts", label: "All Posts" },
  { href: "/blog/posts/new", label: "Add New Post" },
  { href: "/blog/categories", label: "Categories" },
  { href: "/blog/tags", label: "Tags" },
];

const ANALYTICS_SUBNAV: { href: string; label: string }[] = [
  { href: "/analytics", label: "Overview & Leads" },
  { href: "/analytics/recordings", label: "Session Recordings" },
  { href: "/analytics/heatmaps", label: "Heatmaps" },
  { href: "/analytics/forms", label: "Form Analytics" },
];

const SETTINGS_SUBNAV: { href: string; label: string }[] = [
  { href: "/settings/general", label: "General" },
  { href: "/settings/writing", label: "Writing" },
  { href: "/settings/reading", label: "Reading" },
  { href: "/settings/permalinks", label: "Permalinks" },
  { href: "/email-templates", label: "Email Templates" },
  { href: "/settings", label: "All Settings" },
];

type NavLeaf = { href: string; label: string };
type NavSpecial = { special: "blog" | "settings" | "analytics"; label: string };
type NavChild = NavLeaf | NavSpecial;
type NavGroup = { group: string; children: NavChild[] };

// "/users" and the Settings subnav both hit ADMIN-only endpoints server-side
// (requireRole("ADMIN") in packages/api's server.ts) — hidden here too so an
// EDITOR account isn't shown a link that just 403s.
function isAdminOnlyChild(child: NavChild): boolean {
  return (
    ("href" in child && (child.href === "/users" || child.href === "/system/backups")) ||
    ("special" in child && child.special === "settings")
  );
}

// Grouped sidebar hierarchy — flat top-level items collapsed into logical
// sections. Dashboard stays outside any group (a single destination, not a
// category). Hrefs match this app's actual route folder names (Setup Helper
// is /setup-helper, Gallery/Media is /gallery).
const NAV_GROUPS: NavGroup[] = [
  {
    group: "Content & CMS",
    children: [
      { href: "/pages", label: "Pages" },
      { special: "blog", label: "Blog Engine" },
      { href: "/gallery", label: "Gallery / Media" },
      { href: "/collections", label: "Collections" },
      { href: "/faqs", label: "FAQs" },
    ],
  },
  {
    group: "Appearance & Builder",
    children: [
      { href: "/theme-builder", label: "Theme Builder" },
      { href: "/menus", label: "Menus" },
      { href: "/footer-links", label: "Footer Links" },
    ],
  },
  {
    group: "CRM & Pipelines",
    children: [
      { href: "/crm/pipeline", label: "Pipeline" },
      { href: "/crm/contacts", label: "Contacts" },
      { href: "/crm/workflows", label: "Automation Workflows" },
      { href: "/crm/automation-email-templates", label: "Marketing Emails" },
    ],
  },
  {
    group: "Inquiries & Forms",
    children: [
      { special: "analytics", label: "Analytics & Leads" },
      { href: "/inquiries", label: "Inquiries" },
      { href: "/form-submissions", label: "Form Submissions" },
      { href: "/reviews", label: "Reviews" },
    ],
  },
  {
    group: "System & Settings",
    children: [
      { href: "/users", label: "Users" },
      { href: "/workspaces", label: "Workspaces" },
      { special: "settings", label: "Settings" },
      // Self-service — every staff member (ADMIN and EDITOR) manages their
      // own password/2FA here, so unlike "Settings" above this is NOT in
      // isAdminOnlyChild.
      { href: "/settings/security", label: "Security" },
      { href: "/audit-logs", label: "Audit Logs" },
      { href: "/system/backups", label: "Backups" },
      { href: "/setup-helper", label: "Setup Helper" },
    ],
  },
];

function isChildActive(child: NavChild, pathname: string): boolean {
  if ("special" in child) {
    if (child.special === "blog") return pathname.startsWith("/blog");
    if (child.special === "analytics") return pathname.startsWith("/analytics");
    return pathname.startsWith("/settings") || pathname === "/email-templates";
  }
  // "/crm/contacts" nests a "/crm/contacts/[id]" detail page — the nav item
  // should stay highlighted there too, same as Blog Engine/Settings above.
  if (child.href === "/crm/contacts") return pathname === child.href || pathname.startsWith(`${child.href}/`);
  return pathname === child.href;
}

function isGroupActive(group: NavGroup, pathname: string): boolean {
  return group.children.some((c) => isChildActive(c, pathname));
}

// Grid-rows animation trick (0fr -> 1fr) so subnav/group bodies expand and
// collapse smoothly instead of popping in/out with conditional rendering.
function CollapsibleSection({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div className={`grid transition-all duration-200 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

type CacheStatus = "idle" | "loading" | "success" | "error";

// Purges the public site's Next.js cache (see apps/web's POST /api/revalidate)
// so a just-published edit shows up immediately instead of waiting for that
// route's own revalidation. Every content route on the site already renders
// fully dynamic, so this is mostly a safety net today — but it's real, not a
// stub: it reaches all the way through to Next.js's revalidatePath.
function ClearCacheButton() {
  const [status, setStatus] = useState<CacheStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setStatus("loading");
    setError(null);
    try {
      await api.clearCache();
      setStatus("success");
      setTimeout(() => setStatus("idle"), 2500);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to clear cache");
      setTimeout(() => setStatus("idle"), 4000);
    }
  }

  const label = status === "loading" ? "Clearing…" : status === "success" ? "Cache cleared" : status === "error" ? "Failed — retry" : "Clear Cache";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === "loading"}
      title={status === "error" ? (error ?? "Failed to clear cache") : "Purge the public site's cache so recent edits show up immediately"}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
        status === "success"
          ? "border-emerald-500/40 text-emerald-400"
          : status === "error"
            ? "border-red-500/40 text-red-400"
            : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-3.5 w-3.5 ${status === "loading" ? "animate-spin" : ""}`}>
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <path d="M21 3v6h-6" />
      </svg>
      {label}
    </button>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useCurrentUser();
  const isAdmin = user?.role === "ADMIN";
  const { activeOrganization } = useActiveOrganization();
  const brandColor = activeOrganization?.primaryColor || "#3b82f6"; // blue-500, this app's default accent

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(NAV_GROUPS.filter((g) => isGroupActive(g, pathname)).map((g) => g.group)));
  const [blogOpen, setBlogOpen] = useState(pathname.startsWith("/blog"));
  const [analyticsOpen, setAnalyticsOpen] = useState(pathname.startsWith("/analytics"));
  const [settingsOpen, setSettingsOpen] = useState(pathname.startsWith("/settings") || pathname === "/email-templates");
  const [settings, setSettings] = useState<DashboardBranding | null>(null);

  useEffect(() => {
    api.getPublicSettings().then(setSettings).catch(() => {});
  }, []);

  // Auto-expand whichever group (and nested special subnav) contains the
  // current route — doesn't auto-collapse anything the admin already opened
  // by hand, so navigating around within a section doesn't keep shutting it.
  useEffect(() => {
    const active = NAV_GROUPS.filter((g) => isGroupActive(g, pathname)).map((g) => g.group);
    // Expands whichever nav group contains the current route on every
    // navigation — a real "sync UI state from an external system" (the
    // router's current pathname), just triggered directly rather than from
    // inside a subscription callback.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (active.length > 0) setOpenGroups((prev) => new Set([...prev, ...active]));
    if (pathname.startsWith("/blog")) setBlogOpen(true);
    if (pathname.startsWith("/analytics")) setAnalyticsOpen(true);
    if (pathname.startsWith("/settings") || pathname === "/email-templates") setSettingsOpen(true);
  }, [pathname]);

  function toggleGroup(group: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  function logout() {
    clearToken();
    router.replace("/login");
  }

  function renderChild(child: NavChild) {
    if ("special" in child && child.special === "blog") {
      return (
        <div key="blog">
          <button
            type="button"
            onClick={() => setBlogOpen((v) => !v)}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors duration-200 ${
              pathname.startsWith("/blog") ? "nav-active-glow bg-[var(--brand)] text-white" : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
            }`}
          >
            Blog Engine
            <span className={`text-xs transition-transform duration-200 ${blogOpen ? "rotate-90" : ""}`}>▸</span>
          </button>
          <CollapsibleSection open={blogOpen}>
            <div className="ml-3 mt-1 flex flex-col gap-0.5 border-l border-white/[0.08] pl-3">
              {BLOG_SUBNAV.map((sub) => {
                const active = pathname === sub.href;
                return (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    className={`rounded-md px-2 py-1.5 text-sm transition-colors duration-200 ${active ? "bg-amber-400/20 text-amber-300" : "text-zinc-400 hover:text-zinc-100"}`}
                  >
                    {sub.label}
                  </Link>
                );
              })}
            </div>
          </CollapsibleSection>
        </div>
      );
    }

    if ("special" in child && child.special === "analytics") {
      return (
        <div key="analytics">
          <button
            type="button"
            onClick={() => setAnalyticsOpen((v) => !v)}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors duration-200 ${
              pathname.startsWith("/analytics") ? "nav-active-glow bg-[var(--brand)] text-white" : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
            }`}
          >
            Analytics &amp; Leads
            <span className={`text-xs transition-transform duration-200 ${analyticsOpen ? "rotate-90" : ""}`}>▸</span>
          </button>
          <CollapsibleSection open={analyticsOpen}>
            <div className="ml-3 mt-1 flex flex-col gap-0.5 border-l border-white/[0.08] pl-3">
              {ANALYTICS_SUBNAV.map((sub) => {
                const active = pathname === sub.href;
                return (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    className={`rounded-md px-2 py-1.5 text-sm transition-colors duration-200 ${active ? "bg-amber-400/20 text-amber-300" : "text-zinc-400 hover:text-zinc-100"}`}
                  >
                    {sub.label}
                  </Link>
                );
              })}
            </div>
          </CollapsibleSection>
        </div>
      );
    }

    if ("special" in child && child.special === "settings") {
      return (
        <div key="settings">
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors duration-200 ${
              pathname.startsWith("/settings") || pathname === "/email-templates" ? "nav-active-glow bg-[var(--brand)] text-white" : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
            }`}
          >
            Settings
            <span className={`text-xs transition-transform duration-200 ${settingsOpen ? "rotate-90" : ""}`}>▸</span>
          </button>
          <CollapsibleSection open={settingsOpen}>
            <div className="ml-3 mt-1 flex flex-col gap-0.5 border-l border-white/[0.08] pl-3">
              {SETTINGS_SUBNAV.map((sub) => {
                const active = pathname === sub.href;
                return (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    className={`rounded-md px-2 py-1.5 text-sm transition-colors duration-200 ${active ? "bg-amber-400/20 text-amber-300" : "text-zinc-400 hover:text-zinc-100"}`}
                  >
                    {sub.label}
                  </Link>
                );
              })}
            </div>
          </CollapsibleSection>
        </div>
      );
    }

    const leaf = child as NavLeaf;
    const active = isChildActive(leaf, pathname);
    return (
      <Link
        key={leaf.href}
        href={leaf.href}
        className={`rounded-lg px-3 py-2 text-sm transition-colors duration-200 ${active ? "nav-active-glow bg-[var(--brand)] text-white" : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"}`}
      >
        {leaf.label}
      </Link>
    );
  }

  // White-Labeling: the active workspace's own logo/accent color override
  // this app's default Marwa Digital branding in the persistent chrome
  // (sidebar logo + active-state highlight color) — see
  // useActiveOrganization and Organization.primaryColor/logoUrl.
  const logoUrl = activeOrganization?.logoUrl || settings?.logoImage;
  const logoAlt = activeOrganization?.name || settings?.siteName || "Marwa Digital";

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100" style={{ "--brand": brandColor } as CSSProperties}>
      <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-r border-white/[0.08] bg-zinc-950 p-4">
        <Link href="/dashboard" className="mb-6 flex items-center px-2">
          {logoUrl ? (
            // Uploaded assets are outside Next's static build, so a plain
            // <img> is correct here — same as Gallery's usage elsewhere.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolveUploadUrl(logoUrl)} alt={logoAlt} className="h-8 w-auto object-contain" />
          ) : settings?.siteName ? (
            <span className="text-lg font-semibold text-white">
              {settings.siteName} <span className="text-[var(--brand)]">Admin</span>
            </span>
          ) : (
            <span className="text-lg font-semibold">
              Marwa <span className="text-[var(--brand)]">Digital</span> Admin
            </span>
          )}
        </Link>
        <WorkspaceSwitcher />
        <nav className="flex flex-1 flex-col gap-1">
          <Link
            href="/dashboard"
            className={`rounded-lg px-3 py-2 text-sm transition-colors duration-200 ${
              pathname === "/dashboard" ? "nav-active-glow bg-[var(--brand)] text-white" : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
            }`}
          >
            Dashboard
          </Link>

          {NAV_GROUPS.map((g, i) => {
            const open = openGroups.has(g.group);
            const groupActive = isGroupActive(g, pathname);
            return (
              <div key={g.group} className={`mt-1 ${i > 0 ? "mt-3 border-t border-white/[0.06] pt-3" : ""}`}>
                <button
                  type="button"
                  onClick={() => toggleGroup(g.group)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors duration-200 ${
                    groupActive ? "text-[var(--brand)]" : "text-zinc-400 hover:text-zinc-100"
                  }`}
                >
                  {g.group}
                  <span className={`transition-transform duration-200 ${open ? "rotate-90" : ""}`}>▸</span>
                </button>
                <CollapsibleSection open={open}>
                  <div className="flex flex-col gap-0.5 pt-0.5">
                    {g.children.filter((child) => isAdmin || !isAdminOnlyChild(child)).map(renderChild)}
                  </div>
                </CollapsibleSection>
              </div>
            );
          })}
        </nav>
        <button
          onClick={logout}
          className="mt-4 rounded-lg px-3 py-2 text-left text-sm text-zinc-400 transition-colors duration-200 hover:bg-white/[0.04] hover:text-zinc-100"
        >
          Log out
        </button>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-end gap-3 border-b border-white/[0.08] px-6 py-2.5">
          <ClearCacheButton />
        </header>
        <main className="flex-1 overflow-x-auto p-8">{children}</main>
      </div>
    </div>
  );
}
