import { Router } from "express";
import { prisma, Prisma } from "@marwa/db";

export const adminAuditLogsRouter = Router();

// Paginated, filterable search over the audit trail — filterable by user
// (id), action (exact or prefix, e.g. "PAGE" matches PAGE_CREATE/UPDATE/
// DELETE), resource, and a date range. Read-only: this router is
// deliberately never wrapped in the auditLog() middleware itself — logging
// reads of the audit log would just be noise.
adminAuditLogsRouter.get("/", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));

  const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
  const action = typeof req.query.action === "string" ? req.query.action.trim() : undefined;
  const resource = typeof req.query.resource === "string" ? req.query.resource.trim() : undefined;
  const startDate = typeof req.query.startDate === "string" ? req.query.startDate : undefined;
  const endDate = typeof req.query.endDate === "string" ? req.query.endDate : undefined;

  const where: Prisma.AuditLogWhereInput = {
    ...(userId ? { userId } : {}),
    ...(action ? { action: { contains: action, mode: "insensitive" } } : {}),
    ...(resource ? { resource: { equals: resource, mode: "insensitive" } } : {}),
    ...(startDate || endDate
      ? {
          createdAt: {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(`${endDate}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
  };

  const [items, total, resources] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.auditLog.count({ where }),
    // Powers the admin UI's "Resource" filter dropdown with only values that
    // actually occur, instead of a hardcoded list that drifts from whatever
    // resources are really being logged.
    prisma.auditLog.findMany({ distinct: ["resource"], select: { resource: true }, orderBy: { resource: "asc" } }),
  ]);

  res.json({ items, total, page, limit, resources: resources.map((r) => r.resource) });
});
