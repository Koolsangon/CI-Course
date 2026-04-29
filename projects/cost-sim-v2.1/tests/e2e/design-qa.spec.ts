import { test, expect } from "@playwright/test";
import path from "node:path";

const SHOT_DIR = path.join(__dirname, "__screenshots__");

test.describe("Design QA — v2.1", () => {
  test("home page shows title + two mode cards", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /살아있는 원가 트리/ })).toBeVisible();
    const sandboxLink = page.getByRole("link", { name: /자유 실험실/ });
    const worksheetLink = page.getByRole("link", { name: /원가 계산 워크시트/ });
    await expect(sandboxLink).toBeVisible();
    await expect(worksheetLink).toBeVisible();
    const sandboxBox = await sandboxLink.boundingBox();
    const worksheetBox = await worksheetLink.boundingBox();
    expect(sandboxBox, "sandbox card box").not.toBeNull();
    expect(worksheetBox, "worksheet card box").not.toBeNull();
    if (sandboxBox && worksheetBox) {
      expect(sandboxBox.height).toBeGreaterThanOrEqual(80);
      expect(worksheetBox.height).toBeGreaterThanOrEqual(80);
    }
    await page.screenshot({ path: path.join(SHOT_DIR, "home.png"), fullPage: true });
  });

  test("sandbox dropdown closed screenshot", async ({ page }) => {
    await page.goto("/sandbox");
    await expect(page.getByText("Panel 노무비").first()).toBeVisible({ timeout: 10_000 });

    const treeContainer = page.locator("main > div").nth(0).locator(".react-flow");
    const box = await treeContainer.boundingBox();
    expect(box, "cost tree bounding box").not.toBeNull();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(600);
    }

    await page.screenshot({ path: path.join(SHOT_DIR, "sandbox-closed.png"), fullPage: true });
  });

  test("sandbox dropdown open — all 4 options visible", async ({ page }) => {
    await page.goto("/sandbox");
    await expect(page.getByText("Panel 노무비").first()).toBeVisible({ timeout: 10_000 });

    const selector = page.locator("header button").filter({ hasText: "Loading 변화" });
    await selector.click();

    for (const title of [
      "Loading 변화",
      "재료비 절감 vs 수율 하락",
      "면취수 · Mask 복합 변화",
      "Tact 지연 + 투자비"
    ]) {
      const option = page.locator("header button").filter({ hasText: title });
      await expect(option.first()).toBeVisible();
    }

    await page.screenshot({ path: path.join(SHOT_DIR, "sandbox-dropdown-open.png"), fullPage: true });
  });

  test("worksheet problem list page", async ({ page }) => {
    await page.goto("/cases");
    await expect(page.getByRole("heading", { name: /문제 선택/ })).toBeVisible();
    const links = page.getByRole("link").filter({ hasText: /Loading 변화|재료비|면취수|Tact/ });
    await expect(links).toHaveCount(4);
    await page.screenshot({ path: path.join(SHOT_DIR, "worksheet-list.png"), fullPage: true });
  });
});
