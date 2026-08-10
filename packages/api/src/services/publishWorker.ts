import { prisma, Prisma } from "@marwa/db";
import type { LayoutDocument } from "@marwa/builder";
import { calculateReadingTime } from "../lib/readingTime";

/**
 * Promotes any Page/Post whose `status` is SCHEDULED and `scheduledAt` has
 * passed — pushes stagedContent/stagedLayout into the live content/layout
 * and flips status to PUBLISHED. A lightweight setInterval poller rather
 * than node-cron or an external job queue, matching this codebase's existing
 * scheduling convention (see workflowEngine.ts's own delay poller).
 */

const POLL_INTERVAL_MS = 60_000;

export function startPublishScheduler(): void {
  setInterval(() => {
    runDueChecks().catch((err) => console.error("[publish-worker] Scheduler tick failed:", err));
  }, POLL_INTERVAL_MS);
}

async function runDueChecks(): Promise<void> {
  await Promise.all([promoteDuePages(), promoteDuePosts()]);
}

async function promoteDuePages(): Promise<void> {
  const due = await prisma.page.findMany({ where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } } });
  for (const page of due) {
    await prisma.page.update({
      where: { id: page.id },
      data: {
        content: page.stagedContent ?? page.content,
        layout: ((page.stagedLayout ?? page.layout) as Prisma.InputJsonValue | null) ?? Prisma.JsonNull,
        published: true,
        status: "PUBLISHED",
        scheduledAt: null,
      },
    });
    console.log(`[publish-worker] Promoted scheduled page "${page.slug}" to live`);
  }
}

async function promoteDuePosts(): Promise<void> {
  const due = await prisma.post.findMany({ where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } } });
  for (const post of due) {
    const content = post.stagedContent ?? post.content;
    const layout = (post.stagedLayout ?? post.layout) as Prisma.InputJsonValue | null;
    const readingTime = calculateReadingTime(content, layout as unknown as LayoutDocument | null);
    await prisma.post.update({
      where: { id: post.id },
      data: {
        content,
        layout: layout ?? Prisma.JsonNull,
        readingTime,
        status: "PUBLISHED",
        publishedAt: post.publishedAt ?? new Date(),
        scheduledAt: null,
      },
    });
    console.log(`[publish-worker] Promoted scheduled post "${post.slug}" to live`);
  }
}
