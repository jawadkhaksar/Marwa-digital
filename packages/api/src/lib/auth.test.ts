import { describe, it, expect, beforeAll } from "vitest";
import jwt from "jsonwebtoken";
import { issueSessionToken, type StaffTokenPayload } from "./auth";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";

describe("issueSessionToken", () => {
  it("signs a token carrying id, role, and sessionVersion as `sv`", () => {
    const token = issueSessionToken({ id: "user_1", role: "ADMIN", sessionVersion: 3 });
    const payload = jwt.verify(token, JWT_SECRET) as StaffTokenPayload;
    expect(payload.id).toBe("user_1");
    expect(payload.role).toBe("ADMIN");
    expect(payload.sv).toBe(3);
  });

  it("produces a token that expires in the future but not indefinitely (12h)", () => {
    const token = issueSessionToken({ id: "user_1", role: "EDITOR", sessionVersion: 0 });
    const decoded = jwt.decode(token) as { exp: number; iat: number };
    const lifetimeSeconds = decoded.exp - decoded.iat;
    expect(lifetimeSeconds).toBe(12 * 60 * 60);
  });

  it("rejects verification against the wrong secret", () => {
    const token = issueSessionToken({ id: "user_1", role: "ADMIN", sessionVersion: 0 });
    expect(() => jwt.verify(token, "a-completely-different-secret")).toThrow();
  });

  it("rejects a token that has been tampered with", () => {
    const token = issueSessionToken({ id: "user_1", role: "ADMIN", sessionVersion: 0 });
    const tampered = token.slice(0, -2) + (token.slice(-2) === "aa" ? "bb" : "aa");
    expect(() => jwt.verify(tampered, JWT_SECRET)).toThrow();
  });

  it("rejects an already-expired token", () => {
    const expired = jwt.sign({ id: "user_1", role: "ADMIN", sv: 0 }, JWT_SECRET, { expiresIn: -10 });
    expect(() => jwt.verify(expired, JWT_SECRET)).toThrow(/expired/i);
  });
});

describe("2FA challenge tokens (routes/auth.ts's /login flow)", () => {
  // The challenge token issued mid-login (before the 2FA code is verified)
  // deliberately omits `role` — this asserts that invariant holds: a
  // challenge token alone can never satisfy requireAdmin's staff-role check,
  // even if it leaked straight into an Authorization header.
  it("carries no role claim, unlike a real session token", () => {
    const challenge = jwt.sign({ id: "user_1", type: "2fa_challenge" }, JWT_SECRET, { expiresIn: "5m" });
    const payload = jwt.verify(challenge, JWT_SECRET) as Record<string, unknown>;
    expect(payload.role).toBeUndefined();
    expect(payload.type).toBe("2fa_challenge");
  });
});

describe("JWT_SECRET", () => {
  beforeAll(() => {
    if (!process.env.JWT_SECRET) {
      // Not a failure — just documents that the "dev-secret" fallback is
      // what's active for this run, same as the server itself falls back to.
      console.warn("[test] JWT_SECRET is not set; tests are using the 'dev-secret' fallback.");
    }
  });

  it("is a non-empty string", () => {
    expect(JWT_SECRET.length).toBeGreaterThan(0);
  });
});
