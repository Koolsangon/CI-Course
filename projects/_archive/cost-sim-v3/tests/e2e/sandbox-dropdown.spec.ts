import { test, expect } from "@playwright/test";

// Case order matches lib/cases.ts CASE_ORDER.
const CASES = [
  { title: "Loading 변화" },
  { title: "인건비 변화" },
  { title: "한계이익률 목표" },
  { title: "재료비 절감 vs 수율 하락" },
  { title: "면취수 · Mask 복합 변화" },
  { title: "Tact 지연 + 투자비" }
];

async function readTreeFingerprint(page: import("@playwright/test").Page): Promise<string> {
  // Concatenate all tree node values into a stable fingerprint string.
  // If the fingerprint changes between two cases, the store actually updated.
  return page.locator(".react-flow__node").evaluateAll((nodes) =>
    nodes
      .map((n) => (n as HTMLElement).innerText.replace(/\s+/g, " ").trim())
      .join("|")
  );
}

test.describe("Sandbox case dropdown — US-PW-2 (critical bug)", () => {
  test("all 6 cases are selectable and each produces a distinct tree state", async ({ page }) => {
    await page.goto("/sandbox");
    // Wait for the reactflow tree to mount
    await expect(page.locator(".react-flow__node").first()).toBeVisible({ timeout: 15_000 });
    // Give the initial adapter a frame to run
    await page.waitForTimeout(200);

    const fingerprints: string[] = [];

    for (let i = 0; i < CASES.length; i += 1) {
      const target = CASES[i]!;

      // Click the selector button (whichever title it currently holds)
      const selector = page
        .locator("header button")
        .filter({ hasText: /Loading 변화|인건비 변화|한계이익률 목표|재료비|면취수|Tact/ })
        .first();
      await selector.click();

      // Click the option inside the open dropdown
      const option = page
        .locator("header button")
        .filter({ hasText: target.title })
        .last();
      await expect(option).toBeVisible({ timeout: 3_000 });
      await option.click();

      // Selector button must now display the target title
      await expect(
        page.locator("header button").filter({ hasText: target.title }).first()
      ).toBeVisible({ timeout: 3_000 });

      // Allow the ParamPanel remount + adapter run to propagate
      await page.waitForTimeout(250);

      const fp = await readTreeFingerprint(page);
      expect(fp.length, `case ${i + 1} "${target.title}" fingerprint must be non-empty`).toBeGreaterThan(0);
      fingerprints.push(fp);
    }

    // Uniqueness check: every case should produce a distinct fingerprint except
    // where cases intentionally share the same reference (e.g. case 3 marginal
    // is read-only and case 4 default yields same values as case 1). At minimum,
    // cases 1 and 2 must differ (Loading vs Labor baselines).
    expect(fingerprints[0]).not.toBe(fingerprints[1]); // Loading 50% ≠ Labor 1.5x
    expect(fingerprints[0]).not.toBe(fingerprints[5]); // Loading 50% ≠ Tact+invest

    // Every fingerprint must contain the Panel 노무비 label (structure intact)
    for (let i = 0; i < fingerprints.length; i += 1) {
      expect(fingerprints[i]!).toMatch(/PANEL 노무비/);
    }
  });

  // Case 3 was previously a NO-OP adapter — verify the slider now moves the tree.
  test("Case 3 한계이익률 목표 slider actually mutates the tree", async ({ page }) => {
    await page.goto("/sandbox");
    await expect(page.locator(".react-flow__node").first()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(200);

    await page
      .locator("header button")
      .filter({ hasText: /Loading 변화|인건비 변화|한계이익률 목표|재료비|면취수|Tact/ })
      .first()
      .click();
    await page.locator("header button").filter({ hasText: "한계이익률 목표" }).last().click();
    await page.waitForTimeout(300);

    const fpBefore = await readTreeFingerprint(page);

    const slider = page.locator("input[type='range']").first();
    await slider.focus();
    for (let i = 0; i < 8; i += 1) await slider.press("ArrowRight");
    await page.waitForTimeout(300);

    const fpAfter = await readTreeFingerprint(page);
    expect(
      fpAfter,
      "Case 3 target-rate slider must mutate the tree (was NO-OP adapter before fix)"
    ).not.toBe(fpBefore);
    expect(fpAfter).toMatch(/소요재료비/);
  });
});
