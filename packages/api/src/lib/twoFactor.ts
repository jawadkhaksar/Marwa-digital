import { generateSecret, generateURI, verify as totpVerify } from "otplib";
import QRCode from "qrcode";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const ISSUER = "Marwa Digital Admin";

/** A fresh base32 TOTP secret — stored on User.twoFactorSecret from setup onward, live from the moment of setup but not "active" (twoFactorEnabled) until a matching code is confirmed via POST /2fa/verify. */
export function createTotpSecret(): string {
  return generateSecret();
}

/** otpauth:// URI rendered as a scannable QR code data URL — what standard authenticator apps (Google Authenticator, 1Password, Authy) actually read to enroll the account. */
export async function totpQrCodeDataUrl(accountLabel: string, secret: string): Promise<string> {
  const uri = generateURI({ issuer: ISSUER, label: accountLabel, secret });
  return QRCode.toDataURL(uri);
}

/** A bare 6-digit TOTP check — used only during setup, where there are no backup codes to fall back to yet. */
export async function verifyTotpCode(secret: string, code: string): Promise<boolean> {
  const trimmed = code.trim();
  if (!/^\d{6}$/.test(trimmed)) return false;
  const result = await totpVerify({ secret, token: trimmed });
  return result.valid;
}

function randomBackupCode(): string {
  // 8 uppercase hex chars — easy to read/type back in, printed once at
  // enrollment time for the user to store somewhere safe.
  return crypto.randomBytes(5).toString("hex").slice(0, 8).toUpperCase();
}

/** 8 single-use recovery codes — returned in `plain` exactly once (at enrollment) for the user to save; only the bcrypt `hashed` forms are ever persisted. */
export async function generateBackupCodes(count = 8): Promise<{ plain: string[]; hashed: string[] }> {
  const plain = Array.from({ length: count }, randomBackupCode);
  const hashed = await Promise.all(plain.map((code) => bcrypt.hash(code, 10)));
  return { plain, hashed };
}

/**
 * Accepts either a live 6-digit TOTP code or one of the stored backup codes
 * — used everywhere a 2FA-enabled account needs to prove possession (login
 * step 2, disabling 2FA). A matched backup code is reported back via
 * `remainingBackupCodes` for the caller to persist, so it can never be
 * redeemed a second time.
 */
export async function verifyTotpOrBackupCode(
  user: { twoFactorSecret: string | null; twoFactorBackupCodes: unknown },
  code: string
): Promise<{ ok: boolean; remainingBackupCodes?: string[] }> {
  const trimmed = code.trim();

  if (user.twoFactorSecret && /^\d{6}$/.test(trimmed)) {
    const result = await totpVerify({ secret: user.twoFactorSecret, token: trimmed });
    if (result.valid) return { ok: true };
  }

  const backupCodes = Array.isArray(user.twoFactorBackupCodes) ? (user.twoFactorBackupCodes as string[]) : [];
  for (let i = 0; i < backupCodes.length; i++) {
    if (await bcrypt.compare(trimmed, backupCodes[i])) {
      const remaining = [...backupCodes];
      remaining.splice(i, 1);
      return { ok: true, remainingBackupCodes: remaining };
    }
  }
  return { ok: false };
}
