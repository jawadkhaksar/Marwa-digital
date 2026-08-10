import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

/**
 * Purges Next.js's Full Route Cache + Data Cache for the entire site —
 * revalidating the root layout cascades to every route nested under it.
 * Every content route here already sets `dynamic = "force-dynamic"`, which
 * means there's nothing to purge *today*, but this is the actual, only real
 * cache Next.js has, so it's the correct thing for the admin's "Clear Cache"
 * button to hit — and it keeps working with no further wiring if a route
 * ever switches away from force-dynamic (e.g. for ISR) later.
 *
 * Server-to-server only: called by packages/api's POST /api/admin/cache/clear
 * (itself behind requireAdmin), authenticated here with a shared secret so
 * this route can't be used to force-purge the cache from the public internet.
 */
export async function POST(req: Request) {
  const secret = req.headers.get("x-revalidate-secret");
  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidatePath("/", "layout");
  return NextResponse.json({ revalidated: true });
}
