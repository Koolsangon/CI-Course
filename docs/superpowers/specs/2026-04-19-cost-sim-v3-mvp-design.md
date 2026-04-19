# Cost Sim v3 MVP — Implementation Spec

## Overview

v2-game을 복사한 `cost-sim-v3` 프로젝트에 실무 분석 기능을 추가한다. 교육 기능은 100% 유지하면서, 원가기획/원가관리 담당자가 자기 제품 데이터를 입력하고 What-if 시나리오를 비교할 수 있게 한다.

**핵심 원칙:** "배운 도구 = 일하는 도구" — 교육에서 쓰던 Living Cost Tree, ParamPanel, FormulaInspector가 실무에서도 그대로 동작.

**디자인 문서:** `~/.gstack/projects/Koolsangon-CI-Course/sam-unknown-design-20260419-215303.md` (APPROVED)

## Decisions

| 결정 | 선택 | 이유 |
|------|------|------|
| 프로젝트 구조 | v2-game 복사 → cost-sim-v3 | v0→v1→v2 패턴 유지 |
| 구현 접근법 | 새 라우트 그룹 (Approach B) | 교육/실무 URL 분리, 기존 컴포넌트 공유 |
| 데모 방식 | 샘플 데이터 프리로드 | 회의에서 바로 동작 |
| 입력 폼 | 아코디언 4그룹 | 20개 필드를 그룹별로 정리 |
| 비교 뷰 | 테이블 + 델타 강조 | 엑셀에 복사 가능, 직관적 |
| Store | 별도 work-store.ts | 교육 상태와 lifecycle 분리 |
| 내보내기 | TSV 클립보드 복사 | 0 dependency, MVP에 충분 |

## Architecture

### 새 파일 목록

```
cost-sim-v3/
├── lib/
│   ├── work-store.ts              # NEW — 실무 분석 전용 zustand store
│   └── export.ts                  # NEW — TSV 변환 + 클립보드 복사
├── content/
│   └── sample-presets.json        # NEW — 데모용 샘플 프리셋 2개
├── app/
│   ├── (work)/
│   │   ├── analyze/
│   │   │   └── page.tsx           # NEW — 실무 분석 페이지
│   │   └── compare/
│   │       └── page.tsx           # NEW — 시나리오 비교 페이지
│   └── page.tsx                   # MODIFY — "실무 분석" 카드 추가 (~10줄)
├── components/
│   ├── CustomPreset/
│   │   ├── PresetForm.tsx         # NEW — 아코디언 입력 폼
│   │   └── PresetManager.tsx      # NEW — 프리셋 목록/CRUD
│   ├── Work/
│   │   └── AnalyzePanel.tsx       # NEW — analyze 전용 ParamPanel 래퍼 (로컬 state 관리)
│   └── Scenario/
│       ├── CompareView.tsx        # NEW — 비교 테이블
│       └── DeltaCell.tsx          # NEW — 차이값 셀 (색상)
```

### 수정 파일

| 파일 | 변경 | 범위 |
|------|------|------|
| `app/page.tsx` | modes 배열에 "실무 분석" 카드 추가 | ~10줄 |
| `package.json` | name → cost-sim-v3, version → 3.0.0-alpha.0 | 2줄 |

### 수정하지 않는 파일 (Sacred)

- `lib/cost-engine/engine.ts` — COP 계산 엔진
- `lib/cost-engine/presets.ts` — 교육 프리셋 6개
- `lib/cost-engine/types.ts` — CostParams, CostResult 타입
- `lib/cost-engine/__fixtures__/*` — golden fixtures
- `lib/cost-engine/engine.test.ts` — 27 golden fixture 테스트
- `lib/store.ts` — 교육 게임 상태 (한 줄도 수정 안 함)

## Component Specs

### 1. work-store.ts

```typescript
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CostParams } from "./cost-engine/types";

export interface CustomPreset {
  id: string;           // crypto.randomUUID()
  name: string;         // 사용자 지정 이름
  params: CostParams;
  createdAt: number;    // Date.now()
}

export interface Scenario {
  id: string;
  name: string;
  presetId: string;     // 기반 프리셋 ID
  params: CostParams;   // 슬라이더로 조정된 최종값
}

export interface WorkState {
  customPresets: CustomPreset[];
  scenarios: Scenario[];
  activePresetId: string | null;

  savePreset: (name: string, params: CostParams) => string;
  updatePreset: (id: string, name: string, params: CostParams) => void;
  deletePreset: (id: string) => void;
  loadSamplePresets: () => void;

  saveScenario: (name: string, presetId: string, params: CostParams) => string;
  deleteScenario: (id: string) => void;
  setActivePreset: (id: string | null) => void;
}
```

**제약:**
- customPresets 최대 10개 — 10개 시 savePreset은 에러 throw
- scenarios 최대 5개 — 5개 시 saveScenario는 에러 throw
- persist key: `cost-sim-v3:work:v1`
- partialize: 전체 state persist (actions 제외)

### 2. sample-presets.json

2개의 현실적 더미 프리셋. v2 presets.ts의 REFERENCE 값을 약간 변형해서 "다른 제품"처럼 보이게 함.

```json
[
  {
    "name": "55인치 OLED 기준",
    "params": { /* CostParams — REFERENCE case1 기반, 약간 변형 */ }
  },
  {
    "name": "65인치 LCD 기준",
    "params": { /* CostParams — 가격/BOM/수율 다른 값 */ }
  }
]
```

구체적 수치는 v2의 REFERENCE 값을 기반으로 생성. engine 테스트와 무관한 별도 데이터.

### 3. PresetForm.tsx

**Props:**
```typescript
interface PresetFormProps {
  initialParams?: CostParams;  // 편집 모드 시 기존 값
  onSave: (name: string, params: CostParams) => void;
  onAnalyze: (params: CostParams) => void;  // "분석 시작" 클릭
}
```

**구현:**
- React Hook Form + zod schema (`costParamsSchema`)
- 4개 아코디언 그룹: 기본정보, BOM, Yields/Processing, SGA
- 한 번에 하나만 열림 (controlled accordion state)
- 각 필드 변경 시 `calculate()` 호출 → 하단 COP 미리보기 실시간 갱신
- zod 검증 규칙:

| 필드 그룹 | 범위 | 비고 |
|-----------|------|------|
| Price | 0.01 ~ 10,000 | 0 이하 불가 |
| BOM (각) | 0 ~ 5,000 | 0 허용 |
| Yields (각) | 0.01 ~ 1.00 | 0 불가 (division by zero 방지) |
| Processing (각) | 0 ~ 5,000 | 0 허용 |
| SGA (각) | 0 ~ 5,000 | 0 허용 |
| Loading | 0.01 ~ 1.00 | 0 불가 |

- 검증 실패: 인라인 에러 메시지, "저장" 및 "분석 시작" 버튼 disabled

### 4. PresetManager.tsx

**Props:**
```typescript
interface PresetManagerProps {
  presets: CustomPreset[];
  onSelect: (preset: CustomPreset) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}
```

**UI:** 카드 목록. 각 카드에 이름, 생성일, 주요 지표(Price, 영업이익 — `calculate()` 호출로 표시), 삭제 버튼.

### 5. analyze/page.tsx

**레이아웃:** 2컬럼 (모바일: 1컬럼 스택)
- 좌: ParamPanel (기존 컴포넌트 그대로)
- 우: CostTreeView (기존 컴포넌트 그대로)
- 하단: 주요 지표 요약 바
- 상단: 프리셋 선택 드롭다운 + "시나리오 저장" + "비교 →" 버튼

**데이터 흐름:**
1. URL 진입 → work-store에서 activePresetId의 params 로드
2. 첫 진입 시 샘플 프리셋 없으면 `loadSamplePresets()` 호출
3. 슬라이더 조작 → `calculate()` → CostTree 갱신 (기존 로직)
4. "시나리오 저장" → 현재 params를 work-store.scenarios에 추가
5. "비교 →" → `/compare`로 router.push

**ParamPanel 재사용 전략:**
- ParamPanel은 현재 `useStore`(교육 store)에 바인딩되어 있음.
- **결정:** analyze 전용 래퍼 `components/Work/AnalyzePanel.tsx`를 만든다. 이 래퍼가 로컬 React state로 `CostParams`를 관리하고, 기존 ParamPanel의 슬라이더 UI 로직을 재사용한다. 기존 `ParamPanel.tsx`는 수정하지 않는다.
- AnalyzePanel은 work-store의 activePreset에서 초기 params를 로드하고, 슬라이더 변경 시 로컬 state를 갱신하며, `calculate()`를 호출해서 CostTreeView에 result를 전달한다.

### 6. compare/page.tsx

**레이아웃:**
- 상단: 시나리오 체크박스 목록 (저장된 시나리오 중 2개 선택)
- 중앙: CompareView 테이블
- 하단: 변동 요약 + "클립보드 복사" 버튼

### 7. CompareView.tsx

**Props:**
```typescript
interface CompareViewProps {
  scenarioA: { name: string; params: CostParams };
  scenarioB: { name: string; params: CostParams };
}
```

**구현:**
- `calculate(scenarioA.params)`, `calculate(scenarioB.params)` 호출
- CostResult의 주요 필드를 행으로 표시
- 각 행에 DeltaCell로 차이 표시

**표시할 행:**

| 항목 | CostResult 필드 | 델타 방향 |
|------|-----------------|-----------|
| Price | price | neutral |
| 소요재료비 | material_cost | 감소=녹색 |
| 가공비 | processing_cost | 감소=녹색 |
| COM | com | 감소=녹색 |
| SGA | sga | 감소=녹색 |
| COP | cop | 감소=녹색 |
| 영업이익 | operating_profit | 증가=녹색 |
| 영업이익률 | operating_margin | 증가=녹색 |
| Cash Cost | cash_cost | 감소=녹색 |
| EBITDA | ebitda | 증가=녹색 |
| 변동비 | variable_cost | 감소=녹색 |
| 한계이익 | marginal_profit | 증가=녹색 |

### 8. DeltaCell.tsx

```typescript
interface DeltaCellProps {
  value: number;           // 차이값 (B - A)
  isProfit: boolean;       // true면 증가=녹색, false면 감소=녹색
  format?: "dollar" | "percent";
}
```

- 0이면 "—" 표시
- 양수: `▲ $1.78` (녹/빨은 isProfit에 따라)
- 음수: `▼ $1.78`

### 9. export.ts

```typescript
export function toTSV(scenarioA: CostResult, scenarioB: CostResult, nameA: string, nameB: string): string
export async function copyToClipboard(text: string): Promise<boolean>
```

- `toTSV`: CostResult 필드를 탭 구분 텍스트로 변환. 첫 행 = 헤더, 이후 행 = 항목별 값.
- `copyToClipboard`: `navigator.clipboard.writeText()` 래퍼. 성공/실패 boolean 반환.

## Testing Strategy (MVP)

| 테스트 | 범위 | 도구 |
|--------|------|------|
| 기존 golden fixtures | 27개 통과 확인 | vitest (기존) |
| work-store CRUD | preset/scenario 저장/삭제/제한 | vitest (새로 추가) |
| export.ts toTSV | 올바른 TSV 출력 | vitest (새로 추가) |
| E2E: analyze 페이지 로드 | 샘플 프리셋 로드, 슬라이더 동작 | Playwright (새로 추가) |
| 기존 E2E 14 spec | 교육 기능 회귀 없음 확인 | Playwright (기존) |

## Bundle Impact

| 항목 | 크기 (gzip) | 로드 |
|------|-------------|------|
| work-store.ts | ~1KB | 정적 |
| PresetForm + PresetManager | ~3KB | 정적 |
| CompareView + DeltaCell | ~2KB | 정적 |
| export.ts | ~0.5KB | 정적 |
| analyze/page.tsx | ~2KB | route chunk |
| compare/page.tsx | ~1KB | route chunk |

First Load JS 영향: ~6.5KB 추가 → 231 + 6.5 = **~237.5KB** (250KB ceiling 이내)
analyze/compare 페이지는 route-level code split이므로 홈/교육 페이지 번들에 영향 없음.

## Out of Scope (MVP)

- 엑셀 (.xlsx) 내보내기 (풀 v3에서 SheetJS로)
- zod 완전 검증 (MVP는 기본 범위 체크만)
- 프리셋 10개 CRUD UI (MVP는 저장/삭제만)
- Coach 모드 분기 (MVP는 교육과 동일하게 동작)
- 다중 제품 관리
- 팀 공유 / JSON export-import
- 인증/접근 제어
