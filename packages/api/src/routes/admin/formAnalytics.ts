import { Router } from "express";
import { prisma } from "@marwa/db";

export const adminFormAnalyticsRouter = Router();

// Every tracked (form, field) pair, ranked by abandonment rate — what the
// Form Field Abandonment chart (/analytics/forms) renders directly.
adminFormAnalyticsRouter.get("/", async (req, res) => {
  const formId = typeof req.query.formId === "string" ? req.query.formId : undefined;

  const rows = await prisma.formFieldAnalytics.findMany({
    where: formId ? { formId } : undefined,
    orderBy: { abandonments: "desc" },
  });

  const fields = rows.map((r) => ({
    formId: r.formId,
    fieldId: r.fieldId,
    fieldName: r.fieldName,
    interactions: r.interactions,
    abandonments: r.abandonments,
    abandonmentRate: r.interactions > 0 ? Math.round((r.abandonments / r.interactions) * 10000) / 100 : 0,
  }));

  const forms = [...new Set(rows.map((r) => r.formId))];
  res.json({ forms, fields });
});
