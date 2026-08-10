import { describe, it, expect } from "vitest";
import { generate as totpGenerate } from "otplib";
import { createTotpSecret, totpQrCodeDataUrl, verifyTotpCode, verifyTotpOrBackupCode, generateBackupCodes } from "./twoFactor";

describe("createTotpSecret", () => {
  it("returns a non-empty base32 secret, different each call", () => {
    const a = createTotpSecret();
    const b = createTotpSecret();
    expect(a).toMatch(/^[A-Z2-7]+$/);
    expect(a.length).toBeGreaterThan(10);
    expect(a).not.toBe(b);
  });
});

describe("totpQrCodeDataUrl", () => {
  it("renders a PNG data URL", async () => {
    const secret = createTotpSecret();
    const url = await totpQrCodeDataUrl("admin@example.com", secret);
    expect(url).toMatch(/^data:image\/png;base64,/);
  });
});

describe("verifyTotpCode", () => {
  it("accepts the current code for the secret", async () => {
    const secret = createTotpSecret();
    const code = await totpGenerate({ secret });
    await expect(verifyTotpCode(secret, code)).resolves.toBe(true);
  });

  it("rejects an incorrect code", async () => {
    const secret = createTotpSecret();
    await expect(verifyTotpCode(secret, "000000")).resolves.toBe(false);
  });

  it("rejects malformed input (not 6 digits)", async () => {
    const secret = createTotpSecret();
    await expect(verifyTotpCode(secret, "abc")).resolves.toBe(false);
    await expect(verifyTotpCode(secret, "12345")).resolves.toBe(false);
  });
});

describe("generateBackupCodes", () => {
  it("returns 8 unique plaintext codes and matching bcrypt hashes", async () => {
    const { plain, hashed } = await generateBackupCodes();
    expect(plain).toHaveLength(8);
    expect(hashed).toHaveLength(8);
    expect(new Set(plain).size).toBe(8);
    // bcrypt hashes never equal their plaintext input.
    for (let i = 0; i < plain.length; i++) expect(hashed[i]).not.toBe(plain[i]);
  });
});

describe("verifyTotpOrBackupCode", () => {
  it("accepts a valid live TOTP code", async () => {
    const secret = createTotpSecret();
    const code = await totpGenerate({ secret });
    const result = await verifyTotpOrBackupCode({ twoFactorSecret: secret, twoFactorBackupCodes: [] }, code);
    expect(result.ok).toBe(true);
    expect(result.remainingBackupCodes).toBeUndefined();
  });

  it("accepts a valid backup code and reports it consumed (removed from the remaining list)", async () => {
    const { plain, hashed } = await generateBackupCodes();
    const result = await verifyTotpOrBackupCode({ twoFactorSecret: null, twoFactorBackupCodes: hashed }, plain[3]);
    expect(result.ok).toBe(true);
    expect(result.remainingBackupCodes).toHaveLength(7);
    expect(result.remainingBackupCodes).not.toContain(hashed[3]);
  });

  it("rejects a code that matches neither the TOTP secret nor any backup code", async () => {
    const secret = createTotpSecret();
    const { hashed } = await generateBackupCodes();
    const result = await verifyTotpOrBackupCode({ twoFactorSecret: secret, twoFactorBackupCodes: hashed }, "000000");
    expect(result.ok).toBe(false);
  });

  it("rejects a backup code reused after being consumed once (single-use)", async () => {
    const { plain, hashed } = await generateBackupCodes();
    const first = await verifyTotpOrBackupCode({ twoFactorSecret: null, twoFactorBackupCodes: hashed }, plain[0]);
    expect(first.ok).toBe(true);
    // The caller is responsible for persisting `remainingBackupCodes` — simulate that here.
    const second = await verifyTotpOrBackupCode({ twoFactorSecret: null, twoFactorBackupCodes: first.remainingBackupCodes }, plain[0]);
    expect(second.ok).toBe(false);
  });
});
