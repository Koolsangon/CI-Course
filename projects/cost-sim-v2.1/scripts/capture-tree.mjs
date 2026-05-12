import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const outDir = "/tmp/v21-shots";
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();

await page.goto("http://localhost:3000/sandbox", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2500);

// Default = 01-loading
const file1 = path.join(outDir, "sandbox-01-loading.png");
await page.screenshot({ path: file1, fullPage: false });
console.log(`captured 01 -> ${file1}`);

// Switch through other cases via dropdown
const cases = [
  { id: "04-material-yield", label: "Material" },
  { id: "05-cuts-mask", label: "Mask" },
  { id: "06-tact-investment", label: "Tact" }
];

for (const c of cases) {
  // Open dropdown (click the case selector button at top right)
  const dropdownBtn = page.locator("header button:has(svg.lucide-chevron-down)").first();
  await dropdownBtn.click();
  await page.waitForTimeout(300);
  // Click matching case option
  await page.locator("button", { hasText: new RegExp(c.label) }).first().click();
  await page.waitForTimeout(1500);
  const f = path.join(outDir, `sandbox-${c.id}.png`);
  await page.screenshot({ path: f, fullPage: false });
  console.log(`captured ${c.id} -> ${f}`);
}

await browser.close();
