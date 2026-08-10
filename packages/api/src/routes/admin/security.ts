import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma, Prisma } from "@marwa/db";
import type { AuthedRequest } from "../../lib/auth";
import { formatZodError } from "../../lib/zodError";
import { logAuditAction } from "../../lib/auditLogger";
import { createTotpSecret, totpQrCodeDataUrl, verifyTotpCode, verifyTotpOrBackupCode, generateBackupCodes } from "../../lib/twoFactor";

// Self-service only — every route here acts on req.user's own account, never
// another user's (managing OTHER users' passwords/2FA stays under
// /api/admin/users, which is already ADMIN-only). Mounted at
// /api/admin/auth in server.ts, behind plain requireAdmin (both ADMIN and
// EDITOR manage their own account security).
export const adminSecurityRouter = Router();

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

adminSecurityRouter.post("/change-password", async (req: AuthedRequest, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: "User not found" });

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Current password is incorrect." });

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  // Bumping sessionVersion here too — a self-service password change is just
  // as sensitive as a reset-link-driven one, and should log out any other
  // signed-in session/device the same way.
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash, sessionVersion: { increment: 1 } } });

  await logAuditAction({ req, action: "USER_PASSWORD_CHANGE", resource: "User", resourceId: user.id });
  res.json({ ok: true });
});

// ── Two-Factor Authentication ───────────────────────────────────────────

adminSecurityRouter.post("/2fa/setup", async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.twoFactorEnabled) {
    return res.status(400).json({ error: "Two-factor authentication is already enabled. Disable it first to set up a new device." });
  }

  const secret = createTotpSecret();
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorSecret: secret } });
  const qrCodeDataUrl = await totpQrCodeDataUrl(user.email, secret);

  res.json({ secret, qrCodeDataUrl });
});

const verifySchema = z.object({ code: z.string().min(6) });

adminSecurityRouter.post("/2fa/verify", async (req: AuthedRequest, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user?.twoFactorSecret) return res.status(400).json({ error: "Start setup first by requesting a QR code." });

  const valid = await verifyTotpCode(user.twoFactorSecret, parsed.data.code);
  if (!valid) return res.status(400).json({ error: "Incorrect code. Please try again." });

  const { plain, hashed } = await generateBackupCodes();
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true, twoFactorBackupCodes: hashed } });

  await logAuditAction({ req, action: "USER_2FA_ENABLED", resource: "User", resourceId: user.id });
  res.json({ ok: true, backupCodes: plain });
});

const disableSchema = z.object({ password: z.string().min(1), code: z.string().min(6) });

adminSecurityRouter.post("/2fa/disable", async (req: AuthedRequest, res) => {
  const parsed = disableSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user || !user.twoFactorEnabled) return res.status(400).json({ error: "Two-factor authentication is not enabled." });

  const passwordOk = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!passwordOk) return res.status(401).json({ error: "Incorrect password." });

  const result = await verifyTotpOrBackupCode(user, parsed.data.code);
  if (!result.ok) return res.status(401).json({ error: "Incorrect authentication code." });

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: Prisma.JsonNull },
  });

  await logAuditAction({ req, action: "USER_2FA_DISABLED", resource: "User", resourceId: user.id });
  res.json({ ok: true });
});
