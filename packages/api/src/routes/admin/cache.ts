import { Router } from "express";

export const adminCacheRouter = Router();

const WEB_URL = process.env.WEB_URL ?? "http://localhost:3000";
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET ?? "dev-secret-change-me";

/**
 * "Clear Cache" in the admin top bar. Forwards to apps/web's own
 * POST /api/revalidate (see that route for what it actually purges) rather
 * than duplicating Next.js cache internals here — this API has no
 * server-rendering of its own to invalidate.
 */
adminCacheRouter.post("/clear", async (_req, res) => {
  try {
    const response = await fetch(`${WEB_URL}/api/revalidate`, {
      method: "POST",
      headers: { "x-revalidate-secret": REVALIDATE_SECRET },
    });
    if (!response.ok) {
      return res.status(502).json({ error: `Web app returned ${response.status}` });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Failed to reach the web app" });
  }
});
