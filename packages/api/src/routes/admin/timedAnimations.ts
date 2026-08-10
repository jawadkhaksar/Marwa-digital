import { Router } from "express";
import { z } from "zod";
import { prisma, Prisma } from "@marwa/db";
import { blockTimelineSchema } from "@marwa/builder";
import { formatZodError } from "../../lib/zodError";

/** Same pattern as admin/styleClasses.ts's toJsonInput — Prisma's generated Json input type wants a concrete InputJsonValue, not our structured TS types. */
function toJsonInput<T>(value: T): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

export const adminTimedAnimationsRouter = Router();

// A TimedAnimation's own `timeline` never carries a `trigger` — the trigger
// belongs to the element+event pairing that starts it, not the reusable
// animation itself — so this omits it from the full BlockTimeline shape.
const timedAnimationTimelineSchema = blockTimelineSchema.omit({ trigger: true });

const createSchema = z.object({
  name: z.string().min(1),
  timeline: timedAnimationTimelineSchema.optional(),
});

const updateSchema = createSchema.partial();

adminTimedAnimationsRouter.get("/", async (req, res) => {
  const animations = await prisma.timedAnimation.findMany({ orderBy: { name: "asc" } });
  res.json(animations);
});

adminTimedAnimationsRouter.get("/:id", async (req, res) => {
  const animation = await prisma.timedAnimation.findUnique({ where: { id: req.params.id } });
  if (!animation) return res.status(404).json({ error: "Animation not found" });
  res.json(animation);
});

adminTimedAnimationsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });

  try {
    const animation = await prisma.timedAnimation.create({
      data: {
        name: parsed.data.name,
        timeline: toJsonInput(parsed.data.timeline ?? { version: 2, duration: 0.6, tracks: [], cssVarTracks: [], clipPathTracks: [] }),
      },
    });
    res.status(201).json(animation);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return res.status(409).json({ error: "An animation with this name already exists" });
    }
    throw err;
  }
});

adminTimedAnimationsRouter.patch("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });

  try {
    const animation = await prisma.timedAnimation.update({
      where: { id: req.params.id },
      data: {
        ...parsed.data,
        timeline: parsed.data.timeline !== undefined ? toJsonInput(parsed.data.timeline) : undefined,
      },
    });
    res.json(animation);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return res.status(409).json({ error: "An animation with this name already exists" });
    }
    res.status(404).json({ error: "Animation not found" });
  }
});

adminTimedAnimationsRouter.delete("/:id", async (req, res) => {
  try {
    await prisma.timedAnimation.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Animation not found" });
  }
});
