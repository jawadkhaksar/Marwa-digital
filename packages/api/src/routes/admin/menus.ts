import { Router } from "express";
import { z } from "zod";
import { prisma } from "@marwa/db";
import { formatZodError } from "../../lib/zodError";

export const adminMenusRouter = Router();

adminMenusRouter.get("/", async (_req, res) => {
  const menus = await prisma.menu.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { items: true } } },
  });
  res.json(menus);
});

adminMenusRouter.get("/:id", async (req, res) => {
  const menu = await prisma.menu.findUnique({
    where: { id: req.params.id },
    include: { items: { orderBy: { order: "asc" } } },
  });
  if (!menu) return res.status(404).json({ error: "Menu not found" });
  res.json(menu);
});

const menuSchema = z.object({
  name: z.string().min(1),
  autoAddPages: z.boolean().default(false),
  showInHeader: z.boolean().default(false),
  showInFooter: z.boolean().default(false),
});

adminMenusRouter.post("/", async (req, res) => {
  const parsed = menuSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const menu = await prisma.menu.create({ data: parsed.data });
  res.status(201).json(menu);
});

adminMenusRouter.patch("/:id", async (req, res) => {
  const parsed = menuSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  try {
    // Only one menu can occupy a given location at a time — flipping this
    // one on clears it from every other menu first, same single-selection
    // invariant SiteSettings.primaryMenuId already enforces for the header.
    if (parsed.data.showInHeader) {
      await prisma.menu.updateMany({ where: { id: { not: req.params.id }, showInHeader: true }, data: { showInHeader: false } });
    }
    if (parsed.data.showInFooter) {
      await prisma.menu.updateMany({ where: { id: { not: req.params.id }, showInFooter: true }, data: { showInFooter: false } });
    }
    const menu = await prisma.menu.update({ where: { id: req.params.id }, data: parsed.data });
    res.json(menu);
  } catch {
    res.status(404).json({ error: "Menu not found" });
  }
});

adminMenusRouter.delete("/:id", async (req, res) => {
  const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
  if (settings?.primaryMenuId === req.params.id) {
    await prisma.siteSettings.update({ where: { id: "singleton" }, data: { primaryMenuId: null } });
  }
  try {
    // MenuItem.menuId has onDelete: Cascade — items go with it.
    await prisma.menu.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Menu not found" });
  }
});

const menuItemSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  parentId: z.string().nullable().optional(),
  cssClasses: z.string().nullable().optional(),
  openInNewTab: z.boolean().default(false),
  active: z.boolean().default(true),
  order: z.number().int().default(0),
  previewImage: z.string().nullable().optional(),
});

adminMenusRouter.post("/:id/items", async (req, res) => {
  const parsed = menuItemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const item = await prisma.menuItem.create({ data: { ...parsed.data, menuId: req.params.id } });
  res.status(201).json(item);
});

adminMenusRouter.patch("/:id/items/:itemId", async (req, res) => {
  const parsed = menuItemSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  // A parent can't become its own descendant's child — walk up the new
  // parent's chain and reject if it loops back to this item.
  if (parsed.data.parentId) {
    let cursor: string | null = parsed.data.parentId;
    while (cursor) {
      if (cursor === req.params.itemId) return res.status(400).json({ error: "An item can't be nested under its own descendant" });
      const parent: { parentId: string | null } | null = await prisma.menuItem.findUnique({ where: { id: cursor }, select: { parentId: true } });
      cursor = parent?.parentId ?? null;
    }
  }
  try {
    const item = await prisma.menuItem.update({ where: { id: req.params.itemId }, data: parsed.data });
    res.json(item);
  } catch {
    res.status(404).json({ error: "Menu item not found" });
  }
});

adminMenusRouter.delete("/:id/items/:itemId", async (req, res) => {
  try {
    // MenuItem.parentId has onDelete: SetNull — children are promoted to
    // top-level rather than deleted along with their parent.
    await prisma.menuItem.delete({ where: { id: req.params.itemId } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Menu item not found" });
  }
});

const reorderSchema = z.object({
  items: z.array(z.object({ id: z.string(), parentId: z.string().nullable(), order: z.number().int() })),
});

/** Bulk-applies a full reorder/renest result (Move Up/Down/Indent/Outdent) in one transaction instead of N separate PATCH round-trips. */
adminMenusRouter.patch("/:id/reorder", async (req, res) => {
  const parsed = reorderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  await prisma.$transaction(
    parsed.data.items.map((item) =>
      prisma.menuItem.update({ where: { id: item.id }, data: { parentId: item.parentId, order: item.order } })
    )
  );
  const menu = await prisma.menu.findUnique({ where: { id: req.params.id }, include: { items: { orderBy: { order: "asc" } } } });
  res.json(menu);
});
