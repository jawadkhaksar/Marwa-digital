import { Router } from "express";
import { z } from "zod";
import { prisma, Prisma } from "@marwa/db";
import { layoutNodeStyleSchema } from "@marwa/builder";
import { formatZodError } from "../../lib/zodError";

/** Same pattern as admin/siteTemplates.ts's toJsonInput — Prisma's generated Json input type wants a concrete InputJsonValue, not our structured TS types. */
function toJsonInput<T>(value: T): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

export const adminStyleClassesRouter = Router();

const createSchema = z.object({
  name: z.string().min(1),
  style: layoutNodeStyleSchema.optional(),
});

const updateSchema = createSchema.partial();

adminStyleClassesRouter.get("/", async (req, res) => {
  const classes = await prisma.styleClass.findMany({ orderBy: { name: "asc" } });
  res.json(classes);
});

adminStyleClassesRouter.get("/:id", async (req, res) => {
  const styleClass = await prisma.styleClass.findUnique({ where: { id: req.params.id } });
  if (!styleClass) return res.status(404).json({ error: "Class not found" });
  res.json(styleClass);
});

adminStyleClassesRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });

  try {
    const styleClass = await prisma.styleClass.create({
      data: {
        name: parsed.data.name,
        style: toJsonInput(parsed.data.style ?? {}),
      },
    });
    res.status(201).json(styleClass);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return res.status(409).json({ error: "A class with this name already exists" });
    }
    throw err;
  }
});

adminStyleClassesRouter.patch("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });

  try {
    const styleClass = await prisma.styleClass.update({
      where: { id: req.params.id },
      data: {
        ...parsed.data,
        style: parsed.data.style !== undefined ? toJsonInput(parsed.data.style) : undefined,
      },
    });
    res.json(styleClass);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return res.status(409).json({ error: "A class with this name already exists" });
    }
    res.status(404).json({ error: "Class not found" });
  }
});

adminStyleClassesRouter.delete("/:id", async (req, res) => {
  try {
    await prisma.styleClass.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Class not found" });
  }
});
