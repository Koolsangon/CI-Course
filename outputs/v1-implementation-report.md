# Cost Sim v1.0 — Implementation Report

> 작성일: 2026-04-11
> 플랜: `.omc/plans/2026-04-11-cost-sim-v1-redesign.md` (CONSENSUS APPROVED v2)
> 실행: Ralph loop (Phase 0a → Phase 7)
> 저장소: `CI-Course/projects/cost-sim-v1/`

## 0. Executive Summary

Living Cost Tree 재설계를 단일 세션 내에서 Phase 0a–Phase 7 (docs) 까지 완주. Python `cost_model.py`를 oracle로 사용하는 **골든 픽스처 27/27 ±0.001 회귀 테스트가 HARD GATE를 통과**했고, 이후 모든 phase가 문제없이 빌드·테스트되었다. Phase 7의 파일럿만 실제 학습자가 필요하기 때문에 본 세션에서는 런북/매뉴얼/instrument까지 완성하고, 실제 측정은 다음 세션으로 이연.

## 1. Phase 완료 현황

| Phase | 목표 | 결과 | 증거 |
|---|---|---|---|
| 0a — Env 셋업 | Next.js 14 + TS strict + 핵심 의존성 | ✅ | `npx tsc --noEmit` clean, `next build` 성공 |
| 0b — 자산 흡수 | glossary/brand-voice/cases/instrument | ✅ | `content/glossary.json`, `content/coach-tone.md`, `content/cases/*.json` (6), `content/instrument/pre-post.json` |
| **1 — TS 엔진 + 골든 픽스처 (HARD GATE)** | Python oracle 기반 27/27 ±0.001 | ✅ | `scripts/gen-fixtures.py` 생성, `engine.test.ts` 29/29 통과 (27 assertions + 2 reference sanity) |
| 2 — Living Cost Tree | reactflow + dagre + Framer pulse | ✅ | `components/CostTree/`, `diff.test.ts` 2/2 통과 |
| 3 — Sandbox + ParamPanel + Inspector | Zustand + RHF/zod + 수식 인스펙터 | ✅ | `app/(learn)/sandbox/page.tsx`, 빌드 성공 214KB |
| 4 — Guided 6 Cases | Hook/Discover/Apply/Reflect + 6 어댑터 | ✅ | `components/Guided/*`, 어댑터 6개 모두 ≤20줄, Reflect 클라이언트 전용 (R9) |
| 5 — Static Coach + AI Layer | 24 항목 정적 코치 + Edge AI 라우트 (fallback) | ✅ | `lib/coach/static-coach.ts` 24/24 커버리지 검증, `/api/ai/coach` 존재 |
| 6 — PWA + Bundle | SW + 매니페스트 + 번들 ≤250KB | ✅ | `/sandbox` 214KB, `/cases/*` 223KB — 모두 AC12 통과 |
| 7 — Pilot docs | 매뉴얼/가이드/런북 | ✅ (docs만) | `docs/instructor-manual.md`, `case-authoring-guide.md`, `pilot-runbook.md` |

## 2. Acceptance Criteria 체크리스트

| AC | 내용 | 상태 | 근거 |
|---|---|---|---|
| AC1 | 슬라이더 조작 시 200ms 이내 시각 강조 | ⏳ (코드 O, 측정 미실시) | Framer Motion 200ms pulse 구현, 실기기 측정은 Phase 7 |
| AC2 | paired pre/post delta ≥ +30% | ⏳ (instrument O, 파일럿 미실시) | `content/instrument/pre-post.json` 10문항 작성 완료 |
| AC3 | 수식 인스펙터 (변수/단위/값) | ✅ | `components/FormulaInspector/FormulaInspector.tsx` |
| AC4 | Sandbox 95p ≤ 16ms | ⏳ (미측정) | 엔진 단일 호출 < 1ms 확인, 실기기 Chrome Profiler 측정은 Phase 7 |
| AC5 | 네트워크 단절 시 100% 작동 | ✅ (구현) | `public/sw.js` cache-first content, DevTools 검증은 파일럿 |
| AC6 | iOS 16.4+ / Android Chrome 120+ | ⏳ (매트릭스 O, 실기기 미검증) | `docs/device-matrix.md` 작성 |
| AC7 | AI 장애 시 graceful degrade | ✅ | `/api/ai/coach` 에러 catch → 정적 반환 |
| **AC8** | **TS ↔ Python ±0.001** | **✅ PASS** | **engine.test.ts 29/29 (27 required + 2 reference), Phase 1 HARD GATE 통과** |
| AC9 | 6 케이스 reference 일치 | ✅ | golden fixtures references.json이 v0 oracle과 동일 |
| AC10 | 두 경로 문서화 (JSON + ≤20줄 어댑터) | ✅ | `docs/case-authoring-guide.md` |
| AC11 | 용어집 hover 팝오버 | ⏳ (글로서리 JSON O, UI 미구현) | v1.1 백로그 또는 Phase 6 follow-up |
| AC12 | 번들 ≤ 250KB gzip | ✅ | `docs/bundle-report.md` sandbox 214KB, cases 223KB |

## 3. 테스트 요약

```
 RUN  v2.1.2
 ✓ lib/cost-engine/__tests__/diff.test.ts      (2 tests)
 ✓ lib/cost-engine/engine.test.ts              (29 tests)   ← HARD GATE
 ✓ lib/coach/__tests__/static-coach.test.ts    (2 tests)

 Test Files  3 passed (3)
      Tests  33 passed (33)
```

## 4. 번들 보고 (next build)

| Route | First Load JS | 판정 |
|---|---|---|
| `/` | 94.1 kB | ✅ |
| `/sandbox` | 214 kB | ✅ (AC12) |
| `/cases/[caseId]` | 223 kB | ✅ (AC12) |
| `/api/ai/coach` | 0 kB (edge) | ✅ |

## 5. R-리스크 상태 (플랜 §7)

| # | 리스크 | 상태 | 메모 |
|---|---|---|---|
| R1 | TS 포팅 부동소수점 | **해결** | 골든 픽스처로 ±0.001 증명 |
| R2 | reactflow + Framer 학습 곡선 | 해결 | Position enum 초기 에러 외 무이슈 |
| R3 | 30명 부하 | N/A | Workshop v1.1 이연 |
| R4 | AI 코치 품질 | 관찰 필요 | 정적이 본진, AI feature flag |
| R5 | 강사 거부감 | 미검증 | Phase 7 리허설 필요 |
| R6 | AC2 객관성 | 부분 완화 | Instrument 작성, n=3 모호성 점검 남음 |
| R7 | 어댑터 = 코드 | 해결 | 두 경로 문서화 (AC10) |
| R8 | 모바일 FPS | 부분 완화 | GPU 가속 속성만 사용, 실기기 측정 남음 |
| R9 | PIPA | **해결** | Reflect 클라이언트 전용 (store.ts:recordReflection), AI route도 caseId/phase만 수신 |
| R10 | v0 자산 흡수 | 해결 | Phase 0b에서 완료 |

## 6. v1.1 백로그 (다음 세션)

1. **파일럿 실시** — 학습자 5~10명, paired pre/post 측정, AC2 검증
2. **AC11 용어집 hover 팝오버** — Radix Popover 또는 shadcn Tooltip 적용
3. **AC1/AC4/AC6 실기기 측정** — Chrome DevTools Performance 프로파일
4. **Workshop 모드** — 실시간 멀티플레이어, 리더보드, 이벤트 (별도 2주)
5. **n=3 instrument validation** — 비대상 사용자 모호성 점검
6. **AI 코치 질적 평가** — Phase 5 Day 2 결과 기반으로 feature flag 영구 on/off 결정

## 7. v0.3 처리

- `CI-Course/projects/cost-sim-wargame` → `CI-Course/projects/cost-sim-wargame-v0/` 로 이동
- v0 README에 deprecated banner 필요 (다음 세션)

## 8. 주요 결정 로그

| 결정 | 근거 |
|---|---|
| pnpm → npm 대체 | 호스트 환경에서 corepack sudo 권한 없음 |
| Workshop 이연 | Consensus 단계에서 3일 추정 비현실 |
| reactflow 선택 | D3 대비 React 네이티브, 일정 1~2일 절약 |
| 골든 픽스처 full precision (round 제거) | ±0.001 tolerance 달성을 위해 |

---

## 9. 2026-04-11 Playwright QA 세션 (FINAL — v1.0 동결)

> Phase 0a–7 초기 빌드 완료 후, 사용자 플레이테스트에서 추가로 발견된 4건의 root cause 버그를 Playwright로 reproduce → 수정 → 회귀로 잠그는 작업을 진행. v1.0은 이 시점에서 동결.

### 발견된 root cause 버그 (모두 Playwright로 검증)

| # | 버그 | Root cause | 수정 파일 |
|---|---|---|---|
| 1 | Sandbox 드롭다운 옵션 클릭 무반응 | 헤더 `backdrop-blur-md`가 stacking context 생성, dropdown z-10이 fixed click-outside overlay z-5보다 아래로 내려감 | `app/(learn)/sandbox/page.tsx` 헤더에 `relative z-20` 추가 |
| 2 | Guided Hook → Discover 클릭 무반응 | `advanceGuidedPhase()`가 store.caseId null이면 early return. CasePage가 store를 prime하지 않음 | `app/(learn)/cases/[caseId]/page.tsx`에 useEffect로 `loadCase + setGuidedPhase("hook")` 추가 |
| 3 | Cost Tree 하단 노드 가로 클리핑 | TB 레이아웃 + 10개 leaf 노드 → 2178px 너비, viewport 730px, fitView minZoom 0.6 캡 | `components/CostTree/layout.ts`를 `rankdir: "LR"`로 전환, Handle 위치 Left/Right, fitView minZoom 0.25 |
| 4 | 슬라이더가 case default(50%)인데 트리는 reference(70%) 값 | RHF `useForm({ defaultValues })`는 mount 시 `watch` 콜백 트리거 안 함 | `components/ParamPanel/ParamPanel.tsx` mount useEffect에서 `applyCaseAdapter(caseDef.adapter, caseDef.reference, defaults)` 수동 호출 |

### 추가 UX 개선

| # | 이슈 | 수정 |
|---|---|---|
| 5 | Case 3 한계이익률 목표 슬라이더가 NO-OP | `content/case-adapters/index.ts`의 marginal 어댑터가 `(base) => base`였음. 목표율에서 역산한 필요 재료비로 BOM 전체 비례 스케일하도록 구현 |
| 6 | Loading 케이스에서 수식 인스펙터가 COM ↔ 가공비 공식을 왔다갔다 | `lib/cost-engine/diff.ts` sort에 specificity tiebreaker 추가 (deeper/more-specific 노드 우선) |
| 7 | 인건비 케이스에서 수식이 1개만 표시 | `components/FormulaInspector/FormulaInspector.tsx`의 수식 수집 루프가 top-4 delta에 묶여 있었음. 전체 lastDelta를 훑어 unique formula 최대 5개 수집하도록 분리 |
| 8 | 노드가 너무 작아 가시성 부족 | NODE_WIDTH 168, NODE_HEIGHT 72 + 패널 토글(Left/Right/Focus) + 폭 264/256으로 축소 |

### Playwright E2E harness (신규)

`tests/e2e/` 디렉토리 + `playwright.config.ts` (chromium, dev 서버 reuse). 14 spec 모두 통과:

| Spec | 검증 항목 |
|---|---|
| `sandbox-dropdown.spec.ts` | 6 케이스 모두 클릭 + 트리 fingerprint uniqueness · Case 3 한계이익률 슬라이더 mutation |
| `guided-flow.spec.ts` | Hook → Discover → Apply (29.82) → Reflect → "다음 케이스로" → /cases/02-labor 네비게이션 |
| `design-qa.spec.ts` | home 카드 가시성 · sandbox 트리 폭 ≥600px · 트리 노드 클리핑 없음 · FormulaInspector row overflow 없음 · CTA touch target ≥44px |
| `formula-inspector.spec.ts` | 6 케이스 각각 수식 ≥1개 · 라벨 dump 로깅 |

### 최종 회귀 결과

| 항목 | 결과 |
|---|---|
| Playwright | **14/14 pass** |
| Vitest (engine + diff + coach) | **33/33 pass** (27 골든 픽스처 ±0.001 + 6 보조) |
| `npx tsc --noEmit` | clean |
| `npm run lint` | clean |
| Architect 리뷰 | **APPROVE** (Sonnet 모델로 4가지 root cause 픽스 grep 검증 + 스크린샷 시각 검증) |
| Deslop 패스 | 섹션 헤더 주석 제거, load-bearing WHY 주석 보존, 회귀 0건 |

### v2-game 분리

이후 사용자 요청으로 게임 디자인 진단 + 몰입형 게임 리디자인 플랜을 별도 작성:

- 플랜 파일: `.omc/plans/2026-04-11-game-feel-upgrade.md` (315 lines)
- 진단: 게임 디자인 8 차원 평균 **14/40 (35%)** — 코어 루프 2/5, 진행/마스터리 1/5, 서사 stakes 1/5, 메타 골 1/5
- MUST 4개: 분기 캠페인 / 케이스당 3성 평가 / 정답 순간 juice (confetti+chime+count-up) / persist (zustand persist middleware)
- 새 프로젝트: [`CI-Course/projects/cost-sim-v2-game/`](../projects/cost-sim-v2-game/) (v1 fork, npm install + 4 root cause 픽스 + Playwright harness 포함 상속)

### v1 동결 사유

v1은 다음 조건을 모두 충족하므로 안정 산출물로 동결:
- ✅ 골든 픽스처 27/27 ±0.001
- ✅ Playwright 14/14
- ✅ Vitest 33/33
- ✅ 4건 root cause 모두 reproduce + 회귀로 잠금
- ✅ Architect APPROVE

신규 기능(점수 · 캠페인 · 서사 · persist · juice · 마스터리)은 모두 v2-game에서 진행. v1은 버그 수정만 backport.
