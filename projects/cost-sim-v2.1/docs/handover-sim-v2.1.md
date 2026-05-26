# cost-sim v2.1 인수인계서

> 작성: 2026-05-26 · 대상: **개발자 + 강의 운영자 동시 인수**
> 인수 범위: **전체** (코드 유지보수 + 6차수 강의 운영 + 배포)
> 인수 단위: `projects/cost-sim-v2.1/` 폴더 + 루트 운영 문서(`CLAUDE.md`·`plan.md`·`decision-log.md`·`CONTEXT.md`·`handoff.md`)
> 본 문서는 단일 진입점. 세부는 본문 링크 따라가기. **읽는 순서**: §1 → §2 → §10(긴급) → 나머지

---

## 1. 30초 요약

| 항목 | 값 |
|------|------|
| 정체 | LG Display CI(원가혁신) 과정 학습자용 **개발 원가 산정 시뮬레이션 게임** |
| 활성 버전 | `projects/cost-sim-v2.1/` (v1, v2-game, wargame-v0은 frozen/archive) |
| 스택 | Next.js 14 (App Router) · React 18 · TypeScript 5.6 · Zustand · RHF+zod · Tailwind · reactflow+dagre · Framer Motion |
| 백엔드 | AWS Amplify **SSR (WEB_COMPUTE)** + DynamoDB + 폴링 2초 |
| 라이브 URL | https://master.d26yr76roz76fk.amplifyapp.com |
| 저장소 | https://github.com/Koolsangon/CI-Course (`master` 브랜치 자동 배포) |
| 운영 일정 | 2026-05-27 1차수 시작 → **6차수 × 30명**, LG Display 사내 강의실, 회사 노트북 |
| 게임 모델 | 4 라운드 × 10분 캡 타임어택. 100% 정답 자동 종료. 개인 1·2·3 + 팀 1·2·3 |

**핵심 위치 3곳**
- 운영 계약: `CI-Course/CLAUDE.md`
- 작업 계획: `CI-Course/plan.md` (17 vertical slices, 14/17 코드 완료)
- 최근 작업 상태: `CI-Course/handoff.md` (시간역순 prepend)

---

## 2. 도메인 (canon, 2026-05-12 확정)

### 2.1 4 케이스 — 엑셀 원본 번호 그대로 유지 (리넘버 금지)

| ID | 이름 | 메커니즘 |
|----|------|----------|
| **01-loading** | Loading율 변동 | 고정비 가공비(노무·경비·감상비)가 가동률↓ 시 단위당 분담액 ↑. `새값 = 기준값 × (기준Loading ÷ 새Loading)` |
| **04-material-yield** | 재료비 절감 vs 수율 하락 | Module BOM 절감(분자↓)과 Module 수율 하락(분모↓) 상쇄. `소요재료비 = Σ(BOM / 누적수율)` |
| **05-cuts-mask** | 면취수·Mask 복합 | 면취수↑ = TFT/CF/Cell BOM↓ + Panel 가공비↓ (반비례). Mask↑ = Panel 가공비↑ (정비례). 곱셈 |
| **06-tact-investment** | Tact 지연 + 투자비 | Tact 배수는 Module 가공비 전체에 곱셈, 투자 상각비는 Module 감상비에 덧셈 |

> **case 02·03(인건비·한계이익률)은 스코프 제외**. 개념만 Sandbox/인스펙터에 노출. 복원 결정 시 `decision-log.md` 2026-05-12 supersede 새 결정 필요.

### 2.2 7 변동 변수 (Sandbox Multi-factor)

| # | 변수 | 범위 / 기본값 | 슬라이더 키 |
|---|------|-------------|------------|
| 1 | Loading율 | 30~100% / 70% | `new_loading` |
| 2 | Module 재료비 변동률 | -20%~+20% / 0% | `material_change_pct` |
| 3 | Module 수율 변동률 | -10%p~+5%p / 0%p | `module_yield_change` |
| 4 | 새 면취수 | 10~40개 / 25개 (기준 25 reference 고정) | `new_cuts` |
| 5 | 새 Mask | 3~10장 / 6장 (기준 6 reference 고정) | `new_mask` |
| 6 | Tact 배수 | 0.80~1.50x / 1.00x | `tact_multiplier` |
| 7 | 투자 상각비 증가분 | $0~5 / $0 | `investment_depreciation_delta` |

**적용 순서 (sacred)**: Loading → 재료비 → 수율 → 면취수 → Mask → Tact → 투자상각비
→ `lib/cost-engine/merged-adapter.ts` 의 `applyMerged()` 가 5 sacred 어댑터를 순차 호출.

### 2.3 게임화 룰 (1차수 5/27 적용)

- **타임어택**: 4 라운드, 라운드당 10분 캡 (강사 설정 패널에서 조정)
- **개인 점수**: 라운드별 풀이 시간 합산. 1·2·3등 발표
- **팀 점수**: 라운드별 *팀에서 가장 늦은 조원* 시간을 4 라운드 합산. 1·2·3등 발표
- **시간 측정**: 강사 신호로 라운드 시작 → 학습자 100% 정답 도달 시각 차이. **Lambda 서버 timestamp 사용** (학습자 노트북 시계 조작 불가)
- **미완료자**: 캡 시간(10분) 으로 합산 (자연 하위 정렬)
- **종료 조건**: 100% 정답 시 자동 종료. **채점 결과는 O/X만**, 정답 숫자 미노출. 채점-부분초기화-재계산-채점 반복 허용
- **힌트**: 문제 단위 3단계 모달 (100/70/40/20% 차감). 차감 토글 강사 설정에서 ON/OFF
- **결과 공개**: 매 라운드 즉시 학습자/강사 모두 전체 리더보드 공개

상세 — `outputs/cost-sim-v2.1-game-prd.md`, `decision-log.md` 2026-05-13 (16개 결정 박제), `outputs/개발원가-War-Game-설명서.pdf`.

### 2.4 핵심 용어 (cheat sheet)

| 용어 | 정의 |
|------|------|
| BOM | Bill of Materials. 부품 단가. TFT/CF/Cell/Module 4단계 |
| 수율 (Yield) | 공정별 양품률. 누적수율 = TFT × CF × Cell × Module |
| 가공비 | 노무비 + 경비 + 감상비. Panel/Module 각 3항목 = 6 항목 |
| 소요재료비 | `Σ(BOM / 누적수율)`. 수율↓ 시 소요재료비↑ |
| COM | Cost of Manufacturing = 소요재료비 + 가공비 |
| COP | Cost of Production = COM + SGA |
| SGA | 판관비 5항목 (direct_dev / transport / business_unit / operation / corporate_oh) |
| 영업이익 | Price − COP |
| Loading율 | 설비 가동률. 가공비 분담의 분모 |
| Tact Time | 단위 생산 시간. Module 가공비 곱셈 배수 |
| 면취수 | 원판 1장 → 패널 수. 늘면 단위당 분담 ↓ |
| Mask | 공정 마스크 수. 늘면 공정 부담 ↑ |

상세: `context/glossary.md`.

---

## 3. 라우트 맵 (학습자 / 강사)

### 3.1 학습자 흐름

```
/                                       ← 룸 코드 + 이름 + 팀 번호 입력
  ↓ POST /api/rooms/{code}/players
  ↓ saveRoomContext(localStorage)
/intro                                  ← 기존 6비트 인트로 다이얼로그
  ↓
/menu                                   ← 메뉴 (Sandbox / 게임 모드 선택)
  │  ├─ Sandbox 선택 → /sandbox        ← 7변수 자유 탐험
  │  └─ 게임 모드: useRoomState 2초 폴링
  │       ↓ 강사가 라운드 신호 (round.status=in_progress)
/cases/[caseId]?game=true&room={code}&round={n}
  ↓ 100% 정답 자동 종료 → POST submissions → /menu (round_ended 상태)
  ↓ 강사 다음 라운드 신호 폴링
  ↓ 4 라운드 끝 → /menu (game_ended) 종합 발표
```

`caseId` ∈ `{01-loading, 04-material-yield, 05-cuts-mask, 06-tact-investment}`.

### 3.2 강사 흐름

```
/instructor                             ← 새 방 생성 + 내가 만든 방 목록
  ↓ POST /api/rooms → {code: 4자, admin_token: 12hex}
  ↓ saveAdminToken(localStorage)
/instructor/[code]
  ├─ 설정 패널 (시간 캡 · 팀 수 · 힌트 차감 · 발표 모드)
  ├─ 입장 학습자 대시보드 (이름·팀·UUID, 팀 번호 오타 수정 가능)
  ├─ 라운드 4개 start/end 버튼
  ├─ 실시간 진행 대시보드 (학습자별 N/4 제출 + 시간)
  └─ 종합 발표 컨트롤
```

### 3.3 두 학습 동선 (게임 외)

| 동선 | 라우트 | 용도 |
|------|--------|------|
| Sandbox | `/sandbox` | 7변수 통합 Multi-factor 자유 탐험 |
| Worksheet (연습 모드) | `/cases/[id]` | 룸 컨텍스트 없으면 자동 연습 모드 (타이머·리더보드 없음) |

---

## 4. 폴더 구조

### 4.1 리포 루트 (`CI-Course/`)

```
CI-Course/
├── CLAUDE.md                ← 운영 계약 (핵심 명령·금지 규칙·검증)
├── CONTEXT.md               ← 도메인 인덱스 (본 문서의 부모)
├── plan.md                  ← 17 vertical slices, 14/17 코드 완료
├── handoff.md               ← 세션별 인수인계 로그 (시간역순 prepend)
├── decision-log.md          ← ADR 등가물 (Scope/결정/이유/영향/거부된 대안 4-필드)
├── amplify.yml              ← Amplify 빌드 스펙
├── sam-cli_accessKeys.csv   ← ⚠️ AWS IAM 키 (커밋 금지, 별도 전달)
├── context/                 ← 장기 배경지식 (브랜드 톤, 용어집) — 수정 시 사용자 승인
│   ├── brand-voice.md
│   └── glossary.md
├── docs/agents/             ← skill 운영 규칙 (issue-tracker, triage-labels, domain)
├── outputs/                 ← 최종 산출물 결재함 (덮어쓰기 시 승인 필요)
│   ├── cost-sim-v2.1-game-prd.md          ← 게임화 PRD 422줄 55 stories
│   ├── 개발원가-War-Game-설명서.{md,pdf}  ← 학습자/강사용 설명서
│   ├── implementation-report.md           ← v2.1 구현 보고서
│   ├── v1-implementation-report.md
│   └── amplify-changelog-2026-05.md
├── projects/
│   ├── cost-sim-v2.1/       ← ★ 활성 버전
│   ├── cost-sim-v1/         ← FROZEN 2026-04-11
│   ├── cost-sim-v2-game/    ← v2.1 직전 베이스 (정적 export 시절)
│   ├── cost-sim-wargame-v0/ ← Python/FastAPI 프로토타입 (archive)
│   ├── lg-display-hrd/      ← 강의 운영 자료
│   ├── CI 과정 활용 자료/   ← 강사 배포물
│   └── _archive/
└── templates/               ← 결과물 양식 (verification-checklists 등)
```

### 4.2 활성 앱 (`projects/cost-sim-v2.1/`)

```
cost-sim-v2.1/
├── README.md                 ← v2.1 진입점 (v1 상속 자산 + v2-game 추가 작업)
├── package.json              ← name: cost-sim-v2-game, version: 2.1.0
├── next.config.js            ← ⚠️ output:'export' 제거됨 (SSR 전환)
├── playwright.config.ts
├── vitest.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
├── app/                      ← Next.js 14 App Router
│   ├── layout.tsx
│   ├── page.tsx              ← 룸 코드 입력 (학습자 진입)
│   ├── globals.css
│   ├── (learn)/
│   │   ├── sandbox/page.tsx  ← 7변수 통합 Sandbox
│   │   ├── menu/page.tsx     ← 학습자 메뉴 + 게임 대기·결과·종합발표
│   │   └── cases/[caseId]/
│   │       ├── page.tsx      ← generateStaticParams (SSG)
│   │       └── CaseClient.tsx ← "use client" 분리
│   ├── instructor/
│   │   ├── page.tsx          ← 방 생성 + 목록
│   │   └── [code]/page.tsx   ← 방 본체 (설정/대시보드/라운드 컨트롤)
│   └── api/
│       ├── ai/               ← (잔존 폴더 — LLM 코치 제거 후 비어있음 확인)
│       └── rooms/
│           ├── route.ts                              ← POST 룸 생성
│           ├── [code]/route.ts                       ← GET 폴링 + PATCH 강사 액션
│           ├── [code]/players/route.ts               ← POST 학습자 입장
│           └── [code]/rounds/[n]/submissions/route.ts ← POST 정답 제출
├── components/
│   ├── CostTree/             ← reactflow LR + dagre + Framer pulse (SACRED 시각)
│   ├── FormulaInspector/     ← 변동 변수만 group 단위 자연어 표시
│   ├── ParamPanel/           ← 7 sliders × 4 multi-open accordion (RHF + zod)
│   ├── Worksheet/
│   │   ├── ProblemPage.tsx   ← 게임/연습 모드 분기, 미니 리더보드, sticky 계산기
│   │   ├── WorksheetCell.tsx ← yellow 셀 듀얼 입력 (클릭+키인)
│   │   └── WorksheetGuide.tsx
│   ├── Room/                 ← 룸 컨텍스트 UI
│   ├── Intro/                ← 6비트 인트로
│   ├── ui/                   ← Card / Button / Slider / PhaseChip / Container
│   └── ServiceWorkerBoot.tsx
├── lib/
│   ├── cost-engine/          ← ★ SACRED — 건드리지 마세요
│   │   ├── engine.ts         ← 순수 TS 계산 코어
│   │   ├── presets.ts        ← REFERENCE 기준값
│   │   ├── types.ts
│   │   ├── diff.ts
│   │   ├── merged-adapter.ts ← applyMerged(SevenDeltas) — 5 어댑터 순차
│   │   ├── case-adapters/    ← loading / material-yield / cuts-mask / tact-investment
│   │   ├── __fixtures__/     ← 27 골든 픽스처 (±0.001 회귀)
│   │   └── __tests__/        ← engine 35 + diff 2 + merged-adapter 11
│   ├── room/
│   │   ├── types.ts          ← RoomStatus, RoundStatus, Submission 등
│   │   ├── storage.ts        ← ⚠️ in-memory Map (DynamoDB 마이그 미완료)
│   │   ├── state-machine.ts  ← waiting→playing→ended / not_started→in_progress→ended
│   │   ├── time-aggregator.ts ← aggregatePlayerScores / aggregateTeamScores / rankPlayers/Teams
│   │   └── __tests__/        ← state-machine 12 + time-aggregator 7
│   ├── hooks/
│   │   └── useRoomState.ts   ← 2초 폴링 hook
│   ├── cases.ts              ← CASES, CASE_ORDER (4 케이스)
│   ├── worksheet-engine.ts   ← yellow/purple/blue 셀 cascade resolve + 채점
│   ├── worksheet-engine.test.ts
│   ├── formula-parser.ts     ← "21.3*70%" → 14.91 파싱 (19 tests)
│   ├── formula-parser.test.ts
│   ├── store.ts              ← Zustand (sandbox sliders 등)
│   ├── instructor.ts         ← admin_tokens localStorage
│   ├── player.ts             ← RoomContext localStorage
│   └── sound.ts              ← Web Audio chime
├── content/
│   ├── coach-tone.md         ← 강사 카피 톤 가이드
│   ├── glossary.json
│   ├── cases/                ← 4 케이스 메타데이터
│   │   ├── 01-loading.json
│   │   ├── 04-material-yield.json
│   │   ├── 05-cuts-mask.json
│   │   └── 06-tact-investment.json
│   ├── problems/             ← 4 문제 워크시트 (셀·행·힌트 3단계 12개)
│   └── case-adapters/        ← ≤20-line 변환 함수
├── scripts/
│   └── gen-fixtures.py       ← Python oracle → JSON fixtures
├── tests/e2e/                ← Playwright 14+ spec
├── docs/
│   ├── handover-sim-v2.1.md  ← (본 문서)
│   ├── amplify-deploy.md     ← ⚠️ v2-game 시절(정적 export) — v2.1은 SSR로 변경됨
│   ├── deploy.md
│   ├── instructor-manual.md  ← ⚠️ v1 매뉴얼 — v2.1 운영은 본 문서 §8 참고
│   ├── pilot-runbook.md      ← v1 시절 측정 런북 (참고용)
│   ├── case-authoring-guide.md
│   ├── bundle-report.md
│   ├── lighthouse.md
│   ├── device-matrix.md
│   └── sandbox-loading-material-update-20260506.md
└── public/                   ← PWA manifest + 서비스 워커
```

### 4.3 Sacred 영역 — 절대 수정 금지 (PR 리뷰 1번 체크)

- `lib/cost-engine/engine.ts`
- `lib/cost-engine/presets.ts`
- `lib/cost-engine/__fixtures__/*.json` (27 골든 픽스처)
- `lib/cost-engine/engine.test.ts`
- `components/CostTree/` 시각 (LR 레이아웃·dagre·Framer pulse)
- `content/problems/*.json` 의 Reflect 자유 응답 (게임화 금지 — 학습 무결성)

수정 시 — `decision-log.md` 에 supersede 새 결정 entry 필수 + 골든 픽스처 회귀 ±0.001 통과 필수.

---

## 5. 핵심 데이터 흐름

### 5.1 룸 lifecycle (게임 모드)

```
[강사]   POST /api/rooms
         → {code: "X3K7", admin_token: "abc...12hex"}
         → saveAdminToken(localStorage)

[학습자] POST /api/rooms/{code}/players  {name, team}
         → {playerId: uuid}
         → saveRoomContext(localStorage)

[강사]   PATCH /api/rooms/{code}  {action: "start_round", roundN: 1}
         (admin_token 검증)

[학습자] useRoomState 폴링 (2초)
         → snapshot.round.status === "in_progress" 감지
         → router.push(/cases/{caseId}?game=true&room={code}&round=1)

[학습자] 100% 정답 자동 → POST submissions {playerId, timeSec, hintsUsed}
         → 또는 10분 캡 → submitRound(false) (캡 시간 기록)
         → router.push(/menu)

[강사]   다음 라운드 PATCH → 반복 × 4

[강사]   PATCH {action: "end_game"}
         → aggregatePlayerScores + aggregateTeamScores
         → 학습자 /menu = game_ended 상태 (개인·팀 1·2·3 발표)
```

### 5.2 API 5종 요약

| Method · Path | 용도 | 인증 |
|---|---|---|
| POST `/api/rooms` | 룸 생성 | 없음 (admin_token 응답) |
| GET `/api/rooms/{code}` | 폴링 스냅샷 | 없음 |
| PATCH `/api/rooms/{code}` | 강사 액션·설정 | `x-admin-token` 헤더 |
| POST `/api/rooms/{code}/players` | 학습자 입장 (UUID 발급) | 없음 (ended 상태 거부) |
| POST `/api/rooms/{code}/rounds/{n}/submissions` | 정답 제출 | playerId 멤버십 검증 |

**룸 코드 알파벳**: `0/O/1/I` 제외 32자. 충돌 시 10회 재시도. 4자.
**admin_token**: 12 hex.

### 5.3 ⚠️ 저장소: 현재 in-memory, DynamoDB 마이그 미완료

`lib/room/storage.ts` 는 **Node 프로세스 메모리 Map**. Next.js serverless Lambda cold start 시 룸 데이터 리셋됨.

- **로컬 dev (`npm run dev`)**: 정상 동작
- **Amplify 단일 instance**: 동작하나 Lambda 재시작 시 데이터 손실
- **다중 instance / 1차수 30명 라이브**: ❌ DynamoDB 작업 필수 (S11 deployment caveat, plan.md C.1)

DynamoDB 스키마 (예정 — single-table):

```
PK: ROOM#{code}
SK:
  META                            ← room meta (settings, status)
  PLAYER#{playerId}               ← player
  ROUND#{N}                       ← round meta
  ROUND#{N}#PLAYER#{playerId}     ← submission
```

마이그레이션 시 `storage.ts` 의 CRUD 함수 시그니처 유지하고 내부만 AWS SDK 호출로 교체하면 OK (state-machine·API 라우트는 storage 의존성만 통해 접근).

---

## 6. 로컬 개발 셋업

### 6.1 사전 요구사항

| 도구 | 버전 |
|------|------|
| Node.js | 20.x (`@types/node`: 20.16.10 기준) |
| npm | 10.x |
| Python | 3.x (gen-fixtures 용) |
| 시스템 Chrome | 사내망 PC는 chromium 다운로드 차단 → Chrome 본체 사용 |

### 6.2 초기 셋업

```bash
cd "D:\02. AI\02. Claude\Vibe Coding\28. CI 과정 시뮬레이션 개발\CI-Course\projects\cost-sim-v2.1"
npm ci                # package-lock.json 결정적 설치
npm run dev           # http://localhost:3000 (점유 시 3001 자동)
```

### 6.3 명령어

```bash
npm run dev           # 개발 서버
npm run build         # 프로덕션 빌드
npm run start         # 빌드 결과 실행
npm run lint          # next lint
npm run typecheck     # tsc --noEmit (목표: 0 에러)
npm run test          # vitest run (목표: 92/92)
npm run test:watch    # vitest watch
npm run gen:fixtures  # Python oracle → JSON 골든 픽스처 재생성 (sacred 영역)

npx playwright test                          # 전체 E2E
npx playwright test scenario-card-review     # 특정 spec
npx playwright test --project=chromium --timeout=60000
```

### 6.4 환경변수 (Amplify 콘솔 또는 `.env.local`)

| 키 | 용도 | 비고 |
|----|------|------|
| `AWS_REGION` | DynamoDB 리전 | DynamoDB 마이그 후 필수 |
| `DYNAMODB_TABLE_NAME` | DynamoDB 테이블 이름 | 동일 |
| ~~`GEMINI_API_KEY`~~ | (제거됨) LLM 코치 | Phase 0.1에서 완전 제거. Amplify 콘솔에서도 삭제 |
| ~~`ANTHROPIC_API_KEY`~~ | (제거됨) | 동일 |
| ~~`NEXT_PUBLIC_AI_COACH_ENABLED`~~ | (제거됨) | 동일 |

> **`.env`, 자격증명, 비밀키는 절대 커밋 금지** (CLAUDE.md 절대 금지 규칙).

### 6.5 사내망 Playwright 셋업 (트러블슈팅 빈도 ↑)

```ts
// playwright.config.ts 에 이미 적용
use: {
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
}
// dev server fetch 시: waitUntil: 'domcontentloaded' (networkidle 금기 — HMR WebSocket 무한 대기)
```

`npx playwright install` 는 사내망 TLS 인터셉트로 실패 — 시스템 Chrome 직접 사용이 정답.

---

## 7. 배포 (AWS Amplify)

### 7.1 현재 상태

- **플랫폼**: WEB_COMPUTE (SSR/Lambda) — `output:'export'` 제거 완료
- **앱 ID**: `d26yr76roz76fk` (콘솔 → Amplify → CI-Course)
- **연결 저장소**: GitHub `Koolsangon/CI-Course`, 브랜치 `master`, 자동 배포
- **빌드 스펙**: 리포 루트 `amplify.yml`

```yaml
version: 1
applications:
  - appRoot: projects/cost-sim-v2.1   # ★ v2-game 아님 (혼동 주의)
    frontend:
      phases:
        preBuild:  { commands: [ npm ci ] }
        build:     { commands: [ npm run build ] }
      artifacts:
        baseDirectory: .next          # WEB_COMPUTE 기준 (정적 export는 out/)
        files: [ '**/*' ]
      cache:
        paths:
          - node_modules/**/*
          - .next/cache/**/*
```

### 7.2 자격증명 (AWS IAM)

- 위치: `CI-Course/sam-cli_accessKeys.csv` ⚠️ **커밋 금지**
- 권한 필요: Amplify · DynamoDB read/write · CloudWatch logs
- 본 문서에는 키 노출 안 함 — **별도 채널로 전달**
- 분실 시 IAM 콘솔에서 신규 액세스 키 발급 + 구 키 비활성화

### 7.3 배포 검증

```bash
# 플랫폼 확인 (WEB_COMPUTE 기대)
curl -sI https://master.d26yr76roz76fk.amplifyapp.com/ | grep server
# server: CloudFront → WEB_COMPUTE OK
# server: AmazonS3 → 잘못된 플랫폼 (정적 export 시절)

# 룸 생성 smoke test
curl -X POST https://master.d26yr76roz76fk.amplifyapp.com/api/rooms
# 기대: {"code": "X3K7", "admin_token": "..."}

# 폴링
curl https://master.d26yr76roz76fk.amplifyapp.com/api/rooms/X3K7
# 기대: RoomSnapshot JSON
```

### 7.4 ⚠️ docs/amplify-deploy.md 주의

이 문서는 **v2-game 시절(정적 export)** 가이드. v2.1은 SSR로 전환됨. `output:'export'`, `baseDirectory: out`, "API Route 미지원" 부분은 **현재와 다름**. v2.1 기준은 본 §7.

> SSR ↔ 정적 export 전환은 Amplify 콘솔 → App settings → Platform 에서 변경 + `next.config.js` 동기화 필요.

---

## 8. 강의 운영 (강사용)

### 8.1 1차수 일정 — 2026-05-27 (D+1)

> 본 인수인계서 작성일은 D-1. D-2 셀프 리허설 결과에 따라 Plan A/B 결정.

| 시점 | 게이트 |
|------|--------|
| **D-2 (5/25) 셀프 리허설** | 노트북 1대로 강사+학습자 다중 탭 시뮬레이션. 게이미피케이션 풀 동작? |
| → 동작 시 | **Plan A**: 풀 게이미피케이션 진행 |
| → 미동작 시 | **Plan B (fallback)**: 워크시트만 + 강사 수기 시간 측정 |

### 8.2 강의 1회 운영 시나리오 (90~120분)

| 단계 | 시간 | 작업 |
|------|------|------|
| 1. 강사 사전 | -10분 | `/instructor` 접속 → 새 방 생성 → 코드 4자 칠판 표시 |
| 2. 강사 설정 | -5분 | `/instructor/{code}` 설정 패널: 시간 캡 10분, 팀 수 5, 힌트 차감 ON |
| 3. 학습자 입장 | 0~10분 | 30명 본인 노트북에서 `https://master.d26yr76roz76fk.amplifyapp.com/` → 코드+이름+팀 입력 |
| 4. 강사 검수 | 10~15분 | 입장 대시보드에서 이름·팀 오타 수정 (팀 번호 직접 수정 가능) |
| 5. 인트로 + 메뉴 | 15~25분 | 학습자 `/intro` → `/menu` 대기 화면 안착 |
| 6. 라운드 1 | 25~35분 | 강사 "Round 1 Start" 클릭 → 학습자 자동 진입 → 10분 캡 |
| 7. 결과 1 | 35~40분 | 학습자/강사 화면 자동 리더보드 → 강사 코멘트 |
| 8. 라운드 2~4 | 40~80분 | 반복 (각 라운드 10분 + 결과 발표) |
| 9. 종합 발표 | 80~90분 | 강사 "End Game" → 개인 1·2·3 + 팀 1·2·3 |
| 10. 디브리프 | 90~120분 | Sandbox 자유 탐험 + 학습 정리 |

### 8.3 강사 설정 패널 상세

| 설정 | 기본값 | 조정 범위 |
|------|--------|----------|
| 시간 캡 (sec) | 600 | 60 ~ 1800 |
| 팀 수 | 5 (6명/팀) | 1 ~ 10 |
| 힌트 차감 토글 | ON | ON/OFF |
| 발표 모드 | full | full / winner_only |

설정 변경은 PATCH `/api/rooms/{code}` `x-admin-token` 헤더로. 실시간 반영 (학습자 폴링 2초 후).

### 8.4 미완료 학습자 처리

- 라운드 캡(10분) 도달 시 자동 submission (`completed: false`, time: capSec)
- 점수 산정에는 cap 시간이 그대로 합산 → 자연 하위 정렬
- 강사가 강제 종료할 필요 없음

### 8.5 부정행위 방지

- 시간은 **Lambda 서버 timestamp**. 학습자 노트북 시계 조작 무효
- 새로고침 시 RoomContext localStorage 복원 — 시간 리셋 불가
- 정답 숫자 미노출 (O/X만) — 정답 추측 어려움

### 8.6 디브리프용 자료

- `outputs/개발원가-War-Game-설명서.pdf` — 학습자 배포물
- `outputs/cost-sim-v2.1-game-prd.md` — 강사 자체 학습용
- `projects/CI 과정 활용 자료/` — 강의장 배포물 일체

---

## 9. 테스트 & 검증

### 9.1 검증 베이스라인 (2026-05-22 기준)

| 검증 | 명령어 | 기대 |
|------|--------|------|
| Typecheck | `npm run typecheck` | 0 에러 |
| Unit | `npm test` | **92/92 통과** |
| Build | `npm run build` | SUCCESS, 0 warning |
| E2E | `npx playwright test` | 14+ spec 통과 |

### 9.2 Vitest 분포

| 모듈 | tests |
|------|-------|
| cost-engine engine | 35 |
| cost-engine diff | 2 |
| cost-engine merged-adapter | 11 |
| worksheet-engine | 3 |
| formula-parser | 19 |
| room state-machine | 12 |
| room time-aggregator | 7 |
| 기타 | 3 |
| **합계** | **92** |

### 9.3 골든 픽스처 (sacred)

- 27개, ±0.001 tolerance
- PR 리뷰 1번 체크 항목
- `npm run gen:fixtures` 로 재생성 — Python oracle 결과와 ±0.001 일치해야 함
- **추가 시**: `scripts/gen-fixtures.py` 새 시나리오 블록 + `engine.test.ts` 새 describe + Python 수동 검증 1회

### 9.4 시각 회귀

- **새 세션에서 검증** (CLAUDE.md 검증 원칙 — 구현 세션 자체 검증 금지)
- Playwright `scenario-card-review` spec — `test-results/scenario-card/*.png` 4 케이스 스크린샷
- 사내망: 시스템 Chrome `executablePath` 옵션 사용

### 9.5 케이스 추가 SOP (4 케이스 → 5+ 확장 시)

상세: `docs/case-authoring-guide.md`. 요약:

**경로 A — 기존 어댑터 재사용**
1. `content/cases/07-your-case.json` 복사
2. variables 슬라이더 key가 어댑터 기대 이름과 일치
3. `lib/cases.ts` 의 `CASES`, `CASE_ORDER` 갱신
4. `npm test` 27/27 통과 확인

**경로 B — 신규 어댑터**
1. `lib/cost-engine/case-adapters/your-id.ts` ≤20줄
2. `merged-adapter.ts` 의 적용 순서에 끼울지 결정
3. `scripts/gen-fixtures.py` 시나리오 추가 → `npm run gen:fixtures`
4. `engine.test.ts` 새 describe + ±0.001 tolerance

---

## 10. 트러블슈팅 (자주 발생 순)

### 10.1 dev server `Cannot read properties of undefined (reading 'clientModules')`

원인: HMR 누적 + 컴파일 오류 캐시.
해결: `.next` 캐시 삭제 후 재시작.

```bash
rm -rf .next
npm run dev
```

### 10.2 Playwright `npx playwright install` 실패 (사내망)

원인: TLS 인터셉트로 chromium 다운로드 차단.
해결: 시스템 Chrome 사용. `playwright.config.ts` 에 이미 `executablePath` 적용됨.

### 10.3 Playwright dev server 무한 대기

원인: `waitUntil: 'networkidle'` 사용 — HMR WebSocket 이 항상 살아있음.
해결: `waitUntil: 'domcontentloaded'` + 명시적 selector wait.

```ts
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-testid="cost-tree"]');
```

### 10.4 라이브 환경 룸 데이터 손실

원인: in-memory storage + Lambda cold start.
해결: **DynamoDB 마이그 (plan.md C.1 미완료)**. 1차수 전 필수.

### 10.5 사내 노트북에서 라이브 URL 접근 불가

원인: 사내망 방화벽이 `*.amplifyapp.com` 또는 DynamoDB 엔드포인트 차단 가능.
해결:
- D-2 리허설 시 사내 노트북 1대로 라이브 URL 접근 사전 검증
- 차단 시 LG Display 보안팀에 도메인 화이트리스트 요청
- 최후: Plan B (워크시트만 + 수기 운영)

### 10.6 빌드 에러: `useSearchParams` Suspense

원인: `app/(learn)/cases/[caseId]/page.tsx` 의 CaseClient 가 `useSearchParams` 사용 → 정적 prerender 시 Suspense 외부에서 호출 금지.
해결: `<Suspense fallback={null}>` 으로 wrap (이미 적용됨).

### 10.7 vitest 변경 후 92/92 깨짐

체크 순서:
1. `lib/cost-engine/` 수정했는지 — sacred 영역, 27 픽스처 회귀 필수
2. `lib/room/` 수정 시 state-machine / time-aggregator 19 tests 영향
3. `lib/formula-parser.ts` 수정 시 19 tests 영향

### 10.8 정답 숫자가 학습자에게 노출됨

원인: 채점 컴포넌트가 답 직접 표시.
해결: 채점 결과는 `{ correct: boolean }` 만 응답. 정답값은 클라이언트에 보내지 않음. `WorksheetCell` O/X 마크만 렌더.

---

## 11. 알아두면 좋은 과거 결정 (함정 회피)

### 11.1 케이스 번호 리넘버 금지 (2026-05-12)
원본 엑셀 traceability 보존. 01/04/05/06 그대로 유지. case 02·03 자리 비워둠.

### 11.2 LLM 코치 완전 제거 (Phase 0.1, 2026-05-13)
`components/Coach/`, `lib/coach/`, `app/api/coach`, `FloatingCoach`, `SandboxCoach`, Amplify `GEMINI_API_KEY`, `next.config.js` env 인라인 — 모두 제거. `/api/coach` 응답 404가 정상.

### 11.3 셀별 60 hints → 문제 단위 12 hints (Phase 0.2)
`content/problems/*.json` 의 `cells[].hints`·`rows[].hints` 제거. `phases.apply.hints` 만 사용. `worksheet-engine.test.ts` cascade 6 tests 제거.

### 11.4 케이스 드롭다운 완전 제거 (Phase A.3)
Sandbox 헤더 드롭다운 제거. `useState caseId` 제거. 7변수 단일 통합 화면. 4 케이스 학습 가치는 Worksheet에서 다룸.

### 11.5 WebSocket / AppSync 거부 → 폴링 2초 (2026-05-13)
30명 · 10분 라운드 척도에서 폴링 2초 vs <500ms 체감 불가. 작업량 1주 차이.

### 11.6 Firebase/Supabase 거부 → AWS DynamoDB (2026-05-13)
사내망 차단 가능성. AWS 트랙 (기존 Amplify 운영 검증).

### 11.7 면취수·Mask 기준값 reference 고정
슬라이더는 새값만. 기준값은 case 별로 reference 고정 (25, 6).

### 11.8 Reflect 자유 응답 게임화 금지
학습 무결성 보호. 점수·시간 산정에 포함 안 됨.

### 11.9 정확한 산식 vs 채점 (Module 감상비 사례)
사용자 명시 10.422 vs 계산식 10.428 — 0.006 차이.
round1 (×10) 채점이라 학습자 input 양쪽 모두 10.4로 grade. 정확한 산식 (양산기간 amortize, 환율 적용 시점) 확정되면 보정.

### 11.10 운영 계약 (CLAUDE.md) 절대 금지
- `.env`, 자격증명, 비밀키 읽기/커밋 금지
- `outputs/` 삭제/덮어쓰기 사용자 승인 필요
- `context/` 수정 사용자 승인 필요
- `git push --force` 금지

---

## 12. GitHub 이슈 (Koolsangon/CI-Course)

| Issue | Slice | Phase | 상태 |
|---|---|---|------|
| #2 | PRD | - | ready-for-agent |
| #3 | S1 LLM 코치 제거 | 0 | ✓ 완료 |
| #4 | S2 60 hints 제거 | 0 | ✓ |
| #7 | S3 계산기 sticky | B.1 | ✓ |
| #13 | S4 formula-parser | B.2 | ✓ |
| #8 | S5 단위 통일 + 총수율 | B.3 | **차단** (엑셀 원본 필요) |
| #9 | S6 hint 단순화 | B.4 | ✓ |
| #14 | S7 부분 reset + O/X | B.5 | ✓ |
| #15 | S8 게임 모드 컨텍스트 | B.6 | ✓ |
| #5 | S9 merged-adapter | A | ✓ |
| #10 | S10 인스펙터 톤 | A.2 | ✓ |
| #6 | S11 DynamoDB + API 5 | C.1+2 | ✓ (코드) / **DynamoDB 마이그 HITL** |
| #11 | S12 폴링 hook | C.3 | ✓ |
| #16 | S13 게임 모드 워크시트 | C.4 | ✓ |
| #17 | S14 종합 발표 | C.5 | ✓ |
| #12 | S15 강사 뷰 | C.6 | ✓ (코드) / **시각 검증 HITL** |
| #18 | S16 Amplify 배포 + 사내망 | Z.1+2 | **차단** (HITL) |
| #19 | S17 1차수 강의 진행 | Z.3 | **차단** (2026-05-27) |

진행도: **14/17 코드 완료, 3 HITL/차단**.

skill 규칙: `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`.
canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`.

---

## 13. 인수자 첫 일주일 권장 액션

### Day 1 (오늘 인수)
- [ ] 본 문서 §1~§3 정독
- [ ] 라이브 URL 접속 확인: https://master.d26yr76roz76fk.amplifyapp.com
- [ ] GitHub repo 접근 권한 확인 (Koolsangon/CI-Course)
- [ ] AWS IAM 자격증명 별도 채널 수령 → 로컬 `~/.aws/credentials` 또는 Amplify CLI 설정
- [ ] `npm ci && npm run dev` 동작 확인

### Day 2
- [ ] `CLAUDE.md` · `CONTEXT.md` · `plan.md` 정독
- [ ] `handoff.md` 최근 3 entry 정독 (5/22, 5/21, 5/13)
- [ ] `decision-log.md` 2026-05-12 · 2026-05-13 정독 (16개 결정)
- [ ] `npm run typecheck && npm test` — 92/92 통과 확인

### Day 3
- [ ] 학습자 흐름 단일 브라우저 2탭 시뮬레이션
  - 탭1 `/instructor` 새 방 → 코드 메모
  - 탭2 `/` 코드+이름+팀 입장 → `/intro` → `/menu` → 강사 신호 → 라운드 진입
- [ ] Sandbox `/sandbox` 7 슬라이더 동작 확인 + FormulaInspector 변동 변수만 표시 확인
- [ ] 워크시트 `/cases/01-loading` 연습 모드 동작 확인 (룸 컨텍스트 없이)

### Day 4-5
- [ ] **DynamoDB 마이그 (S11 HITL)** — `lib/room/storage.ts` CRUD 함수 내부 교체
- [ ] **S5 엑셀 원본 차단 해결** — 사용자에게 엑셀 원본 또는 스크린샷 요청
- [ ] D-2 리허설 사전 점검: 사내 노트북 1대로 라이브 URL 접근

### Week 2
- [ ] 1차수 강의 운영 (D+14)
- [ ] 1차수 회고 → `decision-log.md` 새 entry
- [ ] 6차수 일정 확정 (현재 미정)

---

## 14. 문서 인덱스 (필요 시 참조)

| 파일 | 용도 |
|------|------|
| `CI-Course/CLAUDE.md` | 운영 계약 (필독) |
| `CI-Course/CONTEXT.md` | 도메인 인덱스 |
| `CI-Course/plan.md` | 작업 계획 17 slices |
| `CI-Course/handoff.md` | 세션별 로그 (시간역순) |
| `CI-Course/decision-log.md` | 결정 기록 (ADR 등가물) |
| `CI-Course/context/glossary.md` | 용어집 상세 |
| `CI-Course/context/brand-voice.md` | 브랜드 톤 |
| `CI-Course/outputs/cost-sim-v2.1-game-prd.md` | 게임화 PRD 55 stories |
| `CI-Course/outputs/개발원가-War-Game-설명서.pdf` | 학습자 배포물 |
| `CI-Course/outputs/implementation-report.md` | v2.1 구현 보고서 |
| `CI-Course/outputs/amplify-changelog-2026-05.md` | Amplify 변경 이력 |
| `projects/cost-sim-v2.1/docs/handover-sim-v2.1.md` | **(본 문서)** |
| `projects/cost-sim-v2.1/docs/amplify-deploy.md` | ⚠️ v2-game 시절 — 본 §7 참조 |
| `projects/cost-sim-v2.1/docs/instructor-manual.md` | ⚠️ v1 매뉴얼 — 본 §8 참조 |
| `projects/cost-sim-v2.1/docs/case-authoring-guide.md` | 케이스 추가 SOP |
| `projects/cost-sim-v2.1/docs/bundle-report.md` | 번들 사이즈 |
| `projects/cost-sim-v2.1/docs/lighthouse.md` | Lighthouse 점수 |
| `projects/cost-sim-v2.1/docs/device-matrix.md` | 기기 매트릭스 |

---

## 15. 인수 체크리스트 (인수자 서명용)

- [ ] 라이브 URL 접근 가능
- [ ] GitHub `Koolsangon/CI-Course` 권한 (Read/Write/Admin)
- [ ] AWS IAM 액세스 키 수령 (별도 채널)
- [ ] AWS Amplify 콘솔 접근 권한 (`d26yr76roz76fk` 앱)
- [ ] DynamoDB 콘솔 접근 권한
- [ ] LG Display 사내 강의실 + 노트북 환경 정보 인수
- [ ] 1차수 학습자 명단 + 팀 편성 인수 (강사 운영자 한정)
- [ ] 사용자(원작자) 슬랙/메신저 핫라인 채널 확보
- [ ] 본 인수인계서 §13 Day 1 액션 완료

---

## 부록 A. 한눈에 보는 명령어 치트시트

```bash
# 진입
cd "CI-Course/projects/cost-sim-v2.1"

# 개발
npm ci              # 최초 1회
npm run dev         # localhost:3000
npm run typecheck   # 0 에러
npm test            # 92/92
npm run build       # 프로덕션 빌드

# 골든 픽스처 (sacred 변경 시만)
npm run gen:fixtures

# E2E
npx playwright test
npx playwright test scenario-card-review --project=chromium --timeout=60000

# 라이브 검증
curl -sI https://master.d26yr76roz76fk.amplifyapp.com/ | grep server
curl -X POST https://master.d26yr76roz76fk.amplifyapp.com/api/rooms

# .next 캐시 클리어 (HMR 깨졌을 때)
rm -rf .next
```

## 부록 B. 폴더 진입점 (인수자 빠른 탐색)

```
sandbox 화면 → app/(learn)/sandbox/page.tsx + components/ParamPanel + lib/cost-engine/merged-adapter.ts
워크시트 화면 → app/(learn)/cases/[caseId]/CaseClient.tsx + components/Worksheet/ProblemPage.tsx + lib/worksheet-engine.ts
강사 화면 → app/instructor/[code]/page.tsx + lib/instructor.ts
룸 lifecycle → lib/room/{storage,state-machine,time-aggregator}.ts
API → app/api/rooms/**/route.ts
케이스 데이터 → content/cases/*.json + content/problems/*.json
원가 엔진 (SACRED) → lib/cost-engine/engine.ts + presets.ts + __fixtures__/
```

---

**작성자 메모**: 본 문서는 `projects/cost-sim-v2.1/docs/` 안에 두어 폴더 자체가 인수 단위가 되도록 했습니다. 1차수 운영 후 회고 사항·새 결정은 `CI-Course/decision-log.md` 에 prepend하고, 본 문서 §11에 동기화해주세요.
