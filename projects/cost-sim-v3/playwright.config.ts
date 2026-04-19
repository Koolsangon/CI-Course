import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 1280, height: 800 },
    testIdAttribute: "data-test"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], testIdAttribute: "data-test" }
    }
  ]
  // NOTE: dev server is already running externally — no webServer block
});
