import { test, expect } from "@playwright/test";

test.describe("Guided flow — Reflect → next case navigation (US-PW-3)", () => {
  test("Case 1 Reflect completes and leads to Case 2", async ({ page }) => {
    await page.goto("/cases/01-loading");

    // Hook phase — click "Discover로 이동"
    await expect(page.locator("h2").filter({ hasText: "Loading 변화" })).toBeVisible();
    await page.getByRole("button", { name: /Discover로 이동/ }).click();

    // Discover phase — wait for tree, then advance
    await expect(page.getByText("Panel 노무비").first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /이해했어요/ }).click();

    // Apply phase — answer_key is 29.82 for Loading 50%
    await expect(page.locator("h2").filter({ hasText: /Panel 노무비/ })).toBeVisible();
    const input = page.getByPlaceholder("답을 입력하세요");
    await input.fill("29.82");
    await page.getByRole("button", { name: "확인" }).click();

    // Expect success feedback then click "다음: Reflect"
    await expect(page.getByText(/잘 따라오고 있어요/)).toBeVisible({ timeout: 3_000 });
    await page.getByRole("button", { name: /다음: Reflect/ }).click();

    // Reflect phase — write something, save
    const reflectArea = page.getByPlaceholder("한 문장으로 정리해보세요...");
    await reflectArea.fill("가동률이 떨어지면 단위당 가공비가 반비례로 커진다");
    await page.getByRole("button", { name: "저장하고 완료" }).click();

    // After saving: "다음 케이스로" should appear
    const nextButton = page.getByRole("button", { name: /다음 케이스로/ });
    await expect(nextButton).toBeVisible({ timeout: 3_000 });

    // Click it and expect navigation to case 2 (인건비 변화)
    await nextButton.click();
    await expect(page).toHaveURL(/\/cases\/02-labor/);
    await expect(page.locator("h2").filter({ hasText: "인건비 변화" })).toBeVisible({ timeout: 5_000 });
  });
});
