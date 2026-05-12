import { test, expect } from "@playwright/test";

const CASES = [
  "Loading 변화",
  "인건비 변화",
  "한계이익률 목표",
  "재료비 절감 vs 수율 하락",
  "면취수 · Mask 복합 변화",
  "Tact 지연 + 투자비"
];

test.describe("Formula Inspector — every case shows formulas after slider interaction", () => {
  for (const title of CASES) {
    test(`case "${title}" displays ≥ 1 formula after moving a slider`, async ({ page }) => {
      await page.goto("/sandbox");
      await expect(page.locator(".react-flow__node").first()).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(200);

      // Open dropdown, select target case
      await page
        .locator("header button")
        .filter({ hasText: /Loading 변화|인건비 변화|한계이익률 목표|재료비|면취수|Tact/ })
        .first()
        .click();
      await page.locator("header button").filter({ hasText: title }).last().click();
      await page.waitForTimeout(300);

      // Nudge the first slider so lastDelta refreshes with a fresh diff
      const slider = page.locator("input[type='range']").first();
      await slider.focus();
      for (let i = 0; i < 5; i += 1) await slider.press("ArrowRight");
      await page.waitForTimeout(400);

      // Inspector aside — first one (desktop panel, not mobile details)
      const inspector = page
        .locator("aside")
        .filter({ hasText: "수식 인스펙터" })
        .first();
      await expect(inspector).toBeVisible();

      // Count formula cards (the header "관련 수식")
      const formulaHeader = inspector.getByText(/관련 수식/);
      await expect(formulaHeader, `case "${title}" should show at least one formula`).toBeVisible();

      // Count individual formula <code> blocks
      const codeBlocks = inspector.locator("code");
      const count = await codeBlocks.count();
      expect(count, `case "${title}" formula block count`).toBeGreaterThan(0);

      // Log for debugging
      const labels: string[] = [];
      for (let i = 0; i < count; i += 1) {
        const text = (await codeBlocks.nth(i).innerText()).replace(/\s+/g, " ").trim();
        labels.push(text);
      }
      console.log(`  ${title}: ${count} formula(s):`, labels);
    });
  }
});
