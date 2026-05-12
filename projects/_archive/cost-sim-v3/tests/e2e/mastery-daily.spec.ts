import { test, expect } from "@playwright/test";

/**
 * Phase C — Variable Mastery + Daily Challenge
 *
 * 1. Mastery meter renders 6 rows on the home page with default level 0
 * 2. Streak badge shows "오늘 첫 도전" before any case completion
 * 3. Completing case 1 (loading) bumps loading mastery to level 1 + streak becomes 1
 * 4. Daily challenge route renders a case with deterministic per-day pick
 */

const REFLECT_TEXT = "가동률이 떨어지면 단위당 가공비가 반비례로 커진다";

async function clearStorage(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.evaluate(() => {
    try {
      localStorage.removeItem("cost-sim-v2-game:profile:v1");
    } catch {
      // ignore
    }
  });
}

test.describe("Phase C — Mastery + Daily Challenge", () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
  });

  test("Home page shows mastery meter with all 6 rows at level 0", async ({ page }) => {
    await page.goto("/");
    const meter = page.getByTestId("mastery-meter");
    await expect(meter).toBeVisible();

    for (const v of ["loading", "labor", "yield", "cuts", "mask", "tact"]) {
      const row = page.getByTestId(`mastery-row-${v}`);
      await expect(row).toBeVisible();
      const level = await row.getAttribute("data-level");
      expect(Number(level)).toBe(0);
    }
  });

  test("Streak badge starts at 0", async ({ page }) => {
    await page.goto("/");
    const badge = page.getByTestId("streak-badge");
    await expect(badge).toBeVisible();
    expect(Number(await badge.getAttribute("data-streak"))).toBe(0);
    await expect(badge).toContainText(/오늘 첫 도전/);
  });

  test("Completing case 1 bumps loading mastery to 1 and starts streak", async ({ page }) => {
    await page.goto("/cases/01-loading");

    // Dismiss intro modal if visible
    const introDismiss = page.getByTestId("intro-dismiss");
    if (await introDismiss.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await introDismiss.click();
    }

    // Walk Hook → Discover → Apply (correct) → Reflect → save
    await page.getByRole("button", { name: /Discover로 이동/ }).click();
    await expect(page.getByText("Panel 노무비").first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /이해했어요/ }).click();
    await page.getByTestId("apply-answer").fill("29.82");
    await page.getByRole("button", { name: "확인" }).click();
    await expect(page.getByTestId("apply-correct")).toBeVisible({ timeout: 3_000 });
    await page.getByRole("button", { name: /다음: Reflect/ }).click();
    await page.getByPlaceholder("한 문장으로 정리해보세요...").fill(REFLECT_TEXT);
    await page.getByRole("button", { name: "저장하고 완료" }).click();
    await expect(page.getByTestId("reflect-success")).toBeVisible({ timeout: 3_000 });

    // Navigate home and check mastery row + streak
    await page.goto("/");
    const loadingRow = page.getByTestId("mastery-row-loading");
    await expect(loadingRow).toBeVisible();
    const loadingLevel = Number(await loadingRow.getAttribute("data-level"));
    expect(loadingLevel, "loading mastery should bump to 1 after correct case 1 Apply").toBeGreaterThanOrEqual(1);

    const streakBadge = page.getByTestId("streak-badge");
    await expect(streakBadge).toBeVisible();
    const streak = Number(await streakBadge.getAttribute("data-streak"));
    expect(streak, "streak should be 1 after first case completion").toBeGreaterThanOrEqual(1);

    // Other variables stay at 0 (we only solved loading)
    for (const v of ["labor", "yield", "cuts", "mask", "tact"]) {
      const row = page.getByTestId(`mastery-row-${v}`);
      const level = Number(await row.getAttribute("data-level"));
      expect(level, `${v} should stay at 0`).toBe(0);
    }
  });

  test("Daily challenge route renders a case + start link", async ({ page }) => {
    await page.goto("/daily");
    await expect(page.getByTestId("daily-card")).toBeVisible();
    await expect(page.getByTestId("daily-title")).not.toHaveText("···");
    const startLink = page.getByTestId("daily-start");
    await expect(startLink).toBeVisible();
    const href = await startLink.getAttribute("href");
    expect(href).toMatch(/^\/cases\/\d{2}-/);
  });

  test("Daily challenge picks the same case for the same date (deterministic seed)", async ({ page }) => {
    // First visit
    await page.goto("/daily");
    await expect(page.getByTestId("daily-card")).toBeVisible();
    const titleA = await page.getByTestId("daily-title").innerText();

    // Reload — same date, should be the same case
    await page.reload();
    await expect(page.getByTestId("daily-card")).toBeVisible();
    const titleB = await page.getByTestId("daily-title").innerText();

    expect(titleA).toBe(titleB);
  });
});
