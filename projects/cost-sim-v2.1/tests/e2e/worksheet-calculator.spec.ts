import { test, expect } from "@playwright/test";

async function dismissGuide(page: import("@playwright/test").Page) {
  const skipBtn = page.locator("text=건너뛰기");
  if (await skipBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await skipBtn.click();
    await page.waitForTimeout(300);
  }
}

test.describe("Worksheet Calculator", () => {
  test("p1-loading: calculator flow — enter value and see result in cell", async ({ page }) => {
    await page.goto("/cases/01-loading");

    // Dismiss guide modal
    await dismissGuide(page);

    // Wait for table
    await expect(page.locator("table")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Reference")).toBeVisible();
    await expect(page.getByText("Simulation")).toBeVisible();
    await expect(page.getByText("영업이익 (Price - COP)")).toBeVisible();

    // Click first empty yellow cell
    const emptyYellow = page.locator("[data-test='yellow-empty']").first();
    await expect(emptyYellow).toBeVisible({ timeout: 5_000 });
    await emptyYellow.click();

    // Calculator panel should appear
    await expect(page.locator("input[placeholder='숫자']")).toBeVisible({ timeout: 3_000 });

    // Enter 29.82 manually
    await page.locator("input[placeholder='숫자']").fill("29.82");
    await page.getByRole("button", { name: "추가" }).click();

    // Preview should show = 29.82
    await expect(page.locator("text=29.82").first()).toBeVisible();

    // Click 계산하기
    await page.getByRole("button", { name: "계산하기" }).click();
    await page.waitForTimeout(500);

    // Calculator should close
    await expect(page.locator("input[placeholder='숫자']")).not.toBeVisible();

    // The cell should now show 29.82 (filled)
    const filledCell = page.locator("[data-test='yellow-filled']").first();
    await expect(filledCell).toBeVisible();
    await expect(filledCell).toContainText("29.82");

    console.log("  ✓ Calculator value entered into cell successfully");
  });

  test("p1-loading: fill all yellows + grade → 6/6", async ({ page }) => {
    await page.goto("/cases/01-loading");
    await dismissGuide(page);
    await expect(page.locator("table")).toBeVisible({ timeout: 15_000 });

    const answers = ["29.82", "16.10", "22.68", "12.18", "7.42", "10.50"];

    for (const ans of answers) {
      const emptyCell = page.locator("[data-test='yellow-empty']").first();
      await emptyCell.click();
      await page.waitForTimeout(300);

      await page.locator("input[placeholder='숫자']").fill(ans);
      await page.getByRole("button", { name: "추가" }).click();
      await page.getByRole("button", { name: "계산하기" }).click();
      await page.waitForTimeout(300);
    }

    // No more empty yellows
    await expect(page.locator("[data-test='yellow-empty']")).toHaveCount(0);

    // Blue cells should be computed — 가공비 합계 98.70
    await expect(page.locator("td").filter({ hasText: "98.70" })).toBeVisible();

    // 영업이익 = 200 - (90.76 + 98.70 + 28.40) = -17.86
    await expect(page.locator("td").filter({ hasText: "-17.86" })).toBeVisible();

    // Grade
    await page.getByRole("button", { name: "채점하기" }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText("6/6")).toBeVisible();
    console.log("  ✓ All 6 cells filled, blue auto-calc correct, grading 6/6");
  });
});
