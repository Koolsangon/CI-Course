import { test, chromium, type Browser } from "@playwright/test";

/**
 * 시나리오 카드 가독성 리뷰용 스크린샷.
 * 4개 문항의 카드 영역만 잘라서 저장 — UI 개선 의사결정 자료.
 *
 * 사내망 TLS 인터셉트로 playwright 브라우저 다운로드 실패 → 시스템 Chrome 사용.
 */

const PROBLEMS = [
  { id: "01-loading", titleKeyword: "Loading" },
  { id: "04-material-yield", titleKeyword: "재료비" },
  { id: "05-cuts-mask", titleKeyword: "면취수" },
  { id: "06-tact-investment", titleKeyword: "Tact" }
] as const;

const SYSTEM_CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

let sharedBrowser: Browser | undefined;

test.beforeAll(async () => {
  sharedBrowser = await chromium.launch({
    executablePath: SYSTEM_CHROME,
    headless: true
  });
});

test.afterAll(async () => {
  await sharedBrowser?.close();
});

for (const p of PROBLEMS) {
  test(`scenario card — ${p.id}`, async () => {
    const ctx = await sharedBrowser!.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`http://localhost:3001/cases/${p.id}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    // 시나리오 카드 등장 대기
    await page.locator(`h2:has-text("${p.titleKeyword}")`).first().waitFor({ timeout: 15_000 });

    // 가이드 모달 닫기
    const guideClose = page.locator('button:has-text("건너뛰기")').first();
    if (await guideClose.isVisible().catch(() => false)) {
      await guideClose.click();
      await page.waitForTimeout(300);
    }

    // 시나리오 카드 영역만 캡처
    const card = page.locator(`h2:has-text("${p.titleKeyword}")`).first().locator('xpath=ancestor::div[contains(@class, "rounded-2xl")][1]');
    await card.screenshot({ path: `test-results/scenario-card/${p.id}.png` });

    // 페이지 상단 (헤더 + 카드 + 테이블 위쪽) 캡처
    await page.screenshot({
      path: `test-results/scenario-card/${p.id}-top.png`,
      clip: { x: 0, y: 0, width: 1280, height: 600 }
    });

    await ctx.close();
  });
}
