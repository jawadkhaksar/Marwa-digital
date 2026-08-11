import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "path";
// Patches Express so rejected promises in async route handlers are forwarded
// to the error-handling middleware below instead of crashing the process.
import "express-async-errors";
import { prisma } from "@marwa/db";
import { corsOptions, generalLimiter } from "./lib/security";
import { authRouter } from "./routes/auth";
import { contentRouter } from "./routes/content";
import { formsRouter } from "./routes/forms";
import { publicSiteTemplatesRouter } from "./routes/siteTemplates";
import { publicStyleClassesRouter } from "./routes/styleClasses";
import { publicTimedAnimationsRouter } from "./routes/timedAnimations";
import { blogRouter } from "./routes/blog";
import { adminUsersRouter } from "./routes/admin/users";
import { adminReviewsRouter } from "./routes/admin/reviews";
import { adminMediaRouter } from "./routes/admin/media";
import { adminPagesRouter } from "./routes/admin/pages";
import { adminMenusRouter } from "./routes/admin/menus";
import { adminFooterLinksRouter } from "./routes/admin/footerLinks";
import { adminSettingsRouter } from "./routes/admin/settings";
import { adminSetupHelperRouter } from "./routes/admin/setupHelper";
import { adminInquiriesRouter } from "./routes/admin/inquiries";
import { adminFaqsRouter } from "./routes/admin/faqs";
import { adminFormSubmissionsRouter } from "./routes/admin/formSubmissions";
import { adminSiteTemplatesRouter } from "./routes/admin/siteTemplates";
import { adminStyleClassesRouter } from "./routes/admin/styleClasses";
import { adminTimedAnimationsRouter } from "./routes/admin/timedAnimations";
import { adminPostsRouter } from "./routes/admin/posts";
import { adminCategoriesRouter } from "./routes/admin/categories";
import { adminTagsRouter } from "./routes/admin/tags";
import { adminEmailTemplatesRouter } from "./routes/admin/emailTemplates";
import { adminCacheRouter } from "./routes/admin/cache";
import { adminCollectionsRouter } from "./routes/admin/collections";
import { analyticsRouter } from "./routes/analytics";
import { adminAnalyticsRouter } from "./routes/admin/analytics";
import { adminRevisionsRouter } from "./routes/admin/revisions";
import { adminSecurityRouter } from "./routes/admin/security";
import { adminAuditLogsRouter } from "./routes/admin/auditLogs";
import { adminContactsRouter } from "./routes/admin/contacts";
import { adminPipelinesRouter } from "./routes/admin/pipelines";
import { adminDealsRouter } from "./routes/admin/deals";
import { adminAiRouter } from "./routes/admin/ai";
import { adminWorkflowsRouter } from "./routes/admin/workflows";
import { adminAutomationEmailTemplatesRouter } from "./routes/admin/automationEmailTemplates";
import { adminHeatmapsRouter } from "./routes/admin/heatmaps";
import { adminFormAnalyticsRouter } from "./routes/admin/formAnalytics";
import { adminOrganizationsRouter } from "./routes/admin/organizations";
import { adminBackupsRouter } from "./routes/admin/backups";
import { cronRouter } from "./routes/cron";
import { requireAdmin, requireRole } from "./lib/auth";
import { auditLog } from "./lib/auditLogger";
import { resolveOrganization } from "./middleware/tenant";
import { startWorkflowScheduler } from "./services/workflowEngine";
import { startPublishScheduler } from "./services/publishWorker";

const app = express();

app.set("trust proxy", 1);

app.use(
  helmet({
    // This server only serves JSON + static /uploads assets, never HTML
    // documents — the meaningful CSP lives on the Next.js apps themselves
    // (see next.config.ts in apps/web and apps/admin), where it's actually
    // enforced against a rendered page.
    contentSecurityPolicy: false,
    // /uploads is deliberately loaded cross-origin (web:3000 and admin:3001
    // both embed images served from api:4000) — helmet's same-origin default
    // would silently break every <img>/next/image pointed at this API.
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(cors(corsOptions));

// Static asset serving is deliberately NOT behind the general API rate
// limiter — a single gallery/media-picker view can easily fire 30+ <img>
// requests at once, which isn't "API traffic" in the sense the limiter is
// meant to police and was tripping "Too Many Requests" on ordinary admin use.
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use("/api", generalLimiter);

// Default 100kb limit is too small for CMS page content (rich HTML, pasted
// design exports, embedded base64 images, etc.).
app.use(express.json({ limit: "20mb" }));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

/**
 * Database reachability probe.
 *
 * The global error handler deliberately collapses everything to "Internal
 * server error", which is right for production but leaves a total DB outage
 * indistinguishable from an application bug. This runs one trivial query and
 * reports the Prisma error *code* — P1001 unreachable, P1000 bad credentials,
 * P2024 pool exhausted — which is what actually tells the two apart.
 *
 * Deliberately reports no connection string, credentials, or raw driver text;
 * the code plus the host is the whole diagnostic surface.
 */
app.get("/health/db", async (_req, res) => {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, ms: Date.now() - started });
  } catch (err) {
    const code = (err as { code?: string }).code ?? null;
    let host: string | null = null;
    try {
      host = new URL(process.env.DATABASE_URL ?? "").host || null;
    } catch {
      host = process.env.DATABASE_URL ? "unparseable" : "unset";
    }
    res.status(503).json({
      ok: false,
      code,
      name: (err as Error).name,
      host,
      pooled: host ? host.includes("-pooler") : null,
      ms: Date.now() - started,
    });
  }
});

app.use("/api/auth", authRouter);
app.use("/api", contentRouter);
app.use("/api", blogRouter);
app.use("/api/forms", formsRouter);
app.use("/api/site-templates", publicSiteTemplatesRouter);
app.use("/api/style-classes", publicStyleClassesRouter);
app.use("/api/timed-animations", publicTimedAnimationsRouter);
app.use("/api/analytics", analyticsRouter);
// Auth here is a shared secret (CRON_SECRET), not requireAdmin — a cron
// pinger has no staff login. See routes/cron.ts's top comment.
app.use("/api/cron", cronRouter);

// auditLog(resource) is mounted right after requireAdmin on every router
// below that manages real admin-editable content/accounts — it writes one
// AuditLog row per successful POST/PATCH/PUT/DELETE, named
// "{RESOURCE}_{CREATE|UPDATE|DELETE}" (see lib/auditLogger.ts). Routers that
// are read-only (analytics, audit-logs itself), purely operational (cache
// clear), or that already log more specific/precise actions by hand
// (revisions' restore, the security router's password/2FA endpoints) are
// deliberately left unwrapped rather than doubly- or confusingly-logged.
app.use("/api/admin/users", requireAdmin, requireRole("ADMIN"), auditLog("User"), adminUsersRouter);
app.use("/api/admin/reviews", requireAdmin, auditLog("Review"), adminReviewsRouter);
app.use("/api/admin/media", requireAdmin, auditLog("Media"), adminMediaRouter);
app.use("/api/admin/pages", requireAdmin, resolveOrganization, auditLog("Page"), adminPagesRouter);
app.use("/api/admin/menus", requireAdmin, auditLog("Menu"), adminMenusRouter);
app.use("/api/admin/footer-links", requireAdmin, auditLog("FooterLink"), adminFooterLinksRouter);
app.use("/api/admin/settings", requireAdmin, auditLog("SiteSettings"), adminSettingsRouter);
app.use("/api/admin/setup-helper", requireAdmin, adminSetupHelperRouter);
app.use("/api/admin/inquiries", requireAdmin, auditLog("ContactInquiry"), adminInquiriesRouter);
app.use("/api/admin/faqs", requireAdmin, auditLog("Faq"), adminFaqsRouter);
app.use("/api/admin/form-submissions", requireAdmin, auditLog("FormSubmission"), adminFormSubmissionsRouter);
app.use("/api/admin/site-templates", requireAdmin, auditLog("SiteTemplate"), adminSiteTemplatesRouter);
app.use("/api/admin/style-classes", requireAdmin, auditLog("StyleClass"), adminStyleClassesRouter);
app.use("/api/admin/timed-animations", requireAdmin, auditLog("TimedAnimation"), adminTimedAnimationsRouter);
app.use("/api/admin/posts", requireAdmin, resolveOrganization, auditLog("Post"), adminPostsRouter);
app.use("/api/admin/categories", requireAdmin, auditLog("Category"), adminCategoriesRouter);
app.use("/api/admin/tags", requireAdmin, auditLog("Tag"), adminTagsRouter);
app.use("/api/admin/email-templates", requireAdmin, auditLog("EmailTemplate"), adminEmailTemplatesRouter);
app.use("/api/admin/cache", requireAdmin, adminCacheRouter);
app.use("/api/admin/collections", requireAdmin, auditLog("Collection"), adminCollectionsRouter);
app.use("/api/admin/analytics", requireAdmin, adminAnalyticsRouter);
app.use("/api/admin/revisions", requireAdmin, adminRevisionsRouter);
app.use("/api/admin/auth", requireAdmin, adminSecurityRouter);
app.use("/api/admin/audit-logs", requireAdmin, adminAuditLogsRouter);
app.use("/api/admin/crm/contacts", requireAdmin, resolveOrganization, auditLog("Contact"), adminContactsRouter);
app.use("/api/admin/crm/pipelines", requireAdmin, resolveOrganization, auditLog("Pipeline"), adminPipelinesRouter);
app.use("/api/admin/crm/deals", requireAdmin, auditLog("Deal"), adminDealsRouter);
// Not audit-logged: every generation call already writes its own, more
// detailed AiGenerationLog row (prompt, tokens, model) — see lib/aiProvider.ts.
app.use("/api/admin/ai", requireAdmin, adminAiRouter);
app.use("/api/admin/workflows", requireAdmin, resolveOrganization, auditLog("Workflow"), adminWorkflowsRouter);
app.use("/api/admin/automation-email-templates", requireAdmin, auditLog("AutomationEmailTemplate"), adminAutomationEmailTemplatesRouter);
app.use("/api/admin/heatmaps", requireAdmin, adminHeatmapsRouter);
app.use("/api/admin/form-analytics", requireAdmin, adminFormAnalyticsRouter);
// Not audit-logged: workspace membership changes aren't page/post-style
// "content" edits, and org creation stamps its own OWNER membership in the
// same call — a generic CREATE/UPDATE row would add noise, not signal.
app.use("/api/admin/organizations", requireAdmin, adminOrganizationsRouter);
app.use("/api/admin/system/backups", requireAdmin, requireRole("ADMIN"), adminBackupsRouter);

app.use((err: Error & { status?: number; statusCode?: number; type?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Request payload is too large." });
  }
  const status = err.status ?? err.statusCode ?? 500;
  res.status(status).json({ error: status === 500 ? "Internal server error" : err.message });
});

// Last-resort safety net: log and keep serving rather than take down every
// in-flight request over one stray unhandled rejection elsewhere in the app.
process.on("unhandledRejection", (reason) => {
  console.error("[api] Unhandled rejection:", reason);
});

// Vercel invokes the default export (this whole module, bundled by
// scripts/build-vercel.mjs into dist-vercel/server.js — see vercel.json)
// directly as a request handler per-request — it never calls .listen() and
// a serverless instance doesn't stay alive between requests, so both the
// TCP listener and the
// setInterval pollers below are always-on-host-only (local dev, Railway,
// a VPS). On Vercel, routes/cron.ts (driven by Vercel Cron Jobs or an
// external pinger) does the equivalent job instead — see its top comment.
if (!process.env.VERCEL) {
  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  app.listen(port, () => {
    console.log(`[api] listening on http://localhost:${port}`);
  });

  // Resumes any Wait/Delay automation steps whose scheduled time has
  // arrived — see workflowEngine.ts.
  startWorkflowScheduler();
  // Promotes any Page/Post whose scheduled publish time has arrived — see
  // publishWorker.ts.
  startPublishScheduler();
}

export default app;
