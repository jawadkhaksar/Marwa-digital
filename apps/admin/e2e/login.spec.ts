import { test, expect, request as playwrightRequest, type APIRequestContext } from "@playwright/test";
import { generate as totpGenerate } from "otplib";

const API_URL = process.env.API_URL ?? "http://localhost:4000";
const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@marwadigital.com";
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";

test.describe("Admin login — standard", () => {
  test("signs in with valid credentials and reaches the dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(SEED_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(SEED_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    // getByText("Dashboard") is ambiguous here: it matches both the sidebar's
    // "Dashboard" nav link and the page's own "Dashboard" heading.
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("shows an error for invalid credentials and stays on the login screen", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(SEED_ADMIN_EMAIL);
    await page.getByLabel("Password").fill("definitely-the-wrong-password");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Admin login — 2FA-gated", () => {
  // Provisions a throwaway EDITOR account with 2FA enabled via the API
  // (faster and more deterministic than driving the Settings → Security UI
  // just to set the fixture up), then exercises the actual two-step sign-in
  // through the real browser UI, which is what this test is verifying.
  let api: APIRequestContext;
  let userId: string;
  let secret: string;
  const testEmail = `e2e-2fa-${Date.now()}@example.test`;
  const testPassword = "E2eTestPassword123!";

  test.beforeAll(async () => {
    api = await playwrightRequest.newContext({ baseURL: API_URL });

    const adminLogin = await api.post("/api/auth/login", { data: { email: SEED_ADMIN_EMAIL, password: SEED_ADMIN_PASSWORD } });
    const { token: adminToken } = await adminLogin.json();

    const createUser = await api.post("/api/admin/users", {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { email: testEmail, name: "E2E 2FA User", password: testPassword, role: "EDITOR" },
    });
    const created = await createUser.json();
    userId = created.id;

    const userLogin = await api.post("/api/auth/login", { data: { email: testEmail, password: testPassword } });
    const { token: userToken } = await userLogin.json();

    const setup = await api.post("/api/admin/auth/2fa/setup", { headers: { Authorization: `Bearer ${userToken}` } });
    ({ secret } = await setup.json());

    const code = await totpGenerate({ secret });
    await api.post("/api/admin/auth/2fa/verify", { headers: { Authorization: `Bearer ${userToken}` }, data: { code } });
  });

  test.afterAll(async () => {
    const adminLogin = await api.post("/api/auth/login", { data: { email: SEED_ADMIN_EMAIL, password: SEED_ADMIN_PASSWORD } });
    const { token: adminToken } = await adminLogin.json();
    await api.delete(`/api/admin/users/${userId}`, { headers: { Authorization: `Bearer ${adminToken}` } });
    await api.dispose();
  });

  test("requires a valid TOTP code after a correct password before reaching the dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(testEmail);
    await page.getByLabel("Password").fill(testPassword);
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByText("Two-Factor Verification")).toBeVisible();

    const code = await totpGenerate({ secret });
    await page.getByPlaceholder("123456").fill(code);
    await page.getByRole("button", { name: "Verify & Sign In" }).click();

    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("rejects an incorrect authentication code", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(testEmail);
    await page.getByLabel("Password").fill(testPassword);
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByText("Two-Factor Verification")).toBeVisible();
    await page.getByPlaceholder("123456").fill("000000");
    await page.getByRole("button", { name: "Verify & Sign In" }).click();

    await expect(page.getByText(/incorrect/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
