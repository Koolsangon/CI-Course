import { test, expect } from "@playwright/test";

test.describe("Guided flow — Reflect → next case navigation + Phase A scoring (US-PW-3)", () => {
  test.beforeEach(async ({ page }) => {
    // Phase B introduced an Intro premise modal on first /cases/01-loading visit.
    // Clear localStorage so the introSeen flag resets, then dismiss the modal
    // explicitly inside the test.
    await page.goto("/");
    await page.evaluate(() => {
      try { localStorage.removeItem("cost-sim-v2-game:profile:v1"); } catch {}
    });
  });

  test("Case 1 Reflect completes, score+stars visible, leads to Case 2", async ({ page }) => {
    await page.goto("/cases/01-loading");

    // Dismiss Phase B intro modal if present
    const introDismiss = page.getByTestId("intro-dismiss");
    if (await introDismiss.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await introDismiss.click();
    }

    // Hook phase
    await expect(page.locator("h2").filter({ hasText: "Loading 변화" })).toBeVisible();
    await page.getByRole("button", { name: /Discover로 이동/ }).click();

    // Discover phase — tree should be live
    await expect(page.getByText("Panel 노무비").first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /이해했어요/ }).click();

    // Apply phase — answer 29.82 (Loading 50% Panel 노무비)
    await expect(page.locator("h2").filter({ hasText: /Panel 노무비/ })).toBeVisible();
    const input = page.getByTestId("apply-answer");
    await input.fill("29.82");
    await page.getByRole("button", { name: "확인" }).click();

    // Phase A — confetti burst, success card, score chip all appear
    await expect(page.getByTestId("apply-correct")).toBeVisible({ timeout: 3_000 });
    // Confetti container is aria-hidden (decorative); assert by particle child count.
    await expect(page.getByTestId("confetti").locator("span")).toHaveCount(14, { timeout: 2_000 });

    const scoreLocator = page.getByTestId("apply-score");
    await expect(scoreLocator).toBeVisible();
    const scoreText = await scoreLocator.innerText();
    const score = Number(scoreText);
    expect(score, "Phase A score must be > 0").toBeGreaterThan(0);
    expect(score, "Phase A score upper bound 135").toBeLessThanOrEqual(135);

    await page.getByRole("button", { name: /다음: Reflect/ }).click();

    // Reflect — save
    const reflectArea = page.getByPlaceholder("한 문장으로 정리해보세요...");
    await reflectArea.fill("가동률이 떨어지면 단위당 가공비가 반비례로 커진다");
    await page.getByRole("button", { name: "저장하고 완료" }).click();

    // Reflect success card visible with stars
    await expect(page.getByTestId("reflect-success")).toBeVisible({ timeout: 3_000 });
    const stars = page.getByTestId("case-stars");
    await expect(stars).toBeVisible();

    // At least 1 star filled (we entered the exact answer with no hint, so target ≥ 2)
    const filledStars = stars.locator('[data-filled="true"]');
    await expect(filledStars.first()).toBeVisible({ timeout: 2_000 });
    const filledCount = await filledStars.count();
    expect(filledCount, "exact-answer + no-hint run should earn ≥ 2 stars").toBeGreaterThanOrEqual(2);

    // Next case button → /cases/02-labor
    const nextButton = page.getByRole("button", { name: /다음 케이스로/ });
    await expect(nextButton).toBeVisible({ timeout: 3_000 });
    await nextButton.click();
    await expect(page).toHaveURL(/\/cases\/02-labor/);
    await expect(page.locator("h2").filter({ hasText: "인건비 변화" })).toBeVisible({ timeout: 5_000 });
  });
});
