import { Router } from "express";
import { z } from "zod";
import { prisma } from "@marwa/db";
import { formatZodError } from "../../lib/zodError";

export const adminTagsRouter = Router();

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "tag"
  );
}

adminTagsRouter.get("/", async (_req, res) => {
  const tags = await prisma.tag.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { posts: true } } } });
  res.json(tags);
});

const tagSchema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
});

adminTagsRouter.post("/", async (req, res) => {
  const parsed = tagSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const { slug, ...data } = parsed.data;
  const tag = await prisma.tag.create({ data: { ...data, slug: slug?.trim() || slugify(data.name) } });
  res.status(201).json(tag);
});

adminTagsRouter.patch("/:id", async (req, res) => {
  const parsed = tagSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const { slug, ...data } = parsed.data;
  const tag = await prisma.tag.update({
    where: { id: req.params.id },
    data: { ...data, ...(slug !== undefined ? { slug: slug.trim() || undefined } : {}) },
  });
  res.json(tag);
});

adminTagsRouter.delete("/:id", async (req, res) => {
  await prisma.tag.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
