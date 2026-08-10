import { defineConfig, devices } from "@playwright/test";

// This monorepo's E2E scenarios span three coordinated services (API,
// apps/web, apps/admin) rather than just this one app, so unlike a typical
// single-app Playwright setup, `webServer` deliberately isn't used here —
// the CI workflow (.github/workflows/ci.yml) starts all three itself before
// running these specs. Locally, run `npm run dev` from the repo root first.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.ADMIN_URL ?? "http://localhost:3001",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
