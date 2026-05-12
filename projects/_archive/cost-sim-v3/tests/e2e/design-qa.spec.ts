import { test, expect } from "@playwright/test";
import path from "node:path";

const SHOT_DIR = path.join(__dirname, "__screenshots__");

test.describe("Design QA — Playwright visual + hard checks (US-PW-4)", () => {
  test("home page shows title + two mode cards", async ({ page }) => {
    // Disable Framer Motion transition delays so the screenshot doesn't catch
    // the first-mount opacity ramp mid-way
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /살아있는 원가 트리/ })).toBeVisible();
    const sandboxLink = page.getByRole("link", { name: /Sandbox/ });
    const guidedLink = page.getByRole("link", { name: /Guided Cases/ });
    await expect(sandboxLink).toBeVisible();
    await expect(guidedLink).toBeVisible();
    // Hard visibility: each card box must be within the initial viewport (1280×720)
    const sandboxBox = await sandboxLink.boundingBox();
    const guidedBox = await guidedLink.boundingBox();
    expect(sandboxBox, "sandbox card box").not.toBeNull();
    expect(guidedBox, "guided card box").not.toBeNull();
    if (sandboxBox && guidedBox) {
      expect(sandboxBox.height).toBeGreaterThanOrEqual(80);
      expect(guidedBox.height).toBeGreaterThanOrEqual(80);
      expect(sandboxBox.y + sandboxBox.height).toBeLessThanOrEqual(720);
      expect(guidedBox.y + guidedBox.height).toBeLessThanOrEqual(720);
    }
    await page.screenshot({ path: path.join(SHOT_DIR, "home.png"), fullPage: true });
  });

  test("sandbox dropdown closed screenshot", async ({ page }) => {
    await page.goto("/sandbox");
    await expect(page.getByText("Panel 노무비").first()).toBeVisible({ timeout: 10_000 });

    // Cost tree container should dominate horizontal space on 1280×800
    const treeContainer = page.locator("main > div").nth(0).locator(".react-flow");
    const box = await treeContainer.boundingBox();
    expect(box, "cost tree bounding box").not.toBeNull();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(600);
    }

    await page.screenshot({ path: path.join(SHOT_DIR, "sandbox-closed.png"), fullPage: true });

    // No tree node may be horizontally clipped by the reactflow viewport.
    // Find all reactflow node wrappers and assert each lies fully inside the viewport box.
    const viewportBox = await page.locator(".react-flow__viewport").boundingBox();
    expect(viewportBox).not.toBeNull();
    const nodes = page.locator(".react-flow__node");
    const nodeCount = await nodes.count();
    expect(nodeCount).toBeGreaterThan(10);
    for (let i = 0; i < nodeCount; i += 1) {
      const nBox = await nodes.nth(i).boundingBox();
      expect(nBox, `tree node ${i} bounding box`).not.toBeNull();
      if (nBox && box) {
        // box is the reactflow container from earlier in this test
        expect(
          nBox.x,
          `tree node ${i} left edge below container left`
        ).toBeGreaterThanOrEqual(box.x - 0.5);
        expect(
          nBox.x + nBox.width,
          `tree node ${i} right edge must stay inside container right edge`
        ).toBeLessThanOrEqual(box.x + box.width + 0.5);
      }
    }
  });

  test("sandbox dropdown open — all 6 options visible", async ({ page }) => {
    await page.goto("/sandbox");
    await expect(page.getByText("Panel 노무비").first()).toBeVisible({ timeout: 10_000 });

    const selector = page.locator("header button").filter({ hasText: "Loading 변화" });
    await selector.click();

    // All 6 case titles should be visible in the open dropdown
    for (const title of [
      "Loading 변화",
      "인건비 변화",
      "한계이익률 목표",
      "재료비 절감 vs 수율 하락",
      "면취수 · Mask 복합 변화",
      "Tact 지연 + 투자비"
    ]) {
      const option = page.locator("header button").filter({ hasText: title });
      await expect(option.first()).toBeVisible();
    }

    await page.screenshot({ path: path.join(SHOT_DIR, "sandbox-dropdown-open.png"), fullPage: true });
  });

  test("formula inspector rows do not clip text at 256px panel width", async ({ page }) => {
    await page.goto("/sandbox");
    await expect(page.getByText("Panel 노무비").first()).toBeVisible({ timeout: 10_000 });

    // Move a slider to produce delta entries in the inspector
    const slider = page.locator("input[type='range']").first();
    await slider.focus();
    await slider.press("ArrowLeft");
    await slider.press("ArrowLeft");
    await slider.press("ArrowLeft");

    // Wait a frame for the inspector to render deltas
    await page.waitForTimeout(300);

    // There are two aside elements in the DOM (desktop panel + mobile details),
    // mobile one is `md:hidden`. Filter to visible only, take first.
    const inspector = page
      .locator("aside")
      .filter({ hasText: "수식 인스펙터" })
      .filter({ has: page.locator("ul > li") })
      .first();
    await expect(inspector).toBeVisible();

    // Each inspector list item must be fully visible within its parent (no horizontal clipping)
    const items = inspector.locator("ul > li");
    const count = await items.count();
    expect(count).toBeGreaterThan(0);

    const inspectorBox = await inspector.boundingBox();
    expect(inspectorBox).not.toBeNull();

    for (let i = 0; i < count; i += 1) {
      const itemBox = await items.nth(i).boundingBox();
      expect(itemBox, `item ${i} bounding box`).not.toBeNull();
      if (itemBox && inspectorBox) {
        expect(
          itemBox.x + itemBox.width,
          `inspector row ${i} right-edge must not exceed panel right-edge`
        ).toBeLessThanOrEqual(inspectorBox.x + inspectorBox.width + 1);
      }
    }
  });

  test("guided case 1 hook phase screenshot + touch target sizes", async ({ page }) => {
    await page.goto("/cases/01-loading");
    // Hook phase renders an h2 with the case title (h1 in the top bar uses the same text)
    await expect(page.locator("h2").filter({ hasText: "Loading 변화" })).toBeVisible();

    // Primary CTA must be at least 44px tall (touch target)
    const cta = page.getByRole("button", { name: /Discover로 이동/ });
    await expect(cta).toBeVisible();
    const ctaBox = await cta.boundingBox();
    expect(ctaBox).not.toBeNull();
    if (ctaBox) {
      expect(ctaBox.height).toBeGreaterThanOrEqual(44);
    }

    await page.screenshot({ path: path.join(SHOT_DIR, "case1-hook.png"), fullPage: true });
  });
});
