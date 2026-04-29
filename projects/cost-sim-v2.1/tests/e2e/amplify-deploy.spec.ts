import { test, expect } from "@playwright/test";

const AMPLIFY_URL = process.env.AMPLIFY_URL ?? "https://master.d26yr76roz76fk.amplifyapp.com";

test.describe("Amplify deployment verification", () => {
  test.use({ baseURL: AMPLIFY_URL });

  test("home page loads with 200", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toContainText("살아있는 원가 트리");
  });

  test("home page has mode cards", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("text=Sandbox")).toBeVisible();
    await expect(page.locator("text=Guided Cases")).toBeVisible();
    await expect(page.locator("text=오늘의 도전")).toBeVisible();
  });

  test("sandbox route loads", async ({ page }) => {
    const response = await page.goto("/sandbox", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
  });

  test("cases route loads", async ({ page }) => {
    const response = await page.goto("/cases/01-loading", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
  });

  test("daily route loads", async ({ page }) => {
    const response = await page.goto("/daily", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
  });
});
