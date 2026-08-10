import { Router } from "express";
import { prisma } from "@marwa/db";

export const publicStyleClassesRouter = Router();

/**
 * Public — apps/web fetches the full site-wide class list once per render
 * (Next's fetch cache dedupes repeated calls within one request) so
 * LayoutRenderer can merge each node's attached `classIds` into its style
 * before resolveNodeStyle runs. No draft/active concept here (unlike site
 * templates) — a class is either attached to a node or it isn't.
 */
publicStyleClassesRouter.get("/", async (req, res) => {
  const classes = await prisma.styleClass.findMany({ orderBy: { name: "asc" } });
  res.json(classes);
});
