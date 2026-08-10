import type { LayoutDocument, LayoutNodeStyle, SiteTemplateType, SiteTemplateCondition, BlockTimeline } from "@marwa/builder";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const TOKEN_KEY = "marwa.admin.token";
const ORG_KEY = "marwa.admin.organizationId";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// The active Agency Workspace — persisted client-side (same localStorage
// pattern as the auth token) and sent as `x-organization-id` on every
// request below. Null/absent means "no workspace selected", which the API
// treats as the default, global (pre-tenancy) view — see
// packages/api/src/middleware/tenant.ts.
export function getActiveOrganizationId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ORG_KEY);
}

export function setActiveOrganizationId(organizationId: string | null) {
  if (organizationId) localStorage.setItem(ORG_KEY, organizationId);
  else localStorage.removeItem(ORG_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const organizationId = getActiveOrganizationId();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(organizationId ? { "x-organization-id": organizationId } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new ApiError(401, "Session expired");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error ?? "Request failed");
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Types ────────────────────────────────────────────────────────────────

export type UserRole = "ADMIN" | "EDITOR";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

// The shape login/me actually returns for "who am I" purposes — deliberately
// narrower than AdminUser (no lastLoginAt/createdAt/active), plus
// twoFactorEnabled, which only this shape carries.
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  twoFactorEnabled: boolean;
}

export type LoginResult = { token: string; user: SessionUser } | { twoFactorRequired: true; challengeToken: string };

export interface Review {
  id: string;
  customerName: string;
  quote: string;
  rating: number;
  source: string;
  published: boolean;
  createdAt: string;
}

export interface MediaAsset {
  id: string;
  url: string;
  filename: string;
  category: string | null;
  mimeType: string;
  altText: string | null;
  createdAt: string;
}

export interface ConvertWebpResult {
  converted: boolean;
  asset: MediaAsset;
}

export interface MediaUsageRef {
  type: "page" | "post" | "setting" | "collection-item";
  id: string;
  label: string;
  field?: string;
}

export interface MediaUsageResult {
  url: string;
  usages: MediaUsageRef[];
}

export interface ConvertAllWebpResult {
  converted: number;
  skipped: number;
  failed: number;
  results: { id: string; filename: string; status: "converted" | "skipped" | "failed"; error?: string }[];
}

export type PageTemplate = "default" | "full-width" | "sidebar" | "landing" | "contact";
export type PageEditorMode = "CLASSIC" | "BUILDER";
export type PublishStatus = "DRAFT" | "STAGED" | "PUBLISHED" | "SCHEDULED";

export interface Page {
  id: string;
  slug: string;
  title: string;
  editorMode: PageEditorMode;
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
  template: PageTemplate;
  published: boolean;
  status: PublishStatus;
  stagedContent: string | null;
  stagedLayout: LayoutDocument | null;
  scheduledAt: string | null;
  organizationId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Blog ─────────────────────────────────────────────────────────────────

export type PostStatus = "DRAFT" | "PUBLISHED" | "SCHEDULED" | "STAGED";

export interface BlogAuthor {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio?: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  _count?: { posts: number };
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  _count?: { posts: number };
}

export interface EmailTemplateListItem {
  key: string;
  name: string;
  description: string;
  isCustom: boolean;
  isOverridden: boolean;
  active: boolean;
  updatedAt: string | null;
  isShell: boolean;
}

export interface EmailTemplateVariable {
  key: string;
  description: string;
}

export interface EmailTemplateDetail {
  key: string;
  name: string;
  description: string;
  isCustom: boolean;
  isShell: boolean;
  variables: EmailTemplateVariable[];
  subject: string;
  bodyHtml: string;
  active: boolean;
  hasDefault: boolean;
  updatedAt: string | null;
}

export interface Post {
  id: string;
  postNumber: number;
  slug: string;
  title: string;
  excerpt: string | null;
  editorMode: PageEditorMode;
  content: string | null;
  layout: LayoutDocument | null;
  featuredImage: string | null;
  author: BlogAuthor | null;
  categories: Category[];
  tags: Tag[];
  status: PostStatus;
  publishedAt: string | null;
  readingTime: number | null;
  isFeatured: boolean;
  format: string;
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  ogImage: string | null;
  stagedContent: string | null;
  stagedLayout: LayoutDocument | null;
  scheduledAt: string | null;
  organizationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PostListResult {
  items: Post[];
  total: number;
  page: number;
  limit: number;
}

export interface MenuItem {
  id: string;
  menuId: string;
  parentId: string | null;
  label: string;
  href: string;
  cssClasses: string | null;
  openInNewTab: boolean;
  active: boolean;
  order: number;
  previewImage: string | null;
}

export interface Menu {
  id: string;
  name: string;
  autoAddPages: boolean;
  showInHeader: boolean;
  showInFooter: boolean;
  items?: MenuItem[];
  _count?: { items: number };
  createdAt: string;
  updatedAt: string;
}

export interface MenuItemPayload {
  label: string;
  href: string;
  parentId?: string | null;
  cssClasses?: string | null;
  openInNewTab?: boolean;
  active?: boolean;
  order?: number;
  previewImage?: string | null;
}

export interface FooterLink {
  id: string;
  group: string;
  label: string;
  href: string;
  order: number;
  active: boolean;
}

export interface SiteSettings {
  id: string;
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

  recaptchaV2SiteKey: string | null;
  recaptchaV2SecretKey: string | null;
  recaptchaV3SiteKey: string | null;
  recaptchaV3SecretKey: string | null;
  recaptchaV3ScoreThreshold: string;
  smtpHost: string | null;
  smtpPort: string | null;
  smtpUser: string | null;
  smtpPassword: string | null;
  smtpSecure: boolean;
  smtpFromEmail: string | null;
  smtpFromName: string | null;
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

  // Analytics & Leads (Admin → Analytics → Settings)
  analyticsAnonymizeIp: boolean;
  analyticsExcludeAdminTraffic: boolean;
  analyticsCookieDays: number;
  sessionRecordingEnabled: boolean;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  order: number;
  published: boolean;
}

export interface FaqPayload {
  question: string;
  answer: string;
  order: number;
  published: boolean;
}

export type CollectionFieldType = "TEXT" | "RICH_TEXT" | "NUMBER" | "BOOLEAN" | "IMAGE" | "IMAGE_LIST" | "DATE" | "SELECT" | "REFERENCE" | "JSON";
export type CollectionItemStatus = "DRAFT" | "PUBLISHED";

export interface CollectionField {
  id: string;
  collectionId: string;
  key: string;
  label: string;
  type: CollectionFieldType;
  required: boolean;
  order: number;
  options: unknown;
}

export interface CollectionFieldPayload {
  key: string;
  label: string;
  type: CollectionFieldType;
  required?: boolean;
  order?: number;
  options?: unknown;
}

export interface CollectionItem {
  id: string;
  collectionId: string;
  slug: string | null;
  data: Record<string, unknown>;
  status: CollectionItemStatus;
  order: number;
}

export interface CollectionItemPayload {
  slug?: string;
  data?: Record<string, unknown>;
  status?: CollectionItemStatus;
  order?: number;
}

export interface Collection {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
  _count?: { items: number; fields: number };
}

export interface CollectionDetail extends Collection {
  fields: CollectionField[];
  items: CollectionItem[];
}

export interface CollectionPayload {
  key: string;
  name: string;
  description?: string;
  icon?: string;
}

// ── Audit Logs & Content Revisions ──────────────────────────────────────

export interface ContentRevisionRecord {
  id: string;
  entityType: "PAGE" | "POST";
  entityId: string;
  title: string;
  content: string | null;
  layout: LayoutDocument | null;
  seoTitle: string | null;
  seoDesc: string | null;
  authorId: string | null;
  author: { id: string; name: string; avatarUrl: string | null } | null;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  details: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogsResult {
  items: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  resources: string[];
}

export interface SetupHelperItem {
  label: string;
  done: boolean;
  group: string;
}

export interface SetupHelperResponse {
  checklist: SetupHelperItem[];
  completedCount: number;
  totalCount: number;
}

export interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string | null;
  status: string;
  createdAt: string;
}

export interface FormSubmissionActionLogEntry {
  action: string;
  status: "ok" | "skipped" | "failed";
  detail?: string;
}

export interface FormSubmission {
  id: string;
  formId: string;
  pageSlug: string;
  blockId: string;
  data: Record<string, string>;
  actionsLog: FormSubmissionActionLogEntry[] | null;
  read: boolean;
  userIp: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface SiteTemplate {
  id: string;
  type: SiteTemplateType;
  title: string;
  layout: LayoutDocument;
  conditions: SiteTemplateCondition[];
  priority: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SiteTemplatePayload {
  type: SiteTemplateType;
  title: string;
  layout?: LayoutDocument;
  conditions?: SiteTemplateCondition[];
  priority?: number;
  active?: boolean;
}

/** A reusable, site-wide style definition — see StyleClassDefinition in
 *  @marwa/builder. `style` is LayoutNodeStyle-shaped, same as a node's
 *  own `style`, so it carries its own tablet/mobile/hover overrides. */
export interface StyleClass {
  id: string;
  name: string;
  style: LayoutNodeStyle;
  createdAt: string;
  updatedAt: string;
}

export interface StyleClassPayload {
  name: string;
  style?: LayoutNodeStyle;
}

/** A reusable, site-wide named animation ("Timed Animation") — see TimedAnimationDefinition in @marwa/builder. `timeline` is a BlockTimeline shape minus `trigger`. */
export interface TimedAnimation {
  id: string;
  name: string;
  timeline: Omit<BlockTimeline, "trigger">;
  createdAt: string;
  updatedAt: string;
}

export interface TimedAnimationPayload {
  name: string;
  timeline?: TimedAnimation["timeline"];
}

// ── Analytics & Leads ────────────────────────────────────────────────────

export interface AnalyticsDateParams {
  preset?: "today" | "7d" | "30d" | "90d" | "all" | "custom";
  startDate?: string;
  endDate?: string;
}

function dateParamsToQuery(params?: AnalyticsDateParams): string {
  const qs = new URLSearchParams();
  if (params?.startDate && params?.endDate) {
    qs.set("startDate", params.startDate);
    qs.set("endDate", params.endDate);
  } else if (params?.preset) {
    qs.set("preset", params.preset);
  }
  return qs.toString();
}

export interface AnalyticsOverview {
  range: { start: string; end: string };
  totalPageViews: number;
  totalVisits: number;
  uniqueVisitors: number;
  totalLeads: number;
  conversionRate: number;
  avgSessionDuration: number;
  bounceRate: number;
  avgPagesPerSession: number;
  dailyTrend: { date: string; visits: number; leads: number }[];
}

export interface AnalyticsSources {
  range: { start: string; end: string };
  channels: { channel: string; visits: number; leads: number }[];
  referringDomains: { domain: string; visits: number; leads: number }[];
  campaigns: { source: string; medium: string; campaign: string; visits: number; leads: number }[];
}

export interface AnalyticsTopPage {
  path: string;
  views: number;
  uniqueVisitors: number;
  conversions: number;
  conversionRate: number;
}

export interface AnalyticsTopPages {
  range: { start: string; end: string };
  pages: AnalyticsTopPage[];
}

export interface AnalyticsLead {
  id: string;
  type: "inquiry" | "submission";
  name: string;
  email: string;
  formName: string;
  status?: string;
  sessionId: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  landingPage: string | null;
  conversionPage: string | null;
  createdAt: string;
}

export interface AnalyticsLeadsResult {
  items: AnalyticsLead[];
  total: number;
  page: number;
  limit: number;
}

export interface AnalyticsJourneyStep {
  path: string;
  title: string | null;
  referrer: string | null;
  duration: number | null;
  createdAt: string;
}

export interface AnalyticsJourney {
  lead: {
    id: string;
    name: string;
    email: string;
    formName: string;
    createdAt: string;
    landingPage: string | null;
    conversionPage: string | null;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
  };
  session: {
    referringDomain: string;
    referrer: string | null;
    country: string | null;
    city: string | null;
    deviceType: string | null;
    browser: string | null;
    os: string | null;
    createdAt: string;
  } | null;
  timeline: AnalyticsJourneyStep[];
}

// ── CRM: Contacts, Pipelines & Deals ────────────────────────────────────

export type ContactStatus = "LEAD" | "OPPORTUNITY" | "CUSTOMER" | "ARCHIVED";

export interface Contact {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  company: string | null;
  status: ContactStatus;
  tags: string[];
  customFields: Record<string, unknown> | null;
  assignedUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContactListItem extends Contact {
  deals: { id: string; value: number; currency: string; status: string }[];
  _count: { notes: number; activities: number };
}

export interface ContactsListResult {
  items: ContactListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ContactActivityEntry {
  id?: string;
  type: string;
  title: string;
  description: string | null;
  createdAt: string;
  metadata: unknown;
}

export interface ContactNote {
  id: string;
  contactId: string;
  authorId: string | null;
  content: string;
  createdAt: string;
}

export interface DealContactSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  company: string | null;
}

export type DealStatus = "OPEN" | "WON" | "LOST";

export interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  stageId: string;
  contactId: string | null;
  contact?: DealContactSummary | null;
  status: DealStatus;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type StageType = "DEFAULT" | "WON" | "LOST";

export interface PipelineStage {
  id: string;
  pipelineId: string;
  name: string;
  order: number;
  color: string | null;
  stageType: StageType;
  deals: Deal[];
}

export interface Pipeline {
  id: string;
  name: string;
  isDefault: boolean;
  stages: PipelineStage[];
  createdAt: string;
}

export interface ContactSessionSummary {
  sessionId: string;
  country: string | null;
  city: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  createdAt: string;
  pageViews: AnalyticsJourneyStep[];
  recording: { id: string; duration: number; eventCount: number; hasRageClicks: boolean } | null;
}

export interface ContactDetail extends Contact {
  deals: (Deal & { stage: PipelineStage & { pipeline: Pipeline } })[];
  notes: ContactNote[];
  inquiries: ContactInquiry[];
  submissions: FormSubmission[];
  sessions: ContactSessionSummary[];
  activities: ContactActivityEntry[];
  timeline: ContactActivityEntry[];
}

export interface ContactPayload {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  tags?: string[];
}

// ── Session Recording (self-hosted rrweb) ───────────────────────────────

export interface SessionRecordingListItem {
  id: string;
  sessionId: string;
  duration: number;
  eventCount: number;
  hasRageClicks: boolean;
  createdAt: string;
  session: {
    ipAddress: string | null;
    country: string | null;
    city: string | null;
    deviceType: string | null;
    browser: string | null;
    landingPage: string | null;
    contactId: string | null;
    contact: { id: string; firstName: string | null; lastName: string | null; email: string } | null;
    _count: { pageViews: number };
  };
}

export interface SessionRecordingsResult {
  items: SessionRecordingListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface SessionRecordingDetail {
  id: string;
  sessionId: string;
  events: unknown[];
  duration: number;
  eventCount: number;
  hasRageClicks: boolean;
  createdAt: string;
  session: { country: string | null; city: string | null; deviceType: string | null; browser: string | null; os: string | null; contactId: string | null };
}

// ── AI Content & SEO Assistant ──────────────────────────────────────────

export type AiRewriteInstruction = "summarize" | "expand" | "professional" | "simplify" | "rewrite" | "translate";

export interface AiTextResult {
  text: string;
  tokensUsed: number;
  model: string;
}

export interface AiSeoResult {
  metaTitle: string;
  metaDescription: string;
  focusKeywords: string[];
  ogTitle: string;
  ogDescription: string;
  tokensUsed: number;
  model: string;
}

export interface AiAltTextResult {
  altText: string;
  tokensUsed: number;
  model: string;
}

// ── Visual Marketing Automation ─────────────────────────────────────────

export type WorkflowTriggerType = "FORM_SUBMITTED" | "TAG_ADDED" | "DEAL_STAGE_CHANGED" | "SESSION_RAGE_CLICK";

export interface WorkflowNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
  position?: { x: number; y: number };
  [key: string]: unknown;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  [key: string]: unknown;
}

export interface AutomationWorkflow {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  triggerType: WorkflowTriggerType;
  triggerData: Record<string, unknown> | null;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: string;
  updatedAt: string;
  _count?: { logs: number };
}

export interface WorkflowExecutionLogEntry {
  id: string;
  workflowId: string;
  contactId: string | null;
  status: "PENDING" | "SUCCESS" | "FAILED";
  currentNode: string | null;
  error: string | null;
  executedAt: string;
}

export interface AutomationEmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  jsonBody: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// ── Heatmaps & Form Field Analytics ─────────────────────────────────────

export interface HeatmapClickPoint {
  xPercent: number;
  yPx: number;
}

export interface HeatmapResult {
  path: string;
  device: string | null;
  totalClicks: number;
  maxYPx: number;
  clicks: HeatmapClickPoint[];
}

export interface HeatmapPageSummary {
  path: string;
  clicks: number;
}

export interface FormFieldAnalyticsEntry {
  formId: string;
  fieldId: string;
  fieldName: string;
  interactions: number;
  abandonments: number;
  abandonmentRate: number;
}

export interface FormFieldAnalyticsResult {
  forms: string[];
  fields: FormFieldAnalyticsEntry[];
}

// ── Multi-Tenant Agency Workspaces ──────────────────────────────────────
export type OrgRole = "OWNER" | "ADMIN" | "MEMBER" | "CLIENT";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  role: OrgRole;
  createdAt: string;
  updatedAt: string;
}

export interface OrgMembershipEntry {
  id: string;
  organizationId: string;
  userId: string;
  role: OrgRole;
  createdAt: string;
  user: { id: string; name: string; email: string; role: UserRole };
}

// ── Backup & Disaster Recovery ──────────────────────────────────────────
export type BackupType = "FULL" | "DATABASE_ONLY" | "UPLOADS_ONLY";
export type BackupStatus = "PENDING" | "COMPLETED" | "FAILED";

export interface SystemBackup {
  id: string;
  organizationId: string | null;
  filename: string;
  fileSize: number;
  type: BackupType;
  storagePath: string;
  status: BackupStatus;
  createdAt: string;
}

export interface SystemBackupListResult {
  items: SystemBackup[];
  total: number;
  page: number;
  limit: number;
  totalStorageBytes: number;
  lastBackupAt: string | null;
}

// ── API ──────────────────────────────────────────────────────────────────

export const api = {
  login: (email: string, password: string) =>
    fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then(async (res) => {
      const body = await res.json();
      if (!res.ok) throw new ApiError(res.status, body.error ?? "Login failed");
      return body as LoginResult;
    }),
  // Step 2 of a 2FA-gated login — challengeToken is the short-lived token
  // POST /api/auth/login returned instead of a real session token when the
  // account has twoFactorEnabled.
  loginWith2fa: (challengeToken: string, code: string) =>
    fetch(`${API_URL}/api/auth/login/2fa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeToken, code }),
    }).then(async (res) => {
      const body = await res.json();
      if (!res.ok) throw new ApiError(res.status, body.error ?? "Verification failed");
      return body as { token: string; user: SessionUser };
    }),
  forgotPassword: (email: string) =>
    fetch(`${API_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).then(async (res) => {
      const body = await res.json();
      if (!res.ok) throw new ApiError(res.status, body.error ?? "Request failed");
      return body as { ok: true; message: string };
    }),
  resetPassword: (token: string, password: string) =>
    fetch(`${API_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    }).then(async (res) => {
      const body = await res.json();
      if (!res.ok) throw new ApiError(res.status, body.error ?? "Reset failed");
      return body as { ok: true };
    }),
  getMe: () => request<SessionUser>("/api/auth/me"),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: true }>("/api/admin/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }),
  setup2fa: () => request<{ secret: string; qrCodeDataUrl: string }>("/api/admin/auth/2fa/setup", { method: "POST" }),
  verify2fa: (code: string) => request<{ ok: true; backupCodes: string[] }>("/api/admin/auth/2fa/verify", { method: "POST", body: JSON.stringify({ code }) }),
  disable2fa: (password: string, code: string) =>
    request<{ ok: true }>("/api/admin/auth/2fa/disable", { method: "POST", body: JSON.stringify({ password, code }) }),

  getInquiries: () => request<ContactInquiry[]>("/api/admin/inquiries"),
  updateInquiryStatus: (id: string, status: string) =>
    request<ContactInquiry>(`/api/admin/inquiries/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  deleteInquiry: (id: string) => request<void>(`/api/admin/inquiries/${id}`, { method: "DELETE" }),
  bulkDeleteInquiries: (ids: string[]) =>
    request<{ deleted: number }>("/api/admin/inquiries/bulk-delete", { method: "POST", body: JSON.stringify({ ids }) }),

  getFormSubmissions: () => request<FormSubmission[]>("/api/admin/form-submissions"),
  getFormSubmission: (id: string) => request<FormSubmission>(`/api/admin/form-submissions/${id}`),
  markFormSubmissionRead: (id: string, read: boolean) =>
    request<FormSubmission>(`/api/admin/form-submissions/${id}`, { method: "PATCH", body: JSON.stringify({ read }) }),
  deleteFormSubmission: (id: string) => request<void>(`/api/admin/form-submissions/${id}`, { method: "DELETE" }),

  getSiteTemplates: (type?: SiteTemplateType) => request<SiteTemplate[]>(`/api/admin/site-templates${type ? `?type=${type}` : ""}`),
  getSiteTemplate: (id: string) => request<SiteTemplate>(`/api/admin/site-templates/${id}`),
  createSiteTemplate: (data: SiteTemplatePayload) => request<SiteTemplate>("/api/admin/site-templates", { method: "POST", body: JSON.stringify(data) }),
  updateSiteTemplate: (id: string, data: Partial<SiteTemplatePayload>) =>
    request<SiteTemplate>(`/api/admin/site-templates/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteSiteTemplate: (id: string) => request<void>(`/api/admin/site-templates/${id}`, { method: "DELETE" }),

  getStyleClasses: () => request<StyleClass[]>("/api/admin/style-classes"),
  getStyleClass: (id: string) => request<StyleClass>(`/api/admin/style-classes/${id}`),
  createStyleClass: (data: StyleClassPayload) => request<StyleClass>("/api/admin/style-classes", { method: "POST", body: JSON.stringify(data) }),
  updateStyleClass: (id: string, data: Partial<StyleClassPayload>) =>
    request<StyleClass>(`/api/admin/style-classes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteStyleClass: (id: string) => request<void>(`/api/admin/style-classes/${id}`, { method: "DELETE" }),

  getTimedAnimations: () => request<TimedAnimation[]>("/api/admin/timed-animations"),
  createTimedAnimation: (data: TimedAnimationPayload) => request<TimedAnimation>("/api/admin/timed-animations", { method: "POST", body: JSON.stringify(data) }),
  updateTimedAnimation: (id: string, data: Partial<TimedAnimationPayload>) =>
    request<TimedAnimation>(`/api/admin/timed-animations/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTimedAnimation: (id: string) => request<void>(`/api/admin/timed-animations/${id}`, { method: "DELETE" }),

  getUsers: () => request<AdminUser[]>("/api/admin/users"),
  createUser: (data: { email: string; name: string; password: string; role: UserRole }) =>
    request<AdminUser>("/api/admin/users", { method: "POST", body: JSON.stringify(data) }),
  updateUser: (id: string, data: Partial<{ name: string; role: UserRole; active: boolean; password: string }>) =>
    request<AdminUser>(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteUser: (id: string) => request<void>(`/api/admin/users/${id}`, { method: "DELETE" }),

  getReviews: () => request<Review[]>("/api/admin/reviews"),
  createReview: (data: Partial<Review>) => request<Review>("/api/admin/reviews", { method: "POST", body: JSON.stringify(data) }),
  updateReview: (id: string, data: Partial<Review>) => request<Review>(`/api/admin/reviews/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteReview: (id: string) => request<void>(`/api/admin/reviews/${id}`, { method: "DELETE" }),

  getMedia: () => request<MediaAsset[]>("/api/admin/media"),
  uploadMedia: async (file: File, category?: string) => {
    const token = getToken();
    const formData = new FormData();
    formData.append("file", file);
    if (category) formData.append("category", category);
    const res = await fetch(`${API_URL}/api/admin/media`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new ApiError(res.status, body.error ?? "Upload failed");
    }
    return res.json() as Promise<MediaAsset>;
  },
  getMediaUsage: (id: string) => request<MediaUsageResult>(`/api/admin/media/${id}/usage`),
  deleteMedia: (id: string) => request<void>(`/api/admin/media/${id}`, { method: "DELETE" }),
  convertMediaToWebp: (id: string) => request<ConvertWebpResult>(`/api/admin/media/${id}/convert-webp`, { method: "POST" }),
  convertAllMediaToWebp: () => request<ConvertAllWebpResult>("/api/admin/media/convert-all-webp", { method: "POST" }),

  getPages: () => request<Page[]>("/api/admin/pages"),
  getPage: (id: string) => request<Page>(`/api/admin/pages/${id}`),
  createPage: (data: Partial<Page>) => request<Page>("/api/admin/pages", { method: "POST", body: JSON.stringify(data) }),
  updatePage: (id: string, data: Partial<Page>) => request<Page>(`/api/admin/pages/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deletePage: (id: string) => request<void>(`/api/admin/pages/${id}`, { method: "DELETE" }),

  getPosts: (params?: { page?: number; limit?: number; search?: string; status?: PostStatus; categoryId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.search) qs.set("search", params.search);
    if (params?.status) qs.set("status", params.status);
    if (params?.categoryId) qs.set("categoryId", params.categoryId);
    const query = qs.toString();
    return request<PostListResult>(`/api/admin/posts${query ? `?${query}` : ""}`);
  },
  getPost: (id: string) => request<Post>(`/api/admin/posts/${id}`),
  createPost: (data: Record<string, unknown>) => request<Post>("/api/admin/posts", { method: "POST", body: JSON.stringify(data) }),
  updatePost: (id: string, data: Record<string, unknown>) =>
    request<Post>(`/api/admin/posts/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deletePost: (id: string) => request<void>(`/api/admin/posts/${id}`, { method: "DELETE" }),
  bulkPosts: (ids: string[], action: "publish" | "draft" | "delete") =>
    request<{ ok: true }>("/api/admin/posts/bulk", { method: "POST", body: JSON.stringify({ ids, action }) }),

  getCategories: () => request<Category[]>("/api/admin/categories"),
  createCategory: (data: { name: string; slug?: string; description?: string; color?: string }) =>
    request<Category>("/api/admin/categories", { method: "POST", body: JSON.stringify(data) }),
  updateCategory: (id: string, data: Partial<{ name: string; slug: string; description: string; color: string }>) =>
    request<Category>(`/api/admin/categories/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteCategory: (id: string) => request<void>(`/api/admin/categories/${id}`, { method: "DELETE" }),

  getEmailTemplates: () => request<EmailTemplateListItem[]>("/api/admin/email-templates"),
  getEmailTemplate: (key: string) => request<EmailTemplateDetail>(`/api/admin/email-templates/${key}`),
  saveEmailTemplate: (key: string, data: { name?: string; subject: string; bodyHtml: string; active: boolean }) =>
    request<EmailTemplateDetail>(`/api/admin/email-templates/${key}`, { method: "PUT", body: JSON.stringify(data) }),
  resetEmailTemplate: (key: string) => request<void>(`/api/admin/email-templates/${key}/reset`, { method: "POST" }),
  deleteEmailTemplate: (key: string) => request<void>(`/api/admin/email-templates/${key}`, { method: "DELETE" }),

  getTags: () => request<Tag[]>("/api/admin/tags"),
  createTag: (data: { name: string; slug?: string }) => request<Tag>("/api/admin/tags", { method: "POST", body: JSON.stringify(data) }),
  updateTag: (id: string, data: Partial<{ name: string; slug: string }>) =>
    request<Tag>(`/api/admin/tags/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTag: (id: string) => request<void>(`/api/admin/tags/${id}`, { method: "DELETE" }),

  getMenus: () => request<Menu[]>("/api/admin/menus"),
  getMenu: (id: string) => request<Menu>(`/api/admin/menus/${id}`),
  createMenu: (data: { name: string; autoAddPages?: boolean }) => request<Menu>("/api/admin/menus", { method: "POST", body: JSON.stringify(data) }),
  updateMenu: (id: string, data: Partial<{ name: string; autoAddPages: boolean; showInHeader: boolean; showInFooter: boolean }>) =>
    request<Menu>(`/api/admin/menus/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteMenu: (id: string) => request<void>(`/api/admin/menus/${id}`, { method: "DELETE" }),
  createMenuItem: (menuId: string, data: MenuItemPayload) =>
    request<MenuItem>(`/api/admin/menus/${menuId}/items`, { method: "POST", body: JSON.stringify(data) }),
  updateMenuItem: (menuId: string, itemId: string, data: Partial<MenuItemPayload>) =>
    request<MenuItem>(`/api/admin/menus/${menuId}/items/${itemId}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteMenuItem: (menuId: string, itemId: string) => request<void>(`/api/admin/menus/${menuId}/items/${itemId}`, { method: "DELETE" }),
  reorderMenuItems: (menuId: string, items: { id: string; parentId: string | null; order: number }[]) =>
    request<Menu>(`/api/admin/menus/${menuId}/reorder`, { method: "PATCH", body: JSON.stringify({ items }) }),

  getFooterLinks: () => request<FooterLink[]>("/api/admin/footer-links"),
  createFooterLink: (data: Partial<FooterLink>) => request<FooterLink>("/api/admin/footer-links", { method: "POST", body: JSON.stringify(data) }),
  updateFooterLink: (id: string, data: Partial<FooterLink>) => request<FooterLink>(`/api/admin/footer-links/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteFooterLink: (id: string) => request<void>(`/api/admin/footer-links/${id}`, { method: "DELETE" }),

  getSettings: () => request<SiteSettings>("/api/admin/settings"),
  // Unauthenticated, secrets-stripped read of the same record (see
  // GET /api/settings in packages/api's content.ts) — Settings itself is
  // ADMIN-only (it exposes SMTP password / reCAPTCHA secret keys via the
  // admin endpoint above), but every staff member's dashboard chrome
  // (sidebar logo/site name) still needs somewhere to read those two
  // non-sensitive fields from.
  getPublicSettings: () => request<Pick<SiteSettings, "siteName" | "logoImage">>("/api/settings"),
  updateSettings: (data: Partial<SiteSettings>) =>
    request<SiteSettings>("/api/admin/settings", { method: "PATCH", body: JSON.stringify(data) }),

  getFaqs: () => request<Faq[]>("/api/admin/faqs"),
  createFaq: (data: FaqPayload) => request<Faq>("/api/admin/faqs", { method: "POST", body: JSON.stringify(data) }),
  updateFaq: (id: string, data: Partial<FaqPayload>) =>
    request<Faq>(`/api/admin/faqs/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteFaq: (id: string) => request<void>(`/api/admin/faqs/${id}`, { method: "DELETE" }),

  getCollections: () => request<Collection[]>("/api/admin/collections"),
  getCollection: (id: string) => request<CollectionDetail>(`/api/admin/collections/${id}`),
  createCollection: (data: CollectionPayload) => request<Collection>("/api/admin/collections", { method: "POST", body: JSON.stringify(data) }),
  updateCollection: (id: string, data: Partial<CollectionPayload>) =>
    request<Collection>(`/api/admin/collections/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteCollection: (id: string) => request<void>(`/api/admin/collections/${id}`, { method: "DELETE" }),

  createCollectionField: (collectionId: string, data: CollectionFieldPayload) =>
    request<CollectionField>(`/api/admin/collections/${collectionId}/fields`, { method: "POST", body: JSON.stringify(data) }),
  updateCollectionField: (collectionId: string, fieldId: string, data: Partial<CollectionFieldPayload>) =>
    request<CollectionField>(`/api/admin/collections/${collectionId}/fields/${fieldId}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteCollectionField: (collectionId: string, fieldId: string) =>
    request<void>(`/api/admin/collections/${collectionId}/fields/${fieldId}`, { method: "DELETE" }),

  createCollectionItem: (collectionId: string, data: CollectionItemPayload) =>
    request<CollectionItem>(`/api/admin/collections/${collectionId}/items`, { method: "POST", body: JSON.stringify(data) }),
  updateCollectionItem: (collectionId: string, itemId: string, data: Partial<CollectionItemPayload>) =>
    request<CollectionItem>(`/api/admin/collections/${collectionId}/items/${itemId}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteCollectionItem: (collectionId: string, itemId: string) =>
    request<void>(`/api/admin/collections/${collectionId}/items/${itemId}`, { method: "DELETE" }),

  getSetupHelper: () => request<SetupHelperResponse>("/api/admin/setup-helper"),

  getRevisions: (entityType: "PAGE" | "POST", entityId: string) =>
    request<ContentRevisionRecord[]>(`/api/admin/revisions/${entityType}/${entityId}`),
  restoreRevision: (id: string) => request<Page | Post>(`/api/admin/revisions/${id}/restore`, { method: "POST" }),

  getAuditLogs: (params?: { page?: number; limit?: number; userId?: string; action?: string; resource?: string; startDate?: string; endDate?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.userId) qs.set("userId", params.userId);
    if (params?.action) qs.set("action", params.action);
    if (params?.resource) qs.set("resource", params.resource);
    if (params?.startDate) qs.set("startDate", params.startDate);
    if (params?.endDate) qs.set("endDate", params.endDate);
    const query = qs.toString();
    return request<AuditLogsResult>(`/api/admin/audit-logs${query ? `?${query}` : ""}`);
  },

  clearCache: () => request<{ ok: true }>("/api/admin/cache/clear", { method: "POST" }),

  getAnalyticsOverview: (params?: AnalyticsDateParams) => {
    const qs = dateParamsToQuery(params);
    return request<AnalyticsOverview>(`/api/admin/analytics/overview${qs ? `?${qs}` : ""}`);
  },
  getAnalyticsSources: (params?: AnalyticsDateParams) => {
    const qs = dateParamsToQuery(params);
    return request<AnalyticsSources>(`/api/admin/analytics/sources${qs ? `?${qs}` : ""}`);
  },
  getAnalyticsTopPages: (params?: AnalyticsDateParams) => {
    const qs = dateParamsToQuery(params);
    return request<AnalyticsTopPages>(`/api/admin/analytics/top-pages${qs ? `?${qs}` : ""}`);
  },
  getAnalyticsLeads: (params?: AnalyticsDateParams & { page?: number; limit?: number }) => {
    const qs = new URLSearchParams(dateParamsToQuery(params));
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString();
    return request<AnalyticsLeadsResult>(`/api/admin/analytics/leads${query ? `?${query}` : ""}`);
  },
  getLeadJourney: (id: string) => request<AnalyticsJourney>(`/api/admin/analytics/leads/${encodeURIComponent(id)}/journey`),

  getSessionRecordings: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    minDuration?: number;
    maxDuration?: number;
    country?: string;
    hasRageClicks?: boolean;
    pagePath?: string;
    startDate?: string;
    endDate?: string;
    contactId?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.search) qs.set("search", params.search);
    if (params?.minDuration !== undefined) qs.set("minDuration", String(params.minDuration));
    if (params?.maxDuration !== undefined) qs.set("maxDuration", String(params.maxDuration));
    if (params?.country) qs.set("country", params.country);
    if (params?.hasRageClicks !== undefined) qs.set("hasRageClicks", String(params.hasRageClicks));
    if (params?.pagePath) qs.set("pagePath", params.pagePath);
    if (params?.startDate) qs.set("startDate", params.startDate);
    if (params?.endDate) qs.set("endDate", params.endDate);
    if (params?.contactId) qs.set("contactId", params.contactId);
    const query = qs.toString();
    return request<SessionRecordingsResult>(`/api/admin/analytics/recordings${query ? `?${query}` : ""}`);
  },
  getSessionRecording: (sessionId: string) => request<SessionRecordingDetail>(`/api/admin/analytics/recordings/${encodeURIComponent(sessionId)}`),

  // ── CRM: Contacts, Pipelines & Deals ──────────────────────────────────
  getContacts: (params?: { page?: number; limit?: number; search?: string; status?: ContactStatus; tag?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.search) qs.set("search", params.search);
    if (params?.status) qs.set("status", params.status);
    if (params?.tag) qs.set("tag", params.tag);
    const query = qs.toString();
    return request<ContactsListResult>(`/api/admin/crm/contacts${query ? `?${query}` : ""}`);
  },
  getContact: (id: string) => request<ContactDetail>(`/api/admin/crm/contacts/${id}`),
  createContact: (data: ContactPayload) => request<Contact>("/api/admin/crm/contacts", { method: "POST", body: JSON.stringify(data) }),
  updateContact: (
    id: string,
    data: Partial<{
      firstName: string | null;
      lastName: string | null;
      phone: string | null;
      company: string | null;
      status: ContactStatus;
      tags: string[];
      customFields: Record<string, unknown> | null;
      assignedUserId: string | null;
    }>
  ) => request<Contact>(`/api/admin/crm/contacts/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteContact: (id: string) => request<void>(`/api/admin/crm/contacts/${id}`, { method: "DELETE" }),
  bulkDeleteContacts: (ids: string[]) =>
    request<{ deleted: number }>("/api/admin/crm/contacts/bulk-delete", { method: "POST", body: JSON.stringify({ ids }) }),
  addContactNote: (id: string, content: string) =>
    request<ContactNote>(`/api/admin/crm/contacts/${id}/notes`, { method: "POST", body: JSON.stringify({ content }) }),

  getPipelines: () => request<Pipeline[]>("/api/admin/crm/pipelines"),
  createPipeline: (data: { name: string; isDefault?: boolean; stages?: { name: string; color?: string; stageType?: StageType }[] }) =>
    request<Pipeline>("/api/admin/crm/pipelines", { method: "POST", body: JSON.stringify(data) }),
  createPipelineStage: (pipelineId: string, data: { name: string; color?: string; stageType?: StageType }) =>
    request<PipelineStage>(`/api/admin/crm/pipelines/${pipelineId}/stages`, { method: "POST", body: JSON.stringify(data) }),
  updatePipelineStage: (stageId: string, data: Partial<{ name: string; color: string | null; order: number; stageType: StageType }>) =>
    request<PipelineStage>(`/api/admin/crm/pipelines/stages/${stageId}`, { method: "PATCH", body: JSON.stringify(data) }),
  deletePipelineStage: (stageId: string) => request<void>(`/api/admin/crm/pipelines/stages/${stageId}`, { method: "DELETE" }),

  createDeal: (data: { title: string; value?: number; currency?: string; stageId: string; contactId?: string | null }) =>
    request<Deal>("/api/admin/crm/deals", { method: "POST", body: JSON.stringify(data) }),
  updateDeal: (id: string, data: Partial<{ title: string; value: number; currency: string; contactId: string | null; status: DealStatus; stageId: string }>) =>
    request<Deal>(`/api/admin/crm/deals/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  reorderDeal: (id: string, stageId: string, order: number) =>
    request<Deal>(`/api/admin/crm/deals/${id}/reorder`, { method: "PATCH", body: JSON.stringify({ stageId, order }) }),
  deleteDeal: (id: string) => request<void>(`/api/admin/crm/deals/${id}`, { method: "DELETE" }),
  exportAnalyticsLeads: async (params?: AnalyticsDateParams) => {
    const token = getToken();
    const qs = dateParamsToQuery(params);
    const res = await fetch(`${API_URL}/api/admin/analytics/export${qs ? `?${qs}` : ""}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) throw new ApiError(res.status, "Export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  // ── AI Content & SEO Assistant ──────────────────────────────────────────
  aiGenerateText: (data: { text: string; instruction: AiRewriteInstruction; targetLanguage?: string }) =>
    request<AiTextResult>("/api/admin/ai/generate-text", { method: "POST", body: JSON.stringify(data) }),
  aiGenerateSeo: (data: { title?: string; content: string }) =>
    request<AiSeoResult>("/api/admin/ai/generate-seo", { method: "POST", body: JSON.stringify(data) }),
  aiGenerateAltText: (mediaId: string) =>
    request<AiAltTextResult>("/api/admin/ai/generate-alt-text", { method: "POST", body: JSON.stringify({ mediaId }) }),

  // ── Visual Marketing Automation ─────────────────────────────────────────
  getWorkflows: () => request<AutomationWorkflow[]>("/api/admin/workflows"),
  getWorkflow: (id: string) => request<AutomationWorkflow>(`/api/admin/workflows/${id}`),
  createWorkflow: (data: Partial<AutomationWorkflow>) => request<AutomationWorkflow>("/api/admin/workflows", { method: "POST", body: JSON.stringify(data) }),
  updateWorkflow: (id: string, data: Partial<AutomationWorkflow>) =>
    request<AutomationWorkflow>(`/api/admin/workflows/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteWorkflow: (id: string) => request<void>(`/api/admin/workflows/${id}`, { method: "DELETE" }),
  getWorkflowLogs: (id: string, params?: { page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString();
    return request<{ items: WorkflowExecutionLogEntry[]; total: number; page: number; limit: number }>(
      `/api/admin/workflows/${id}/logs${query ? `?${query}` : ""}`
    );
  },

  getAutomationEmailTemplates: () => request<AutomationEmailTemplate[]>("/api/admin/automation-email-templates"),
  getAutomationEmailTemplate: (id: string) => request<AutomationEmailTemplate>(`/api/admin/automation-email-templates/${id}`),
  createAutomationEmailTemplate: (data: { name: string; subject: string; htmlBody: string; jsonBody?: Record<string, unknown> | null }) =>
    request<AutomationEmailTemplate>("/api/admin/automation-email-templates", { method: "POST", body: JSON.stringify(data) }),
  updateAutomationEmailTemplate: (id: string, data: Partial<{ name: string; subject: string; htmlBody: string; jsonBody: Record<string, unknown> | null }>) =>
    request<AutomationEmailTemplate>(`/api/admin/automation-email-templates/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteAutomationEmailTemplate: (id: string) => request<void>(`/api/admin/automation-email-templates/${id}`, { method: "DELETE" }),

  // ── Heatmaps & Form Field Analytics ─────────────────────────────────────
  getHeatmapPages: () => request<HeatmapPageSummary[]>("/api/admin/heatmaps/pages"),
  getHeatmap: (params: { path: string; device?: string; startDate?: string; endDate?: string }) => {
    const qs = new URLSearchParams({ path: params.path });
    if (params.device) qs.set("device", params.device);
    if (params.startDate) qs.set("startDate", params.startDate);
    if (params.endDate) qs.set("endDate", params.endDate);
    return request<HeatmapResult>(`/api/admin/heatmaps?${qs.toString()}`);
  },
  getFormFieldAnalytics: (formId?: string) =>
    request<FormFieldAnalyticsResult>(`/api/admin/form-analytics${formId ? `?formId=${encodeURIComponent(formId)}` : ""}`),

  // ── Multi-Tenant Agency Workspaces ──────────────────────────────────────
  getOrganizations: () => request<Organization[]>("/api/admin/organizations"),
  createOrganization: (data: { name: string; logoUrl?: string | null; primaryColor?: string | null }) =>
    request<Organization>("/api/admin/organizations", { method: "POST", body: JSON.stringify(data) }),
  updateOrganization: (id: string, data: Partial<{ name: string; logoUrl: string | null; primaryColor: string | null }>) =>
    request<Organization>(`/api/admin/organizations/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  getOrganizationMembers: (id: string) => request<OrgMembershipEntry[]>(`/api/admin/organizations/${id}/members`),
  inviteOrganizationMember: (id: string, data: { email: string; role: OrgRole }) =>
    request<OrgMembershipEntry>(`/api/admin/organizations/${id}/members`, { method: "POST", body: JSON.stringify(data) }),
  removeOrganizationMember: (id: string, userId: string) =>
    request<void>(`/api/admin/organizations/${id}/members/${userId}`, { method: "DELETE" }),

  // ── Staging & Scheduled Publishing ──────────────────────────────────────
  stagePage: (id: string, data: { content?: string; layout?: LayoutDocument | null }) =>
    request<Page>(`/api/admin/pages/${id}/stage`, { method: "POST", body: JSON.stringify(data) }),
  publishPage: (id: string) => request<Page>(`/api/admin/pages/${id}/publish`, { method: "POST" }),
  schedulePage: (id: string, scheduledAt: string) =>
    request<Page>(`/api/admin/pages/${id}/schedule`, { method: "POST", body: JSON.stringify({ scheduledAt }) }),
  getPagePreviewToken: (id: string) => request<{ token: string; slug: string }>(`/api/admin/pages/${id}/preview-token`),

  stagePost: (id: string, data: { content?: string; layout?: LayoutDocument | null }) =>
    request<Post>(`/api/admin/posts/${id}/stage`, { method: "POST", body: JSON.stringify(data) }),
  publishPost: (id: string) => request<Post>(`/api/admin/posts/${id}/publish`, { method: "POST" }),
  schedulePost: (id: string, scheduledAt: string) =>
    request<Post>(`/api/admin/posts/${id}/schedule`, { method: "POST", body: JSON.stringify({ scheduledAt }) }),
  getPostPreviewToken: (id: string) => request<{ token: string; slug: string }>(`/api/admin/posts/${id}/preview-token`),

  // ── Backup & Disaster Recovery ──────────────────────────────────────────
  getBackups: (params?: { page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString();
    return request<SystemBackupListResult>(`/api/admin/system/backups${query ? `?${query}` : ""}`);
  },
  generateBackup: (type: BackupType) => request<SystemBackup>("/api/admin/system/backups/generate", { method: "POST", body: JSON.stringify({ type }) }),
  restoreBackup: (id: string) => request<{ ok: true; restoredFrom: string }>(`/api/admin/system/backups/${id}/restore`, { method: "POST" }),
  deleteBackup: (id: string) => request<void>(`/api/admin/system/backups/${id}`, { method: "DELETE" }),
  downloadBackup: async (backup: SystemBackup) => {
    const token = getToken();
    const organizationId = getActiveOrganizationId();
    const res = await fetch(`${API_URL}/api/admin/system/backups/${backup.id}/download`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(organizationId ? { "x-organization-id": organizationId } : {}),
      },
    });
    if (!res.ok) throw new ApiError(res.status, "Download failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = backup.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
