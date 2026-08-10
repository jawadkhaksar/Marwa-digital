import { defineConfig, devices } from "@playwright/test";

// See apps/admin/playwright.config.ts for why `webServer` isn't used here —
// these specs coordinate across apps/web, apps/admin, and the API together.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.WEB_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
