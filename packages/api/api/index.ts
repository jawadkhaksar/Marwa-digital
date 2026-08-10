// Vercel serverless entrypoint — every request (see vercel.json's rewrite
// rule sending all paths here) is handed to the same Express `app` this
// package already runs locally/on Railway/on a VPS via src/server.ts's own
// app.listen(). Vercel's Node.js runtime invokes an Express app directly as
// a request handler, so re-exporting it is all that's needed here; the
// listen()/setInterval-scheduler bootstrap in server.ts is itself guarded
// off when process.env.VERCEL is set, so importing it has no side effects
// beyond building the app.
import app from "../src/server";

export default app;
