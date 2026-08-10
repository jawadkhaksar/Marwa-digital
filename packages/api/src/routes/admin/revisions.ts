import { Router } from "express";
import type { AuthedRequest } from "../../lib/auth";
import { listRevisions, restoreRevision } from "../../services/revisionService";
import { logAuditAction } from "../../lib/auditLogger";

export const adminRevisionsRouter = Router();

const ENTITY_TYPES = new Set(["PAGE", "POST"]);

adminRevisionsRouter.get("/:entityType/:entityId", async (req, res) => {
  const entityType = req.params.entityType.toUpperCase();
  if (!ENTITY_TYPES.has(entityType)) return res.status(400).json({ error: "entityType must be PAGE or POST" });
  const revisions = await listRevisions(entityType as "PAGE" | "POST", req.params.entityId);
  res.json(revisions);
});

// Not covered by the generic auditLog middleware (mounted per-resource in
// server.ts) since this router's own resource — a revision snapshot — isn't
// the thing that actually changed; the Page/Post it belongs to is. Logged
// directly here instead, against the real resource, so the audit trail reads
// "Page updated" rather than a meaningless "ContentRevision restored".
adminRevisionsRouter.post("/:id/restore", async (req: AuthedRequest, res) => {
  const result = await restoreRevision(req.params.id, req.user?.id ?? null);
  if (!result) return res.status(404).json({ error: "Revision not found" });

  await logAuditAction({
    req,
    action: `${result.entityType}_RESTORE`,
    resource: result.entityType === "PAGE" ? "Page" : "Post",
    resourceId: result.entity.id,
    details: { restoredFromRevisionId: req.params.id },
  });

  res.json(result.entity);
});
