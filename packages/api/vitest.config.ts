import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Tests that touch @marwa/db (revisionService, passwordResetTokens) need
    // DATABASE_URL from the same .env the dev server itself reads — not
    // loaded automatically by Vitest.
    setupFiles: ["dotenv/config"],
    testTimeout: 15000,
  },
});
