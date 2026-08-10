import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@marwa/db";
import { formatZodError } from "../lib/zodError";
import { authLimiter } from "../lib/security";
import { logAuditAction } from "../lib/auditLogger";
import { verifyTotpOrBackupCode } from "../lib/twoFactor";
import { sendPasswordResetEmail } from "../lib/authNotifications";
import { createPasswordResetToken, consumePasswordResetToken } from "../lib/passwordResetTokens";
import { issueSessionToken, type StaffTokenPayload } from "../lib/auth";

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";

function publicUser(user: { id: string; email: string; name: string; role: string; twoFactorEnabled: boolean }) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, twoFactorEnabled: user.twoFactorEnabled };
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid email or password" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid email or password" });

  if (!user.active) return res.status(403).json({ error: "This account has been deactivated" });

  // Password verified, but the sign-in isn't complete yet — a second
  // request to /login/2fa with a valid TOTP/backup code is required before a
  // real session token is issued. The challenge token deliberately carries
  // no `role` claim, so it can never be mistaken for staff access even if it
  // leaked straight into requireAdmin.
  if (user.twoFactorEnabled) {
    const challengeToken = jwt.sign({ id: user.id, type: "2fa_challenge" }, JWT_SECRET, { expiresIn: "5m" });
    return res.json({ twoFactorRequired: true, challengeToken });
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const token = issueSessionToken(user);
  await logAuditAction({ req, action: "USER_LOGIN", resource: "User", resourceId: user.id, userId: user.id, userEmail: user.email });
  res.json({ token, user: publicUser(user) });
});

const twoFaLoginSchema = z.object({
  challengeToken: z.string().min(1),
  code: z.string().min(6),
});

authRouter.post("/login/2fa", authLimiter, async (req, res) => {
  const parsed = twoFaLoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const { challengeToken, code } = parsed.data;

  let payload: { id?: string; type?: string };
  try {
    payload = jwt.verify(challengeToken, JWT_SECRET) as typeof payload;
  } catch {
    return res.status(401).json({ error: "This login attempt has expired. Please sign in again." });
  }
  if (payload.type !== "2fa_challenge" || !payload.id) {
    return res.status(401).json({ error: "Invalid login challenge." });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user || !user.active || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return res.status(401).json({ error: "Invalid login challenge." });
  }

  const result = await verifyTotpOrBackupCode(user, code);
  if (!result.ok) return res.status(401).json({ error: "Incorrect authentication code." });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      ...(result.remainingBackupCodes ? { twoFactorBackupCodes: result.remainingBackupCodes } : {}),
    },
  });

  const token = issueSessionToken(user);
  await logAuditAction({
    req,
    action: "USER_LOGIN",
    resource: "User",
    resourceId: user.id,
    userId: user.id,
    userEmail: user.email,
    details: { via: "2fa" },
  });
  res.json({ token, user: publicUser(user) });
});

authRouter.get("/me", async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing bearer token" });

  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as Partial<StaffTokenPayload>;
    if (!payload.id) return res.status(401).json({ error: "Invalid or expired token" });
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || !user.active || user.sessionVersion !== (payload.sv ?? 0)) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    res.json(publicUser(user));
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

// ── Password reset ─────────────────────────────────────────────────────

const forgotPasswordSchema = z.object({ email: z.string().email() });

authRouter.post("/forgot-password", authLimiter, async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  // Always the same response whether or not the account exists — an
  // account-existence oracle here would let anyone enumerate staff emails.
  if (user && user.active) {
    const rawToken = await createPasswordResetToken(user.id);
    await sendPasswordResetEmail(user, rawToken);
    await logAuditAction({
      req,
      action: "USER_PASSWORD_RESET_REQUESTED",
      resource: "User",
      resourceId: user.id,
      userId: user.id,
      userEmail: user.email,
    });
  }

  res.json({ ok: true, message: "If that email has an account, a password reset link has been sent." });
});

const resetPasswordSchema = z.object({ token: z.string().min(1), password: z.string().min(8) });

authRouter.post("/reset-password", authLimiter, async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const { token, password } = parsed.data;

  const consumed = await consumePasswordResetToken(token);
  if (!consumed.ok) {
    return res.status(400).json({ error: "This reset link is invalid or has expired." });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  // sessionVersion++ invalidates every JWT issued before this moment —
  // exactly the "invalidate all active sessions" requirement — see
  // requireAdmin in lib/auth.ts.
  const user = await prisma.user.update({
    where: { id: consumed.userId },
    data: { passwordHash, sessionVersion: { increment: 1 } },
  });

  await logAuditAction({ req, action: "USER_PASSWORD_RESET", resource: "User", resourceId: user.id, userId: user.id, userEmail: user.email });
  res.json({ ok: true });
});
