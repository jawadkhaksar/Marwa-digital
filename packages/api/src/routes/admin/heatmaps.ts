import { Router } from "express";
import { prisma, Prisma } from "@marwa/db";

export const adminHeatmapsRouter = Router();

// Powers the page picker on /analytics/heatmaps — only pages that actually
// have recorded clicks, newest-active first.
adminHeatmapsRouter.get("/pages", async (_req, res) => {
  const rows = await prisma.heatmapClick.groupBy({ by: ["path"], _count: { path: true }, orderBy: { _count: { path: "desc" } } });
  res.json(rows.map((r) => ({ path: r.path, clicks: r._count.path })));
});

const DEVICES = ["DESKTOP", "MOBILE", "TABLET"] as const;

// Raw click coordinates for one page (optionally filtered by device/date
// range) — the Heatmap Visualizer renders these into a canvas density
// overlay client-side, see apps/admin's /analytics/heatmaps page.
adminHeatmapsRouter.get("/", async (req, res) => {
  const path = typeof req.query.path === "string" ? req.query.path : undefined;
  if (!path) return res.status(400).json({ error: "path is required" });

  const device = typeof req.query.device === "string" && (DEVICES as readonly string[]).includes(req.query.device) ? req.query.device : undefined;
  const startDate = typeof req.query.startDate === "string" ? req.query.startDate : undefined;
  const endDate = typeof req.query.endDate === "string" ? req.query.endDate : undefined;

  const where: Prisma.HeatmapClickWhereInput = {
    path,
    ...(device ? { device } : {}),
    ...(startDate || endDate
      ? { createdAt: { ...(startDate ? { gte: new Date(startDate) } : {}), ...(endDate ? { lte: new Date(`${endDate}T23:59:59.999Z`) } : {}) } }
      : {}),
  };

  const clicks = await prisma.heatmapClick.findMany({ where, select: { xPercent: true, yPx: true }, take: 20000 });
  // Click Y-positions are the only depth signal this table records (there's
  // no separate scroll-tracking table) — the deepest click on the page is
  // surfaced as a rough "how far down people engage" marker rather than a
  // precise scroll-depth percentage, which would need real scroll events.
  const maxYPx = clicks.reduce((max, c) => Math.max(max, c.yPx), 0);

  res.json({ path, device: device ?? null, totalClicks: clicks.length, maxYPx, clicks });
});
