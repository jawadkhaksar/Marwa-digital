import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@marwa/db";
import { createPasswordResetToken, consumePasswordResetToken, hashResetToken } from "./passwordResetTokens";

let userId: string;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { email: `vitest-reset-${Date.now()}@example.test`, passwordHash: "x", name: "Vitest Reset User" },
  });
  userId = user.id;
});

afterAll(async () => {
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
});

describe("createPasswordResetToken", () => {
  it("persists only the token's hash, never the raw value", async () => {
    const rawToken = await createPasswordResetToken(userId);
    const stored = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashResetToken(rawToken) } });
    expect(stored).not.toBeNull();
    expect(stored?.userId).toBe(userId);
    expect(stored?.tokenHash).not.toBe(rawToken);
    expect(stored?.usedAt).toBeNull();
  });

  it("sets an expiration roughly 1 hour out", async () => {
    const before = Date.now();
    const rawToken = await createPasswordResetToken(userId);
    const stored = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashResetToken(rawToken) } });
    const deltaMs = stored!.expiresAt.getTime() - before;
    expect(deltaMs).toBeGreaterThan(59 * 60 * 1000);
    expect(deltaMs).toBeLessThan(61 * 60 * 1000);
  });

  it("invalidates any earlier unused token for the same user", async () => {
    const first = await createPasswordResetToken(userId);
    const second = await createPasswordResetToken(userId);

    const firstResult = await consumePasswordResetToken(first);
    expect(firstResult.ok).toBe(false);
    if (!firstResult.ok) expect(firstResult.reason).toBe("used");

    const secondResult = await consumePasswordResetToken(second);
    expect(secondResult.ok).toBe(true);
  });
});

describe("consumePasswordResetToken", () => {
  it("succeeds exactly once for a freshly-issued token, then reports it used", async () => {
    const rawToken = await createPasswordResetToken(userId);

    const first = await consumePasswordResetToken(rawToken);
    expect(first).toEqual({ ok: true, userId });

    const second = await consumePasswordResetToken(rawToken);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe("used");
  });

  it("rejects a token that was never issued", async () => {
    const result = await consumePasswordResetToken("this-token-was-never-issued");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not_found");
  });

  it("rejects an expired token", async () => {
    const rawToken = await createPasswordResetToken(userId);
    await prisma.passwordResetToken.update({
      where: { tokenHash: hashResetToken(rawToken) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const result = await consumePasswordResetToken(rawToken);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("expired");
  });
});
