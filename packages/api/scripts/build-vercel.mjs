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
// Output goes to api/index.js because Vercel's zero-config convention
// ("every file in api/ is a Function") is the only mode that also runs this
// build script — a `builds` key in vercel.json would take over the whole
// pipeline and skip package.json scripts entirely.
import { build } from "esbuild";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const apiPkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const dbPkg = JSON.parse(readFileSync(path.join(root, "..", "db", "package.json"), "utf8"));
const builderPkg = JSON.parse(readFileSync(path.join(root, "..", "builder", "package.json"), "utf8"));

// Every real npm package any bundled workspace source might import, minus
// the workspace packages themselves (those are what we WANT inlined).
const external = [
  ...Object.keys(apiPkg.dependencies ?? {}),
  ...Object.keys(dbPkg.dependencies ?? {}),
  ...Object.keys(builderPkg.dependencies ?? {}),
].filter((name) => !name.startsWith("@marwa/"));

await build({
  entryPoints: [path.join(root, "src", "server.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: path.join(root, "api", "index.js"),
  external,
  logLevel: "info",
});
