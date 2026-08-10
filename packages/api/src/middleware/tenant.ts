import type { NextFunction, Response } from "express";
import { prisma } from "@marwa/db";
import type { AuthedRequest } from "../lib/auth";

export interface TenantRequest extends AuthedRequest {
  organizationId?: string;
}

// Resolves the active workspace from the `x-organization-id` header the
// admin client sends on every request once a workspace is selected (see
// apps/admin's lib/api.ts request()). No header = the default/unassigned
// workspace every pre-existing row already belongs to (organizationId
// null) — every install keeps working exactly as before with zero
// Organizations ever created. When the header IS present, membership is
// verified here so one staff account can't read/write another agency's
// workspace just by sending a guessed/forged header.
export async function resolveOrganization(req: TenantRequest, res: Response, next: NextFunction) {
  const headerValue = req.headers["x-organization-id"];
  const organizationId = typeof headerValue === "string" && headerValue.trim() ? headerValue.trim() : undefined;
  if (!organizationId) return next();

  if (!req.user) return res.status(401).json({ error: "Missing bearer token" });

  const membership = await prisma.orgMembership.findUnique({
    where: { organizationId_userId: { organizationId, userId: req.user.id } },
  });
  if (!membership) return res.status(403).json({ error: "You do not have access to this workspace" });

  req.organizationId = organizationId;
  next();
}
