import { test, expect } from "@playwright/test";

/**
 * Phase C — Boss Case #7 (Q3 위기)
 *
 * 1. Boss card defaults to LOCKED state with progress 0/6
 * 2. Visiting /cases/07-crisis directly still works (route not hidden)
 * 3. Solving the boss Apply with the correct answer credits 3 mastery bumps
 *    (loading + labor + yield) since the case touches all three
 * 4. Seeding localStorage with 6 × 3-star unlocks the boss card link
 */

const STORE_KEY = "cost-sim-v2-game:profile:v1";
const QUARTER_CASES = [
  "01-loading",
  "02-labor",
  "03-marginal",
  "04-material-yield",
  "05-cuts-mask",
  "06-tact-investment"
];

async function clearStorage(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.evaluate((key) => {
    try { localStorage.removeItem(key); } catch {}
  }, STORE_KEY);
}

async function seedSixThreeStars(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.evaluate(({ key, cases }) => {
    const caseScores: Record<string, unknown> = {};
    for (const id of cases) {
      caseScores[id] = {
        stars: 3,
        accuracy: 1,
        moves: 1,
        hintUsed: false,
        score: 135,
        attempts: 1,
        committedProfit: 10
      };
    }
    const data = {
      state: {
        caseScores,
        guidedCompleted: {},
        reflectNotes: {},
        campaign: { highestMonth: 6, cumulativeProfit: 60 },
        profile: {
          name: "테스트",
          createdAt: 1,
          introSeen: true,
          lastPlayedDate: "",
          streak: 0
        },
        variableMastery: { loading: 5, labor: 5, yield: 5, cuts: 5, mask: 5, tact: 5 }
      },
      version: 1
    };
    try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
  }, { key: STORE_KEY, cases: QUARTER_CASES });
}

test.describe("Phase C — Boss Case #7 (Q3 위기)", () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
  });

  test("Boss card defaults to LOCKED state with 0/6 progress", async ({ page }) => {
    await page.goto("/");
    const card = page.getByTestId("boss-card");
    await expect(card).toBeVisible();
    expect(await card.getAttribute("data-unlocked")).toBe("false");

    const progress = page.getByTestId("boss-progress");
    await expect(progress).toBeVisible();
    expect(Number(await progress.innerText())).toBe(0);

    // Locked state must NOT render the boss link
    await expect(page.getByTestId("boss-link")).toHaveCount(0);
  });

  test("Boss card UNLOCKS after seeding 6 × 3-star localStorage", async ({ page }) => {
    await seedSixThreeStars(page);
    await page.goto("/");

    const card = page.getByTestId("boss-card");
    await expect(card).toBeVisible();
    expect(await card.getAttribute("data-unlocked")).toBe("true");

    const link = page.getByTestId("boss-link");
    await expect(link).toBeVisible();
    expect(await link.getAttribute("href")).toBe("/cases/07-crisis");

    // Boss case route loads
    await link.click();
    await expect(page).toHaveURL(/\/cases\/07-crisis/);
    await expect(page.locator("h2").filter({ hasText: /Q3 위기/ })).toBeVisible({ timeout: 5_000 });
  });

  test("Boss case Apply with correct answer credits 3 mastery bumps", async ({ page }) => {
    // Bypass the unlock gate by going direct + dismissing intro modal if present
    await page.goto("/cases/07-crisis");
    const introDismiss = page.getByTestId("intro-dismiss");
    if (await introDismiss.isVisible({ timeout: 1_500 }).catch(() => false)) {
      await introDismiss.click();
    }

    // Hook → Discover → Apply (correct answer 32.305 within tolerance 0.5)
    await page.getByRole("button", { name: /Discover로 이동/ }).click();
    await expect(page.getByText("Panel 노무비").first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /이해했어요/ }).click();
    await page.getByTestId("apply-answer").fill("32.31");
    await page.getByRole("button", { name: "확인" }).click();
    await expect(page.getByTestId("apply-correct")).toBeVisible({ timeout: 3_000 });

    // Navigate home and verify 3 variable masteries each bumped to ≥1
    await page.goto("/");
    for (const v of ["loading", "labor", "yield"]) {
      const row = page.getByTestId(`mastery-row-${v}`);
      const level = Number(await row.getAttribute("data-level"));
      expect(level, `${v} should bump to ≥1 after boss case correct`).toBeGreaterThanOrEqual(1);
    }
    // cuts/mask/tact stay at 0 (boss doesn't tag them)
    for (const v of ["cuts", "mask", "tact"]) {
      const row = page.getByTestId(`mastery-row-${v}`);
      expect(Number(await row.getAttribute("data-level"))).toBe(0);
    }
  });
});
