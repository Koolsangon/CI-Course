/**
 * Debug spec — 강사 방 생성/토글/삭제 + 학습자 입장 + 라운드 reset 시나리오.
 * dev server 가 localhost:3000 에 떠 있어야 한다 (config.webServer 없음).
 *
 * 시나리오 (단일 test 로 묶음, 중간 단계 결과를 console 로 보고):
 *  1) 강사 컨텍스트 — /instructor → 새 방 만들기 → {code} 추출
 *  2) /instructor 인덱스 복귀 → "활성" 도트 + status 확인
 *  3) 비활성 토글 → 인덱스에 "비활성" 표시
 *  4) 학습자 컨텍스트 — 비활성 룸에 입장 시도 → 거부 메시지
 *  5) 강사 — 다시 활성화
 *  6) 학습자 — 입장 성공 → /menu
 *  7) 강사 — R1 시작 → 학습자 폴링이 ProblemPage 로 이동시키는지
 *  8) 강사 — R1 종료 → R1 reset (확인 dialog 자동 수락) → 라운드 카드 "시작" 다시 등장
 *  9) 강사 — /instructor 인덱스에서 방 삭제 (인덱스 휴지통)
 */

import { test, expect, type BrowserContext, type Page } from "@playwright/test";

// LG Display 사내망 TLS 인터셉트로 Playwright CDN 차단 → 번들 chromium 다운로드 실패.
// 시스템에 설치된 Chrome 으로 대체 (msedge 도 가능).
test.use({ channel: "chrome" });

async function dismissIntroIfAny(page: Page) {
  // 학습자 첫 진입 시 IntroSequence 가 떠 있을 수 있음 — 건너뛰기 시도.
  const skip = page.getByRole("button", { name: /건너뛰기|skip/i });
  if (await skip.first().isVisible({ timeout: 1_500 }).catch(() => false)) {
    await skip.first().click();
    await page.waitForTimeout(200);
  }
}

test("instructor + learner full flow (toggle, R1, reset, delete)", async ({ browser }) => {
  test.setTimeout(90_000);

  // 강사 컨텍스트 — localStorage 격리.
  const instructorCtx: BrowserContext = await browser.newContext();
  const instructor: Page = await instructorCtx.newPage();

  // confirm() 모두 자동 수락.
  instructor.on("dialog", (d) => d.accept().catch(() => {}));

  instructor.on("console", (msg) => {
    if (msg.type() === "error") console.log("[instructor console.error]", msg.text());
  });
  instructor.on("pageerror", (e) => console.log("[instructor pageerror]", e.message));

  // 1) 강사 — 새 방 만들기
  await instructor.goto("/instructor");
  await expect(instructor.getByRole("button", { name: /새 방 만들기/ })).toBeVisible({ timeout: 10_000 });

  // /instructor/{code} 로의 이동을 URL 변화로 대기.
  await Promise.all([
    instructor.waitForURL(/\/instructor\/[A-Z0-9]{4}$/, { timeout: 15_000 }),
    instructor.getByRole("button", { name: /새 방 만들기/ }).click()
  ]);

  const code = instructor.url().match(/\/instructor\/([A-Z0-9]{4})/)?.[1];
  expect(code).toMatch(/^[A-Z0-9]{4}$/);
  console.log(`[1] room created: ${code}`);

  // 강사 본체 페이지 — 활성 배지 확인.
  await expect(instructor.locator("text=활성").first()).toBeVisible({ timeout: 5_000 });
  console.log(`[1] instructor room page shows 활성 badge`);

  // 2) 인덱스 복귀 → 활성 도트 + 상태 라벨 확인.
  await instructor.goto("/instructor");
  const codeRow = instructor.locator("li", { hasText: code! });
  await expect(codeRow).toBeVisible({ timeout: 10_000 });
  // 상태 라벨 — "활성 · waiting · 0명"
  await expect(codeRow).toContainText(/활성/);
  await expect(codeRow).toContainText(/waiting/);
  console.log(`[2] index row: active dot + label OK`);

  // 3) 비활성 토글 (인덱스에서)
  await codeRow.getByRole("button", { name: /비활성화/ }).click();
  await expect(codeRow).toContainText(/비활성/, { timeout: 5_000 });
  console.log(`[3] toggled to disabled`);

  // 4) 학습자 컨텍스트 — 비활성 룸 입장 시도
  const learnerCtx: BrowserContext = await browser.newContext();
  const learner: Page = await learnerCtx.newPage();
  learner.on("dialog", (d) => d.accept().catch(() => {}));
  learner.on("console", (msg) => {
    if (msg.type() === "error") console.log("[learner console.error]", msg.text());
  });

  await learner.goto("/");
  await dismissIntroIfAny(learner);

  // 룸 입장 폼.
  await learner.locator("input[placeholder='ABCD']").fill(code!);
  await learner.locator("input[placeholder='이름']").fill("디버그");
  // 팀 번호 1 (default)
  await learner.getByRole("button", { name: /입장/ }).click();

  // 거부 메시지 표시 확인 (cannot join).
  const joinError = learner.locator("p.text-\\[hsl\\(var\\(--danger\\)\\)\\]");
  await expect(joinError).toContainText(/disabled|cannot join/i, { timeout: 5_000 });
  console.log(`[4] disabled room rejected learner join: "${await joinError.textContent()}"`);

  // 5) 강사 — 다시 활성화
  await codeRow.getByRole("button", { name: /활성화/ }).click();
  await expect(codeRow).toContainText(/활성/, { timeout: 5_000 });
  // "비활성" 글자가 라벨에 남아있지 않은지.
  const labelText = await codeRow.textContent();
  expect(labelText).not.toMatch(/비활성/);
  console.log(`[5] re-enabled`);

  // 6) 학습자 — 다시 입장 시도. 입력은 그대로 남아 있음.
  await learner.getByRole("button", { name: /입장/ }).click();
  await learner.waitForURL(/\/menu$/, { timeout: 10_000 });
  console.log(`[6] learner joined → /menu`);

  // 7) 강사 — 본체 페이지로 이동 → R1 시작.
  await instructor.goto(`/instructor/${code}`);
  const r1Card = instructor.locator("div", { hasText: /^R1/ }).first();
  await expect(r1Card).toBeVisible({ timeout: 5_000 });
  await r1Card.getByRole("button", { name: /시작/ }).click();
  // 라운드가 in_progress 로 표시될 때까지.
  await expect(r1Card).toContainText(/in_progress/, { timeout: 5_000 });
  console.log(`[7] instructor started R1`);

  // 학습자 — useRoomState 폴링(2초) 으로 /cases 로 redirect.
  await learner.waitForURL(/\/cases\/01-loading.*game=true.*round=1/, { timeout: 15_000 });
  console.log(`[7] learner auto-redirected to game worksheet: ${learner.url()}`);

  // 8) 강사 — R1 종료 → reset.
  await r1Card.getByRole("button", { name: /종료/ }).click();
  await expect(r1Card).toContainText(/ended/, { timeout: 5_000 });
  await r1Card.getByRole("button", { name: /초기화/ }).click();
  // reset 후 "시작" 버튼이 다시 보임.
  await expect(r1Card.getByRole("button", { name: /시작/ })).toBeVisible({ timeout: 5_000 });
  // status 가 not_started 로 돌아갔는지.
  await expect(r1Card).toContainText(/not_started/);
  console.log(`[8] R1 reset OK — 시작 button re-appeared`);

  // 9) /instructor 인덱스에서 삭제.
  await instructor.goto("/instructor");
  const codeRow2 = instructor.locator("li", { hasText: code! });
  await expect(codeRow2).toBeVisible({ timeout: 5_000 });
  await codeRow2.getByRole("button", { name: /방 삭제/ }).click();
  await expect(instructor.locator("li", { hasText: code! })).toHaveCount(0, { timeout: 5_000 });
  console.log(`[9] room ${code} deleted from index`);

  await instructorCtx.close();
  await learnerCtx.close();
});
