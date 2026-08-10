import { prisma, Prisma } from "@marwa/db";
import type { LayoutDocument } from "@marwa/builder";

export type RevisionEntityType = "PAGE" | "POST";

interface SnapshotInput {
  entityType: RevisionEntityType;
  entityId: string;
  title: string;
  content?: string | null;
  layout?: LayoutDocument | null;
  seoTitle?: string | null;
  seoDesc?: string | null;
  authorId?: string | null;
}

/**
 * Snapshots the given Page/Post state into ContentRevision — called AFTER a
 * successful create/update in admin/pages.ts and admin/posts.ts, from the
 * row Prisma just returned (never the raw request body), so a revision
 * always reflects what's actually stored, not what was merely requested.
 * Never throws: a failed history write must not fail the save it's
 * recording.
 */
export async function snapshotRevision(input: SnapshotInput): Promise<void> {
  try {
    await prisma.contentRevision.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        title: input.title,
        content: input.content ?? null,
        layout: input.layout ? (input.layout as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        seoTitle: input.seoTitle ?? null,
        seoDesc: input.seoDesc ?? null,
        authorId: input.authorId ?? null,
      },
    });
  } catch (err) {
    console.error("[revisions] Failed to snapshot revision:", err);
  }
}

export function listRevisions(entityType: RevisionEntityType, entityId: string) {
  return prisma.contentRevision.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });
}

/**
 * Reverts the revision's owning Page or Post back to this snapshot's
 * title/content/layout/SEO fields, then immediately snapshots the
 * now-current (just-restored) state as a brand-new revision — the same
 * "restoring creates a new history entry" behavior most CMSes use, so a
 * restore is itself always undoable by picking an even older version.
 */
export async function restoreRevision(revisionId: string, restoredByUserId: string | null) {
  const revision = await prisma.contentRevision.findUnique({ where: { id: revisionId } });
  if (!revision) return null;

  if (revision.entityType === "PAGE") {
    const page = await prisma.page.update({
      where: { id: revision.entityId },
      data: {
        title: revision.title,
        content: revision.content,
        layout: revision.layout === null ? Prisma.JsonNull : (revision.layout as Prisma.InputJsonValue),
        metaTitle: revision.seoTitle,
        metaDescription: revision.seoDesc,
      },
    });
    await snapshotRevision({
      entityType: "PAGE",
      entityId: page.id,
      title: page.title,
      content: page.content,
      layout: page.layout as LayoutDocument | null,
      seoTitle: page.metaTitle,
      seoDesc: page.metaDescription,
      authorId: restoredByUserId,
    });
    return { entityType: "PAGE" as const, entity: page };
  }

  const post = await prisma.post.update({
    where: { id: revision.entityId },
    data: {
      title: revision.title,
      content: revision.content,
      layout: revision.layout === null ? Prisma.JsonNull : (revision.layout as Prisma.InputJsonValue),
      metaTitle: revision.seoTitle,
      metaDescription: revision.seoDesc,
    },
  });
  await snapshotRevision({
    entityType: "POST",
    entityId: post.id,
    title: post.title,
    content: post.content,
    layout: post.layout as LayoutDocument | null,
    seoTitle: post.metaTitle,
    seoDesc: post.metaDescription,
    authorId: restoredByUserId,
  });
  return { entityType: "POST" as const, entity: post };
}
