# cost-sim-v2-game

> **개발원가 시뮬레이션 v2** — v1의 교육용 인터랙티브 도구를 **몰입형 게임**으로 전환합니다.
>
> v1 (frozen) 위에서 점수·캠페인·CFO 서사·진행 저장·마스터리·주스(confetti/sound) 메카닉을 추가합니다. v1의 검증된 cost engine, golden fixtures, Living Cost Tree, Playwright 회귀 harness는 모두 그대로 유지됩니다.
>
> **플랜**: `.omc/plans/2026-04-11-game-feel-upgrade.md`
> **이전 버전**: [`../cost-sim-v1/`](../cost-sim-v1/) (FROZEN, 2026-04-11)

## 시작하기

```bash
cd CI-Course/projects/cost-sim-v2-game
npm install
npm run dev          # http://localhost:3000
npm test             # vitest (cost engine golden fixtures, 33/33)
npm run gen:fixtures # Python oracle → JSON fixtures
npm run build
npx playwright test  # E2E (sandbox dropdown / guided flow / design QA / formula inspector)
```

## v1으로부터 상속받은 것

- ✅ Pure TS cost engine (`lib/cost-engine/`) + 27 골든 픽스처 ±0.001
- ✅ Living Cost Tree (reactflow LR 레이아웃, Framer Motion 펄스, 디자이너 에이전트 디자인 토큰)
- ✅ 6 케이스 Sandbox + Guided 4-phase (Hook → Discover → Apply → Reflect)
- ✅ ParamPanel (RHF + zod) · FormulaInspector (관련 수식 자동 수집) · Coach Drawer (정적 + AI fallback)
- ✅ PWA (manifest + 서비스 워커) · 다크 모드 · 모바일 반응형
- ✅ Playwright 14 spec E2E (sandbox 드롭다운 / guided flow / design QA / formula inspector / case 3 mutation)
- ✅ Root-cause 픽스 4건 (z-index stacking context · CasePage store priming · LR layout 클리핑 · RHF mount adapter)

## v2-game 추가 작업 (플랜에서)

### Phase A — Juice + visible score (1-2일)
- **M3**. ConfettiBurst (CSS-only ~1KB) · Web Audio chime · count-up · 햅틱
- **M2**. 케이스당 3성 평가 (정확도 · 슬라이더 효율 · 힌트 무사용)

### Phase B — Narrative + persistence + 캠페인 (2-3일)
- **M1**. 분기 캠페인 — 6 케이스 = Q2 6개월 · 누적 영업이익 vs 생존선
- **M4**. zustand persist · profile · 새로고침 후 진행 보존
- **S2**. CFO 서사 wrapper · Hook의 italic quote → CFO 쪽지

### Phase C — 마스터리 + 메타 루프 (3-5일)
- **S1**. 변수 마스터리 미터 (Loading/인건비/수율/면취수/Mask/Tact × 5단계)
- **C1**. 데일리 챌린지 (시드 PRNG)
- **C2**. 보스 케이스 #7 (3성 6개 잠금 해제, 골든 픽스처 28/28 확장)

### Sacred (건드리지 않음)
- `lib/cost-engine/engine.ts` · `presets.ts` · `__fixtures__/*.json` · `engine.test.ts`
- 27 골든 픽스처 ±0.001 회귀 — PR 리뷰의 1번 체크 항목
- Reflect 자유 응답은 게임화 금지 (학습 무결성 보호)

## 구조

```
app/                 # Next.js 14 App Router
  (learn)/sandbox    # Sandbox 모드
  (learn)/cases/[id] # Guided 4-phase
  api/ai/coach       # Edge runtime AI 프록시
components/          # React components
  CostTree/          # reactflow + dagre LR + Framer pulse (sacred 시각)
  Guided/            # Hook/Discover/Apply/Reflect
  ParamPanel/
  FormulaInspector/
  CoachDrawer/
  ui/                # Card, Button, Slider, PhaseChip, Container
lib/
  cost-engine/       # SACRED — engine + types + presets + diff + golden fixtures
  coach/             # Static + AI 코치
  store.ts           # Zustand
content/
  glossary.json
  coach-tone.md
  cases/*.json       # 6 케이스 메타데이터
  case-adapters/*.ts # ≤20-line 변환 함수
scripts/
  gen-fixtures.py    # Python oracle 호출 (v1과 동일 oracle 참조)
tests/e2e/           # Playwright (v1에서 14 spec 그대로 가져옴)
docs/
```

## 번들 가드레일

- 현재 (v1 베이스라인): `/sandbox` 224 KB · `/cases/[id]` 231 KB First Load JS gzip
- v2 ceiling: **250 KB** (AC12)
- 헤드룸: 약 22 KB. confetti(~1KB) + sound(~0.5KB) + persist(~0KB, zustand 내장) ≈ **+2.5~4 KB** 예상
- 금지 라이브러리: canvas-confetti / howler / tone / lottie / react-rewards (KB 낭비)
