import { Router } from "express";
import { prisma } from "@marwa/db";

export const publicSiteTemplatesRouter = Router();

/**
 * Public — the web app calls this on every page render to figure out which
 * Header/Footer template applies (see apps/web/src/lib/resolveSiteTemplate
 * usage in the layout/route files). Only ever returns `active` templates —
 * inactive/draft ones stay admin-only, viewed through the template editor.
 */
publicSiteTemplatesRouter.get("/", async (req, res) => {
  const type = typeof req.query.type === "string" ? req.query.type : undefined;
  const templates = await prisma.siteTemplate.findMany({
    where: { active: true, ...(type ? { type } : {}) },
    orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
  });
  res.json(templates);
});

/**
 * Single-template lookup, gated the same way `GET /api/pages/:slug` gates
 * drafts — only `active` templates are visible here. This is what the
 * admin's template editor iframe points at (apps/web/src/app/preview/
 * template/[id]/page.tsx), same trust model as the main page builder's
 * preview only ever showing published pages: new templates default to
 * `active: true`, so this only bites if an admin deliberately deactivates
 * the one they're actively editing.
 */
publicSiteTemplatesRouter.get("/:id", async (req, res) => {
  const template = await prisma.siteTemplate.findUnique({ where: { id: req.params.id } });
  if (!template || !template.active) return res.status(404).json({ error: "Template not found" });
  res.json(template);
});
