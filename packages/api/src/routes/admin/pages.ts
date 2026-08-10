import { Router } from "express";
import { z } from "zod";
import { prisma, Prisma } from "@marwa/db";
import { layoutDocumentSchema, validateLayoutTree, type LayoutDocument } from "@marwa/builder";
import { formatZodError } from "../../lib/zodError";
import { sanitizeRichText } from "../../lib/security";
import { snapshotRevision } from "../../services/revisionService";
import { signPreviewToken, type AuthedRequest } from "../../lib/auth";
import type { TenantRequest } from "../../middleware/tenant";

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "page"
  );
}

/** Prisma's generated Json input type wants `Prisma.JsonNull`, not a plain `null`, for an explicit null write. */
function toJsonInput(layout: LayoutDocument | null | undefined): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (layout === undefined) return undefined;
  if (layout === null) return Prisma.JsonNull;
  return layout as unknown as Prisma.InputJsonValue;
}

export const adminPagesRouter = Router();

// No `x-organization-id` header (no workspace selected) shows every page
// across every workspace, for backward compatibility with the pre-tenancy
// single-workspace admin — see middleware/tenant.ts's resolveOrganization.
// Once a workspace IS selected, isolation is strict: only that workspace's
// own pages, never a mix.
adminPagesRouter.get("/", async (req: TenantRequest, res) => {
  const pages = await prisma.page.findMany({
    where: req.organizationId ? { organizationId: req.organizationId } : {},
    orderBy: { title: "asc" },
  });
  res.json(pages);
});

adminPagesRouter.get("/:id", async (req, res) => {
  const page = await prisma.page.findUnique({ where: { id: req.params.id } });
  if (!page) return res.status(404).json({ error: "Page not found" });
  res.json(page);
});

const TEMPLATES = ["default", "full-width", "sidebar", "landing", "contact"] as const;
const EDITOR_MODES = ["CLASSIC", "BUILDER"] as const;
const EMPTY_LAYOUT = { version: 1 as const, nodes: [] };

const pageSchema = z.object({
  // Left blank, auto-generated from `title` — same convention as Categories/Tags/Posts.
  slug: z.string().regex(/^[a-z0-9-]+$/, "slug must be lowercase letters, numbers, and hyphens").optional(),
  title: z.string().min(1),
  editorMode: z.enum(EDITOR_MODES).default("CLASSIC"),
  content: z.string().default(""),
  layout: layoutDocumentSchema.nullable().optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  metaKeywords: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
  metaRobotsIndex: z.boolean().default(true),
  metaRobotsFollow: z.boolean().default(true),
  headTags: z.string().nullable().optional(),
  customCss: z.string().nullable().optional(),
  customJs: z.string().nullable().optional(),
  template: z.enum(TEMPLATES).default("default"),
  published: z.boolean().default(true),
});

function layoutErrorsOrNull(editorMode: string | undefined, layout: LayoutDocument | null | undefined) {
  if (editorMode !== "BUILDER" || layout == null) return null;
  const errors = validateLayoutTree(layout);
  return errors.length > 0 ? errors : null;
}

adminPagesRouter.post("/", async (req: AuthedRequest & TenantRequest, res) => {
  const parsed = pageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const { slug, ...data } = parsed.data;
  if (data.content) data.content = sanitizeRichText(data.content);

  const layout = data.editorMode === "BUILDER" ? data.layout ?? EMPTY_LAYOUT : data.layout ?? undefined;
  const layoutErrors = layoutErrorsOrNull(data.editorMode, layout);
  if (layoutErrors) return res.status(400).json({ error: "Invalid layout", details: layoutErrors });

  const page = await prisma.page.create({
    data: {
      ...data,
      slug: slug?.trim() || slugify(data.title),
      layout: toJsonInput(layout),
      status: data.published ? "PUBLISHED" : "DRAFT",
      organizationId: req.organizationId,
    },
  });
  await snapshotRevision({
    entityType: "PAGE",
    entityId: page.id,
    title: page.title,
    content: page.content,
    layout: page.layout as LayoutDocument | null,
    seoTitle: page.metaTitle,
    seoDesc: page.metaDescription,
    authorId: req.user?.id ?? null,
  });
  res.status(201).json(page);
});

adminPagesRouter.patch("/:id", async (req: AuthedRequest, res) => {
  const parsed = pageSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const { slug, ...data } = parsed.data;
  if (data.content) data.content = sanitizeRichText(data.content);

  if ("layout" in data) {
    const existing = await prisma.page.findUnique({ where: { id: req.params.id }, select: { editorMode: true } });
    const effectiveMode = data.editorMode ?? existing?.editorMode;
    const layoutErrors = layoutErrorsOrNull(effectiveMode, data.layout);
    if (layoutErrors) return res.status(400).json({ error: "Invalid layout", details: layoutErrors });
  }

  // Slug cleared with a title present in the same payload -> regenerate from
  // title. Slug cleared with no title change -> leave the existing slug alone.
  let slugUpdate: string | undefined;
  if (slug !== undefined) {
    slugUpdate = slug.trim() || (data.title ? slugify(data.title) : undefined);
  }

  const page = await prisma.page.update({
    where: { id: req.params.id },
    data: {
      ...data,
      ...(slugUpdate !== undefined ? { slug: slugUpdate } : {}),
      layout: toJsonInput(data.layout),
      // Keeps the richer staging `status` in lockstep whenever the plain
      // published toggle is used directly (e.g. the Pages list's quick
      // publish/unpublish switch) rather than the dedicated stage/publish/
      // schedule endpoints below.
      ...(data.published !== undefined ? { status: data.published ? "PUBLISHED" : "DRAFT" } : {}),
    },
  });
  await snapshotRevision({
    entityType: "PAGE",
    entityId: page.id,
    title: page.title,
    content: page.content,
    layout: page.layout as LayoutDocument | null,
    seoTitle: page.metaTitle,
    seoDesc: page.metaDescription,
    authorId: req.user?.id ?? null,
  });
  res.json(page);
});

adminPagesRouter.delete("/:id", async (req, res) => {
  await prisma.page.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// ── Staging & Scheduled Publishing ──────────────────────────────────────
// These three endpoints are the only way `status` moves between
// STAGED/SCHEDULED and back — the live `content`/`layout`/`published`
// columns (what apps/web actually serves) are untouched by "stage", only
// ever promoted by "publish" (immediately) or by publishWorker.ts (once a
// "schedule" target time arrives).

const stageSchema = z.object({
  content: z.string().optional(),
  layout: layoutDocumentSchema.nullable().optional(),
});

adminPagesRouter.post("/:id/stage", async (req: AuthedRequest, res) => {
  const parsed = stageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });

  const existing = await prisma.page.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Page not found" });

  const layoutErrors = layoutErrorsOrNull(existing.editorMode, parsed.data.layout);
  if (layoutErrors) return res.status(400).json({ error: "Invalid layout", details: layoutErrors });

  const page = await prisma.page.update({
    where: { id: req.params.id },
    data: {
      status: "STAGED",
      stagedContent: parsed.data.content !== undefined ? sanitizeRichText(parsed.data.content) : existing.stagedContent ?? existing.content,
      stagedLayout: parsed.data.layout !== undefined ? toJsonInput(parsed.data.layout) : (existing.stagedLayout as Prisma.InputJsonValue | null) ?? toJsonInput(existing.layout as LayoutDocument | null),
    },
  });
  res.json(page);
});

/** Promotes stagedContent/stagedLayout into the live content/layout, if a staged snapshot exists. */
function promotedFields(page: { stagedContent: string | null; stagedLayout: unknown; content: string | null; layout: unknown }) {
  return {
    content: page.stagedContent ?? page.content,
    layout: (page.stagedLayout ?? page.layout) as Prisma.InputJsonValue | null,
  };
}

adminPagesRouter.post("/:id/publish", async (req: AuthedRequest, res) => {
  const existing = await prisma.page.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Page not found" });

  const promoted = promotedFields(existing);
  const page = await prisma.page.update({
    where: { id: req.params.id },
    data: {
      content: promoted.content,
      layout: promoted.layout ?? Prisma.JsonNull,
      published: true,
      status: "PUBLISHED",
      scheduledAt: null,
    },
  });
  await snapshotRevision({
    entityType: "PAGE",
    entityId: page.id,
    title: page.title,
    content: page.content,
    layout: page.layout as LayoutDocument | null,
    seoTitle: page.metaTitle,
    seoDesc: page.metaDescription,
    authorId: req.user?.id ?? null,
  });
  res.json(page);
});

adminPagesRouter.get("/:id/preview-token", async (req, res) => {
  const page = await prisma.page.findUnique({ where: { id: req.params.id }, select: { id: true, slug: true } });
  if (!page) return res.status(404).json({ error: "Page not found" });
  res.json({ token: signPreviewToken("page", page.id), slug: page.slug });
});

const scheduleSchema = z.object({ scheduledAt: z.coerce.date() });

adminPagesRouter.post("/:id/schedule", async (req, res) => {
  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  if (parsed.data.scheduledAt.getTime() <= Date.now()) {
    return res.status(400).json({ error: "scheduledAt must be in the future" });
  }

  const existing = await prisma.page.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Page not found" });
  if (!existing.stagedLayout && !existing.stagedContent) {
    return res.status(400).json({ error: "Save a staged draft before scheduling it" });
  }

  const page = await prisma.page.update({
    where: { id: req.params.id },
    data: { status: "SCHEDULED", scheduledAt: parsed.data.scheduledAt },
  });
  res.json(page);
});
