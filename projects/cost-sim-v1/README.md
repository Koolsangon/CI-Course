# cost-sim-v1 — ❄️ FROZEN

> **이 디렉토리는 v1.0 최종 산출물(2026-04-11)으로 동결되었습니다.** 신규 기능 작업은 [`../cost-sim-v2-game/`](../cost-sim-v2-game/)에서 진행됩니다.
>
> v1은 교육용 인터랙티브 도구의 안정 버전입니다 — 골든 픽스처 27/27, Playwright 14/14, 33 vitest 모두 통과. 버그 수정만 backport, 게임 메카닉(점수·캠페인·CFO 서사 등)은 v2-game으로 이전.
>
> **무엇이 v1에 포함되어 있나**: Living Cost Tree (reactflow LR 레이아웃) · 6 케이스 Sandbox + Guided 4-phase · 정적 코치 + AI fallback · PWA · 골든 픽스처 회귀 · z-index/store-priming/LR-layout/RHF mount-adapter 4개 root cause 픽스 · Playwright dropdown/guided/design-qa/formula-inspector E2E 14 spec · `engine/cost_model.py` (oracle, 삭제 금지)
>
> **무엇이 v1에 없는가** (v2-game 플랜에서 다룸): 점수·별 평가·캠페인·서사·진행 저장·마스터리·주스(confetti/sound). 분석은 `.omc/plans/2026-04-11-game-feel-upgrade.md` 참조.

---

## 원본 정보

개발원가 시뮬레이션 **v1.0** — Living Cost Tree 재설계.
플랜: `.omc/plans/2026-04-11-cost-sim-v1-redesign.md`

## 시작하기

```bash
cd CI-Course/projects/cost-sim-v1
npm install
npm run dev          # http://localhost:3000
npm test             # vitest (cost engine golden fixtures)
npm run gen:fixtures # Python oracle → JSON fixtures
npm run build
```

## 구조

```
app/                 # Next.js 14 App Router
  (learn)/sandbox    # Sandbox 모드
  (learn)/cases/[id] # Guided 4-phase
  api/ai/coach       # Edge runtime AI 프록시
components/          # React components
lib/
  cost-engine/       # Pure TS 엔진 + golden fixtures
  coach/             # Static + AI 코치
  store.ts           # Zustand
content/
  glossary.json
  coach-tone.md
  cases/*.json       # 6 케이스 메타데이터
  case-adapters/*.ts # ≤20-line 변환 함수
scripts/
  gen-fixtures.py    # Python oracle 호출
docs/
```

## v0.3 (구 버전)

`CI-Course/projects/cost-sim-wargame-v0/` 에 보존 (deprecated).
