import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@marwa/db";

export interface AuthedRequest extends Request {
  user?: { id: string; role: string };
}

// A valid signature isn't proof of staff access, only proof of *a* token
// signed with this secret — the role has to be checked explicitly, so any
// future non-staff token type signed with the same JWT_SECRET can't reach
// the admin API just by verifying.
const STAFF_ROLES = new Set(["ADMIN", "EDITOR"]);

export interface StaffTokenPayload {
  id: string;
  role: string;
  sv: number; // the user's User.sessionVersion at the moment this token was issued
}

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";

/** Issues a real 12h session token — used by both direct login and the completed 2FA challenge in routes/auth.ts. */
export function issueSessionToken(user: { id: string; role: string; sessionVersion: number }): string {
  const payload: StaffTokenPayload = { id: user.id, role: user.role, sv: user.sessionVersion };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
}

export async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  let payload: { id?: string; role?: string; sv?: number };
  try {
    const token = header.slice("Bearer ".length);
    payload = jwt.verify(token, JWT_SECRET) as typeof payload;
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  if (!payload.id || !payload.role || !STAFF_ROLES.has(payload.role)) {
    return res.status(403).json({ error: "This token does not grant staff access" });
  }

  // A token stays cryptographically valid until its 12h expiry regardless of
  // what happens to the account in the meantime — this DB check is what
  // actually enforces "log out everywhere" on password reset (User.sessionVersion),
  // and as a side effect also catches a deactivated account or a role
  // downgrade immediately rather than waiting out the token's natural expiry.
  const user = await prisma.user.findUnique({ where: { id: payload.id }, select: { role: true, active: true, sessionVersion: true } });
  if (!user || !user.active || user.role !== payload.role || user.sessionVersion !== (payload.sv ?? 0)) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.user = { id: payload.id, role: payload.role };
  next();
}

// Staging preview links (Admin → Builder → "Staging Preview Link") — a
// short-lived, single-purpose token scoped to exactly one page/post id, NOT
// a staff session token, so it's safe to put in a URL and hand to a client
// for review without granting them any admin access.
export function signPreviewToken(entityType: "page" | "post", entityId: string): string {
  return jwt.sign({ entityType, entityId, purpose: "content-preview" }, JWT_SECRET, { expiresIn: "1h" });
}

export function verifyPreviewToken(token: string | undefined, entityType: "page" | "post", entityId: string): boolean {
  if (!token) return false;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { entityType?: string; entityId?: string; purpose?: string };
    return payload.purpose === "content-preview" && payload.entityType === entityType && payload.entityId === entityId;
  } catch {
    return false;
  }
}

// Mount AFTER requireAdmin on routers that must stay ADMIN-only even though
// requireAdmin itself (despite the name) lets both ADMIN and EDITOR through
// — user management and site-wide settings (SMTP credentials, reCAPTCHA
// secret keys) are the two places an EDITOR account having the same access
// as ADMIN would actually matter: an EDITOR could otherwise promote their
// own account to ADMIN via PATCH /api/admin/users/:id, or read/change
// server secrets via Settings.
export function requireRole(role: "ADMIN") {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: `This action requires the ${role} role` });
    }
    next();
  };
}
