# 개발원가 시뮬레이션 v1.0 — 전면 재설계 플랜

> 작성일: 2026-04-11
> 작성자: planner skill (interview mode → consensus revised)
> 상태: **CONSENSUS APPROVED v2** (Architect APPROVE_WITH_REVISIONS + Critic REVISE → 통합 반영)
> 대상 코드베이스: `CI-Course/projects/cost-sim-wargame` (v0.3는 `cost-sim-wargame-v0/`로 보존)

---

## 0. Executive Summary

v0.3 프로토타입은 엑셀 6문제를 단순 이식한 수준이라 교육 깊이·게임성·UI·AI 코칭이 모두 부족함. v1.0은 **"학습자가 머릿속에 원가 구조 트리를 그릴 수 있게 만든다"** 는 단일 목표 하나에 집중해 처음부터 재설계.

핵심 차별화는 **살아있는 원가 트리(Living Cost Tree)** 인터랙션. 어떤 변수든 드래그하면 트리 전체에 인과관계가 애니메이션으로 전파되고, 영향받는 노드가 강조되며, 변화의 수식 근거가 인라인으로 노출.

**v1.0 범위 (consensus 후 축소)**: Sandbox + Guided 6 Cases + 진단 도구 + 정적 코치(+선택 AI). **Workshop 팀 대항전은 v1.1로 이연** — 3일로 잡았던 추정이 비현실적이라는 architect/critic 합의.

---

## 1. Requirements Summary

### 학습 목표 (확정)
- **Primary**: 수강자가 COP/COM/SGA 구조와 BOM·수율·Loading·면취수·Mask·Tact 변수의 인과관계를 머릿속으로 추적 가능하게 함 (= 원가구조 해석력)
- **Secondary**: 단일 변수 변화에 대한 직관(sensitivity intuition) 형성
- **Tertiary**: 복합 변수 trade-off 의사결정 경험 (Reflect 단계)

### 사용 컨텍스트 (확정)
- **하이브리드 다목적**: 강의장 단체(8h), 와이파이 블렌디드, 단기 워크숍(2~3h)
- **모드 토글**: Sandbox / Guided Cases (v1.0 출시)

### 운영·기술 제약 (확정)
- AI는 **선택적 강화 레이어** — AI 없이도 100% 학습 가능
- 온라인 클라우드 배포 (Vercel)
- 프레임워크 자유, v0.3 코드 폐기 후 검증 자산만 흡수

### 흡수할 검증 자산 (Phase 0b에서 명시적 수집)
1. **원가 엔진 로직**: `CI-Course/projects/cost-sim-wargame/engine/cost_model.py` (27/27 테스트)
2. **케이스 메타데이터**: `CI-Course/outputs/implementation-report.md` 의 케이스별 변수·기댓값
3. **도메인 용어집**: `CI-Course/context/glossary.md` → `content/glossary.json` 변환
4. **브랜드 톤**: `CI-Course/context/brand-voice.md` → 정적 코치 카피 작성 시 직접 인용

---

## 2. RALPLAN-DR Summary (consensus revised)

### 원칙 (Principles) — 4개로 정리
1. **Understanding > Winning** — 게임성은 도구일 뿐, 모든 메커니즘은 "구조 이해"라는 단일 목적에 종속
2. **Living Interactions** — 모든 수치 변화는 즉시·시각적·인과추적가능하게 표현 (정적 차트 비교 금지). 0ms 응답 + 200ms 애니메이션 transition 표준
3. **AI as Optional Coach** — AI 장애·미사용 시에도 모든 학습 흐름 작동. AI는 본진이 아닌 향신료
4. **One App, Multiple Modes** — 같은 코드베이스로 강의장/자가학습/(추후) 워크숍 모드 지원

> *(이전 P3 "Engine on Client"는 P2의 결론이라 순환 — Critic 지적 반영해 P2에 흡수)*

### 의사결정 드라이버 (Decision Drivers)
1. **D1 — 학습 효과 증명 가능성**: 학습자가 세션 후 빈 원가 트리에 노드를 채울 수 있는가?
2. **D2 — 강의장 운영 안정성**: 30명 동시접속·네트워크 단절·모바일 이슈에서 강사가 진행을 멈추지 않을 수 있는가?
3. **D3 — 콘텐츠 확장 비용**: 새 케이스를 강사가 추가할 때 코드 수정량이 최소(≤20줄 TS 어댑터)인가?

### 검토된 옵션 (Viable Options)

#### Option A — Next.js 14 + 클라이언트 TS 엔진 + reactflow 트리 (CHOSEN)
**Approach**: Next.js 14 (App Router) + TS + Tailwind + shadcn/ui. 원가 엔진을 TS로 포팅하되 Python 골든 픽스처로 회귀 검증. **reactflow** 로 트리(D3 아님 — Critic/Architect 합의), Framer Motion으로 노드 펄스만 담당. 백엔드는 Vercel Edge Functions + Supabase (세션·AI 프록시·콘텐츠 서빙).

**Pros**:
- 슬라이더 인터랙션 0ms 응답 → 살아있는 트리 가능
- reactflow는 노드를 React 컴포넌트로 직접 받아 enter/update/exit 조각 불필요 (D3 대비 약 1~2일 절약)
- 서버 부담 최소 → 강의장 30명도 가볍게 처리
- 골든 픽스처 회귀 테스트로 R1 거의 제거

**Cons**:
- TS 포팅 시 원본 Python 함수와의 부동소수점 차이 — 골든 픽스처 ±0.001 검증으로 차단
- 케이스 변환 로직(`apply_loading_change`, `apply_labor_change` 등 5개)은 데이터가 아닌 코드 — 강사가 새 케이스 추가 시 ≤20줄 TS 어댑터 작성 필요 (AC10 완화로 명문화)

#### Option B — Python 백엔드 + WebSocket (debounce + 낙관적 UI 변형)
**Approach**: 검증된 cost_model.py 그대로 두고 FastAPI + WebSocket. 슬라이더 변경 시 50ms 디바운스 + 클라이언트 측 낙관적 UI 보간으로 응답 즉시성 확보. 프론트는 SvelteKit 또는 Vue.

**Pros**:
- 검증된 엔진 1바이트도 손대지 않음 → 정확성 리스크 0
- 단일 진실 소스(SoT) — 향후 수식 변경 시 이중 동기화 부담 없음
- AI 호출도 백엔드 단일 지점에서 처리 → 보안·로깅 단순

**Cons**:
- 디바운스로 인한 지연이 30ms+이면 교육 컨텍스트에서 "살아있다" 느낌 손상
- 강의장 Wi-Fi 변동성에 운영 안정성 의존
- 30명 동시접속 시 백엔드가 병목 가능
- 클라이언트 보간 로직이 결국 부분 엔진을 클라이언트에 가지게 됨 → A의 SoT 부담을 우회한 것이 아님

**Invalidation 근거**: D2(운영 안정성)에서 핵심 약점. Architect 지적대로 디바운스 변형은 존재하지만, 클라이언트 보간이 결국 부분 엔진을 갖게 되어 SoT 우위가 약화. A의 R1을 골든 픽스처로 거의 제거할 수 있게 된 이상 B의 결정적 우위가 사라짐.

#### Option C — Excel + VBA 매크로
**Invalidation**: 모바일·웹·하이브리드 운영 요건 미충족. 사용자가 "엑셀 한계"를 출발점으로 명시. 즉시 기각.

#### Option D — Astro Islands / SvelteKit
**Approach**: Astro islands로 정적 콘텐츠는 0KB JS, 인터랙티브 영역만 React/Solid 섬으로 분리. 또는 SvelteKit으로 번들 사이즈 ↓.

**Invalidation**: 정당한 기술적 대안이지만 (a) shadcn/ui 생태계 가용성 ↓, (b) Supabase JS + reactflow + Framer Motion 통합 사례 ↓, (c) 팀 친숙도 ↓. 이로 인한 일정 리스크가 번들 사이즈 절감 이득을 상쇄. 채택 안 함.

**선택**: Option A. 단일 진실 소스 우려는 §3의 골든 픽스처 자동 동기화로 해결.

---

## 3. 시스템 아키텍처

```
┌────────────────────────────────────────────────────────────┐
│                    Browser (Client)                         │
│ ┌──────────────────────────────────────────────────────┐  │
│ │  Next.js 14 App Router (RSC + Client Components)      │  │
│ │                                                        │  │
│ │  ┌────────────┐  ┌──────────────┐  ┌──────────────┐  │  │
│ │  │ Cost Tree  │  │ Param Panel   │  │ Coach Drawer │  │  │
│ │  │(reactflow) │←→│ (sliders+RHF) │←→│ (md → LLM)   │  │  │
│ │  └─────┬──────┘  └──────┬───────┘  └──────┬───────┘  │  │
│ │        │                │                  │          │  │
│ │        └────────┬───────┴──────────────────┘          │  │
│ │                 ▼                                       │  │
│ │   ┌──────────────────────────────────────────┐        │  │
│ │   │  cost-engine.ts  (PURE TS, 0 deps)        │        │  │
│ │   │  - interfaces + pure functions             │        │  │
│ │   │  - reference presets (6 cases)             │        │  │
│ │   │  - calc(params) → CostTreeSnapshot         │        │  │
│ │   │  - diff(prev, next) → DeltaTrace[]        │        │  │
│ │   │  - case adapters (≤20 lines each)          │        │  │
│ │   └──────────────────────────────────────────┘        │  │
│ │                                                        │  │
│ │   Zustand store: { mode, scenario, params, history }  │  │
│ └──────────────────────────────────────────────────────┘  │
└──────────────────┬─────────────────────────────────────────┘
                   │ (only when needed)
                   ▼
┌────────────────────────────────────────────────────────────┐
│  Edge Functions (Vercel)                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ /api/ai/coach│  │ /api/session │  │ /api/content/:id │ │
│  │ Anthropic SDK│  │ Supabase     │  │ JSON 서빙        │ │
│  └──────────────┘  └──────────────┘  └──────────────────┘ │
└─────────────────────┬──────────────────────────────────────┘
                      ▼
              ┌──────────────────┐
              │ Supabase         │
              │ - sessions       │
              │ - learner_log    │  ← PII-free schema (R9)
              └──────────────────┘
```

### 골든 픽스처 동기화 (Single Source of Truth)
1. `scripts/gen-fixtures.py` — Python `cost_model.py`를 호출해 27개 expected snapshot을 `lib/cost-engine/__fixtures__/*.json`으로 생성
2. `lib/cost-engine/engine.test.ts` — 같은 JSON 픽스처를 oracle로 소비
3. 향후 수식 변경 시: Python 수정 → `pnpm gen:fixtures` → TS 수정 → CI 검증
4. CI gate: 픽스처 ↔ TS 차이가 ±0.001 초과 시 빌드 실패

### 컴포넌트 책임
- **cost-engine.ts**: 순수 함수 + interface (class hierarchy 없음). 단일 호출 < 1ms
- **case-adapters/**: 6개 케이스 각각 ≤20줄 TS 어댑터 (Loading, Labor, Marginal, Material/Yield, Cuts/Mask, Tact/Investment)
- **CostTreeView**: reactflow 노드로 렌더, dagre layouting, Framer Motion으로 펄스 효과
- **ParamPanel**: 케이스별 동적 슬라이더, RHF + zod 검증
- **CoachDrawer**: 정적 마크다운 코칭(기본) + AI 활성 시 Claude API 호출

---

## 4. 교육 메커닉 (2-Layer Pedagogy, v1.0)

### Layer 1 — Sandbox (자유 탐색, 메인)
- 좌측: 살아있는 원가 트리 (reactflow)
- 우측: 변수 슬라이더 패널
- 하단: 수식 인스펙터 — "왜 가공비가 $70.5 → $98.7로 변했는가?" 실시간 수식 표시
- 학습자가 "느낌"을 잡는 단계

### Layer 2 — Guided 6 Cases (4-Phase Micro-learning)
| Phase | 시간 | 활동 | 목적 |
|-------|------|------|------|
| **Hook** | 1분 | 시나리오 카드: "고객사 주문 50% 급감" | 정서적 몰입 |
| **Discover** | 3분 | 학습자가 슬라이더 조작 → 트리 변화 관찰 | 발견 학습 |
| **Apply** | 4분 | "흑자 유지하려면 어디를 건드려야 할까요?" 빈칸 채우기 | 적용 |
| **Reflect** | 2분 | "이 케이스의 핵심 메커니즘 한 줄 요약" + 정적 코치 피드백 | 메타인지 |

총 6 케이스 × 10분 = 60분 (강의장 1교시).

> Reflect 단계의 자유 응답은 **클라이언트 내에서만 처리하고 Supabase에 전송하지 않음** (R9, PIPA 안전망). Supabase로 가는 학습 로그는 객관식 ID와 슬라이더 최종값 정도로 제한.

### Layer 3 — Workshop (v1.1 이연)
- 4~6팀 동시 의사결정, 돌발 이벤트, 자동 비교 보고서
- v1.0에 끼워넣기엔 3일 추정이 비현실적이라는 컨센서스 합의 → §10 Out of Scope

### 콘텐츠 외부화
```
content/
├── glossary.json          # 용어집 (glossary.md 변환)
├── cases/
│   ├── 01-loading.json
│   ├── 02-labor.json
│   └── ...
└── case-adapters/         # ≤20줄 TS 함수 6개
```
강사가 코드 수정 없이 새 케이스를 추가하려면: 기존 어댑터 5종(loading/labor/material-yield/cuts-mask/tact-investment) 패턴에 맞는 경우 JSON만 작성. 새 변환 로직이 필요하면 ≤20줄 어댑터 함수 추가.

---

## 5. Acceptance Criteria

### A. 학습 효과 (D1)
- [ ] **AC1**: 슬라이더 조작 시 영향받는 모든 노드가 200ms 이내에 시각적 강조 + 새 값 transition (Chrome DevTools Performance 측정)
- [ ] **AC2**: 6 케이스 완주 학습자 표본에서 **사후 진단 점수 ≥ 사전 대비 +30%** (paired pre/post 동일 instrument). n=10 표본 + n≥3 비대상 instrument validation 사전 수행
- [ ] **AC3**: 수식 인스펙터가 6 케이스의 모든 핵심 계산에 대해 (a) 변수명 한국어 표기, (b) 단위 표시, (c) 변경 전/후 값을 모두 노출 (체크리스트 검증)

### B. 운영 안정성 (D2)
- [ ] **AC4**: Sandbox 모드에서 단일 사용자 슬라이더 연속 조작 시 95p 응답 ≤ 16ms (60fps 단일 프레임). Workshop 부하 테스트는 v1.1
- [ ] **AC5**: 네트워크 단절 시 Sandbox/Guided 100% 작동 (서비스 워커 + IndexedDB 콘텐츠 캐시)
- [ ] **AC6**: 명시 디바이스 매트릭스 — iOS Safari 16.4+ (iPhone 12 이상), Android Chrome 120+ (Galaxy A52 이상). 가로/세로 모두에서 트리 + 슬라이더 동시 조작
- [ ] **AC7**: AI API 장애 시 코치 드로어가 정적 마크다운으로 graceful degrade, 토스트 1회 표시. AI 비활성 모드에서도 동일 UX

### C. 정확성 (검증)
- [ ] **AC8**: TS 엔진이 Python 엔진의 27 케이스를 모두 재현, 부동소수점 차이 **≤ 0.001** (골든 픽스처 ±0.001 tolerance)
- [ ] **AC9**: 6 케이스 reference vs simulation 영업이익이 implementation-report.md 기댓값과 일치 (±$0.05). Phase 0b에서 implementation-report.md 명시 ingest

### D. 콘텐츠 확장성 (D3)
- [ ] **AC10**: 새 케이스 추가가 (a) 기존 어댑터 패턴에 맞으면 `content/cases/*.json` 한 개로 완료, (b) 새 변환 로직 필요 시 `content/case-adapters/*.ts` 한 개 추가 (≤20줄). 두 경로 각각 강사 매뉴얼에 명시
- [ ] **AC11**: 용어집 단어가 본문 어디서든 호버 시 정의 팝오버 노출

### E. 성능 (Critic 추가)
- [ ] **AC12**: 클라이언트 번들 critical path ≤ 250KB gzip (Lighthouse + `next build` analyzer 측정). 초과 시 dynamic import 분할

---

## 6. Implementation Steps (Consensus revised)

### Phase 0a — 환경 셋업 (1일)
1. Next.js 14 프로젝트 생성: `projects/cost-sim-v1`. v0.3는 `projects/cost-sim-wargame-v0/` 로 rename
2. Tailwind + shadcn/ui + Framer Motion + reactflow + Zustand + Supabase JS + RHF + zod 설치
3. ESLint + Prettier + TS strict, husky pre-commit, Vercel + Supabase 무료 인스턴스 연결

### Phase 0b — 자산 흡수 + 진단 도구 설계 (1일)
1. `glossary.md` → `content/glossary.json` 변환
2. `brand-voice.md` 인용 발췌 → `content/coach-tone.md`
3. `implementation-report.md` 의 6 케이스 변수·기댓값 → `content/cases/*.json` 초안
4. **AC2 사전/사후 진단 instrument 설계**: 빈 트리 채우기 5문항 + 변수영향 매칭 5문항. n≥3 비대상 사용자로 instrument validation (문항 모호성 제거)

### Phase 1 — Cost Engine TS 포팅 (1일, 골든 픽스처 방식)
1. `scripts/gen-fixtures.py` 작성 — Python `cost_model.py` 호출해 27 expected snapshot 생성
2. `lib/cost-engine/`: `types.ts` (interface), `presets.ts`, `engine.ts` (pure functions, no class), `engine.test.ts`
3. **회귀 테스트**: 27 골든 픽스처를 vitest로 검증. ±0.001 tolerance, 통과 못 하면 다음 phase 진입 금지 (AC8)
4. `diff(prev, next)` 함수: 변경 노드 경로 + propagation order 반환

### Phase 2 — 살아있는 원가 트리 (2일, reactflow)
1. `components/CostTree/` — reactflow + dagre layouting + 노드는 React 컴포넌트
2. Framer Motion으로 노드 펄스(scale + 색상 강조 + 화살표 트레이스). 레이아웃 transition은 reactflow에 위임
3. `diff()` 결과를 받아 영향받은 노드에 ripple
4. 노드 클릭 시 sidesheet에 수식·값·영향 변수

### Phase 3 — Sandbox + Param Panel + 수식 인스펙터 (2일)
1. `components/ParamPanel/` — 케이스 메타데이터 기반 동적 슬라이더 (RHF + zod)
2. 슬라이더 변경 → Zustand → cost-engine 즉시 호출 → 트리 리렌더
3. "수식 인스펙터" 풋바: 마지막 변경 변수와 영향받은 항목 수식을 인라인 노출

### Phase 4 — Guided Cases 4-Phase 흐름 + 케이스 어댑터 (3일)
1. 6 케이스 어댑터 작성 (`content/case-adapters/*.ts`, 각 ≤20줄)
2. `app/(learn)/cases/[caseId]/page.tsx` — Hook/Discover/Apply/Reflect 단계 컴포넌트
3. progress bar + 다음 phase 잠금 해제
4. 학습 로그 Supabase 전송 (객관식 ID + 슬라이더 최종값만; Reflect 자유 응답은 클라이언트에서만 처리, R9)

### Phase 5 — Coach Drawer (정적 우선 → 선택 AI) (2일)
1. **Day 1 — 정적 코치 end-to-end**: `lib/coach/static-coach.ts`, 케이스별 사전 작성 코칭(브랜드 톤 적용). AI 코드 작성 금지. 정적 코치만으로 모든 케이스 완주 검증
2. **Day 2 — AI 레이어**: `app/api/ai/coach/route.ts` Anthropic SDK stream. feature flag 뒤에 숨김. 장애 시 정적으로 graceful degrade (AC7)

### Phase 6 — Mobile + Offline + 번들 검증 (2일)
1. PWA 매니페스트 + service worker (next-pwa)
2. IndexedDB 콘텐츠 캐시 → 네트워크 단절 시 Sandbox/Guided 작동 (AC5)
3. 명시 디바이스 매트릭스로 실기기 테스트 (AC6)
4. `next build` analyzer로 번들 사이즈 측정, ≤250KB critical path 검증 (AC12). 초과 시 dynamic import 분할
5. Lighthouse Performance/Accessibility/Best Practices ≥ 90

### Phase 7 — Pilot & 측정 (3일)
1. 학습자 5~10명 파일럿 세션 — 사전/사후 동일 instrument로 paired delta 측정
2. AC2 paired delta ≥30% 미달 케이스는 백로그로 v1.1 재설계 마킹
3. 강사 1~2명 운영 리허설 + 1페이지 운영 매뉴얼 작성
4. 피드백 → v1.1 백로그

**총 추정**: Phase 0a~7 합계 = **17 영업일** (이전 21일에서 4일 절약: Phase 1 -1d, Phase 2 -1d, Phase 6 cut -3d, Phase 0b +1d)

> 이전 v1 초안의 Workshop Phase 6(3일)는 §10 Out of Scope로 이동.

---

## 7. Risks & Mitigations (consensus revised)

| # | 리스크 | 영향 | 가능성 | 완화 |
|---|--------|-----|------|------|
| R1 | TS 포팅 시 부동소수점 오차 | 정확성 신뢰 | **저** (강등) | 골든 픽스처 자동 동기화 + ±0.001 tolerance + CI gate. decimal.js 불필요 |
| R2 | reactflow + Framer Motion 통합 학습 곡선 | Phase 2 +1일 | 저 (강등) | reactflow 공식 예제로 충분. 막히면 노드 펄스만 Framer로, 레이아웃은 reactflow 기본 |
| R3 | (제거) 30명 부하 테스트 | — | — | Workshop이 v1.1로 이동했으므로 v1.0에서 쟁점 아님. v1.1 계획 시 재검토 |
| R4 | AI 코치 품질이 정적보다 못함 | AI 레이어 무가치 | 중 | 정적이 본진. AI는 feature flag. 무가치 판명 시 v1.1에서 강화 또는 제거 |
| R5 | 강사가 새 시스템 거부감 | 도입 실패 | 중 | Phase 7에서 강사 리허설 + 1페이지 운영 매뉴얼. 강사 콘솔은 엑셀과 닮은 흐름 |
| R6 | "원가구조 해석력" 측정의 객관성 | 학습 효과 증명 곤란 | 중 | Phase 0b에서 instrument 사전 설계 + 비대상 n≥3 validation. paired pre/post로 baseline 통제 |
| **R7** | 케이스 변환 로직 = 코드 (cost_model.py:314-492) | AC10 false 가능성 | 고 | AC10을 (a)JSON only (기존 어댑터 패턴) + (b)≤20줄 TS 어댑터 두 경로로 명문화. 강사 매뉴얼에 두 경로 모두 기재 |
| **R8** | Framer Motion + reactflow 30+ 노드 모바일 FPS | AC1·AC6 충돌 | 중 | Phase 6에서 명시 디바이스 매트릭스 측정. 펄스 효과만 GPU-accelerated 속성(transform/opacity)으로 제한 |
| **R9** | learner_log PIPA 위험 | 법적·운영 | 저 | Reflect 자유 응답은 클라이언트에만 저장(전송 금지). Supabase 스키마는 객관식 ID + 슬라이더 최종값만. 세션 ID는 임의 UUID(연계불가) |
| **R10** | v0.3 자산 흡수 미예산 | Phase 1+ 일정 | 저 | Phase 0b 1일 별도 할당 (glossary/brand-voice/implementation-report ingest) |

---

## 8. Verification Steps (concrete)

| Phase | 검증 명령/절차 | 통과 기준 |
|-------|--------------|----------|
| 0a | `pnpm dev`, `pnpm lint`, `pnpm typecheck` | 0 에러 |
| 0b | instrument 5+5문항 작성, n=3 비대상 사용자 모호성 점검 | 모든 문항이 단일 정답으로 합의 |
| 1 | `pnpm gen:fixtures && pnpm test lib/cost-engine` | 27/27 PASS, ±0.001 (AC8) |
| 2 | Chrome DevTools Performance — 슬라이더 드래그 시 노드 강조 timing | 200ms 이내 (AC1) |
| 3 | 6 케이스 reference 로드 + 모든 변수 슬라이더 작동 | 0 콘솔 에러 |
| 4 | 6 케이스 4-phase 완주 + 학습 로그 Supabase 기록 검증 | 각 케이스 ≤12분, 자유 응답 미전송 (R9) |
| 5 | AI off → 케이스 코칭 검증 → AI on 토글 → 동일 케이스 코칭 검증 → API 강제 종료 → graceful degrade 확인 | AC7 통과 |
| 6 | Lighthouse + 명시 디바이스 매트릭스 + `next build --profile` analyzer | Lighthouse ≥90, AC6 매트릭스 통과, AC12 ≤250KB |
| 7 | 파일럿 학습자 paired pre/post 점수 차 | AC2 +30% delta 달성 |

---

## 9. ADR — Architecture Decision Record

### Decision
원가 엔진을 클라이언트 사이드 TypeScript로 포팅하여 Next.js 14 App Router 위에 SPA-like 인터랙션을 구축한다. Python 백엔드는 폐기하되 cost_model.py는 골든 픽스처 생성 oracle로 보존. Vercel Edge Functions + Supabase로 세션·AI·콘텐츠 서빙. **Workshop 멀티플레이어는 v1.1로 이연.**

### Drivers
- D1 (학습효과): 살아있는 트리는 0ms 응답이 전제 → 클라이언트 엔진 필수
- D2 (운영안정성): 서버 의존도 최소 → 강의장 Wi-Fi 변동성에 강함
- D3 (콘텐츠 확장성): JSON + ≤20줄 어댑터로 강사 자율 추가

### Alternatives Considered
1. **Option B (Python 백엔드 + WebSocket + 디바운스)** — 디바운스 변형까지 포함해 steelman. SoT 우위가 클라이언트 보간 도입으로 약화. R1을 골든 픽스처로 거의 제거할 수 있게 된 이상 결정적 우위 없음
2. **Option C (Excel + VBA)** — 모바일/하이브리드 운영 미충족. 즉시 기각
3. **Option D (Astro islands / SvelteKit)** — 정당한 대안. 번들 사이즈 우위는 명확하나 shadcn/Supabase/reactflow 통합 사례 적음, 팀 친숙도 ↓ → 일정 리스크가 절감 이득 상쇄. 채택 안 함

### Why Chosen
Option A는 D1·D2·D3를 모두 만족하면서 골든 픽스처로 R1까지 거의 제거. Option B의 SoT 우위는 클라이언트 보간 부담으로 상쇄. Option D는 일정 리스크.

### Consequences
- **Positive**: 0ms 인터랙션, 서버 비용 최소, 강의장 안정성, 콘텐츠 자율 추가 경로 2개
- **Negative**: 골든 픽스처 동기화 워크플로우 학습 필요, reactflow 학습 곡선(낮음), 케이스 신규 변환 로직은 코드 변경 필요(어댑터)

### Follow-ups
- v1.1: Workshop 모드 (실시간 동기화, 리더보드, 돌발 이벤트, 비교 보고서) — 별도 2주 프로젝트
- v1.1: AI 코치 가치 평가 결과에 따라 강화/제거
- v1.1: AC2 paired delta 결과 분석 → 미달 케이스 인터랙션 재설계

---

## 10. Out of Scope (v1.0)

다음은 의도적으로 v1.0에서 제외:
- **Workshop 실시간 멀티플레이어** (이전 Phase 6, 3일 추정 비현실적이라 v1.1로 이연)
- 학습자 개인 인증/계정 (익명 세션만)
- LMS(SCORM/xAPI) 연동
- 다국어 (한국어만)
- 관리자 분석 대시보드
- AI 음성 코칭
- VR/AR 시각화
- Reflect 자유 응답의 서버 저장 (PIPA 안전망)

---

## 11. Definition of Done (v1.0)

- [ ] AC1~AC12 모두 통과
- [ ] **AC2 instrument**가 비대상 n≥3로 validation 완료
- [ ] 파일럿 세션 1회 + paired pre/post 측정 결과 문서화
- [ ] 강사용 1페이지 운영 매뉴얼 (모드 토글, 세션 시작, 장애 대응)
- [ ] 강사용 케이스 추가 가이드 (JSON 경로 + 어댑터 경로 두 시나리오)
- [ ] `outputs/v1-implementation-report.md` 작성
- [ ] v0.3 코드는 `projects/cost-sim-wargame-v0/` 로 이동, README에 deprecated 명시
- [ ] PIPA 체크리스트 통과 (R9): learner_log 스키마에 PII 컬럼 0개

---

## 12. Open Questions — Resolved

| # | 질문 | 결론 |
|---|------|------|
| Q1 | Supabase Realtime 30명 한도? | **N/A — Workshop이 v1.1로 이동.** v1.0은 Realtime 미사용 |
| Q2 | AC2 측정 객관성? | **paired pre/post +30% delta 채택**, 절대 80% 폐기. instrument는 Phase 0b에서 비대상 validation |
| Q3 | TS 부동소수점 허용 오차? | **±0.001** (Python float64 ≈ JS Number, IEEE 754 동일). decimal.js 불필요 |
| Q4 | 트리 라이브러리? | **reactflow 채택** (D3 폐기). 노드를 React 컴포넌트로 받는 패턴이 v1.0 일정에 적합 |
| Q5 | Workshop 모드 v1.0 vs v1.1? | **v1.1 이연**. 3일 추정이 비현실적, 핵심 가치(Living Tree + Guided + AC2)는 Workshop 의존 안 함 |

---

## 13. Changelog

- **2026-04-11 v1**: 초안 작성 (interview mode, planner skill)
- **2026-04-11 v2 (CONSENSUS)**: Architect APPROVE_WITH_REVISIONS + Critic REVISE 통합 반영
  - P3 ("Engine on Client") 순환 원칙 제거 → P2에 흡수 (4 원칙으로 정리)
  - Option B steelman 보강 (debounce + 낙관적 UI 변형 명시)
  - Option D (Astro/SvelteKit) 추가 + 기각 사유 명시
  - D3 → reactflow 교체 (Phase 2: 3일 → 2일)
  - 골든 픽스처 자동 동기화 도입 (Phase 1: 2일 → 1일, R1 거의 제거, AC8 ±0.01 → ±0.001)
  - Phase 0를 0a (셋업) + 0b (자산 흡수 + AC2 instrument 설계) 두 단계로 분리
  - **Workshop Phase 6 (3일)을 v1.1로 이연** → §10 Out of Scope 추가
  - 신규 리스크 R7 (case DSL), R8 (모바일 FPS), R9 (PIPA), R10 (자산 흡수) 추가
  - AC10 완화: JSON 경로 + ≤20줄 어댑터 경로 두 시나리오로 명문화
  - 신규 AC12 번들 사이즈 ≤250KB critical path 추가
  - AC2를 절대 80%에서 paired pre/post +30% delta로 변경
  - Phase 5 시퀀싱 명시: Day 1 정적 코치 end-to-end → Day 2 AI 레이어
  - learner_log 스키마 PIPA 안전: Reflect 자유 응답 클라이언트 전용
  - Open Questions Q1~Q5 모두 결론 도출
  - 총 일정 21일 → **17일** (4일 슬랙)
