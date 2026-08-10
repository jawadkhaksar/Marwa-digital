import { test, expect, request as playwrightRequest, type APIRequestContext } from "@playwright/test";
import { API_URL, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, authenticateBrowser, loginViaApi } from "./helpers";

/**
 * A minimal but structurally valid rrweb event stream: a Meta event (4)
 * followed by a FullSnapshot (2) whose `node` is a real (if tiny)
 * serialized-DOM mirror — rrweb-player's Replayer rebuilds this DOM on
 * mount, so an event list that's merely "any JSON" isn't enough to exercise
 * real playback the way this test intends to.
 */
function buildMinimalRRWebEvents() {
  const now = Date.now();
  return [
    { type: 4, data: { href: "http://localhost:3000/e2e-recording", width: 1280, height: 720 }, timestamp: now },
    {
      type: 2,
      timestamp: now + 10,
      data: {
        initialOffset: { top: 0, left: 0 },
        node: {
          type: 0,
          id: 1,
          childNodes: [
            {
              type: 2,
              tagName: "html",
              attributes: {},
              id: 2,
              childNodes: [
                { type: 2, tagName: "head", attributes: {}, id: 3, childNodes: [] },
                {
                  type: 2,
                  tagName: "body",
                  attributes: {},
                  id: 4,
                  childNodes: [{ type: 2, tagName: "div", attributes: {}, id: 5, childNodes: [{ type: 3, textContent: "E2E recorded session", id: 6 }] }],
                },
              ],
            },
          ],
        },
      },
    },
  ];
}

test.describe("Session Recordings browser — playback", () => {
  let api: APIRequestContext;
  let token: string;
  const sessionId = `e2e-recording-${Date.now()}`;

  test.beforeAll(async () => {
    api = await playwrightRequest.newContext({ baseURL: API_URL });
    token = await loginViaApi(api, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD);

    await api.post("/api/analytics/session", { data: { sessionId, landingPage: "/e2e-recording" } });
    await api.post("/api/analytics/recording", { data: { sessionId, events: buildMinimalRRWebEvents() } });
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test("lists a recorded session and plays it back via the Session Replay modal", async ({ page }) => {
    await authenticateBrowser(page, token);
    await page.goto("/analytics/recordings");

    // The fixture recording is the most recently created row — sorted
    // desc by createdAt, it lands in the first data row.
    const playButtons = page.getByRole("button", { name: "Play" });
    await expect(playButtons.first()).toBeVisible();
    await playButtons.first().click();

    await expect(page.getByText("Session Replay")).toBeVisible();
    // Confirms the Replayer actually rebuilt the recorded DOM snapshot
    // inside the player, not just that the modal shell opened. rrweb-player
    // renders the replayed page inside its own <iframe>, which page.getByText
    // does not pierce — the assertion has to go through a frameLocator.
    const replayFrame = page.frameLocator(".replayer-wrapper iframe");
    await expect(replayFrame.getByText("E2E recorded session")).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: "✕" }).click();
    await expect(page.getByText("Session Replay")).toHaveCount(0);
  });
});
