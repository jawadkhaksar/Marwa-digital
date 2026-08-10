import { test, expect } from "@playwright/test";

// Basic public-page rendering — a smoke check that the site's core routes
// actually serve real HTML (a title, real body content) rather than an
// error page or an empty shell, independent of the more specific
// attribution/lead-tracking assertions in contact-lead-audit.spec.ts.
test.describe("Public page rendering", () => {
  test("the homepage renders with a real title and visible content", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.ok(), "homepage should respond 2xx").toBe(true);
    await expect(page).toHaveTitle(/.+/);
    expect((await page.locator("body").innerText()).trim().length).toBeGreaterThan(0);
  });

  test("the blog archive renders without erroring", async ({ page }) => {
    const response = await page.goto("/blog");
    expect(response?.ok(), "/blog should respond 2xx").toBe(true);
    await expect(page).toHaveTitle(/.+/);
  });

  test("the contact page renders its lead-capture form", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.getByPlaceholder("name@domain.com")).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit" })).toBeVisible();
  });
});
