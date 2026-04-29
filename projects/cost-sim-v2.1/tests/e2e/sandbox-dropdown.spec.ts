import { test, expect } from "@playwright/test";

const CASES = [
  { title: "Loading 변화" },
  { title: "재료비 절감 vs 수율 하락" },
  { title: "면취수 · Mask 복합 변화" },
  { title: "Tact 지연 + 투자비" }
];

async function readTreeFingerprint(page: import("@playwright/test").Page): Promise<string> {
  return page.locator(".react-flow__node").evaluateAll((nodes) =>
    nodes
      .map((n) => (n as HTMLElement).innerText.replace(/\s+/g, " ").trim())
      .join("|")
  );
}

test.describe("Sandbox case dropdown — v2.1", () => {
  test("all 4 cases are selectable and each produces a distinct tree state", async ({ page }) => {
    await page.goto("/sandbox");
    await expect(page.locator(".react-flow__node").first()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(200);

    const fingerprints: string[] = [];

    for (let i = 0; i < CASES.length; i += 1) {
      const target = CASES[i]!;

      const selector = page
        .locator("header button")
        .filter({ hasText: /Loading 변화|재료비|면취수|Tact/ })
        .first();
      await selector.click();

      const option = page
        .locator("header button")
        .filter({ hasText: target.title })
        .last();
      await expect(option).toBeVisible({ timeout: 3_000 });
      await option.click();

      await expect(
        page.locator("header button").filter({ hasText: target.title }).first()
      ).toBeVisible({ timeout: 3_000 });

      await page.waitForTimeout(250);

      const fp = await readTreeFingerprint(page);
      expect(fp.length, `case ${i + 1} "${target.title}" fingerprint must be non-empty`).toBeGreaterThan(0);
      fingerprints.push(fp);
    }

    expect(fingerprints[0]).not.toBe(fingerprints[1]);
    expect(fingerprints[0]).not.toBe(fingerprints[3]);

    for (let i = 0; i < fingerprints.length; i += 1) {
      expect(fingerprints[i]!).toMatch(/PANEL 노무비/);
    }
  });
});
