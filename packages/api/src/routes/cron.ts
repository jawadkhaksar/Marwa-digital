import { Router } from "express";
import type { Request } from "express";
import { resumeDueDelays } from "../services/workflowEngine";
import { runDueChecks as runDuePublishChecks } from "../services/publishWorker";

// ── Scheduled Tasks (serverless-friendly path) ──────────────────────────
// On an always-on host (local dev, Railway, a VPS), server.ts's own
// setInterval pollers (startWorkflowScheduler/startPublishScheduler) handle
// this by just staying alive. On Vercel, a serverless function instance
// doesn't stay alive between requests — a setInterval there would just be
// discarded, so due workflow delays and scheduled publishes instead need
// something external pinging this endpoint on a timer. Vercel Cron Jobs
// (see vercel.json) covers that on Vercel itself; on the free Hobby plan
// Vercel Cron is capped at once/day, so for finer-grained scheduling a free
// external pinger (cron-job.org, a GitHub Actions scheduled workflow, etc.)
// hitting this same URL every few minutes works just as well — the two
// mechanisms are interchangeable from this endpoint's point of view.
//
// Not mounted behind requireAdmin: a cron pinger has no staff login, so
// authorization is instead a shared secret. This endpoint refuses to run at
// all (503) unless CRON_SECRET is actually configured, rather than silently
// allowing unauthenticated triggers of "send workflow emails"/"publish
// content" by default.

export const cronRouter = Router();

function isAuthorized(req: Request, secret: string): boolean {
  const authHeader = req.headers.authorization;
  if (authHeader === `Bearer ${secret}`) return true; // set automatically by Vercel's own Cron Jobs when CRON_SECRET is configured
  if (req.headers["x-cron-secret"] === secret) return true; // for external pingers that support custom headers
  if (req.query.secret === secret) return true; // for pingers that only support a plain URL
  return false;
}

cronRouter.get("/run-scheduled-tasks", async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ error: "CRON_SECRET is not configured" });
  if (!isAuthorized(req, secret)) return res.status(401).json({ error: "Unauthorized" });

  const [workflowResult, publishResult] = await Promise.allSettled([resumeDueDelays(), runDuePublishChecks()]);
  res.json({
    ok: workflowResult.status === "fulfilled" && publishResult.status === "fulfilled",
    workflow: workflowResult.status === "fulfilled" ? "ok" : String(workflowResult.reason),
    publish: publishResult.status === "fulfilled" ? "ok" : String(publishResult.reason),
  });
});
