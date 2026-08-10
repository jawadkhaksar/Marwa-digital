import type { NextFunction, Request, Response } from "express";
import { prisma, Prisma } from "@marwa/db";
import { extractIp } from "./analyticsUtils";
import type { AuthedRequest } from "./auth";

export interface LogAuditActionParams {
  req: Request;
  action: string;
  resource: string;
  resourceId?: string | null;
  details?: unknown;
  // Overrides — needed by routes that write an audit entry before/without
  // requireAdmin ever populating req.user (login, forgot/reset-password).
  userId?: string | null;
  userEmail?: string | null;
}

const SENSITIVE_KEY = /password|token|secret|hash|backupcode/i;

/**
 * Strips anything credential-shaped out of a request-body snapshot before
 * it's persisted — an audit trail is a liability, not a defense, if it
 * becomes a second place secrets end up sitting in plaintext.
 */
function sanitizeDetails(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeDetails);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, v]) => [key, SENSITIVE_KEY.test(key) ? "[redacted]" : sanitizeDetails(v)])
    );
  }
  return value;
}

/**
 * Centralized audit-trail writer — used both directly (login, password
 * reset, 2FA, revision restore — actions whose meaning the generic
 * `auditLog` middleware below can't infer well) and indirectly through it
 * for routine admin CRUD. Never throws: a failed audit write must not break
 * the real request it's describing.
 */
export async function logAuditAction(params: LogAuditActionParams): Promise<void> {
  const { req, action, resource, resourceId, details } = params;
  const authedReq = req as AuthedRequest;
  const userId = params.userId !== undefined ? params.userId : (authedReq.user?.id ?? null);
  const userAgent = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined;

  let userEmail = params.userEmail ?? null;
  if (userEmail === null && userId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } }).catch(() => null);
    userEmail = user?.email ?? null;
  }

  try {
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail,
        action,
        resource,
        resourceId: resourceId ?? null,
        details: details !== undefined ? (sanitizeDetails(details) as Prisma.InputJsonValue) : undefined,
        ipAddress: extractIp(req),
        userAgent,
      },
    });
  } catch (err) {
    console.error("[audit] Failed to write audit log:", err);
  }
}

const METHOD_VERB: Record<string, string> = { POST: "CREATE", PATCH: "UPDATE", PUT: "UPDATE", DELETE: "DELETE" };

/**
 * Mounted per-router, right after requireAdmin (see server.ts) — writes one
 * AuditLog row for every successful (2xx) state-changing request that
 * router handles, named "{RESOURCE}_{CREATE|UPDATE|DELETE}" (e.g.
 * "PAGE_UPDATE", "USER_DELETE"). GET requests are read-only and skipped.
 * Runs after the real handler via `res.on("finish")`, so it sees the actual
 * status code and — for a 201 Created — the new row's id straight off the
 * response body, without every route needing to call logAuditAction itself.
 */
export function auditLog(resource: string) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const verb = METHOD_VERB[req.method];
    if (!verb) return next();

    let responseBody: unknown;
    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      responseBody = body;
      return originalJson(body);
    }) as typeof res.json;

    res.on("finish", () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      const bodyId = responseBody && typeof responseBody === "object" && "id" in responseBody ? String((responseBody as { id: unknown }).id) : undefined;
      const resourceId = req.params.id ?? bodyId ?? null;
      logAuditAction({ req, action: `${resource.toUpperCase()}_${verb}`, resource, resourceId, details: req.body }).catch(() => {});
    });

    next();
  };
}
