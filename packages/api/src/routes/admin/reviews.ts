import { Router } from "express";
import { z } from "zod";
import { prisma } from "@marwa/db";
import { formatZodError } from "../../lib/zodError";

export const adminReviewsRouter = Router();

adminReviewsRouter.get("/", async (_req, res) => {
  const reviews = await prisma.review.findMany({ orderBy: { createdAt: "desc" } });
  res.json(reviews);
});

const reviewSchema = z.object({
  customerName: z.string().min(1),
  quote: z.string().min(1),
  rating: z.number().int().min(1).max(5).default(5),
  source: z.string().min(1).default("Website"),
  published: z.boolean().default(true),
});

adminReviewsRouter.post("/", async (req, res) => {
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const review = await prisma.review.create({ data: parsed.data });
  res.status(201).json(review);
});

adminReviewsRouter.patch("/:id", async (req, res) => {
  const parsed = reviewSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const review = await prisma.review.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(review);
});

adminReviewsRouter.delete("/:id", async (req, res) => {
  await prisma.review.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
