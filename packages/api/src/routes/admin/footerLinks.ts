import { Router } from "express";
import { z } from "zod";
import { prisma } from "@marwa/db";
import { formatZodError } from "../../lib/zodError";

export const adminFooterLinksRouter = Router();

adminFooterLinksRouter.get("/", async (_req, res) => {
  const links = await prisma.footerLink.findMany({ orderBy: [{ group: "asc" }, { order: "asc" }] });
  res.json(links);
});

const linkSchema = z.object({
  group: z.string().min(1),
  label: z.string().min(1),
  href: z.string().min(1),
  order: z.number().int().default(0),
  active: z.boolean().default(true),
});

adminFooterLinksRouter.post("/", async (req, res) => {
  const parsed = linkSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const link = await prisma.footerLink.create({ data: parsed.data });
  res.status(201).json(link);
});

adminFooterLinksRouter.patch("/:id", async (req, res) => {
  const parsed = linkSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const link = await prisma.footerLink.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(link);
});

adminFooterLinksRouter.delete("/:id", async (req, res) => {
  await prisma.footerLink.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
