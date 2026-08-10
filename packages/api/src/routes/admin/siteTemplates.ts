import { Router } from "express";
import { z } from "zod";
import { prisma, Prisma } from "@marwa/db";
import { layoutDocumentSchema, SITE_TEMPLATE_TYPE_VALUES } from "@marwa/builder";
import { formatZodError } from "../../lib/zodError";

/** Same pattern as admin/pages.ts's toJsonInput — Prisma's generated Json input type wants a concrete InputJsonValue, not our structured TS types. */
function toJsonInput<T>(value: T): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

export const adminSiteTemplatesRouter = Router();

const targetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("entire_site") }),
  z.object({ kind: z.literal("home") }),
  z.object({ kind: z.literal("contact") }),
  z.object({ kind: z.literal("all_pages") }),
  z.object({ kind: z.literal("page"), pageSlug: z.string().min(1), pageTitle: z.string().optional() }),
]);

const conditionSchema = z.object({
  include: z.boolean(),
  target: targetSchema,
});

const createSchema = z.object({
  type: z.enum(SITE_TEMPLATE_TYPE_VALUES),
  title: z.string().min(1),
  layout: layoutDocumentSchema.optional(),
  conditions: z.array(conditionSchema).default([]),
  priority: z.number().int().optional(),
  active: z.boolean().optional(),
});

const updateSchema = createSchema.partial();

const EMPTY_LAYOUT = { version: 1, nodes: [] };

adminSiteTemplatesRouter.get("/", async (req, res) => {
  const type = typeof req.query.type === "string" ? req.query.type : undefined;
  const templates = await prisma.siteTemplate.findMany({
    where: type ? { type } : undefined,
    orderBy: [{ type: "asc" }, { priority: "asc" }, { updatedAt: "desc" }],
  });
  res.json(templates);
});

adminSiteTemplatesRouter.get("/:id", async (req, res) => {
  const template = await prisma.siteTemplate.findUnique({ where: { id: req.params.id } });
  if (!template) return res.status(404).json({ error: "Template not found" });
  res.json(template);
});

adminSiteTemplatesRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });

  const template = await prisma.siteTemplate.create({
    data: {
      type: parsed.data.type,
      title: parsed.data.title,
      layout: toJsonInput(parsed.data.layout ?? EMPTY_LAYOUT),
      conditions: toJsonInput(parsed.data.conditions),
      priority: parsed.data.priority ?? 0,
      active: parsed.data.active ?? true,
    },
  });
  res.status(201).json(template);
});

adminSiteTemplatesRouter.patch("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });

  try {
    const template = await prisma.siteTemplate.update({
      where: { id: req.params.id },
      data: {
        ...parsed.data,
        layout: parsed.data.layout !== undefined ? toJsonInput(parsed.data.layout) : undefined,
        conditions: parsed.data.conditions !== undefined ? toJsonInput(parsed.data.conditions) : undefined,
      },
    });
    res.json(template);
  } catch {
    res.status(404).json({ error: "Template not found" });
  }
});

adminSiteTemplatesRouter.delete("/:id", async (req, res) => {
  try {
    await prisma.siteTemplate.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Template not found" });
  }
});
