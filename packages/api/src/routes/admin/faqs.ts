import { Router } from "express";
import { z } from "zod";
import { prisma } from "@marwa/db";
import { formatZodError } from "../../lib/zodError";

export const adminFaqsRouter = Router();

adminFaqsRouter.get("/", async (_req, res) => {
  const faqs = await prisma.faq.findMany({ orderBy: { order: "asc" } });
  res.json(faqs);
});

const faqSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  order: z.number().int().default(0),
  published: z.boolean().default(true),
});

adminFaqsRouter.post("/", async (req, res) => {
  const parsed = faqSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const faq = await prisma.faq.create({ data: parsed.data });
  res.status(201).json(faq);
});

adminFaqsRouter.patch("/:id", async (req, res) => {
  const parsed = faqSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const faq = await prisma.faq.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(faq);
});

adminFaqsRouter.delete("/:id", async (req, res) => {
  await prisma.faq.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
