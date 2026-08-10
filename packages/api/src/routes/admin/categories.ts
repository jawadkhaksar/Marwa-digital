import { Router } from "express";
import { z } from "zod";
import { prisma } from "@marwa/db";
import { formatZodError } from "../../lib/zodError";

export const adminCategoriesRouter = Router();

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "category"
  );
}

adminCategoriesRouter.get("/", async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { posts: true } } },
  });
  res.json(categories);
});

const categorySchema = z.object({
  name: z.string().min(1),
  // Left blank, auto-generated from `name` — same "type a name, don't make
  // the admin also hand-craft a slug" convention as the builder's page
  // creation form.
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
});

adminCategoriesRouter.post("/", async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const { slug, ...data } = parsed.data;
  const category = await prisma.category.create({ data: { ...data, slug: slug?.trim() || slugify(data.name) } });
  res.status(201).json(category);
});

adminCategoriesRouter.patch("/:id", async (req, res) => {
  const parsed = categorySchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const { slug, ...data } = parsed.data;
  const category = await prisma.category.update({
    where: { id: req.params.id },
    data: { ...data, ...(slug !== undefined ? { slug: slug.trim() || undefined } : {}) },
  });
  res.json(category);
});

adminCategoriesRouter.delete("/:id", async (req, res) => {
  await prisma.category.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
