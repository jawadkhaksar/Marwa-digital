import { test, expect, request as playwrightRequest, type APIRequestContext } from "@playwright/test";
import { API_URL, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, authenticateBrowser, loginViaApi } from "./helpers";

// Exercises the Kanban board's real drag-and-drop (dnd-kit, pointer-events —
// not native HTML5 DnD, so this drives raw mouse events rather than
// Playwright's dragTo) end-to-end against a throwaway pipeline, and verifies
// the Automated Deal Stage Trigger: dropping a deal into a WON-typed stage
// flips its status server-side, not just its visual column.
test.describe("CRM Pipeline — drag-and-drop deal stage triggers", () => {
  let api: APIRequestContext;
  let token: string;
  let pipelineId: string;
  let activeStageId: string;
  let wonStageId: string;
  let dealId: string;

  test.beforeAll(async () => {
    api = await playwrightRequest.newContext({ baseURL: API_URL });
    token = await loginViaApi(api, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD);
    const authHeader = { Authorization: `Bearer ${token}` };

    const pipelineRes = await api.post("/api/admin/crm/pipelines", {
      headers: authHeader,
      data: {
        name: `E2E Drag Pipeline ${Date.now()}`,
        stages: [
          { name: "E2E Active", stageType: "DEFAULT" },
          { name: "E2E Won", stageType: "WON" },
        ],
      },
    });
    const pipeline = await pipelineRes.json();
    pipelineId = pipeline.id;
    activeStageId = pipeline.stages.find((s: { name: string }) => s.name === "E2E Active").id;
    wonStageId = pipeline.stages.find((s: { name: string }) => s.name === "E2E Won").id;

    const dealRes = await api.post("/api/admin/crm/deals", {
      headers: authHeader,
      data: { title: `E2E Drag Deal ${Date.now()}`, value: 5000, stageId: activeStageId },
    });
    const deal = await dealRes.json();
    dealId = deal.id;
    expect(deal.status).toBe("OPEN");
  });

  test.afterAll(async () => {
    await api.delete(`/api/admin/crm/pipelines/${pipelineId}`, { headers: { Authorization: `Bearer ${token}` } });
    await api.dispose();
  });

  test("dragging a deal from a DEFAULT stage into a WON stage marks it WON", async ({ page }) => {
    await authenticateBrowser(page, token);
    await page.goto("/crm/pipeline");

    // Multiple pipelines now exist (the seeded default plus this fixture) —
    // the board only renders a picker once there's more than one, so select
    // this test's pipeline explicitly rather than assuming it loads first.
    // The picker itself only appears once the initial GET /pipelines call
    // resolves, so this waits for it rather than a one-shot isVisible()
    // check that can race that fetch and silently skip the selection,
    // leaving the default "Sales Pipeline" (with no matching deal) active.
    const picker = page.locator("select").first();
    await picker.waitFor({ state: "visible", timeout: 15000 });
    await picker.selectOption(pipelineId);

    const dealCard = page.getByTestId(`deal-card-${dealId}`);
    const targetZone = page.getByTestId(`stage-dropzone-${wonStageId}`);
    await expect(dealCard).toBeVisible();
    await expect(targetZone).toBeVisible();

    const sourceBox = await dealCard.boundingBox();
    const targetBox = await targetZone.boundingBox();
    if (!sourceBox || !targetBox) throw new Error("Could not measure drag source/target");

    // dnd-kit's PointerSensor requires exceeding a small activation distance
    // before it starts tracking a drag, so this moves in deliberate steps
    // rather than jumping straight to the target.
    await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(sourceBox.x + sourceBox.width / 2 + 20, sourceBox.y + sourceBox.height / 2, { steps: 5 });
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 15 });
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2 + 4, { steps: 3 });
    await page.mouse.up();

    // Visually: the card now renders inside the Won column and shows the WON badge.
    // Scoped to the deal card itself (not the whole stage column) since the
    // column also has its own "Won" stage-type <option>, which would
    // otherwise ambiguously match the same getByText("WON").
    const movedCard = page.getByTestId(`stage-column-${wonStageId}`).getByTestId(`deal-card-${dealId}`);
    await expect(movedCard).toBeVisible();
    await expect(movedCard.getByText("WON")).toBeVisible();

    // The Automated Deal Stage Trigger persisted server-side, not just visually.
    const dealRes = await api.get(`/api/admin/crm/deals`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
    // No GET /:id endpoint exists — the reorder/patch responses are the
    // source of truth, so re-derive via the pipelines list instead.
    void dealRes;
    const pipelinesRes = await api.get("/api/admin/crm/pipelines", { headers: { Authorization: `Bearer ${token}` } });
    const pipelines = await pipelinesRes.json();
    const thisPipeline = pipelines.find((p: { id: string }) => p.id === pipelineId);
    const wonStage = thisPipeline.stages.find((s: { id: string }) => s.id === wonStageId);
    const movedDeal = wonStage.deals.find((d: { id: string }) => d.id === dealId);
    expect(movedDeal, "the deal should now be in the Won stage").toBeTruthy();
    expect(movedDeal.status).toBe("WON");
  });
});
