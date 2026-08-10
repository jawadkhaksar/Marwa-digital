// Vercel Serverless Function entrypoint.
//
// This file is deliberately committed (and deliberately trivial): Vercel
// decides which functions to create by scanning api/ in the source
// checkout, before any build script runs — so a generated file here would
// never be seen, and the deployment would ship zero functions.
//
// The real Express app is bundled into ../dist-vercel/server.js by
// scripts/build-vercel.mjs (run via the "vercel-build" script) ahead of
// Vercel bundling this file, so the require below resolves to a plain JS
// file with the @marwa/* workspace packages already inlined — nothing left
// for Vercel's own bundler to try (and fail) to resolve at runtime.
module.exports = require("../dist-vercel/server.js");
