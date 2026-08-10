import { Router } from "express";
import { z } from "zod";
import { prisma, Prisma } from "@marwa/db";
import { layoutDocumentSchema, validateLayoutTree, type LayoutDocument } from "@marwa/builder";
import { formatZodError } from "../../lib/zodError";
import { calculateReadingTime } from "../../lib/readingTime";
import { sanitizeRichText } from "../../lib/security";
import { snapshotRevision } from "../../services/revisionService";
import { signPreviewToken, type AuthedRequest } from "../../lib/auth";
import type { TenantRequest } from "../../middleware/tenant";

function toJsonInput(layout: LayoutDocument | null | undefined): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (layout === undefined) return undefined;
  if (layout === null) return Prisma.JsonNull;
  return layout as unknown as Prisma.InputJsonValue;
}

export const adminPostsRouter = Router();

const POST_STATUSES = ["DRAFT", "PUBLISHED", "SCHEDULED", "STAGED"] as const;
const EDITOR_MODES = ["CLASSIC", "BUILDER"] as const;
const EMPTY_LAYOUT = { version: 1 as const, nodes: [] };

// Datatable: search (title/excerpt), filter by status/category, paginated.
// See adminPagesRouter's GET / for the no-header/global-view rule.
adminPostsRouter.get("/", async (req: TenantRequest, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const status = typeof req.query.status === "string" && POST_STATUSES.includes(req.query.status as (typeof POST_STATUSES)[number]) ? req.query.status : undefined;
  const categoryId = typeof req.query.categoryId === "string" ? req.query.categoryId : undefined;

  const where: Prisma.PostWhereInput = {
    ...(req.organizationId ? { organizationId: req.organizationId } : {}),
    ...(status ? { status: status as (typeof POST_STATUSES)[number] } : {}),
    ...(categoryId ? { categories: { some: { id: categoryId } } } : {}),
    ...(search
      ? { OR: [{ title: { contains: search, mode: "insensitive" } }, { excerpt: { contains: search, mode: "insensitive" } }] }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: { author: { select: { id: true, name: true, avatarUrl: true } }, categories: true, tags: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.post.count({ where }),
  ]);

  res.json({ items, total, page, limit });
});

adminPostsRouter.get("/:id", async (req, res) => {
  const post = await prisma.post.findUnique({
    where: { id: req.params.id },
    include: { author: true, categories: true, tags: true },
  });
  if (!post) return res.status(404).json({ error: "Post not found" });
  res.json(post);
});

const postSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "slug must be lowercase letters, numbers, and hyphens"),
  title: z.string().min(1),
  excerpt: z.string().nullable().optional(),
  editorMode: z.enum(EDITOR_MODES).default("CLASSIC"),
  content: z.string().nullable().optional(),
  layout: layoutDocumentSchema.nullable().optional(),
  featuredImage: z.string().nullable().optional(),
  authorId: z.string().nullable().optional(),
  categoryIds: z.array(z.string()).default([]),
  tagIds: z.array(z.string()).default([]),
  status: z.enum(POST_STATUSES).default("DRAFT"),
  publishedAt: z.coerce.date().nullable().optional(),
  isFeatured: z.boolean().default(false),
  format: z.enum(["STANDARD", "GALLERY", "VIDEO", "QUOTE"]).default("STANDARD"),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  canonicalUrl: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
});

function layoutErrorsOrNull(editorMode: string | undefined, layout: LayoutDocument | null | undefined) {
  if (editorMode !== "BUILDER" || layout == null) return null;
  const errors = validateLayoutTree(layout);
  return errors.length > 0 ? errors : null;
}

adminPostsRouter.post("/", async (req: AuthedRequest & TenantRequest, res) => {
  const parsed = postSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const { categoryIds, tagIds, authorId, ...data } = parsed.data;
  if (data.content) data.content = sanitizeRichText(data.content);

  const layout = data.editorMode === "BUILDER" ? data.layout ?? EMPTY_LAYOUT : data.layout ?? undefined;
  const layoutErrors = layoutErrorsOrNull(data.editorMode, layout);
  if (layoutErrors) return res.status(400).json({ error: "Invalid layout", details: layoutErrors });

  const readingTime = calculateReadingTime(data.content, layout);
  const publishedAt = data.status === "PUBLISHED" && !data.publishedAt ? new Date() : data.publishedAt ?? undefined;

  const post = await prisma.post.create({
    data: {
      ...data,
      layout: toJsonInput(layout),
      readingTime,
      publishedAt,
      organization: req.organizationId ? { connect: { id: req.organizationId } } : undefined,
      author: authorId ? { connect: { id: authorId } } : undefined,
      categories: { connect: categoryIds.map((id) => ({ id })) },
      tags: { connect: tagIds.map((id) => ({ id })) },
    },
    include: { author: true, categories: true, tags: true },
  });
  await snapshotRevision({
    entityType: "POST",
    entityId: post.id,
    title: post.title,
    content: post.content,
    layout: post.layout as LayoutDocument | null,
    seoTitle: post.metaTitle,
    seoDesc: post.metaDescription,
    authorId: req.user?.id ?? null,
  });
  res.status(201).json(post);
});

adminPostsRouter.patch("/:id", async (req: AuthedRequest, res) => {
  const parsed = postSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const { categoryIds, tagIds, authorId, ...data } = parsed.data;
  if (data.content) data.content = sanitizeRichText(data.content);

  const existing = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Post not found" });

  if ("layout" in parsed.data) {
    const effectiveMode = data.editorMode ?? existing.editorMode;
    const layoutErrors = layoutErrorsOrNull(effectiveMode, data.layout);
    if (layoutErrors) return res.status(400).json({ error: "Invalid layout", details: layoutErrors });
  }

  // Recompute reading time whenever the content actually changed — not on
  // every save (e.g. a pure SEO-field or category edit shouldn't touch it).
  const contentChanged = "content" in data || "layout" in data;
  const readingTime = contentChanged
    ? calculateReadingTime(data.content ?? existing.content, data.layout !== undefined ? data.layout : (existing.layout as LayoutDocument | null))
    : undefined;

  // Publishing for the first time (status flips to PUBLISHED, no explicit
  // publishedAt given) stamps "now" — same one-time-default behavior as
  // create, so flipping a draft live doesn't require also hand-setting a date.
  const publishedAt =
    data.status === "PUBLISHED" && !existing.publishedAt && data.publishedAt === undefined ? new Date() : data.publishedAt;

  const post = await prisma.post.update({
    where: { id: req.params.id },
    data: {
      ...data,
      layout: toJsonInput(data.layout),
      ...(readingTime !== undefined ? { readingTime } : {}),
      ...(publishedAt !== undefined ? { publishedAt } : {}),
      author: authorId !== undefined ? (authorId ? { connect: { id: authorId } } : { disconnect: true }) : undefined,
      categories: categoryIds ? { set: categoryIds.map((id) => ({ id })) } : undefined,
      tags: tagIds ? { set: tagIds.map((id) => ({ id })) } : undefined,
    },
    include: { author: true, categories: true, tags: true },
  });
  await snapshotRevision({
    entityType: "POST",
    entityId: post.id,
    title: post.title,
    content: post.content,
    layout: post.layout as LayoutDocument | null,
    seoTitle: post.metaTitle,
    seoDesc: post.metaDescription,
    authorId: req.user?.id ?? null,
  });
  res.json(post);
});

adminPostsRouter.delete("/:id", async (req, res) => {
  await prisma.post.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// ── Staging & Scheduled Publishing ── mirrors adminPagesRouter's three
// endpoints — see that file's comment for the overall design.

const stagePostSchema = z.object({
  content: z.string().optional(),
  layout: layoutDocumentSchema.nullable().optional(),
});

adminPostsRouter.post("/:id/stage", async (req, res) => {
  const parsed = stagePostSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });

  const existing = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Post not found" });

  const layoutErrors = layoutErrorsOrNull(existing.editorMode, parsed.data.layout);
  if (layoutErrors) return res.status(400).json({ error: "Invalid layout", details: layoutErrors });

  const post = await prisma.post.update({
    where: { id: req.params.id },
    data: {
      status: "STAGED",
      stagedContent: parsed.data.content !== undefined ? sanitizeRichText(parsed.data.content) : existing.stagedContent ?? existing.content,
      stagedLayout: parsed.data.layout !== undefined ? toJsonInput(parsed.data.layout) : (existing.stagedLayout as Prisma.InputJsonValue | null) ?? toJsonInput(existing.layout as LayoutDocument | null),
    },
  });
  res.json(post);
});

adminPostsRouter.post("/:id/publish", async (req: AuthedRequest, res) => {
  const existing = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Post not found" });

  const content = existing.stagedContent ?? existing.content;
  const layout = (existing.stagedLayout ?? existing.layout) as Prisma.InputJsonValue | null;
  const readingTime = calculateReadingTime(content, layout as unknown as LayoutDocument | null);

  const post = await prisma.post.update({
    where: { id: req.params.id },
    data: {
      content,
      layout: layout ?? Prisma.JsonNull,
      readingTime,
      status: "PUBLISHED",
      publishedAt: existing.publishedAt ?? new Date(),
      scheduledAt: null,
    },
  });
  await snapshotRevision({
    entityType: "POST",
    entityId: post.id,
    title: post.title,
    content: post.content,
    layout: post.layout as LayoutDocument | null,
    seoTitle: post.metaTitle,
    seoDesc: post.metaDescription,
    authorId: req.user?.id ?? null,
  });
  res.json(post);
});

adminPostsRouter.get("/:id/preview-token", async (req, res) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id }, select: { id: true, slug: true } });
  if (!post) return res.status(404).json({ error: "Post not found" });
  res.json({ token: signPreviewToken("post", post.id), slug: post.slug });
});

const schedulePostSchema = z.object({ scheduledAt: z.coerce.date() });

adminPostsRouter.post("/:id/schedule", async (req, res) => {
  const parsed = schedulePostSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  if (parsed.data.scheduledAt.getTime() <= Date.now()) {
    return res.status(400).json({ error: "scheduledAt must be in the future" });
  }

  const existing = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Post not found" });
  if (!existing.stagedLayout && !existing.stagedContent) {
    return res.status(400).json({ error: "Save a staged draft before scheduling it" });
  }

  const post = await prisma.post.update({
    where: { id: req.params.id },
    data: { status: "SCHEDULED", scheduledAt: parsed.data.scheduledAt },
  });
  res.json(post);
});

// Bulk actions for the All Posts datatable's row-selection toolbar.
const bulkSchema = z.object({
  ids: z.array(z.string()).min(1),
  action: z.enum(["publish", "draft", "delete"]),
});

adminPostsRouter.post("/bulk", async (req, res) => {
  const parsed = bulkSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const { ids, action } = parsed.data;

  if (action === "delete") {
    await prisma.post.deleteMany({ where: { id: { in: ids } } });
    return res.json({ ok: true });
  }

  if (action === "publish") {
    const targets = await prisma.post.findMany({ where: { id: { in: ids } }, select: { id: true, publishedAt: true } });
    await Promise.all(
      targets.map((t) =>
        prisma.post.update({ where: { id: t.id }, data: { status: "PUBLISHED", publishedAt: t.publishedAt ?? new Date() } })
      )
    );
    return res.json({ ok: true });
  }

  await prisma.post.updateMany({ where: { id: { in: ids } }, data: { status: "DRAFT" } });
  res.json({ ok: true });
});
