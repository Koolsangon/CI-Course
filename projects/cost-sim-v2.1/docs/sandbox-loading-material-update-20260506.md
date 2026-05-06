# Sandbox 수정: Loading & Material-Yield Case 개선 — 2026-05-06

> 부서장(책임) 청중 대상 시뮬레이션 정합성을 위한 Sandbox 두 케이스(`01-loading`, `04-material-yield`) 표현/엔진/UI 개선 작업 기록.

---

## 1. 작업 계획 (입력)

### 1.1 컨텍스트
`projects/cost-sim-v2.1`의 Sandbox 두 케이스에 대해 다음을 요구함.

- 케이스 헤더/슬라이더 라벨을 부서장 톤으로 정돈 (예: "새 Loading" → "Loading율")
- 트리 시각화의 정밀도(소수점 1자리), 변동/비변동 색상 구분, 신규 노드(영업이익), 라벨 변경(상각비→감상비)
- 수식 인스펙터를 정적 수식 카드 3개 대신, "변동 내역(상세 식)" + "결과(가공비/COM/COP/영업이익)" 4줄로 케이스 특화 구성
- Case 04: Module 수율 변동이 가공비 6항목까지 연쇄 영향 (스케일링), 트리 좌상단 'Module 수율'·'Net 재료비' 정보 카드

### 1.2 영향 받는 핵심 파일

| 파일 | 변경 |
|------|------|
| `content/cases/01-loading.json` | title, variable.ko, default, inspector 스펙 추가 |
| `content/cases/04-material-yield.json` | title, scenario, variable.ko, inspector + tree_info 스펙 |
| `lib/cost-engine/types.ts` | (변경 없음 — `operating_profit` 이미 존재) |
| `content/case-adapters/index.ts` | `materialYield` 어댑터에서 yield 비율로 가공비 6항목 스케일링 (※ 엔진 대신 어댑터에서 처리) |
| `components/CostTree/tree-model.ts` | `operating_profit` 노드/엣지, "감상비" 라벨, `FIELD_TO_NODE` |
| `components/CostTree/CostTreeNode.tsx` | 1자리 고정, 변동 빨강 텍스트, profit 그룹 색상 |
| `components/CostTree/CostTreeView.tsx` | 좌상단 info-card 오버레이 |
| `components/FormulaInspector/FormulaInspector.tsx` | case-driven 인스펙터 모드 + 토큰 치환 + 폴백 |
| `lib/cases.ts` | `InspectorSpec`/`TreeInfoEntry` 타입 추가 |
| `lib/store.ts` | `sliderValues` 상태 추가 |
| `components/ParamPanel/ParamPanel.tsx` | 슬라이더 값 store 동기화 |
| `app/(learn)/sandbox/page.tsx` | `currentCase?.tree_info` 전달 |

### 1.3 결정 사항 (사용자 확정)

1. 감상비 라벨 통일: Panel/Module 모두 "감상비".
2. 인스펙터 동적성: 기준값(예 21.3)·기준 Loading(70)은 고정 텍스트, 슬라이더 값(예 50)만 동적.
3. 트리 정보 카드 위치: 트리 캔버스 좌상단 오버레이. Case 04에서 `Module 수율: 93.2%`, `Net 재료비(Module): $71.3` 표시.
4. 영업이익 노드: 모든 케이스 공통. Price↔COP 사이 직렬 사슬 (`price → operating_profit → cop`).
5. 수율→가공비 연쇄(Case 04): yield_old/yield_new 비율로 Panel/Module 가공비 6항목 스케일링.
6. 'Module Net 재료비'는 75.0 기준 사용 → `75.0×95.0%=71.25` (JSON expected와 일치).

### 1.4 작업 순서 (계획)

1. 엔진 확장 + 단위 테스트 (Case 04 신규 기대값) — 위험도 최상.
2. case JSON 2개 업데이트.
3. tree-model: 영업이익 노드, 라벨 변경, FIELD_TO_NODE 보강.
4. CostTreeNode: 포맷·변동 색상.
5. CostTreeView: 좌상단 info card 오버레이.
6. FormulaInspector: case-driven 모드 분기 + 토큰 치환.
7. 타입 정의 정리 (`lib/cases.ts`).
8. 수동 UI smoke test → handoff.md 갱신.

---

## 2. 실행 결과

### 2.1 단계별 변경 요약

| # | 파일 | 변경 |
|---|---|---|
| 1 | `lib/cases.ts` | `InspectorLine`, `InspectorGroup`, `InspectorSpec`, `TreeInfoEntry` 타입 추가. `CaseDef`에 `inspector?`/`tree_info?` 옵션 필드. |
| 2 | `content/cases/01-loading.json` | `title` "Loading율 변동", `variables[0].ko` "Loading율", `default` 0.50→0.70, `inspector.delta_lines` 6항목 + `result_fields` 4개. |
| 3 | `content/cases/04-material-yield.json` | `title` "재료비 절감 & 수율 하락", `scenario` 부서장 톤 재작성, `ko` "Module 재료비/수율 변동률", `inspector.delta_groups` 2그룹(재료비/수율 변동) + `tree_info` 2항목. |
| 4 | `content/case-adapters/index.ts` | `materialYield` 어댑터에서 `yieldRatio = base.yields.module / next.yields.module`로 6항목 스케일. (※ 엔진 미수정 — 아래 결정사항 참조) |
| 5 | `components/CostTree/tree-model.ts` | `operating_profit` 노드(group `profit`) 추가, 엣지 `price → operating_profit → cop`로 변경, `panel_depreciation`/`module_depreciation` 라벨 "상각비"→"감상비", `FIELD_TO_NODE.operating_profit` 추가. |
| 6 | `components/CostTree/CostTreeNode.tsx` | `formatValue` 항상 1자리, `profit` 그룹 색상(deep-blue 235°), `data.changed` 시 값 텍스트 `text-[hsl(var(--danger))]`. |
| 7 | `components/CostTree/CostTreeView.tsx` | `treeInfo?: TreeInfoEntry[]` props 추가, ReactFlow 컨테이너에 absolute-positioned 좌상단 오버레이 카드 (backdrop-blur, shadow-card). 가상 필드 매핑 헬퍼(`module_yield_pct`, `module_net_bom`, `cumulative_yield`). |
| 8 | `lib/store.ts` | `sliderValues: Record<string, number>` 상태 + `setSliderValues` 액션. `loadCase` 시 초기화. |
| 9 | `components/ParamPanel/ParamPanel.tsx` | 초기 effect와 watch subscriber에서 `setSliderValues(coerced)` 호출. |
| 10 | `app/(learn)/sandbox/page.tsx` | `<CostTreeView ... treeInfo={currentCase?.tree_info} />` 전달. |
| 11 | `components/FormulaInspector/FormulaInspector.tsx` | `inspector` 스펙이 있으면 `CaseInspector` 신규 렌더 (변동 내역 그룹/라인 + 결과 4줄). 토큰 리졸버 6종 처리. 없으면 기존 lastDelta 폴백. "감상비" 라벨 수정. |

### 2.2 계획에서의 주요 편차 (의식적 결정)

**계획 §F: 엔진 `applyMaterialYieldChange` 확장 → 어댑터로 이동**

- 사유:
  - TS 엔진은 Python `cost_model.py` 오라클과 1:1 패리티 (`__fixtures__/scenarios.json`).
  - **Case 7 Boss combo** (`engine.test.ts:156-175`)가 `applyMaterialYieldChange(sim, 0, -0.02)`를 직접 호출하며 `panel_labor`/`module_labor`/`com`/`cop`를 미수정 Python 픽스처에 대해 검증함. 엔진을 직접 확장하면 33개 어설션 중 4-6개가 깨짐.
  - 계획의 위험 섹션이 명시한 "기존 테스트 모두 통과 유지" 요구 충족 불가.
- 처리:
  - Sandbox UI 경로(`ParamPanel → applyCaseAdapter → materialYield`)에서만 가공비 스케일.
  - Boss 경로(엔진 직접 호출)는 영향 없음.
  - 결과: 동일한 Case 04 UI 거동 + 픽스처 패리티 보존.
- 트레이드오프: 엔진과 어댑터의 경계가 분명해진 대신, "재료비-수율 변동의 가공비 연쇄"라는 도메인 규칙이 어댑터 레이어에 위치. 향후 Python 오라클이 이 거동을 흡수하면 엔진으로 승격 가능.

### 2.3 검증 결과

| 검증 | 결과 |
|---|---|
| `npm run typecheck` | 통과 (clean) |
| `npm test -- --run` | **37/37 통과** (engine 35 + diff 2; Case 7 Boss combo 포함 모든 픽스처 패리티 유지) |
| `npm run lint` | 본 작업으로 새 에러 없음. (`components/Worksheet/CellCalculator.tsx`의 사전 존재하던 4건 에러는 본 작업과 무관) |
| 수동 UI smoke | **미수행 — 사용자 검증 권장** (`npm run dev` → `/sandbox`) |

### 2.4 수치 정합성 (수동 검산)

**Case 01 Loading 70%→50%**
- ratio = 0.7 / 0.5 = 1.4
- Panel 노무비 = 21.3 × 1.4 = **29.82** ✓ (`expected.panel_labor`와 일치)

**Case 04 (default: −5% 재료비, −4%p 수율)**
- bom.module = 75 × 0.95 = **71.25** ✓
- yields.module = 0.972 − 0.04 = **0.932** ✓
- yieldRatio = 0.972 / 0.932 ≈ **1.04292**
- 가공비 6항목 합 = 70.5 × 1.04292 ≈ **$73.5** (계획 스펙 +3.0 일치)
- 누적수율 = 0.99 × 1.0 × 0.95 × 0.932 ≈ 0.87655
- material_cost ≈ **$90.6** ✓ (`expected.material_cost`와 일치)
- COM ≈ 164.1, SGA = 28.4, COP ≈ **192.5**, 영업이익 ≈ **$7.5**
- Tree-info card: `Module 수율: 93.2%`, `Net 재료비(Module): $71.3` ✓

### 2.5 인스펙터 토큰 리졸버 명세 (구현된 6종)

| 토큰 | 출력 형식 | 예 |
|---|---|---|
| `{slider:new_loading_pct}` | 정수 백분율 | 0.50 → `50` |
| `{slider:material_change_pct_inv}` | `(100 + v×100).toFixed(1) + "%"` | -0.05 → `95.0%` |
| `{slider:module_yield_drop_abs}` | `|v×100|.toFixed(1) + "%"` | -0.04 → `4.0%` |
| `{module_net}` | `(75 × (1+v)).toFixed(1)` | -0.05 → `71.3` |
| `{module_yield_new}` | `((0.972 + v) × 100).toFixed(1) + "%"` | -0.04 → `93.2%` |
| `{cum_yield_new}` | 현재 누적수율 1자리 % | 87.5% |

---

## 3. 다음 작업 권장

1. **수동 UI 검증** (`npm run dev` → `/sandbox`)
   - Case 01: 슬라이더 70% 기본값에서 변동 없음 → 50%로 이동 시 가공비 6노드 빨강, 인스펙터 `21.3 × 70 ÷ 50` 형태 확인
   - Case 04: 좌상단 카드 `Module 수율 93.2%`, `Net 재료비 $71.3`, 인스펙터 두 그룹(재료비/수율 변동) 표시
   - 트리 영업이익 노드 위치(`price → operating_profit → cop` 직렬) 가독성 확인 — 모바일에서 wide 노드가 터지는지 점검
   - 음수 영업이익 시 표시 (예: Case 01 50%) 확인
2. **Playwright e2e**: `tests/e2e/sandbox-dropdown.spec.ts` 깨지지 않는지 확인 (시간 허락 시)
3. **handoff.md 갱신**: 본 문서를 참조하여 핸드오프 이력에 추가
4. **장기**: Python `cost_model.py`에 `apply_material_yield_change`의 가공비 스케일링 흡수 검토 → 패리티 회복 후 어댑터 → 엔진 승격
