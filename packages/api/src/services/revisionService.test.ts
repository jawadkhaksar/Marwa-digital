import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@marwa/db";
import { snapshotRevision, listRevisions, restoreRevision } from "./revisionService";

// Integration tests against the real @marwa/db Prisma client — self-cleaning
// (create-in-beforeAll, delete-in-afterAll) so they're safe to run against a
// shared dev database locally, and are exactly what CI's Postgres service
// container is for.
let pageId: string;
let userId: string;

beforeAll(async () => {
  const page = await prisma.page.create({
    data: { slug: `vitest-revision-${Date.now()}`, title: "Original Title", content: "<p>Original</p>", published: false },
  });
  pageId = page.id;

  const user = await prisma.user.create({
    data: { email: `vitest-revision-${Date.now()}@example.test`, passwordHash: "x", name: "Vitest Author" },
  });
  userId = user.id;
});

afterAll(async () => {
  await prisma.contentRevision.deleteMany({ where: { entityId: pageId } });
  await prisma.page.delete({ where: { id: pageId } }).catch(() => {});
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
});

describe("snapshotRevision + listRevisions", () => {
  it("records a snapshot and lists newest-first with the author populated", async () => {
    await snapshotRevision({ entityType: "PAGE", entityId: pageId, title: "Original Title", content: "<p>Original</p>", authorId: userId });
    await new Promise((r) => setTimeout(r, 5));
    await snapshotRevision({ entityType: "PAGE", entityId: pageId, title: "Updated Title", content: "<p>Updated</p>", authorId: userId });

    const revisions = await listRevisions("PAGE", pageId);
    expect(revisions).toHaveLength(2);
    expect(revisions[0].title).toBe("Updated Title");
    expect(revisions[1].title).toBe("Original Title");
    expect(revisions[0].author?.id).toBe(userId);
  });

  it("only returns revisions for the requested entity", async () => {
    const otherPage = await prisma.page.create({ data: { slug: `vitest-revision-other-${Date.now()}`, title: "Other", published: false } });
    await snapshotRevision({ entityType: "PAGE", entityId: otherPage.id, title: "Other", authorId: userId });

    const revisions = await listRevisions("PAGE", pageId);
    expect(revisions.every((r) => r.entityId === pageId)).toBe(true);

    await prisma.contentRevision.deleteMany({ where: { entityId: otherPage.id } });
    await prisma.page.delete({ where: { id: otherPage.id } });
  });
});

describe("restoreRevision", () => {
  it("reverts the Page to the selected snapshot and records a new revision for the restore itself", async () => {
    const revisionsBefore = await listRevisions("PAGE", pageId);
    const originalRevision = revisionsBefore[revisionsBefore.length - 1]; // oldest = "Original Title"
    expect(originalRevision.title).toBe("Original Title");

    const result = await restoreRevision(originalRevision.id, userId);
    expect(result).not.toBeNull();
    expect(result?.entityType).toBe("PAGE");
    expect(result?.entity.title).toBe("Original Title");

    const page = await prisma.page.findUnique({ where: { id: pageId } });
    expect(page?.title).toBe("Original Title");
    expect(page?.content).toBe("<p>Original</p>");

    const revisionsAfter = await listRevisions("PAGE", pageId);
    expect(revisionsAfter.length).toBe(revisionsBefore.length + 1);
    expect(revisionsAfter[0].title).toBe("Original Title");
  });

  it("returns null for a revision id that doesn't exist", async () => {
    const result = await restoreRevision("00000000-0000-0000-0000-000000000000", userId);
    expect(result).toBeNull();
  });
});
