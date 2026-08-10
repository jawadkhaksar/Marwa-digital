import { Router } from "express";
import { prisma } from "@marwa/db";

export const publicTimedAnimationsRouter = Router();

/**
 * Public — apps/web fetches the full site-wide list once per render (same
 * pattern as styleClasses.ts) so any trigger's "Start an animation" action
 * can resolve `{kind:"timeline", timelineId}` to real keyframe data.
 */
publicTimedAnimationsRouter.get("/", async (req, res) => {
  const animations = await prisma.timedAnimation.findMany({ orderBy: { name: "asc" } });
  res.json(animations);
});
