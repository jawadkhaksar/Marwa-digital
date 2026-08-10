import { Router } from "express";
import { z } from "zod";
import { prisma, Prisma } from "@marwa/db";
import { formatZodError } from "../../lib/zodError";

export const adminCollectionsRouter = Router();

const FIELD_TYPES = ["TEXT", "RICH_TEXT", "NUMBER", "BOOLEAN", "IMAGE", "IMAGE_LIST", "DATE", "SELECT", "REFERENCE", "JSON"] as const;
const ITEM_STATUSES = ["DRAFT", "PUBLISHED"] as const;

const keySchema = z
  .string()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only (e.g. case-studies)");

// ── Collections ────────────────────────────────────────────────────────
adminCollectionsRouter.get("/", async (_req, res) => {
  const collections = await prisma.collection.findMany({
    include: { _count: { select: { items: true, fields: true } } },
    orderBy: { name: "asc" },
  });
  res.json(collections);
});

adminCollectionsRouter.get("/:id", async (req, res) => {
  const collection = await prisma.collection.findUnique({
    where: { id: req.params.id },
    include: {
      fields: { orderBy: { order: "asc" } },
      items: { orderBy: { order: "asc" } },
    },
  });
  if (!collection) return res.status(404).json({ error: "Collection not found" });
  res.json(collection);
});

const createCollectionSchema = z.object({
  key: keySchema,
  name: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
});

adminCollectionsRouter.post("/", async (req, res) => {
  const parsed = createCollectionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });

  const existing = await prisma.collection.findUnique({ where: { key: parsed.data.key } });
  if (existing) return res.status(409).json({ error: "A collection with this key already exists" });

  const collection = await prisma.collection.create({ data: parsed.data });
  res.status(201).json(collection);
});

const updateCollectionSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
});

adminCollectionsRouter.patch("/:id", async (req, res) => {
  const parsed = updateCollectionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  try {
    const collection = await prisma.collection.update({ where: { id: req.params.id }, data: parsed.data });
    res.json(collection);
  } catch {
    res.status(404).json({ error: "Collection not found" });
  }
});

adminCollectionsRouter.delete("/:id", async (req, res) => {
  try {
    await prisma.collection.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Collection not found" });
  }
});

// ── Fields ────────────────────────────────────────────────────────────
const fieldSchema = z.object({
  key: keySchema,
  label: z.string().min(1),
  type: z.enum(FIELD_TYPES),
  required: z.boolean().default(false),
  order: z.number().int().default(0),
  options: z.unknown().optional(),
});

adminCollectionsRouter.post("/:id/fields", async (req, res) => {
  const parsed = fieldSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });

  const existing = await prisma.collectionField.findUnique({
    where: { collectionId_key: { collectionId: req.params.id, key: parsed.data.key } },
  });
  if (existing) return res.status(409).json({ error: "A field with this key already exists on this collection" });

  const field = await prisma.collectionField.create({
    data: { ...parsed.data, options: parsed.data.options as Prisma.InputJsonValue, collectionId: req.params.id },
  });
  res.status(201).json(field);
});

const updateFieldSchema = fieldSchema.partial();

adminCollectionsRouter.patch("/:id/fields/:fieldId", async (req, res) => {
  const parsed = updateFieldSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  try {
    const field = await prisma.collectionField.update({
      where: { id: req.params.fieldId },
      data: { ...parsed.data, options: parsed.data.options as Prisma.InputJsonValue | undefined },
    });
    res.json(field);
  } catch {
    res.status(404).json({ error: "Field not found" });
  }
});

adminCollectionsRouter.delete("/:id/fields/:fieldId", async (req, res) => {
  try {
    await prisma.collectionField.delete({ where: { id: req.params.fieldId } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Field not found" });
  }
});

// ── Items ─────────────────────────────────────────────────────────────
const itemSchema = z.object({
  slug: z.string().optional(),
  data: z.record(z.string(), z.unknown()).default({}),
  status: z.enum(ITEM_STATUSES).default("DRAFT"),
  order: z.number().int().default(0),
});

adminCollectionsRouter.post("/:id/items", async (req, res) => {
  const parsed = itemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });

  const item = await prisma.collectionItem.create({
    data: { ...parsed.data, data: parsed.data.data as Prisma.InputJsonValue, collectionId: req.params.id },
  });
  res.status(201).json(item);
});

const updateItemSchema = itemSchema.partial();

adminCollectionsRouter.patch("/:id/items/:itemId", async (req, res) => {
  const parsed = updateItemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  try {
    const item = await prisma.collectionItem.update({
      where: { id: req.params.itemId },
      data: { ...parsed.data, data: parsed.data.data as Prisma.InputJsonValue | undefined },
    });
    res.json(item);
  } catch {
    res.status(404).json({ error: "Item not found" });
  }
});

adminCollectionsRouter.delete("/:id/items/:itemId", async (req, res) => {
  try {
    await prisma.collectionItem.delete({ where: { id: req.params.itemId } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Item not found" });
  }
});
