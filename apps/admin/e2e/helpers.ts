import type { APIRequestContext, Page } from "@playwright/test";

export const API_URL = process.env.API_URL ?? "http://localhost:4000";
export const ADMIN_URL = process.env.ADMIN_URL ?? "http://localhost:3001";
export const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@marwadigital.com";
export const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";

export async function loginViaApi(api: APIRequestContext, email: string, password: string): Promise<string> {
  const res = await api.post("/api/auth/login", { data: { email, password } });
  const body = await res.json();
  return body.token as string;
}

/**
 * Seeds the admin app's localStorage token before the first navigation, so a
 * spec can start already-authenticated instead of re-driving the login form
 * in every single test — login.spec.ts is what actually exercises that flow.
 */
export async function authenticateBrowser(page: Page, token: string) {
  await page.addInitScript((t) => {
    window.localStorage.setItem("marwa.admin.token", t);
  }, token);
  await page.goto(`${ADMIN_URL}/dashboard`);
}
