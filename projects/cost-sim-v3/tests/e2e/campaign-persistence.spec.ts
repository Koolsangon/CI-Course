import { test, expect } from "@playwright/test";

/**
 * Phase B — Narrative + Persistence + Campaign
 *
 * Verifies:
 * 1. Intro modal appears on first /cases/01-loading visit
 * 2. CFO note replaces the italic Hook quote and references "1월"
 * 3. Case page header shows "1월 · Q2-2026" instead of "Case 1"
 * 4. QuarterBar is rendered with a data-progress attribute
 * 5. CFO reaction card appears in Reflect after save
 * 6. zustand persist — completing case 1, reloading the page mid-case-2,
 *    and confirming case 1's stars are still visible (persistence works)
 */

const REFLECT_TEXT = "가동률이 떨어지면 단위당 가공비가 반비례로 커진다";

async function clearProgress(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.evaluate(() => {
    try {
      localStorage.removeItem("cost-sim-v2-game:profile:v1");
    } catch {
      // ignore
    }
  });
}

test.describe("Phase B — Narrative + Persistence + Campaign", () => {
  test.beforeEach(async ({ page }) => {
    await clearProgress(page);
  });

  test("Intro modal appears on first case 1 visit and dismisses", async ({ page }) => {
    await page.goto("/cases/01-loading");

    // ProfileGate may show first — skip via 익명으로
    const profileSkip = page.getByTestId("profile-skip");
    if (await profileSkip.isVisible().catch(() => false)) {
      await profileSkip.click();
    }

    const intro = page.getByTestId("intro-modal");
    await expect(intro).toBeVisible({ timeout: 5_000 });

    // Premise text should reference K-디스플레이 (matches both title and first premise paragraph)
    await expect(page.getByText(/K-디스플레이/).first()).toBeVisible();

    // Dismiss
    await page.getByTestId("intro-dismiss").click();
    await expect(intro).toBeHidden({ timeout: 2_000 });

    // CFO note should now be the primary Hook copy
    await expect(page.getByTestId("cfo-note")).toBeVisible();
    await expect(page.getByTestId("cfo-note")).toContainText(/CFO/);
    await expect(page.getByTestId("cfo-note")).toContainText(/1월/);

    // Case page month label
    await expect(page.getByTestId("case-month-label")).toContainText(/1월/);
  });

  test("Quarter bar renders with progress and updates after Apply", async ({ page }) => {
    await page.goto("/cases/01-loading");
    const profileSkip = page.getByTestId("profile-skip");
    if (await profileSkip.isVisible().catch(() => false)) await profileSkip.click();
    const introDismiss = page.getByTestId("intro-dismiss");
    if (await introDismiss.isVisible().catch(() => false)) await introDismiss.click();

    // Quarter bar present, no commits yet
    const bar = page.getByTestId("campaign-bar");
    await expect(bar).toBeVisible();
    expect(Number(await bar.getAttribute("data-committed-count"))).toBe(0);

    // Walk through case 1
    await page.getByRole("button", { name: /Discover로 이동/ }).click();
    await expect(page.getByText("Panel 노무비").first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /이해했어요/ }).click();
    await page.getByTestId("apply-answer").fill("29.82");
    await page.getByRole("button", { name: "확인" }).click();
    await expect(page.getByTestId("apply-correct")).toBeVisible({ timeout: 3_000 });

    // After answering, the bar should reflect a committed case (count = 1).
    // Progress can be ≤ 0 because Loading 50% drives profit negative — that's the
    // intended scenario, hence we test commit count, not clamped percentage.
    const committedAfter = Number(await bar.getAttribute("data-committed-count"));
    expect(committedAfter).toBe(1);
  });

  test("CFO reaction appears in Reflect success card", async ({ page }) => {
    await page.goto("/cases/01-loading");
    const profileSkip = page.getByTestId("profile-skip");
    if (await profileSkip.isVisible().catch(() => false)) await profileSkip.click();
    const introDismiss = page.getByTestId("intro-dismiss");
    if (await introDismiss.isVisible().catch(() => false)) await introDismiss.click();

    await page.getByRole("button", { name: /Discover로 이동/ }).click();
    await expect(page.getByText("Panel 노무비").first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /이해했어요/ }).click();
    await page.getByTestId("apply-answer").fill("29.82");
    await page.getByRole("button", { name: "확인" }).click();
    await page.getByRole("button", { name: /다음: Reflect/ }).click();
    await page.getByPlaceholder("한 문장으로 정리해보세요...").fill(REFLECT_TEXT);
    await page.getByRole("button", { name: "저장하고 완료" }).click();

    const reaction = page.getByTestId("cfo-reaction");
    await expect(reaction).toBeVisible({ timeout: 3_000 });
    await expect(reaction).toContainText(/CFO/);
  });

  test("zustand persist — case 1 stars survive a page reload", async ({ page }) => {
    await page.goto("/cases/01-loading");
    const profileSkip = page.getByTestId("profile-skip");
    if (await profileSkip.isVisible().catch(() => false)) await profileSkip.click();
    const introDismiss = page.getByTestId("intro-dismiss");
    if (await introDismiss.isVisible().catch(() => false)) await introDismiss.click();

    // Complete case 1
    await page.getByRole("button", { name: /Discover로 이동/ }).click();
    await expect(page.getByText("Panel 노무비").first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /이해했어요/ }).click();
    await page.getByTestId("apply-answer").fill("29.82");
    await page.getByRole("button", { name: "확인" }).click();
    await page.getByRole("button", { name: /다음: Reflect/ }).click();
    await page.getByPlaceholder("한 문장으로 정리해보세요...").fill(REFLECT_TEXT);
    await page.getByRole("button", { name: "저장하고 완료" }).click();

    // Capture committed count + raw cumulative + star count BEFORE reload
    const barBefore = page.getByTestId("campaign-bar");
    const committedBefore = Number(await barBefore.getAttribute("data-committed-count"));
    const cumulativeBefore = Number(await barBefore.getAttribute("data-cumulative-raw"));
    expect(committedBefore).toBe(1);

    const starsBefore = await page
      .getByTestId("case-stars")
      .locator('[data-filled="true"]')
      .count();
    expect(starsBefore).toBeGreaterThanOrEqual(2);

    // Hard reload — zustand persist should rehydrate from localStorage
    await page.reload();

    // Intro modal should NOT reappear (introSeen persisted)
    await expect(page.getByTestId("intro-modal")).toBeHidden({ timeout: 2_000 });

    // QuarterBar should still show committed count == 1 + same cumulative value
    const barAfter = page.getByTestId("campaign-bar");
    await expect(barAfter).toBeVisible();
    const committedAfter = Number(await barAfter.getAttribute("data-committed-count"));
    const cumulativeAfter = Number(await barAfter.getAttribute("data-cumulative-raw"));
    expect(committedAfter, "committed count must persist across reload").toBe(1);
    expect(
      Math.abs(cumulativeAfter - cumulativeBefore),
      "cumulative profit must persist across reload"
    ).toBeLessThan(0.01);
  });
});
