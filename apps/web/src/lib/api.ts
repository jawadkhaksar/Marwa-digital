import type { LayoutDocument, SiteTemplateType, SiteTemplateCondition } from "@marwa/builder";

// 127.0.0.1, not localhost: Node 18+ resolves "localhost" IPv6-first (::1)
// per RFC 8305, which fails outright against a server bound only to IPv4 —
// a real source of intermittent ECONNREFUSED/"fetch failed" in dev on
// Windows even when the API is actually up and listening.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000";

// ── Blog ─────────────────────────────────────────────────────────────────

export interface BlogAuthor {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio?: string | null;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
}

export interface PostCard {
  id: string;
  postNumber: number;
  slug: string;
  title: string;
  excerpt: string | null;
  featuredImage: string | null;
  publishedAt: string | null;
  readingTime: number | null;
  isFeatured: boolean;
  author: BlogAuthor | null;
  categories: BlogCategory[];
  tags: BlogTag[];
}

export interface Post extends PostCard {
  editorMode: "CLASSIC" | "BUILDER";
  content: string | null;
  layout: LayoutDocument | null;
  format: string;
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  ogImage: string | null;
}

/**
 * What `LayoutRenderer`'s `postContext` prop actually needs — looser than
 * `Post` on purpose. A `blog_single` template gets a real `Post` (has
 * `content`); a `Posts` block's loop-card repetition only ever has the
 * lightweight `PostCard` shape from the list endpoint (no `content` — a
 * card wants `excerpt`, not full body HTML, and fetching full content per
 * card in a grid would be wasteful). `content` stays optional here so both
 * satisfy this type structurally with no casting. `href` is always present
 * — the real permalink for this specific post, precomputed by whichever
 * route/block builds the context (see buildPostHref in blogPermalink.ts),
 * since a Post/PostCard alone doesn't know the site's active permalink
 * structure. PostContent/PostExcerpt/CTAButton (in blockComponents.tsx) are
 * what actually read `content`/`excerpt`/`href` off this.
 */
export type PostContextData = PostCard & { content?: string | null; href: string };

export interface PostListResult {
  items: PostCard[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ContactInquiryPayload {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message?: string;
  // Bot defense — see ContactForm.tsx. `website` is a honeypot (must stay
  // empty), `renderedAt` is when the form was rendered (ms since epoch).
  website?: string;
  renderedAt?: number;
  // Lead attribution — see lib/analytics.ts. All optional: a direct API call
  // or a visitor with tracking blocked still submits successfully.
  sessionId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  landingPage?: string;
  conversionPage?: string;
}

export interface Review {
  id: string;
  customerName: string;
  quote: string;
  rating: number;
  source: string;
}

export interface PageSummary {
  slug: string;
  updatedAt: string;
}

export interface Page {
  slug: string;
  title: string;
  editorMode: "CLASSIC" | "BUILDER";
  content: string;
  layout: LayoutDocument | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  ogImage: string | null;
  metaRobotsIndex: boolean;
  metaRobotsFollow: boolean;
  headTags: string | null;
  customCss: string | null;
  customJs: string | null;
  template: "default" | "full-width" | "sidebar" | "landing" | "contact";
  // Only present when fetched with a valid `previewToken` — see the
  // Staging Preview Link in apps/admin's builder navbar. Not read anywhere
  // yet, but signals "this render is showing an unpublished staged draft"
  // for a future preview banner.
  isPreview?: boolean;
}

export interface SiteTemplate {
  id: string;
  type: SiteTemplateType;
  title: string;
  layout: LayoutDocument;
  conditions: SiteTemplateCondition[];
  priority: number;
  active: boolean;
  updatedAt: string;
}

// What SiteHeader's hard-coded nav consumes: GET /api/menu-links resolves
// the site's primary menu server-side and returns its top-level items, each
// with its own (one-level-deep) `children` — enough for SiteHeader to
// render a dropdown for any item that has sub-items.
export interface MenuLink {
  id: string;
  label: string;
  href: string;
  order: number;
  openInNewTab: boolean;
  previewImage: string | null;
  children?: MenuLink[];
}

export interface MenuItem {
  id: string;
  menuId: string;
  parentId: string | null;
  label: string;
  href: string;
  cssClasses: string | null;
  openInNewTab: boolean;
  order: number;
  previewImage: string | null;
}

// What the Nav Menu block fetches via GET /api/menus/:id — the full nested
// tree (all active items, any depth via parentId), for a specific menu
// picked in its own Content tab instead of always the site's primary one.
export interface Menu {
  id: string;
  name: string;
  items: MenuItem[];
}

/** A reusable, site-wide StyleClass row as returned by the API — `style` is
 *  JSON-shaped like LayoutNodeStyle (see @marwa/builder), left untyped
 *  here (same convention as `Page.layout` below) since it's parsed properly
 *  downstream by the builder's own schema, not consumed raw. */
export interface StyleClassRecord {
  id: string;
  name: string;
  style: unknown;
}

/** A reusable, site-wide named animation — see TimedAnimationDefinition in @marwa/builder. `timeline` is left untyped here (same convention as `style` above), parsed properly downstream. */
export interface TimedAnimationRecord {
  id: string;
  name: string;
  timeline: unknown;
}

export interface FooterLink {
  id: string;
  group: string;
  label: string;
  href: string;
  order: number;
}

// GET /api/menus/location/:location — the unified header/footer lookup.
// `menu: null` means nothing is assigned to that location (SiteFooter falls
// back to the FooterLink groups in that case; SiteHeader's own primaryMenuId
// path is unaffected either way).
export interface MenuByLocation {
  menu: { id: string; name: string } | null;
  items: MenuLink[];
}

export interface ServiceCard {
  title: string;
  description: string;
  features: string[];
  image: string;
  highlighted: boolean;
  badge?: string;
  readMoreUrl?: string;
  bookNowUrl?: string;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  order: number;
}

export interface SiteSettings {
  siteName: string;
  tagline: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  whatsappNumber: string | null;
  contactAddress: string;
  contactResponseTime: string;
  facebookUrl: string | null;
  instagramUrl: string | null;
  twitterUrl: string | null;
  youtubeUrl: string | null;
  linkedinUrl: string | null;

  logoImage: string | null;
  footerCopyrightText: string;

  smoothScrollEnabled: boolean;
  customCursorEnabled: boolean;
  cursorGlowEnabled: boolean;

  contactHeroImage: string;
  contactEyebrow: string;
  contactHeading: string;
  contactParagraph: string;
  contactCtaPrimaryLabel: string;
  contactCtaSecondaryLabel: string;
  contactInfoEyebrow: string;
  contactInfoTitle: string;
  contactBusinessHours: string;
  contactFaqHeading: string;

  blogArchiveTemplate: string;
  blogPostTemplate: string;

  // Analytics & Lead Attribution (Admin → Analytics → Settings)
  analyticsAnonymizeIp: boolean;
  analyticsExcludeAdminTraffic: boolean;
  analyticsCookieDays: number;
  sessionRecordingEnabled: boolean;

  // Secret Keys are intentionally absent here — the public /api/settings
  // response strips them server-side (see packages/api/src/routes/content.ts).
  recaptchaV2SiteKey: string | null;
  recaptchaV3SiteKey: string | null;
  recaptchaV3ScoreThreshold: string;
  primaryMenuId: string | null;

  // General Settings (Admin → Settings → General)
  siteIcon: string | null;
  siteUrl: string;
  adminEmail: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  siteLanguage: string;

  // Reading Settings (Admin → Settings → Reading)
  homepageDisplay: "static" | "posts";
  homepagePageSlug: string | null;
  postsPageSlug: string | null;
  postsPerPage: number;
  feedItemCount: number;
  feedContentMode: "full" | "excerpt";
  searchEngineNoindex: boolean;

  // Writing Settings (Admin → Settings → Writing)
  defaultPostCategoryId: string | null;
  defaultPostFormat: string;
  updateServiceUrls: string | null;

  // Permalinks (Admin → Settings → Permalinks)
  permalinkStructure: string;
  categoryBase: string | null;
  tagBase: string | null;

  updatedAt: string;
}

// ── Collections ──────────────────────────────────────────────────────────

export interface CollectionField {
  id: string;
  key: string;
  label: string;
  type: "TEXT" | "RICH_TEXT" | "NUMBER" | "BOOLEAN" | "IMAGE" | "IMAGE_LIST" | "DATE" | "SELECT" | "REFERENCE" | "JSON";
  required: boolean;
  order: number;
  options: unknown;
}

export interface CollectionItem {
  id: string;
  collectionId: string;
  slug: string | null;
  data: Record<string, unknown>;
  status: "DRAFT" | "PUBLISHED";
  order: number;
}

export interface CollectionItemsResult {
  collection: { id: string; key: string; name: string; fields: CollectionField[] };
  items: CollectionItem[];
}

// ── Search ───────────────────────────────────────────────────────────────

export interface SearchPostResult {
  slug: string;
  title: string;
  excerpt: string | null;
  postNumber: number;
  publishedAt: string | null;
  categories: { slug: string }[];
  author: { name: string } | null;
}

export interface SearchPageResult {
  slug: string;
  title: string;
  metaDescription: string | null;
  updatedAt: string;
}

export interface SearchResult {
  query: string;
  posts: SearchPostResult[];
  pages: SearchPageResult[];
}

// ── IT Infrastructure & System Status ───────────────────────────────────
export type ServiceStatusValue = "OPERATIONAL" | "DEGRADED" | "DOWNTIME";
export type IncidentStatusValue = "INVESTIGATING" | "IDENTIFIED" | "MONITORING" | "RESOLVED";
export type IncidentSeverityValue = "MINOR" | "MAJOR" | "CRITICAL";

export interface SystemStatusService {
  key: string;
  name: string;
  description: string | null;
  status: ServiceStatusValue;
  latencyMs: number | null;
  updatedAt: string;
}

export interface SystemIncidentUpdate {
  id: string;
  status: IncidentStatusValue;
  message: string;
  createdAt: string;
}

export interface SystemStatusIncident {
  id: string;
  title: string;
  severity: IncidentSeverityValue;
  status: IncidentStatusValue;
  affectedServices: string[];
  updates: SystemIncidentUpdate[];
  startedAt: string;
}

export interface SystemStatusFeed {
  overall: ServiceStatusValue;
  services: SystemStatusService[];
  incidents: SystemStatusIncident[];
}

export interface ServiceLatencySample {
  latencyMs: number;
  recordedAt: string;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error ?? "Request failed");
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  getPosts: (params?: { page?: number; limit?: number; search?: string; category?: string; tag?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.search) qs.set("search", params.search);
    if (params?.category) qs.set("category", params.category);
    if (params?.tag) qs.set("tag", params.tag);
    const query = qs.toString();
    return request<PostListResult>(`/api/posts${query ? `?${query}` : ""}`);
  },
  getFeaturedPost: () => request<PostCard | null>("/api/posts/featured"),
  getPost: (slug: string, previewToken?: string) =>
    request<Post>(`/api/posts/${slug}${previewToken ? `?previewToken=${encodeURIComponent(previewToken)}` : ""}`),
  getPostByNumber: (num: number) => request<Post>(`/api/posts/by-number/${num}`),
  getRelatedPosts: (slug: string) => request<PostCard[]>(`/api/posts/${slug}/related`),
  getBlogCategories: () => request<BlogCategory[]>("/api/categories"),
  getBlogTags: () => request<BlogTag[]>("/api/tags"),

  getReviews: () => request<Review[]>("/api/reviews"),
  getPage: (slug: string, previewToken?: string) =>
    request<Page>(`/api/pages/${slug}${previewToken ? `?previewToken=${encodeURIComponent(previewToken)}` : ""}`),
  getPages: () => request<PageSummary[]>("/api/pages"),
  getMenuLinks: () => request<MenuLink[]>("/api/menu-links"),
  getMenu: (id: string) => request<Menu>(`/api/menus/${id}`),
  getMenuByLocation: (location: "header" | "footer") => request<MenuByLocation>(`/api/menus/location/${location}`),
  getFooterLinks: () => request<FooterLink[]>("/api/footer-links"),
  getSettings: () => request<SiteSettings>("/api/settings"),
  getStyleClasses: () => request<StyleClassRecord[]>("/api/style-classes"),
  getTimedAnimations: () => request<TimedAnimationRecord[]>("/api/timed-animations"),
  getFaqs: () => request<Faq[]>("/api/faqs"),
  submitContactInquiry: (payload: ContactInquiryPayload) =>
    request<{ ok: true }>("/api/contact", { method: "POST", body: JSON.stringify(payload) }),
  submitForm: (payload: {
    pageSlug: string;
    formId: string;
    fields: Record<string, string>;
    renderedAt?: number;
    sessionId?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    landingPage?: string;
    conversionPage?: string;
  }) => request<{ ok: true; redirectUrl?: string }>("/api/forms/submit", { method: "POST", body: JSON.stringify(payload) }),
  registerAnalyticsSession: (payload: {
    sessionId: string;
    referrer?: string;
    landingPage?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
  }) => request<{ ok: true; created: boolean }>("/api/analytics/session", { method: "POST", body: JSON.stringify(payload) }),
  recordPageview: (payload: { sessionId: string; path?: string; title?: string; referrer?: string; duration?: number }) =>
    request<{ ok: true }>("/api/analytics/pageview", { method: "POST", body: JSON.stringify(payload) }),
  // Self-hosted rrweb session recording — one batch of buffered events per
  // call (route change / periodic flush). The unload-time flush instead uses
  // navigator.sendBeacon directly (see AnalyticsTracker.tsx), the only
  // delivery mechanism guaranteed to survive page unload.
  sendRecordingEvents: (payload: { sessionId: string; events: unknown[] }) =>
    request<{ ok: true }>("/api/analytics/recording", { method: "POST", body: JSON.stringify(payload) }),
  // Click/Scroll Heatmaps — one batch of throttled clicks per page/device,
  // see recordClick in lib/analytics.ts.
  recordHeatmapClicks: (payload: { path: string; device: "DESKTOP" | "MOBILE" | "TABLET"; clicks: { xPercent: number; yPx: number }[] }) =>
    request<{ ok: true; recorded: number }>("/api/analytics/heatmaps", { method: "POST", body: JSON.stringify(payload) }),
  // Form Field Analytics — one call per focus (interaction) or per
  // abandoned-field-on-unload (abandonment), see lib/formAnalytics.ts.
  recordFormFieldEvent: (payload: { formId: string; fieldId: string; fieldName: string; event: "interaction" | "abandonment" }) =>
    request<{ ok: true }>("/api/analytics/forms/field-event", { method: "POST", body: JSON.stringify(payload) }),
  getSiteTemplates: (type: SiteTemplateType) => request<SiteTemplate[]>(`/api/site-templates?type=${type}`),
  getSiteTemplate: (id: string) => request<SiteTemplate>(`/api/site-templates/${id}`),
  getCollectionItems: (key: string, params?: { limit?: number }) =>
    request<CollectionItemsResult>(`/api/collections/${key}/items${params?.limit ? `?limit=${params.limit}` : ""}`),
  search: (query: string) => request<SearchResult>(`/api/search?q=${encodeURIComponent(query)}`),
  // Public system-status feed (see the SystemStatusWidget block) — mounted
  // at the root like /health, not under /api, since it's server.ts's own
  // unauthenticated diagnostic surface rather than a resource router.
  getSystemStatus: () => request<SystemStatusFeed>("/status"),
  getServiceLatency: (key: string, limit?: number) =>
    request<ServiceLatencySample[]>(`/status/${key}/latency${limit ? `?limit=${limit}` : ""}`),
};

export { ApiError };
