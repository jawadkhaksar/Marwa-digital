// Bundles the whole API into a single CommonJS file that Vercel's zero-config
// `api/` directory serves as one Node.js Function.
//
// Why this exists: @marwa/db and @marwa/builder (this monorepo's shared
// workspace packages) point their package.json "main" straight at raw
// TypeScript source (`src/index.ts` / `index.ts`) — fine for local dev,
// where tsx/Next.js transpile on the fly, but Vercel's Node.js Function
// runtime just does a plain require() on whatever it's given. Left alone,
// deploying src/server.ts as-is fails at runtime with "Cannot find module
// '.../src/index.ts'" the moment a route imports @marwa/db.
//
// esbuild resolves and inlines those two workspace packages' TypeScript
// source directly into one plain JS file (`bundle: true` + they're NOT
// listed in `external` below), while every real npm dependency (Express,
// Prisma's generated client, sharp's native bindings, etc.) stays external
// — required normally at runtime from node_modules, exactly like any other
// ordinary Node deployment, so Vercel's file-tracer can still find and
// include them.
//
// Output goes to dist-vercel/server.js, which the committed api/index.js
// shim re-exports. That indirection matters: Vercel decides which
// Serverless Functions exist by scanning api/ in the *source checkout*,
// before this build script has run — so api/index.js has to be a real
// committed file, not generated output, or no function is created at all
// (every route then falls through to the static public/ placeholder).
import { build } from "esbuild";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

// Bundle EVERYTHING except packages that genuinely can't be inlined —
// Prisma's generated client (it loads a platform-specific native query
// engine binary by path at runtime) and sharp (native bindings). Those two
// stay external and get required normally from node_modules, which
// Vercel's file tracer handles.
//
// Deliberately NOT externalizing ordinary npm dependencies: several of
// them (otplib's @scure/base, @vercel/blob, zod, express-rate-limit,
// libphonenumber-js…) ship as ESM-only, and requiring ESM from the
// CommonJS output Vercel's runtime expects fails with ERR_REQUIRE_ESM.
// Letting esbuild inline and down-convert them removes that whole class of
// runtime failure instead of pinning packages one at a time.
const external = ["@prisma/client", ".prisma/client", "sharp"];

await build({
  entryPoints: [path.join(root, "src", "server.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: path.join(root, "dist-vercel", "server.js"),
  external,
  logLevel: "info",
});
