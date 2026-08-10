import { Router } from "express";
import { Prisma, prisma } from "@marwa/db";
import { verifyPreviewToken } from "../lib/auth";

export const blogRouter = Router();

// A SCHEDULED post becomes publicly visible once its publishedAt has
// passed, without any cron flipping the status — checked fresh on every
// request instead. A DRAFT is never publicly visible regardless of dates.
function publicPostWhere(extra?: Prisma.PostWhereInput): Prisma.PostWhereInput {
  return {
    AND: [
      {
        OR: [
          { status: "PUBLISHED" },
          { status: "SCHEDULED", publishedAt: { lte: new Date() } },
        ],
      },
      extra ?? {},
    ],
  };
}

const postCardSelect = {
  id: true,
  postNumber: true,
  slug: true,
  title: true,
  excerpt: true,
  featuredImage: true,
  publishedAt: true,
  readingTime: true,
  isFeatured: true,
  author: { select: { id: true, name: true, avatarUrl: true } },
  categories: { select: { id: true, name: true, slug: true, color: true } },
  tags: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.PostSelect;

// Listing grid: search, category/tag filter, pagination.
blogRouter.get("/posts", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 9));
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const tag = typeof req.query.tag === "string" ? req.query.tag : undefined;

  const where = publicPostWhere({
    ...(category ? { categories: { some: { slug: category } } } : {}),
    ...(tag ? { tags: { some: { slug: tag } } } : {}),
    ...(search
      ? { OR: [{ title: { contains: search, mode: "insensitive" } }, { excerpt: { contains: search, mode: "insensitive" } }] }
      : {}),
  });

  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      select: postCardSelect,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.post.count({ where }),
  ]);

  res.json({ items, total, page, limit, hasMore: page * limit < total });
});

// Newest post flagged isFeatured — the listing page's hero banner.
blogRouter.get("/posts/featured", async (_req, res) => {
  const post = await prisma.post.findFirst({
    where: publicPostWhere({ isFeatured: true }),
    select: postCardSelect,
    orderBy: { publishedAt: "desc" },
  });
  res.json(post ?? null);
});

blogRouter.get("/posts/:slug", async (req, res) => {
  const post = await prisma.post.findUnique({
    where: { slug: req.params.slug },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true, bio: true } },
      categories: true,
      tags: true,
    },
  });
  if (!post) return res.status(404).json({ error: "Post not found" });

  // Staging Preview Link — see content.ts's matching GET /pages/:slug comment.
  const previewToken = typeof req.query.previewToken === "string" ? req.query.previewToken : undefined;
  if (verifyPreviewToken(previewToken, "post", post.id)) {
    return res.json({ ...post, content: post.stagedContent ?? post.content, layout: post.stagedLayout ?? post.layout, isPreview: true });
  }

  // A SCHEDULED post whose time hasn't come, or a DRAFT/STAGED, reads as
  // 404 — same "not publicly visible" rule as the listing query above.
  const isVisible = post.status === "PUBLISHED" || (post.status === "SCHEDULED" && post.publishedAt && post.publishedAt <= new Date());
  if (!isVisible) return res.status(404).json({ error: "Post not found" });
  res.json(post);
});

// Lookup by the sequential postNumber instead of slug — used by apps/web's
// permalink parser for the "Plain" (?p=123) and "Numeric" (/archives/123)
// structures, where the URL carries the number instead of the slug.
blogRouter.get("/posts/by-number/:num", async (req, res) => {
  const num = Number(req.params.num);
  if (!Number.isInteger(num)) return res.status(404).json({ error: "Post not found" });

  const post = await prisma.post.findUnique({
    where: { postNumber: num },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true, bio: true } },
      categories: true,
      tags: true,
    },
  });
  const isVisible = post && (post.status === "PUBLISHED" || (post.status === "SCHEDULED" && post.publishedAt && post.publishedAt <= new Date()));
  if (!isVisible) return res.status(404).json({ error: "Post not found" });
  res.json(post);
});

// Up to 3 posts sharing a category or tag with the given post — the single
// post page's "Related Posts" grid.
blogRouter.get("/posts/:slug/related", async (req, res) => {
  const current = await prisma.post.findUnique({
    where: { slug: req.params.slug },
    select: { id: true, categories: { select: { id: true } }, tags: { select: { id: true } } },
  });
  if (!current) return res.json([]);

  const categoryIds = current.categories.map((c) => c.id);
  const tagIds = current.tags.map((t) => t.id);
  if (categoryIds.length === 0 && tagIds.length === 0) return res.json([]);

  const related = await prisma.post.findMany({
    where: publicPostWhere({
      id: { not: current.id },
      OR: [
        ...(categoryIds.length ? [{ categories: { some: { id: { in: categoryIds } } } }] : []),
        ...(tagIds.length ? [{ tags: { some: { id: { in: tagIds } } } }] : []),
      ],
    }),
    select: postCardSelect,
    orderBy: { publishedAt: "desc" },
    take: 3,
  });
  res.json(related);
});

blogRouter.get("/categories", async (_req, res) => {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  res.json(categories);
});

blogRouter.get("/tags", async (_req, res) => {
  const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });
  res.json(tags);
});
