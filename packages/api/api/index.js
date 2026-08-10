// Vercel Serverless Function entrypoint — PLACEHOLDER.
//
// This file is committed so Vercel sees a function here when it scans the
// api/ directory in the source checkout (it decides which functions exist
// before any build script runs — a purely generated file is invisible to
// that scan and the deployment ships zero functions).
//
// At deploy time `npm run vercel-build` (scripts/build-vercel.mjs) OVERWRITES
// this file with the real bundled Express app: the whole API plus the
// @marwa/* workspace packages and every non-native npm dependency inlined
// into one self-contained CommonJS file. Writing directly over this file,
// rather than requiring a generated one from elsewhere, keeps the deployed
// function free of any module Vercel's own bundler/tracer would have to
// resolve on its own.
//
// So this body only ever runs if the build step didn't — in which case a
// loud, specific error beats a confusing "cannot find module" further down.
module.exports = (_req, res) => {
  res.statusCode = 500;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ error: "API bundle was not built — 'npm run vercel-build' did not run for this deployment." }));
};
