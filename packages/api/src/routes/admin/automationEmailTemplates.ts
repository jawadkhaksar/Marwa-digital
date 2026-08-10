import { Router } from "express";
import { z } from "zod";
import { prisma, Prisma } from "@marwa/db";
import { formatZodError } from "../../lib/zodError";

// CRUD for AutomationEmailTemplate — the marketing email library a
// workflow's "Send Email" action picks from. Distinct from the system
// transactional-email templates managed at /api/admin/email-templates.
export const adminAutomationEmailTemplatesRouter = Router();

adminAutomationEmailTemplatesRouter.get("/", async (_req, res) => {
  const templates = await prisma.automationEmailTemplate.findMany({ orderBy: { updatedAt: "desc" } });
  res.json(templates);
});

adminAutomationEmailTemplatesRouter.get("/:id", async (req, res) => {
  const template = await prisma.automationEmailTemplate.findUnique({ where: { id: req.params.id } });
  if (!template) return res.status(404).json({ error: "Template not found" });
  res.json(template);
});

const templateSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  htmlBody: z.string().min(1),
  jsonBody: z.record(z.string(), z.unknown()).nullable().optional(),
});

adminAutomationEmailTemplatesRouter.post("/", async (req, res) => {
  const parsed = templateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const { jsonBody, ...rest } = parsed.data;
  const template = await prisma.automationEmailTemplate.create({ data: { ...rest, jsonBody: (jsonBody ?? undefined) as Prisma.InputJsonValue | undefined } });
  res.status(201).json(template);
});

adminAutomationEmailTemplatesRouter.patch("/:id", async (req, res) => {
  const parsed = templateSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const { jsonBody, ...rest } = parsed.data;
  const template = await prisma.automationEmailTemplate.update({
    where: { id: req.params.id },
    data: { ...rest, ...(jsonBody !== undefined ? { jsonBody: (jsonBody ?? Prisma.JsonNull) as Prisma.InputJsonValue } : {}) },
  });
  res.json(template);
});

adminAutomationEmailTemplatesRouter.delete("/:id", async (req, res) => {
  await prisma.automationEmailTemplate.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
