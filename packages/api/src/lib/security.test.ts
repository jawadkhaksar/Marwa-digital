import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@marwa/db";
import { issueSessionToken, requireAdmin, requireRole, type AuthedRequest } from "./auth";

/** Minimal Express req/res/next stand-ins — requireAdmin/requireRole only ever touch req.headers/req.user and res.status().json(), so a full Express app isn't needed to exercise them. */
function mockReq(headers: Record<string, string> = {}): AuthedRequest {
  return { headers } as AuthedRequest;
}

function mockRes() {
  const res = {
    statusCode: undefined as number | undefined,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: unknown) {
      res.body = body;
      return res;
    },
  };
  return res;
}

describe("Password hashing (bcryptjs, cost factor 12 — see routes/auth.ts and routes/admin/users.ts)", () => {
  it("hashes a password such that the original never appears in the stored value", async () => {
    const hash = await bcrypt.hash("Sup3r-Secret!", 12);
    expect(hash).not.toContain("Sup3r-Secret!");
    expect(hash.startsWith("$2")).toBe(true);
  });

  it("compares correctly: the right password matches, a wrong one doesn't", async () => {
    const hash = await bcrypt.hash("correct-password", 12);
    expect(await bcrypt.compare("correct-password", hash)).toBe(true);
    expect(await bcrypt.compare("wrong-password", hash)).toBe(false);
  });

  it("produces a different hash each time even for the same password (random salt)", async () => {
    const [a, b] = await Promise.all([bcrypt.hash("same-password", 12), bcrypt.hash("same-password", 12)]);
    expect(a).not.toBe(b);
  });
});

describe("requireAdmin / requireRole (JWT auth verification + role checks)", () => {
  let adminUserId: string;
  let editorUserId: string;

  beforeAll(async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const [admin, editor] = await Promise.all([
      prisma.user.create({ data: { email: `vitest-admin-${suffix}@example.test`, passwordHash: "x", name: "Vitest Admin", role: "ADMIN" } }),
      prisma.user.create({ data: { email: `vitest-editor-${suffix}@example.test`, passwordHash: "x", name: "Vitest Editor", role: "EDITOR" } }),
    ]);
    adminUserId = admin.id;
    editorUserId = editor.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [adminUserId, editorUserId] } } });
  });

  it("rejects a request with no Authorization header", async () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();
    await requireAdmin(req, res as never, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a malformed (non-Bearer) Authorization header", async () => {
    const req = mockReq({ authorization: "Token abc123" });
    const res = mockRes();
    const next = vi.fn();
    await requireAdmin(req, res as never, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a token signed with the wrong secret", async () => {
    const jwt = await import("jsonwebtoken");
    const bogus = jwt.default.sign({ id: adminUserId, role: "ADMIN", sv: 0 }, "not-the-real-secret");
    const req = mockReq({ authorization: `Bearer ${bogus}` });
    const res = mockRes();
    const next = vi.fn();
    await requireAdmin(req, res as never, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts a valid token for an active staff user and attaches req.user", async () => {
    const token = issueSessionToken({ id: adminUserId, role: "ADMIN", sessionVersion: 0 });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    const next = vi.fn();
    await requireAdmin(req, res as never, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toEqual({ id: adminUserId, role: "ADMIN" });
  });

  it("rejects a token whose embedded sessionVersion no longer matches the user's current one (log out everywhere)", async () => {
    const token = issueSessionToken({ id: adminUserId, role: "ADMIN", sessionVersion: 999 });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    const next = vi.fn();
    await requireAdmin(req, res as never, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a token for a deactivated account", async () => {
    await prisma.user.update({ where: { id: editorUserId }, data: { active: false } });
    const token = issueSessionToken({ id: editorUserId, role: "EDITOR", sessionVersion: 0 });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    const next = vi.fn();
    await requireAdmin(req, res as never, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
    await prisma.user.update({ where: { id: editorUserId }, data: { active: true } });
  });

  it("requireRole('ADMIN') lets an ADMIN through", () => {
    const req = mockReq();
    req.user = { id: adminUserId, role: "ADMIN" };
    const res = mockRes();
    const next = vi.fn();
    requireRole("ADMIN")(req, res as never, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("requireRole('ADMIN') rejects an EDITOR even though requireAdmin itself lets EDITOR through", () => {
    const req = mockReq();
    req.user = { id: editorUserId, role: "EDITOR" };
    const res = mockRes();
    const next = vi.fn();
    requireRole("ADMIN")(req, res as never, next);
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });
});
