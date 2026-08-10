import { test, expect, request as playwrightRequest, type APIRequestContext } from "@playwright/test";

const API_URL = process.env.API_URL ?? "http://localhost:4000";
const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@marwadigital.com";
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";

// Contact form submission -> lead tracking (UTM attribution captured on the
// resulting ContactInquiry) -> an admin acting on that lead produces an
// audit log entry. ContactInquiry has no DELETE endpoint, so this test's
// fixture data (and the audit trail describing it) is intentionally left in
// place afterward — audit logs are an append-only record by design, and
// leaving a stray "closed" test inquiry is a normal, low-cost trade-off for
// verifying a real end-to-end write path rather than mocking around it.
test("contact form submission is attributed to its UTM campaign and generates an audit log entry when an admin updates it", async ({ page }) => {
  const uniqueName = `E2E Contact ${Date.now()}`;
  const uniqueEmail = `e2e-contact-${Date.now()}@example.test`;

  await page.goto("/contact?utm_source=e2e&utm_medium=playwright&utm_campaign=lead-audit-test");

  await page.getByPlaceholder("Max Charlie K.").fill(uniqueName);
  await page.getByPlaceholder("name@domain.com").fill(uniqueEmail);
  await page.getByPlaceholder("What can we help with?").fill("Playwright E2E test submission");
  await page.getByPlaceholder("Write your message").fill("This is an automated end-to-end test submission.");
  await page.getByRole("checkbox").check();

  // POST /api/contact's bot defense (looksLikeBot, see packages/api/src/lib/
  // security.ts) rejects any submission within MIN_SUBMIT_MS (2s) of the
  // form's own renderedAt timestamp — real visitors never fill a form that
  // fast, but automated fill+click does. It still responds 201 { ok: true }
  // either way (so a real bot can't tell it was silently dropped), which is
  // exactly what let this test pass its own "Request received" assertion
  // while never actually creating the ContactInquiry it went on to look up.
  await page.waitForTimeout(2200);
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByText("Request received")).toBeVisible();

  const api: APIRequestContext = await playwrightRequest.newContext({ baseURL: API_URL });
  const login = await api.post("/api/auth/login", { data: { email: SEED_ADMIN_EMAIL, password: SEED_ADMIN_PASSWORD } });
  const { token } = await login.json();
  const authHeader = { Authorization: `Bearer ${token}` };

  const inquiriesRes = await api.get("/api/admin/inquiries", { headers: authHeader });
  const inquiriesJson = await inquiriesRes.json();

  // GET /api/admin/inquiries returns a raw array today, but this tolerates a
  // future paginated wrapper ({ items: [...] }, { data: [...] }, or
  // { inquiries: [...] }) too, so this spec doesn't break the moment that
  // endpoint gains pagination like several of its siblings already have.
  type InquiryRecord = { id: string; name: string; email: string };
  const inquiriesList: InquiryRecord[] = Array.isArray(inquiriesJson)
    ? inquiriesJson
    : (inquiriesJson.items ?? inquiriesJson.data ?? inquiriesJson.inquiries ?? []);

  const inquiry = inquiriesList.find((i) => i.email === uniqueEmail);
  expect(inquiry, "the submitted inquiry should appear in the admin inquiries list").toBeTruthy();

  // Lead attribution: the analytics leads endpoint enriches this same
  // inquiry with the UTM tags captured at submission time.
  const leadsRes = await api.get("/api/admin/analytics/leads?preset=today&limit=50", { headers: authHeader });
  const leads = await leadsRes.json();
  const lead = leads.items.find((l: { email: string }) => l.email === uniqueEmail);
  expect(lead?.utmSource).toBe("e2e");
  expect(lead?.utmCampaign).toBe("lead-audit-test");

  // An admin acting on the lead (status change) is a real state-changing
  // admin action — this is what should produce the audit log entry.
  await api.patch(`/api/admin/inquiries/${inquiry!.id}`, { headers: authHeader, data: { status: "CONTACTED" } });

  const auditRes = await api.get(`/api/admin/audit-logs?resource=ContactInquiry&limit=20`, { headers: authHeader });
  const auditLog = await auditRes.json();
  const entry = auditLog.items.find((e: { resourceId: string; action: string }) => e.resourceId === inquiry!.id && e.action === "CONTACTINQUIRY_UPDATE");
  expect(entry, "updating the inquiry should have written an audit log entry").toBeTruthy();

  await api.dispose();
});
