import crypto from "crypto";
import { prisma } from "@marwa/db";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Only the hash is ever persisted — see PasswordResetToken.tokenHash in schema.prisma for why. */
export function hashResetToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Issues a fresh reset token for `userId`, first invalidating any earlier
 * unused ones — a still-unexpired link from a previous request shouldn't
 * remain valid once a newer one has been issued. Returns the RAW token,
 * available only here at issuance time (the caller is responsible for
 * emailing it); only its SHA-256 hash is ever written to the database.
 */
export async function createPasswordResetToken(userId: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(rawToken);

  await prisma.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
  });

  return rawToken;
}

export type ConsumeResetTokenResult = { ok: true; userId: string } | { ok: false; reason: "not_found" | "used" | "expired" };

/**
 * Validates a raw reset token and marks it used in the same step, so a
 * token can never be redeemed twice even under concurrent requests racing
 * on the same link. Returns the associated userId on success.
 */
export async function consumePasswordResetToken(rawToken: string): Promise<ConsumeResetTokenResult> {
  const tokenHash = hashResetToken(rawToken);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record) return { ok: false, reason: "not_found" };
  if (record.usedAt) return { ok: false, reason: "used" };
  if (record.expiresAt < new Date()) return { ok: false, reason: "expired" };

  await prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  return { ok: true, userId: record.userId };
}
