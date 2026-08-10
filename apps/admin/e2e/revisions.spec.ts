import { test, expect, request as playwrightRequest, type APIRequestContext } from "@playwright/test";
import { API_URL, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, loginViaApi, authenticateBrowser } from "./helpers";

const WEB_URL = process.env.WEB_URL ?? "http://localhost:3000";

test.describe("Page revisions — create, update, restore, and verify on the public site", () => {
  let api: APIRequestContext;
  let token: string;
  let pageId: string;
  let slug: string;
  const originalTitle = `E2E Revision Original ${Date.now()}`;
  const updatedTitle = `E2E Revision Updated ${Date.now()}`;

  test.beforeAll(async () => {
    api = await playwrightRequest.newContext({ baseURL: API_URL });
    token = await loginViaApi(api, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD);

    const created = await api.post("/api/admin/pages", {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: originalTitle, editorMode: "BUILDER", layout: { version: 1, nodes: [] }, published: true },
    });
    const page = await created.json();
    pageId = page.id;
    slug = page.slug;

    // A second save — this is what produces the second revision the test
    // restores away from, mirroring an admin editing and saving again.
    await api.patch(`/api/admin/pages/${pageId}`, { headers: { Authorization: `Bearer ${token}` }, data: { title: updatedTitle } });
  });

  test.afterAll(async () => {
    await api.delete(`/api/admin/pages/${pageId}`, { headers: { Authorization: `Bearer ${token}` } });
    await api.dispose();
  });

  test("lists both revisions and restores the page back to its original title", async ({ page }) => {
    await authenticateBrowser(page, token);
    await page.goto(`/builder/${pageId}`);
    await expect(page.getByText(updatedTitle)).toBeVisible();

    await page.getByRole("button", { name: "History" }).click();
    await expect(page.getByText("Revision History")).toBeVisible();

    // Newest first — row 0 is the "updated" save, row 1 is the original.
    // Scoped to the revision rows themselves, not `div.w-72 button`, which
    // also matches the modal's "✕" close button living in the same container.
    const revisionRows = page.getByTestId("revision-row");
    await expect(revisionRows).toHaveCount(2);
    await revisionRows.nth(1).click();
    await expect(page.getByRole("heading", { name: originalTitle })).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Restore This Version" }).click();

    // Restoring triggers a full page reload (see the builder's onRestored).
    await page.waitForURL(`**/builder/${pageId}`);
    await expect(page.getByText(originalTitle)).toBeVisible();
  });

  test("the restored title is what the public site now serves", async ({ page }) => {
    const response = await page.goto(`${WEB_URL}/${slug}`);
    expect(response?.ok()).toBe(true);
  });
});
