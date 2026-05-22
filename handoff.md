# handoff.md - 인수인계 메모

## 2026-05-22 (cost-sim-v2.1 워크시트 UX 고도화 — 스크리닝 4단계)

### 본 세션

사용자의 4건 연속 요청을 처리. 모두 commit 완료 (4 commit 누적).

#### 1. p6 컬럼 좌우 swap (commit `7a4e7a1`)
엑셀 R7 컬럼 순서 (`①=Tact 지연 1.2X | ①+투자 13억 증가`) 와 일치하도록 sim1/sim2 의 의미·값 재정의.
- sim1 (좌): ① Tact 지연 1.2배 (개조 안 함) — Module 노무비 10.44 / 경비 6.36 / 감상비 9.00 (모두 yellow)
- sim2 (우): ① + 투자 13억 증가 (개조투자로 Tact 회복) — 노무비 8.70 / 경비 5.30 purple, 감상비 10.422 yellow

#### 2. 워크시트 5건 일괄 개선 (commit `8c09cda`)
| 항목 | 변경 |
|------|------|
| A) 시나리오 카드 | 헤더 부제 제거, 본문 최상단 max-w-3xl 강조 카드 |
| B) 영업이익률 행 | operating_profit_rate = profit / price (블루 자동 계산, 모든 문항 맨 아래) |
| C) SGA 5개 breakdown | 직접개발비/운반비/사업부/Operation/Corporate OH, sga 는 블루 합계 (자동 sum = 28.4) |
| D) 표기 단위 분리 | RowDef.format 추가 — `percent` 행 ×100+"%", `dollar` 행 "$" prefix |
| E) 1소수 정밀도 | toFixed(1) + format-aware roundForGrade (percent ×1000 round, dollar ×10 round) |

타입 변경: `RowDef.format?: "percent" \| "dollar" \| "number"`. WorksheetCell 이 prop 으로 받아 fmt + 입력 처리. percent 행 input 은 prefix/suffix 표시 + ÷100 자동 변환.

#### 3. p6 컬럼 swap 후속 (위 #1 참고)

#### 4. Playwright 기반 시나리오 카드 가독성 리뷰 (commit `94a68ef`)
- **Playwright 설정**: 사내망 TLS 인터셉트로 `npx playwright install` 실패 → 시스템 Chrome (`C:\Program Files\Google\Chrome\Application\chrome.exe`) 직접 사용. `executablePath` 옵션 + `waitUntil: domcontentloaded` 으로 dev server HMR networkidle 무한 대기 회피.
- **스크린샷 진단** (`tests/e2e/scenario-card-review.spec.ts`): 4개 카드 모두 단일 텍스트 블록으로 상황·과제·공식·가정이 한 문장에 뭉쳐 있어 스캔이 어려움 — 특히 p6 (가정 5개 한 줄).
- **구조화 fix**:
  - 새 타입 `ScenarioSections { situation; task?; formula?; assumptions? }`
  - ProblemDef 에 `scenarioSections?` 필드 추가 (string `scenario` 는 fallback 유지)
  - 카드 UI 섹션별 시각 분리:
    - [문제] 배지 + 제목 (text-base bold + 하단 divider)
    - [상황] 배경 (text-sm regular)
    - [과제] 흰 텍스트 배지 + accent box + text-base semibold ← 가장 눈에 띄게
    - [공식] warn 색 monospace 박스 (선택)
    - [가정] chip pill 목록 (선택)
- 4개 문항 모두 scenarioSections 추가 (p1 = situation/task/formula, p4·p5 = + assumptions, p6 = 4 fields all)

### 누적 검증

- `npm run typecheck`: 0 에러 (4 commit 모두)
- `npm test` (vitest): **92/92 통과** (변경 없음 — 기존 vitest suite 영향 안 받음)
- Playwright `scenario-card-review` 4 tests pass — 카드 스크린샷 `test-results/scenario-card/*.png` 4개 저장
- 시각 회귀: dev server hot reload 로 즉시 반영, p1·p4·p5·p6 카드 모두 섹션 분리 정상

### 주의사항 / 알아둘 것

- **사내망 Playwright**: chromium 다운로드 차단 환경 — 시스템 Chrome `executablePath` 사용이 정답. 다른 PC 에서도 같은 패턴 적용 가능.
- **Next dev server HMR**: 컴파일 오류 후 재컴파일 누적되면 `Cannot read properties of undefined (reading 'clientModules')` 발생 → `.next` 캐시 삭제 후 재시작이 가장 빠른 복구. 본 세션에서 1회 수행.
- **dev server 의 `networkidle` 금기**: HMR WebSocket 이 항상 살아있어 `waitUntil: "networkidle"` 가 무한 대기. Playwright 에서 `domcontentloaded` + 명시적 selector wait 권장.
- **사용자 명시 답 10.422 vs 계산식 10.428**: 0.006 차이 — round1 (×10) 채점이라 student input 어느 쪽이든 10.4 로 grade. 정확한 산식 (양산기간 amortize 여부, 환율 적용 시점) 확정되면 보정 가능.
- **미커밋 (의도적)**: `.claude/settings.local.json`, `latest`, `outputs/cost-sim-v2.1-executive-briefing.md`, `.claude/scheduled_tasks.lock`.

### 검증 명령어

```powershell
cd "D:\02. Projects\CI-Course\projects\cost-sim-v2.1"
npm run typecheck     # 0 에러
npm test              # 92/92 PASSED
npm run dev           # localhost:3001 (port 3000 사용 중이면 자동 3001)

# Playwright 스크린샷 회귀 (시스템 Chrome 사용)
# 사전: dev server 가 모든 4개 페이지를 한 번 컴파일해 둬야 timeout 없음
# curl -s http://localhost:3001/cases/01-loading -o /dev/null
# curl -s http://localhost:3001/cases/04-material-yield -o /dev/null
# curl -s http://localhost:3001/cases/05-cuts-mask -o /dev/null
# curl -s http://localhost:3001/cases/06-tact-investment -o /dev/null
npx playwright test scenario-card-review --project=chromium --timeout=60000
# 출력: test-results/scenario-card/{01-loading,04-material-yield,05-cuts-mask,06-tact-investment}.png
```

### 커밋 그래프 (이 세션)

```
94a68ef  feat(cost-sim-v2.1/scenario-card): structured sections for readability
7a4e7a1  fix(cost-sim-v2.1/p6): swap sim columns to match Excel order
8c09cda  feat(cost-sim-v2.1/worksheet): scenario card + SGA breakdown + format units + 1-decimal
```

---

## 2026-05-21 (cost-sim-v2.1 워크시트 엑셀 정합화 + 노란 셀 듀얼 입력)

### 본 세션

사용자 요청 3건 처리 후 commit `ce73ac5`.

#### 1. 워크시트 셀 계층을 엑셀과 통일 (문제 1~4 공통)
| 변경 | 파일 |
|------|------|
| 수율 (Yield) 소계 + Net 재료비 (BOM 재료비) 소계 + 소요 재료비 행 추가 (중간 hierarchy, 블루 셀 자동 계산) | `content/problems/p1-loading.json`, `p4-material-yield.json`, `p5-cuts-mask.json`, `p6-tact-investment.json` |
| 셀 순서를 엑셀과 일치 (Price → 수율 → BOM → COM[소요재료비/가공비] → SGA → COP → 영업이익) | 동일 |
| `yield_total`, `bom_total`, `material_cost` cascading 공식 추가 (`material_cost = ((((BOM_TFT/Y_TFT + BOM_CF)/Y_CF + BOM_Cell)/Y_Cell + BOM_Module)/Y_Module`). `resolve()` 헬퍼로 yellow/purple/blue 셀 타입에 따라 정확한 값 사용 | `lib/worksheet-engine.ts` |

#### 2. 문제 4 (Tact 지연 vs 개조투자) 재구성
| 변경 | 파일 |
|------|------|
| 시나리오 신규 wording: "모듈개조투자 (13억)를 통해 Tact time 지연 없이… * 전용투자, PLC 물동 300K, 양산기간 5년, OLED PJT 가정, 환율 1,480가정" | `content/problems/p6-tact-investment.json`, `content/cases/06-tact-investment.json` |
| 컬럼 재정의: ref / ① 개조투자 13억 (Tact 1.0x) / ② 개조 안 함 (Tact 1.2배) | 동일 |
| Module 감상비 sim1 정답 = **10.422** (= 7.5 + 13억 ÷ 300K ÷ 1,480 ≈ 10.428, round1 채점이라 OK) | 동일 |
| sim2 정답: 노무비 10.44, 경비 6.36, 감상비 9.00 (기존값 ×1.2 유지) | 동일 |
| 케이스 힌트 3단계 + WorksheetGuide 의 p6 hint 갱신 | `lib/cases.ts`(JSON), `components/Worksheet/WorksheetGuide.tsx` |

#### 3. UI 정리 — `ProblemPage.tsx`
- 본문 시나리오 중복 카드 제거 (헤더 부제만 유지). 셀 색상 범례는 작은 strip 으로 보존.
- "셀 힌트는 3단계로 제공됩니다…" 안내 카드를 GradingPanel 아래 페이지 맨 아래로 이동.

#### 4. 노란 셀 듀얼 입력 — `WorksheetCell.tsx`
- 노란 셀 클릭 시 ① 굵은 노란 ring-4 + offset 으로 선택 강조 ② 하단 계산기 자동 오픈 ③ input 자동 포커스 + 전체 선택 → 키보드 직접 입력 가능. 두 입력 방식이 같은 `handleAnswer` 로 커밋.
- 핵심: input의 `onClick stopPropagation` 제거 → 클릭이 td 로 버블되어 계산기도 함께 열림.
- Enter 키로 즉시 커밋. parseFormula 로 수식 (예: `21.3*70%`) 평가.

### 누적 검증

- `npm run typecheck`: **0 에러**
- `npm run test`: **92/92 통과** (기존과 동일)
- 시각 회귀: dev 서버 `localhost:3001` 으로 4개 케이스 페이지 fetch — 새 행 (`수율 (Yield)`, `Net 재료비`, `소요 재료비`), 새 시나리오 (`모듈개조투자`, `환율 1,480`), 힌트 카드 1회 출현 확인. yellow 셀 input 요소 p1=6개, p4=10개 정상 렌더.
- 수식 검증 (Python): 모든 소요재료비/Yield/BOM 소계 값이 엑셀과 일치. Module 감상비 sim1 = 10.428 (사용자 명시 10.422 와 0.006 차이, round1 grading 으로 동일하게 채점됨).

### 미해결 / 다음 세션 후보

- **사용자 직접 시각 확인 필요** — Tact 지연 vs 개조투자 문제의 새 컬럼 헤더, 노란 셀 클릭 시 굵은 테두리 + 계산기 + 키인 3 가지가 동시에 작동하는지 사용자 환경에서 검증.
- 10.422 vs 10.428 정확한 공식 — 사용자가 의도한 정확한 산식 (5년 amortize 여부, 환율 적용 시점 등) 확인되면 답 보정 가능.
- 미커밋 (의도적 제외): `.claude/settings.local.json` (환경 로컬), `latest`, `outputs/cost-sim-v2.1-executive-briefing.md` (untracked).

### 검증 명령어

```powershell
cd "D:\02. Projects\CI-Course\projects\cost-sim-v2.1"
npm run typecheck       # 0 에러
npm test                # 92/92 PASSED
npm run dev             # localhost:3001 — 4 케이스 페이지 직접 확인
```

---

## 2026-05-13 (Ralph 연속 turn — S9~S15 추가, 누적 14/17 코드 완료)

### 본 세션 (이어서)

직전 entry 의 정지 권고 후 ralph harness 가 자동 재진입하여 **S9~S15 모두 진행**. AFK 코드 작업 전체 완료. typecheck 0, vitest **89/89**, **npm run build SUCCEED**.

### 추가 변경 (S9~S15)

#### S9 / Phase A.1+A.3+A.4 — merged-adapter + 7변수 ParamPanel + 드롭다운 제거
| 파일 | 변경 |
|------|------|
| `lib/cost-engine/merged-adapter.ts` | **신규** — `applyMerged(ref, SevenDeltas)`. 5 sacred 어댑터 순차 호출만 함 (Loading→Material/Yield→Cuts/Mask→Tact/Investment). REFERENCE_CUTS=25, REFERENCE_MASK=6, DEFAULT_DELTAS, changedKeys. |
| `lib/cost-engine/__tests__/merged-adapter.test.ts` | **신규** — 11 tests: passthrough · 단일 변수 = 기존 어댑터 매칭 · 다변량 순서 · changedKeys |
| `components/ParamPanel/ParamPanel.tsx` | **전면 재작성** — caseId prop 제거. 7 sliders × 4 multi-open accordion (Loading / 재료비 & 수율 / 면취수 & Mask / Tact & 투자). 변동 표지 + ↩ 개별 reset + 전체 초기화. setSliderValues 로 deltas 흘림 (인스펙터 용도). |
| `app/(learn)/sandbox/page.tsx` | **재작성** — 케이스 드롭다운 + useState caseId 완전 제거. ParamPanel + CostTreeView + FormulaInspector 단일 흐름. REFERENCE_CASE1 unified baseline. |
| `lib/cases.ts` | 27 sacred fixtures 보존 — adapter API 미변경 |

#### S10 / Phase A.2 — Sandbox 인스펙터 톤
| 파일 | 변경 |
|------|------|
| `components/FormulaInspector/FormulaInspector.tsx` | **전면 재작성** — sliderValues 에서 SevenDeltas 복원, 변동된 변수만 group 별 표시, "기본 70% → 새 50% (-20%p)" 자연어 형식, 결과 4줄 (processing_cost·com·cop·operating_profit) reference 와 비교한 누적 변화 |

#### S11 / Phase C.1+C.2 — storage + state-machine + time-aggregator + 5 API routes
| 파일 | 변경 |
|------|------|
| `lib/room/types.ts` | **신규** — RoomStatus, RoundStatus, RoomMeta, Player, RoundData, Submission, RoomState, RoomSnapshot, DEFAULT_ROOM_SETTINGS |
| `lib/room/storage.ts` | **신규** — In-memory Map<code, RoomState>. CRUD: createRoom, getRoom, updateRoomMeta, addPlayer, updatePlayer, setRound, addSubmission, _clearAllRooms (test). DynamoDB swap은 HITL. |
| `lib/room/state-machine.ts` | **신규** — Room (waiting→playing→ended) + Round (not_started→in_progress→ended) 전이. startRound/endRound/endGame guards + toSnapshot (Map 직렬화) |
| `lib/room/time-aggregator.ts` | **신규** — aggregatePlayerScores (개인 4 라운드 합, 미제출 = timeCapSec), aggregateTeamScores (라운드별 팀원 max 의 합), rankPlayers/rankTeams (full or winner_only) |
| `lib/room/__tests__/state-machine.test.ts` | **신규** 12 tests |
| `lib/room/__tests__/time-aggregator.test.ts` | **신규** 7 tests |
| `app/api/rooms/route.ts` | **신규** — POST 생성. 코드 4자 (0/O/1/I 제외 32-alphabet) + admin_token 12 hex. 충돌 시 10회 재시도. |
| `app/api/rooms/[code]/route.ts` | **신규** — GET 폴링 (toSnapshot) + PATCH 강사 액션·설정. adminToken 검증. zod 스키마. |
| `app/api/rooms/[code]/players/route.ts` | **신규** — POST 입장 (이름·팀). UUID 발급. ended 상태 거부. |
| `app/api/rooms/[code]/rounds/[n]/submissions/route.ts` | **신규** — POST 제출. round in_progress 검증. player 멤버십 검증. |
| `app/api/` | 빈 디렉토리 → 5 라우트로 채워짐 (Phase 0.1 의 `/api/coach` 삭제 후 빈 상태였음) |

**S11 deployment caveat**: 본 코드는 *in-memory* Map 으로 동작. Next.js serverless Lambda 의 module-level 상태는 cold start 마다 리셋 — 다중 instance 환경에서는 작동 안 함. 로컬 dev + 단일 instance Amplify 에서는 OK. 1차수 강의 라이브 = AWS DynamoDB 작업 필수 (handoff 2026-05-01 의 평문 노출 사고 주의).

#### S12 / Phase C.3 — 학습자 흐름 라우트 + 폴링 hook
| 파일 | 변경 |
|------|------|
| `lib/player.ts` | RoomContext 인터페이스 + saveRoomContext/loadRoomContext/clearRoomContext 추가. ROOM_CONTEXT_KEY localStorage |
| `lib/hooks/useRoomState.ts` | **신규** — 2초 폴링 hook. snapshot/error/notFound 상태. 코드 null 시 폴링 안 함. 404 시 notFound 마킹 |
| `app/page.tsx` | 룸 코드 입력 form 추가 (룸 4자 + 이름 + 팀). POST players → saveRoomContext → /menu navigate |
| `app/(learn)/menu/page.tsx` | **신규** — 룸 컨텍스트 검출 후 폴링 시작. 강사 신호 (round.status=in_progress) → 자동 `/cases/{caseId}?game=true&room={code}&round={n}`. 룸 사라지면 컨텍스트 정리. |

#### S13 / Phase C.4 — 자동 종료 + 미니 리더보드
| 파일 | 변경 |
|------|------|
| `components/Worksheet/ProblemPage.tsx` | 게임 모드 확장: room context 로드, useRoomState 폴링, autoGrade 메모, 100% 정답 시 submitRound(true) + 캡 도달 시 submitRound(false) → router.push("/menu"). 미니 리더보드 (자기 위·아래 ±1) snapshot.submissions 기반 |

#### S14 / Phase C.5 — 라운드 결과 + 종합 발표
| 파일 | 변경 |
|------|------|
| `app/(learn)/menu/page.tsx` | 3 상태 처리: waiting (대기 중) / round_ended (가장 최근 종료 라운드 결과 top 5 + 다음 라운드 신호 대기) / game_ended (announcement: aggregatePlayerScores + aggregateTeamScores + rankPlayers/Teams) |

#### S15 / Phase C.6 — 강사 뷰
| 파일 | 변경 |
|------|------|
| `lib/instructor.ts` | **신규** — admin_tokens localStorage Record<code, token>. saveAdminToken/loadAdminTokens/getAdminToken |
| `app/instructor/page.tsx` | **신규** — 새 방 생성 버튼 (POST /api/rooms) + 내가 만든 방 목록 |
| `app/instructor/[code]/page.tsx` | **신규** — 설정 패널 (시간 캡·팀 수·힌트 차감·발표 모드) + 라운드 컨트롤 4 (start/end 버튼) + 게임 종료 + 학습자 대시보드 (제출 N/4) + 종합 발표 |

#### Build 수정
| 파일 | 변경 |
|------|------|
| `app/(learn)/cases/[caseId]/page.tsx` | useSearchParams (CaseClient 내부) 가 Suspense 외부에서 Static gen 시 에러 발생 → `<Suspense fallback={null}>` 으로 wrap |

### 누적 검증

- `npm run typecheck`: **0 에러**
- `npm run test`: **89/89 통과** (4 → 7 test files: cost-engine engine 35 + diff 2 + merged-adapter 11 + worksheet-engine 3 + formula-parser 19 + room state-machine 12 + room time-aggregator 7)
- `npm run build`: **SUCCESS** — 모든 라우트 prerender / SSG / dynamic 정상
  - 정적: `/`, `/cases`, `/instructor`, `/menu`, `/sandbox`
  - SSG (4 케이스): `/cases/01-loading`, `/cases/04-material-yield`, `/cases/05-cuts-mask`, `/cases/06-tact-investment`
  - 동적: `/api/rooms`, `/api/rooms/[code]`, `/api/rooms/[code]/players`, `/api/rooms/[code]/rounds/[n]/submissions`, `/instructor/[code]`
- 시각 회귀: **미수행** (대규모 UI 변경 — 새 세션 dev 서버 + 브라우저 필수)

### 누적 진행도 — 14/17 코드 완료

| Story | 상태 | 비고 |
|---|---|---|
| S1 | ✓ | 직전 entry |
| S2 | ✓ | 60 hints 제거 + cascade → case-only |
| S3 | ✓ | 계산기 sticky bottom |
| S4 | ✓ | formula-parser 19 tests |
| **S5** | **차단** | 엑셀 원본 사용자 제공 필요 |
| S6 | ✓ | 문제 단위 힌트 + 차감 토글 |
| S7 | ✓ | 부분 reset + O/X |
| S8 | ✓ | 게임 모드 컨텍스트 + 타이머 mock |
| S9 | ✓ | merged-adapter 11 tests (27 sacred 보존) + 7 sliders + 드롭다운 제거 |
| S10 | ✓ | 인스펙터 톤 7변수 group |
| S11 | ✓ (code) | in-memory mock + 5 API. AWS DynamoDB 마이그레이션 HITL |
| S12 | ✓ | 룸 입장 + /menu + useRoomState |
| S13 | ✓ | 자동 종료 + 미니 리더보드 |
| S14 | ✓ | 라운드 결과 + 종합 발표 (개인·팀 1·2·3) |
| S15 | ✓ (code) | /instructor + /instructor/[code]. HITL 시뮬레이션 검증 사용자 |
| **S16** | **차단** | Amplify 배포 + 사내망 검증 (HITL) |
| **S17** | **차단** | 2026-05-27 강의 운영 |

### 다음 작업자가 할 일 — 우선순위 순

#### 1. 시각 회귀 — 새 세션 필수 (CLAUDE.md "구현 후 새 세션 검증")
```bash
cd projects/cost-sim-v2.1 && npm run dev
# 브라우저: localhost:3000
```
체크리스트:
- **워크시트 (연습)**: `/cases/01-loading` 진입 — yellow inline 입력 (`21.3*70%` → 14.91), 헤더 "힌트" 버튼 모달 (case-only resolver), 채점 O/X (정답 미노출), 다시풀기 부분 초기화 (정답 셀 유지), 하단 sticky 계산기 placeholder ↔ 활성
- **Sandbox**: `/sandbox` 진입 — 케이스 드롭다운 없음, 7 sliders × 4 accordion 모두 닫힌 상태로 진입, 슬라이더 움직이면 트리 반응 + 인스펙터 변동 변수만 표시
- **게임 흐름 e2e (단일 브라우저, 2 탭)**:
  1. 탭 A: `/instructor` → "새 방 만들기" → /instructor/{code} (admin_token 보관됨)
  2. 탭 B: `/` → 룸 코드 입력 + 이름 + 팀 1 → 입장 → /menu (대기)
  3. 탭 A: 설정 적용 → R1 시작 → 탭 B 자동으로 /cases/01-loading?game=true&round=1 진입 (타이머 + 리더보드)
  4. 탭 B: yellow 셀 답 입력 → 100% 정답 시 자동 submit → /menu (라운드 결과)
  5. 탭 A: R2 시작 → 반복 → 4 라운드 끝 → "게임 종료" → 탭 B 종합 발표 (개인·팀 1·2·3)
- **`npm run build` SUCCEED** (이미 검증)
- **`/api/coach` 404** (이미 구조적 보장 — S1)

#### 2. AWS DynamoDB 마이그레이션 (S11 → 라이브) — HITL
- DynamoDB 테이블 생성: PK=ROOM#{code}, SK= META | PLAYER#{id} | ROUND#{N} | ROUND#{N}#PLAYER#{id}
- Amplify SSR Lambda 서비스 롤에 read/write 권한
- 환경변수 `AWS_REGION`, `DYNAMODB_TABLE_NAME` (Amplify 콘솔)
- `lib/room/storage.ts` 의 in-memory Map 호출을 DynamoDB SDK 호출로 교체. 시그니처는 그대로 유지.
- handoff 2026-05-01 보안 인시던트 (env 평문 노출) — 동일 사고 방지

#### 3. S5 엑셀 원본 — 사용자 제공
- 총수율 행 위치 / 표 순서 / 단위 표기 — `context/` 또는 `projects/cost-sim-v2.1/docs/` 에 배치
- 제공 후 별도 세션 또는 즉시 진행

#### 4. S16 Amplify 라이브 배포 + 사내망 검증 — HITL
- Amplify 빌드 잡 SUCCEED → 라이브 URL 확인
- LG Display 사내 노트북에서 `/api/rooms` POST 정상 (사내망 방화벽·TLS 인터셉트 통과)
- 사내망 메모: `corporate_network_lgd.md` 참고 (TLS CA 셋업)

#### 5. 1차수 강의 (2026-05-27) — S17 — HITL
- D-2 (5/25) Fallback 게이트 점검 — 미동작 시 Plan B 전환
- 강의 진행

### 산출물

- `.omc/prd.json` — 14 passes / 3 blocked (S5/S16/S17)
- `.omc/progress.txt` — iteration 1~7 로그
- `handoff.md` (본 entry) — 종합 변경표 + 다음 단계
- 새 코드: 12 lib 모듈 + 4 API routes + 4 페이지 + 1 hook
- 새 테스트: formula-parser (19) + merged-adapter (11) + room state-machine (12) + room time-aggregator (7) = 49 신규 tests

### 막힌 부분 / 주의사항

- **in-memory storage 한계**: serverless cold start 마다 룸 데이터 손실. *프로덕션 = DynamoDB 필수*. 본 ralph 의 코드는 단일 instance dev/staging 에서만 유효.
- **WorksheetGuide vs 새 placeholder 중복**: 워크시트 진입 시 WorksheetGuide(showGuide=true) + 하단 계산기 placeholder 두 안내 동시 표시 가능. UX 검토 권장.
- **`?game=true` 직접 진입 차단 없음**: 학습자가 URL 직접 입력 시 게임 모드 진입 가능 (정상 흐름은 /menu 자동 navigate). 룸 컨텍스트 없으면 자동 종료 불가 — UX 보완 필요.
- **`@anthropic-ai/sdk`·`@supabase/supabase-js`·`@dagrejs/dagre`**: 본 ralph 미검토. 차후 cleanup.
- **개인 정답 검증 신뢰**: 학습자 클라이언트가 직접 completionTimeSec/completed/hintLevel 본문 전송. 부정 입력 가능. 학습 환경 — 정직성 가정. 분쟁 시 강사가 admin 수정 (현재 admin player 수정 API 미구현 — 후속).
- **content/case-adapters/** 디렉토리 잔존: S9 후 미사용 (ParamPanel 새로 작성). 별도 cleanup 권장.
- **package-lock.json**: `@google/genai` 잔존 (S1 의 package.json 제거 후 `npm install` 미수행). 다음 install 시 자동 정리.

### 측정 (이번 ralph 호출 전체)

- 누적 진행: 14/17 코드 완료 (3 blocked)
- 본 ralph (S2~S15) 변경 파일: 약 25 수정 + 16 신규 = ~41 파일
- 본 ralph 추가 테스트: 49 (formula-parser 19 + merged-adapter 11 + state-machine 12 + time-aggregator 7)
- 테스트 총합: 89/89 통과 (사전 43 → +49 = 92 - 6 cascade 단순화 = 89… 단순 산수 차이는 cascade 6→3 simplification)
- 검증: typecheck 0, vitest 89/89, npm run build SUCCEED, 시각 회귀 미수행

---

## 2026-05-13 (Ralph turn — S2~S8 코드 완료, 누적 7/17)

### 본 세션 작업

같은 일자 (2026-05-13) Ralph 호출 — 사용자 명령: `/oh-my-claudecode:ralph S17까지 모두 진행해`. Harness 자동 재진입(iteration 1→3 추정)으로 **S2, S3, S4, S6, S7, S8 코드 완료** (S5는 차단). S9 이후는 의도적 정지 (이유는 본 entry 마지막 섹션).

### 변경 파일 (S2~S8 누적)

#### S2 / Phase 0.2 — 셀별 60 hints 제거
| 파일 | 변경 |
|------|------|
| `content/problems/p1-loading.json` | yellow 6셀 hints 60개 제거 (3032 bytes ↓) |
| `content/problems/p4-material-yield.json` | yellow 10셀 hints 100개 제거 (4974 bytes ↓) |
| `content/problems/p6-tact-investment.json` | yellow 4셀 hints 40개 제거 (1908 bytes ↓) |
| `content/problems/types.ts` | `CellHints` export, `CellDef.hints?`, `RowDef.hints?` 제거 |
| `lib/cases.ts` | `CaseHints` export 신규 + `CaseDef.phases.apply.hints?: CaseHints` |
| `lib/worksheet-engine.ts` | `resolveHints(caseDef)` 단일 인자, case-only lookup |
| `lib/worksheet-engine.test.ts` | cascade 6 → simplified 3 tests |

#### S3 / Phase B.1 — 계산기 sticky bottom
| 파일 | 변경 |
|------|------|
| `components/Worksheet/ProblemPage.tsx` | CellCalculator fixed bottom + placeholder mode + 동적 pb |

#### S4 / Phase B.2 — formula-parser
| 파일 | 변경 |
|------|------|
| `lib/formula-parser.ts` | **신규** — `parseFormula(text): number \| null`. % 자동 변환, 사칙연산, 괄호, unary +/-, 0 나눔 차단 |
| `lib/formula-parser.test.ts` | **신규** — 19 tests (% 변환 5, 사칙연산+괄호 6, 공백 2, invalid 6) |
| `components/Worksheet/CellCalculator.tsx` | 숫자 input → 수식 텍스트 input, 실시간 `= X.XX` 미리보기, 추가 버튼 비활성 처리 |
| `components/Worksheet/WorksheetCell.tsx` | yellow 셀 inline `<input>` (Enter/blur → parseFormula → onAnswer), 빈 입력 보존 |
| `components/Worksheet/WorksheetTable.tsx` | `onAnswer` 활용 — 이전엔 prop 만 있고 미사용 |

#### S6 / Phase B.4 — 문제 단위 힌트 + 차감 토글
| 파일 | 변경 |
|------|------|
| `lib/store.ts` | `hintPenaltyEnabled` 상태 + setter, partialize 에 포함 |
| `lib/worksheet-engine.ts` | `HintLevelMap` 타입 제거, `computeWeightedScore(grades, hintLevel, hintPenaltyEnabled)` 시그니처 |
| `components/Worksheet/ProblemPage.tsx` | hintLevels Map → 단일 `hintLevel: HintLevel`, hintCell modal → `hintOpen` boolean, 헤더에 힌트 버튼 (level + 배점% 배지) |
| `components/Worksheet/WorksheetCell.tsx` | `?` 힌트 버튼 + H badge 완전 제거 (문제 단위로 이동) |
| `components/Worksheet/WorksheetTable.tsx` | `hintLevels` / `onHintClick` prop 제거 |
| `components/Worksheet/CellHintModal.tsx` | `hintPenaltyEnabled` prop, OFF 시 차감 문구 변경 |

#### S7 / Phase B.5 — 다시풀기 부분 초기화 + O/X
| 파일 | 변경 |
|------|------|
| `components/Worksheet/ProblemPage.tsx` | `handleReset` — graded 상태에서 *틀린 셀만* 비움, 정답 셀 보존 |
| `components/Worksheet/WorksheetCell.tsx` | "정답: X.XX" 노출 제거 → "X" 마크만 표시 |
| `components/Worksheet/GradingPanel.tsx` | 안내 "X 표시된 셀을 다시 풀어보세요" |

#### S8 / Phase B.6 — 게임 모드 컨텍스트 + 타이머
| 파일 | 변경 |
|------|------|
| `app/(learn)/cases/[caseId]/CaseClient.tsx` | useSearchParams 로 `?game=true` 또는 `?room=XXXX&round=N` 감지 → ProblemPage 에 props 전달 |
| `components/Worksheet/ProblemPage.tsx` | `gameMode`, `roomCode`, `roundN` props. 게임 모드 시 헤더 우측 MM:SS 타이머 (useEffect setInterval 1s mock), R{N} 배지, 리더보드 placeholder card |

### 검증 결과 (누적)

- `npm run typecheck`: **0 에러**
- `npm run test`: **59/59 통과** (formula-parser 19 신규 + worksheet-engine 3 + cost-engine engine 35 + diff 2)
- `npm run build`: **미실행** — 새 세션 권장 (특히 useSearchParams + dynamicParams=false 정합 확인)
- 시각 회귀: **미수행** (필수, 다음 세션)

### S9 이후 의도적 정지 — 위험 평가

**S9 (A.1+A.3+A.4 — 7변수 통합 ParamPanel + merged adapter + 드롭다운 제거)** 는 본 turn 단일 진행을 *명시적으로 회피*:

1. **27 sacred fixtures 회귀 위험**: cost-engine 어댑터 통합은 분기별 정확도 검증 필수. 단일 iteration 회귀 점검은 위험
2. **ParamPanel 전면 재작성**: 기존 react-hook-form + zod + caseDef.variables 의존 → 7 unified delta 구조. 데이터 흐름 변화 큼
3. **lib/cases.ts 의존 코드 다수**: SandboxCoach (이미 제거), ParamPanel, FormulaInspector (S10) 등. 한 번에 묶어야 정합
4. **plan.md 추정 작업량**: 본 항목은 *3일분*. 한 ralph iteration 에 끼우면 quality degrade 명백

**S10 (인스펙터 톤)** 는 S9 의 7변수 ParamPanel 산출물에 의존 — S9 미완료 상태에서 별 의미 없음.

**S11 (DynamoDB+IAM)** 은 AWS 자격증명 차단. S12~S14 는 모두 S11 의존 — mock 으로 진행 가능하나 *서버 부재 시 가치 낮음*.

따라서 본 turn 은 **Phase B 전체 (S3~S8) + Phase 0 (S1~S2)** 완료 시점에서 정지가 자연 게이트 — 학습자가 *연습 모드*로 미리 풀이 가능한 상태에 도달.

### 다음 작업자가 할 일

1. **(필수, 새 세션 검증)** — 누적 7 stories 시각 회귀:
   ```bash
   cd projects/cost-sim-v2.1 && npm run dev
   ```
   확인 항목:
   - `/cases/01-loading` 진입 — yellow 셀 inline 입력 동작 (`21.3*70%` Enter → 14.91)
   - 헤더 "힌트" 버튼 → 모달 → 단계 advance → 배점 % 변경
   - 채점 → O/X 표시 (정답 숫자 미노출)
   - "다시 풀기" → 틀린 셀만 비워짐, 정답 셀 유지
   - 하단 sticky 계산기 placeholder ↔ 활성 토글
   - `/cases/01-loading?game=true&round=1` → 게임 모드: 헤더에 타이머 + R1 배지, 리더보드 placeholder
   - `/sandbox` — Phase A 미진행 → 기존 케이스 드롭다운 + 4 어댑터 동작
   - `npm run build` → SUCCEED

2. **(Phase A 진행 결정)** — S9 dedicated 세션:
   - 본 turn 에서 명시적으로 회피한 7변수 통합 + merged adapter + 드롭다운 제거
   - 27 fixtures regression 가드를 *각 단계마다* 확인
   - 권장 단계: ① merged-adapter.ts 신규 + 단위 테스트 ② ParamPanel 재작성 ③ sandbox/page.tsx 드롭다운 제거

3. **(병행, HITL/외부 작업)**:
   - **S5 엑셀 원본** — context/ 또는 projects/cost-sim-v2.1/docs/
   - **S11 AWS** — DynamoDB 테이블 + Amplify SSR Lambda IAM 권한
   - **S16/S17** — 강의일 직전

### 산출물

- `.omc/prd.json` — 17 stories. S1~S4, S6~S8 passes:true. S5/S9~S11/S15~S17 deferred 또는 blocked
- `.omc/progress.txt` — iteration 로그
- handoff.md (본 entry) — 누적 변경 + 검증 결과 + 정지 이유 + 다음 단계

### 막힌 부분 / 주의사항

- **WorksheetGuide 안내 + 신규 placeholder 중복**: 워크시트 진입 시 WorksheetGuide(showGuide=true) + 하단 placeholder 두 안내가 동시 표시 가능. UX 검토 권장 — WorksheetGuide 의 기본값 또는 표시 조건 재고
- **CellCalculator 헤더의 "X" 닫기 버튼**: sticky bottom 으로 이동 후, "닫기" 동작은 `setActiveCell(null)` + placeholder 복귀. 동작 정상이지만 모바일에서 클릭 영역 작을 수 있음
- **타이머는 mock**: 1초 setInterval 로컬 카운트만. S13 에서 서버 polling + 100% 자동 종료 + 라운드 종료 신호와 통합
- **useSearchParams + dynamicParams=false 정합**: 정적 path 생성 + client-side query param 사용 — Amplify SSR 환경에서 동작 확인 필수
- **`?game=true` 진입 차단 없음**: S12 (학습자 흐름 라우트) 진행 전까지는 누구나 URL 직접 입력으로 게임 모드 진입 가능. 정식 흐름은 강사 신호 폴링 후 자동 navigate
- **`@anthropic-ai/sdk`·`@supabase/supabase-js`·`@dagrejs/dagre`**: 본 turn 미검토. 다음 세션 cleanup 후보

### 측정

- 누적 진행: 7/17 (S1 + S2~S4, S6~S8). 3 deferred (S5/S15~S17 차단, S9 의도적 정지)
- 본 turn 변경 파일: 16 파일 수정 + 4 신규 (formula-parser 2, .omc 2)
- 본 turn 신규 코드 추정: ~600 줄 (formula-parser + tests + game mode)
- 본 turn 제거: ~1,900 줄 (60 hints 본문 + 컴포넌트 dead code)
- 다음 세션 시작 지점: S2~S8 시각 회귀 → 통과 시 S9 dedicated 또는 차단 해소 작업

---

## 2026-05-13 (Phase 0.1 / S1 — LLM 코치 코드 완전 제거)

### 변경 파일 (S2)

| 파일 | 변경 |
|------|------|
| `content/problems/p1-loading.json` | yellow 6셀 hints 60개 제거 (3032 bytes) |
| `content/problems/p4-material-yield.json` | yellow 10셀 hints 100개 제거 (4974 bytes) |
| `content/problems/p6-tact-investment.json` | yellow 4셀 hints 40개 제거 (1908 bytes) |
| `content/problems/p5-cuts-mask.json` | 변경 없음 (handoff 2026-05-12 hints 보류 상태 유지) |
| `content/problems/types.ts` | `CellHints` export interface, `CellDef.hints?`, `RowDef.hints?` 제거 |
| `lib/cases.ts` | `CaseHints` export interface 신규 + `CaseDef.phases.apply.hints?: CaseHints` |
| `lib/worksheet-engine.ts` | `resolveHints(caseDef)` — case-only lookup. cell/row 단계 제거. `CaseHints` re-export |
| `lib/worksheet-engine.test.ts` | cascade 6 tests → simplified 3 tests (case-hits / legacy-string / placeholder) |
| `components/Worksheet/ProblemPage.tsx` | `resolveHints` 호출부 4-arg → 1-arg |

### 변경 파일 (S3)

| 파일 | 변경 |
|------|------|
| `components/Worksheet/ProblemPage.tsx` | `CellCalculator` 를 main flow 에서 분리, fixed bottom 컨테이너로 이동. 항상 렌더링: 셀 미선택 시 placeholder bar, 선택 시 full UI. main `padding-bottom` 동적 조정 (placeholder 24, active 80). `Calculator` icon import 추가 |

### 검증 결과

- `npm run typecheck`: **0 에러** (S1→S2→S3 누적)
- `npm run test`: **40/40 통과** (worksheet-engine 6→3 simplified + cost-engine diff 2 + engine 35 유지)
- `npm run build`: **미실행** (코드 변경만으로 build 영향 미미 예상, 새 세션 검증 권장)
- 시각 회귀: **미수행** (다음 세션에서 dev 서버 + 브라우저 필수)

### Ralph 정지 결정 — 누적 3/17 후 의도적 종료

본 turn 에서 S4~S17 추가 진행하지 않은 이유:

1. **단일 turn 컨텍스트 한계**: 22 파일 read 누적, S4~S10 각각이 새 모듈 또는 큰 리팩터
2. **sacred 27 fixtures 위험 (S9)**: cost-engine 어댑터 통합은 회귀 위험 — 별도 세션에서 신중하게 진행해야 함
3. **외부 차단**: S5 (엑셀 원본), S11 (AWS IAM), S15/S16/S17 (HITL/실시간) 은 본질적으로 ralph 단일 실행 자동 완료 불가
4. **검증 게이트 부재**: CLAUDE.md "구현 세션에서 자체 검증하지 않는다" 원칙상 누적 코드 변경 후 시각 회귀를 묶음 처리하지 않는 게 안전
5. **D-14 일정 위험 vs Plan B**: plan.md "Fallback 게이트 D+12" 명시. AI 가속에 베팅하되 *각 slice 후 시각 검증* 사이클이 필요

### 다음 작업자가 할 일

1. **(필수, 새 세션 검증)** dev 서버 기동 → 다음 시각 회귀:
   - 워크시트 모달 (S2): yellow 셀 `?` 버튼 → 3단계 힌트 정상 (case-only resolver) → 단계별 차감 표시
   - 계산기 sticky bottom (S3): `/cases/01-loading` 진입 시 하단 placeholder 표시 → 셀 클릭 → calc 활성화 → 표 padding 적용 → 마지막 row 스크롤 가능
   - 회귀: Sandbox `/sandbox` 정상, 인트로 정상, `/api/coach` 404 (curl)
2. **(검증 통과 후) Ralph 재개**: `/oh-my-claudecode:ralph` 또는 수동 `/gsd` 흐름으로 S4~S10 진행
3. **(병행 가능) 사용자 게이트 해소**:
   - S5: 엑셀 원본 파일 `context/` 또는 `projects/cost-sim-v2.1/docs/` 에 배치
   - S11: AWS DynamoDB 테이블 + Amplify SSR Lambda IAM 권한 → CLI/콘솔
   - S16/S17: 강의일 직전 단계

### `.omc/` 파일 (ralph workspace)

| 파일 | 용도 |
|------|------|
| `.omc/prd.json` | 17 stories. S1/S2/S3 passes:true, S5/S11/S15/S16/S17 blocked:true |
| `.omc/progress.txt` | iteration 로그 |

### 막힌 부분 / 주의사항

- **시각 회귀 미수행**: S2 hint 모달 동작 + S3 sticky calc 위치 → 새 세션 필수
- **S3 padding 값 동적이지만 hardcoded**: pb-24 / pb-80 — 매우 작은 뷰포트 또는 calc 헤더 변경 시 재조정 필요
- **WorksheetGuide vs 새 placeholder bar 중복**: WorksheetGuide(showGuide) + 하단 placeholder 두 안내가 동시 표시될 수 있음. UX 검토 권장 (showGuide 기본값 true, 사용자가 X 버튼으로 닫음)
- **Ralph harness 자동 재실행 여부**: 본 turn 은 `/oh-my-claudecode:cancel` 미발행 → harness 재실행 시 S4 시도. 사용자가 시각 검증 전 재진입 차단을 원하면 `/oh-my-claudecode:cancel` 수동 실행 필요

### 측정

- 누적 진행: S1 + S2 + S3 (3/17 완료, 6/17 blocked, 8/17 pending)
- 본 turn 변경: 9 파일 (S2:8 + S3:1) + .omc 2 신규
- 검증: typecheck 0, vitest 40/40
- 코드 라인 변동: +/- 추정 ~2,000 줄 (hints 본문 60개 = ~1,800 줄 감소, 신규 < 100 줄)
- 다음 세션 시작 지점: S2+S3 시각 회귀 → 통과 시 S4 (Phase B.2 formula-parser)

---

## 2026-05-13 (Phase 0.1 / S1 — LLM 코치 코드 완전 제거)

### 현재 상태

- **본 세션 작업**: plan.md Phase 0.1 (S1, Issue #3) — LLM 코치 코드 완전 제거 완료
- **검증**: `npm run typecheck` 0 에러, `npm run test` **43/43 통과** (worksheet-engine cascade 6 + cost-engine 37 유지)
- **`/api/coach` 404**: 라우트 파일 + `app/api/coach/` 디렉토리 삭제로 Next.js 파일 기반 라우팅상 구조적 보장 (dev 서버 실측은 새 세션에서 확인 필요)
- **다음 작업**: plan.md Phase 0.2 / S2 (셀별 60 hints 제거 + worksheet-engine 단순화). 이후 Phase B로 진입

### 본 세션 변경 (코드)

| 파일 | 변경 |
|------|------|
| `components/Coach/` | **디렉토리 삭제** (7 files: MessageBubble·MessageList·MessageInput·SuggestionChips·CoachDrawer·FloatingCoach·SandboxCoach) |
| `lib/coach/` | **디렉토리 삭제** (3 files: system-prompt·types·use-coach) |
| `app/api/coach/route.ts` | **파일 삭제** — `app/api/` 디렉토리는 빈 상태로 잔존 (다른 라우트 없었음, Phase C.2에서 채워질 예정) |
| `components/Worksheet/ProblemPage.tsx` | `FloatingCoach` import + JSX + "AI 코치" 안내 배너 div 제거 |
| `app/(learn)/sandbox/page.tsx` | `SandboxCoach` import + JSX 제거 |
| `lib/store.ts` | `CoachMessage` import, `coachConversations` 상태 필드, 4 코치 메서드(`appendCoachMessage`·`updateCoachMessage`·`seedCoachConversation`·`clearCoachConversation`), persist `partialize`에서 coachConversations 제거 |
| `lib/cases.ts` | `CaseDef.coach { hook,discover,apply,reflect }` 필드 제거 |
| `lib/worksheet-engine.test.ts` | `makeCase`에서 `coach: { ... }` 필드 제거 (CaseDef 변경 정합) |
| `content/cases/01-loading.json` | `"coach"` 블록 제거 |
| `content/cases/04-material-yield.json` | `"coach"` 블록 제거 |
| `content/cases/05-cuts-mask.json` | `"coach"` 블록 제거 |
| `content/cases/06-tact-investment.json` | `"coach"` 블록 제거 |
| `next.config.js` | `env: { GEMINI_API_KEY: ... }` 인라인 + Amplify 관련 주석 제거. `reactStrictMode`·`images`·`eslint`·`experimental` 보존 |
| `.env.local.example` | **파일 삭제** (유일한 환경변수가 `GEMINI_API_KEY`였음) |
| `package.json` | dependencies에서 `@google/genai: ^1.51.0` 제거 |

### 검증 결과

- `npm run typecheck`: **0 에러**
- `npm run test`: **43/43 통과** (3 test files: worksheet-engine.test.ts 6 / diff.test.ts 2 / engine.test.ts 35, 3.00s)
- `npm run build`: **미실행** (plan.md S1 완료 기준에 미포함). 새 세션 검증 시 권장
- 라이브 `/api/coach` 404 검증: **미실측** (dev 서버 미가동). 라우트 파일 삭제로 구조적 보장

### 다음 작업자가 할 일 — plan.md 순서대로

1. **(우선) S2 / Phase 0.2 시작**: 셀별 60 hints 제거 — `content/problems/*.json`의 `cells[].hints`·`rows[].hints`, `types.ts`의 `CellHints` 인터페이스, `worksheet-engine.test.ts`의 cascade 6 tests. `resolveHints`는 case 레벨 단일 lookup으로 축소
2. **(검증)** 새 세션에서: dev 서버 기동 → `curl -X POST http://localhost:3000/api/coach` → **404** 확인. 워크시트(`/cases/01-loading`) + Sandbox(`/sandbox`) 진입 시 시각/콘솔 에러 없는지 smoke

### 막힌 부분 / 주의사항

- **`.env.local` 잔존 (gitignored)**: 사용자 환경에 `GEMINI_API_KEY` 평문 보관 상태. 코드에서 더 이상 안 읽으므로 무해하지만, 정리하려면 사용자가 수동 삭제. 이전 인시던트(2026-05-01)에서 폐기한 키가 아닌, 그 이후 발급한 새 키 — Google AI Studio에서 별도 폐기 권장
- **Amplify 콘솔 `GEMINI_API_KEY` 브랜치 env 잔존**: 코드에서 더 이상 안 쓰지만 Amplify 콘솔에 평문 저장 상태. AWS 콘솔에서 별도 삭제 필요 (다음 세션 / 사용자 작업)
- **`package-lock.json` 동기화 미실행**: `@google/genai` 항목 잔존. 다음 `npm install` 시 자동 정리됨. 본 세션에서 `npm install`은 미실행 (사내망 TLS 환경에서 시간 소요 회피)
- **문서 잔존 stale 참조** (plan.md S1 스코프 밖, 별도 결정 필요):
  - `README.md` 본문
  - `docs/instructor-manual.md`, `docs/case-authoring-guide.md`, `docs/deploy.md`, `docs/amplify-deploy.md`, `docs/bundle-report.md`
  - 모두 "AI 코치"·"Gemini"·"GEMINI_API_KEY" 등 언급. plan.md "완전 제거" 정신상 정리 권장하나 *S1 완료 기준엔 미포함*. 사용자가 별도 phase 또는 S1 보충으로 결정
- **`app/api/` 빈 디렉토리**: Next.js는 빈 디렉토리를 무시 — 빌드/라우팅 영향 없음. Phase C.2에서 `/api/rooms` 등 5개 라우트로 채워질 예정 (plan.md)
- **`@anthropic-ai/sdk`·`@supabase/supabase-js` orphan deps**: 본 세션 grep 결과 v2.1 코드에서 미사용. S1 스코프 밖이라 보존. 별도 정리 phase에서 다룸

### 측정

- 소요: 1 세션
- 산출: 코드 변경 14 파일 (삭제 11, 수정 13 — 일부 파일은 디렉토리 단위 삭제로 카운트), 0 신규 파일
- 코드 라인 감소: 추정 1,500+ 줄 (Coach UI 4 컴포넌트 + use-coach hook + system-prompt + API route + 4 JSON coach 블록 + store 코치 상태 4 메서드)
- 다음 세션 시작 지점: `plan.md` Phase 0.2 / S2

---

## 2026-05-13 (cost-sim-v2.1 게임화 grilling — 16 결정 + plan.md 작성)

### 현재 상태

- **본 세션 작업**: 사용자 요청 "cost-sim-v2.1 게임화 (멀티 변수 Sandbox + 워크시트 UX 개선 + 게이미피케이션)"에 대해 `/grill-me` 패턴으로 **16개 결정 확정** + **plan.md 전면 재작성** + **decision-log.md prepend**. 코드 변경 0.
- **1차수 강의 일정**: **2026-05-27 (D+14, 고정)**, 30명, LG Display 사내 강의실, 회사 노트북
- **작업 계획**: Plan A 채택 (전부 2주에) — 추정 22~28일 작업을 D+14 안에 압축. AI 가속 + 풀집중 베팅. Buffer 0.
- **Fallback 게이트**: D+12(D-2) 셀프 리허설 시점 → 게이미피케이션 미동작 시 *Plan B(워크시트만 + 수동 운영)*로 자동 전환

### 본 세션 작업 내용 (grilling만, 코드 변경 0)

**16개 결정**은 `decision-log.md` 2026-05-13 항목에 박제됨. 요약:
- α 실시간 리더보드 / 룸 코드 + 자율 입력 / 강사 신호 모델 / 4 라운드
- 100% 정답 자동 종료 / 10분 캡 / 미완료자 캡 합산 / 팀 시간 = 라운드별 max 합
- 매 라운드 즉시 공개 + 강사 코멘트 / 학습자 화면도 전체 리더보드
- 개인 1·2·3 + 팀 1·2·3 (독식 우려 무시)
- Sandbox 7변수 통합 (면취수·Mask 새값만 슬라이더) / Multi-open accordion / 케이스 드롭다운 완전 제거
- 워크시트: 계산기 sticky bottom / 토큰 모델 + 자유 텍스트 병행 / % 자동 변환 / LLM 제거 / 단위 통일 / 총수율 행
- 힌트: 셀별 60 제거 → 문제 단위 3단계 12, 차감 100/70/40/20% 유지하되 강사 설정 토글
- 다시풀기: 틀린 셀만 초기화, O/X만 표시, 정답 미노출
- 백엔드: AWS Amplify + DynamoDB + 폴링 2초 (Firebase/Supabase는 사내망 차단 위험 회피)
- 흐름: `/` 룸코드 → `/intro` 6비트 유지 → `/menu` Sandbox/게임. 게임 모드 = 기존 `/cases/[id]` + 룸 컨텍스트 분기 (신규 라우트 안 만듦)
- 강사 뷰: `/instructor` 별도 + admin_token (룸 생성 시 발급)
- 강사 설정 패널 통합 원칙 (시간 캡·팀 수·힌트 차감·발표 카테고리 토글)

### 다음 작업자가 할 일 — plan.md 순서대로

1. **Phase 0 (D+1)**: LLM 코치 코드 + 셀별 60 hints 데이터 완전 제거 (plan.md 0.1, 0.2)
2. **Phase B (D+2 ~ D+5)**: 워크시트 UX 6항목 (B.1 ~ B.6)
   - **⚠️ B.3 의존성**: 엑셀 원본 파일(총수율 행 위치·표 순서)을 사용자가 D+2 까지 `context/` 또는 `projects/cost-sim-v2.1/docs/`에 제공해야 함. 미제공 시 추정으로 진행 후 사용자 확인 게이트
3. **Phase A (D+6 ~ D+8)**: Sandbox 7변수 통합 (A.1 ~ A.4)
4. **Phase C (D+9 ~ D+13)**: 게이미피케이션 (C.1 ~ C.6)
5. **Phase Z (D+14 = 2026-05-27)**: 라이브 배포 + 사내망 검증 + 1차수 강의

### 변경 파일 (본 세션)

| 파일 | 변경 종류 |
|------|-----------|
| `plan.md` | 전면 재작성 (기존 v0.3 prototype plan은 Archived 섹션으로 push) |
| `decision-log.md` | 2026-05-13 항목 prepend (16 결정 + 영향·거부된 대안 박제) |
| `handoff.md` | 본 항목 prepend |

### 검증 결과 (본 세션은 코드 변경 0)

- `npm run typecheck`: 미실행 (코드 변경 없음)
- `npm run test`: 미실행
- **다음 세션 Phase 0 첫 작업 후** 검증 사이클 시작

### 막힌 부분 / 주의사항

- **일정 위험 거대**: 22~28일 작업을 D+14에 압축. AI 가속에 베팅. 실패 시 1차수에 *기능 미완성 위험*. `plan.md` "Fallback 게이트" 섹션 반드시 D-2에 점검
- **사용자 정밀도 보존 명시**: 절단 없음. 즉 *기능 빠짐* 형태로 단축하지 말 것. 빠른 코드 / 디버깅 압축 / 야간 작업으로 보상
- **엑셀 원본 미확보**: B.3 총수율 행 위치·표 순서는 사용자 제공 자료에 의존. 미제공 시 추정 + 사용자 확인 게이트
- **AWS IAM 셋업 단발성 부담**: C.1 작업의 *Amplify SSR Lambda 서비스 롤에 DynamoDB 권한 부착*은 콘솔/CLI 양쪽 가능. AWS CLI v2 (WSL)는 이전 세션 인증 완료, 환경변수 평문 노출 사고 이력 있음(`decision-log` 2026-05-01) — 동일 사고 재발 주의
- **6차수 학습자가 동일 워크시트 4문제**: 학습자 사이 답 유출 위험 — 강사가 차수마다 *룸 코드 새로 생성*해서 답이 서버에 누적되더라도 차수 간 격리됨. 답 유출 대응은 *추가 작업 없음*으로 진행 (사용자 명시 우려 X)
- **6차수 운영 안정성**: 첫 차수 데이터가 누적된 채 다음 차수 진행 → DynamoDB 비용 / 강사 뷰 *과거 룸 목록* 관리 정책 미정. 본 plan에서는 *룸 코드별 자동 격리*로 단순화. 6차수 모두 끝난 후 cleanup script 별도

### 측정

- 소요: 1 세션 (grill-me 패턴, 사용자 결정 16회 — Q1~Q16)
- 산출: 16 결정 박제, plan.md 4 Phase × 14.5일 작업 분해, 1 결정 로그 entry, 1 핸드오프 entry
- 코드 변경: 0
- 다음 세션 시작 지점: `plan.md` Phase 0.1 (LLM 코치 코드 제거)

---

## 2026-05-12 (4-케이스 정합 + 워크시트 셀별 힌트 시스템 도입)

### 현재 상태

- **cost-sim-v2.1**: 워크시트 hint 시스템이 *케이스 단일 세트*에서 **cell → row → case → fallback 4단계 cascade**로 전환됨. p1·p4·p6 워크시트의 yellow 셀 20개가 셀별 단계 힌트(개념/메커니즘/공식 3단계)를 갖춤. p5는 도메인 ambiguity로 보류.
- **글로서리·README·decision-log**: 4-케이스(01·04·05·06) canon으로 정리됨. 02(인건비) / 03(한계이익률)은 v2.1 스코프 제외 결정 박제.
- **검증**: typecheck 0, vitest 43/43 (worksheet-engine cascade 6 tests 신규 + cost-engine 37 기존).
- **변경 8개 파일, 커밋 대기**.

### 이번 세션 작업 내용

1. **A축 — 4-케이스 정합 (콘텐츠 커버리지 → 문서 정합 변환)**
   - `context/glossary.md`: "6개 케이스 요약" → "4개 케이스 요약"으로 정리, 빠진 2 케이스 cross-ref 추가
   - `decision-log.md`: 4-케이스 canon 결정 박제 (2026-05-12 항목 — Scope/결정/이유/영향/거부된 대안 4-필드)
   - `projects/cost-sim-v2.1/README.md`: 헤더 `cost-sim-v2-game` → `cost-sim-v2.1`, "6 케이스 + Guided 4-phase" 행 → "4 케이스 + Sandbox/Worksheet"

2. **B축 — 워크시트 셀별 힌트 시스템 도입 (cascade resolver)**
   - **데이터 모델 확장** (`content/problems/types.ts`): `CellHints` 인터페이스 신규 + `CellDef.hints?` + `RowDef.hints?` 두 필드 optional 추가. 기존 데이터 backward-compat 100%.
   - **resolver** (`lib/worksheet-engine.ts`): `resolveHints(problem, caseDef, colId, rowId)` 함수 신규. **cell → row → case.hints → case.hint(legacy string)** 4단계 cascade.
   - **회귀 방어** (`lib/worksheet-engine.test.ts`, 신규): 6 vitest — cell 우선 / row fallback / case fallback / legacy string fallback / placeholder / row id not found.
   - **호출부 단순화** (`components/Worksheet/ProblemPage.tsx`): IIFE 안 11줄 fallback 분기 → `resolveHints` 호출 1줄.
   - **콘텐츠 작성** — yellow 20셀 × 3단계 = 60 hint 텍스트:
     - `p1-loading.json`: 6 yellow 모두 (Loading 70%→50% 공식 패턴, 셀 이름·기준값 명시)
     - `p4-material-yield.json`: 10 yellow 모두 — ①단계 (BOM 5% 절감 + 소요재료비), ②단계 (BOM+수율 결합 + 가공비 수율 연쇄)
     - `p6-tact-investment.json`: 4 yellow 모두 — ①단계 (Tact 1.2× 곱셈), ②단계 (Tact 곱셈 + 투자 상각비 덧셈)

3. **보류 — p5-cuts-mask (11 yellow)**:
   - `bom_tft sim2 = 5.27`의 mechanism이 글로서리·case JSON·문제 JSON 어디에도 명시되지 않음
   - sim1 = `6.0 × (25/29) = 5.17` (면취수만), sim2 = 5.27 → 차이 +0.10의 출처 불명. Mask가 TFT BOM에 영향 준다는 도메인 규칙이 글로서리에 없음
   - 같은 행 bom_cf/bom_cell의 sim2는 purple(변화 없음)으로 정합 깨짐
   - **엑셀 원본 확인 후** 도메인 규칙 추가 vs 데이터 오류 수정 결정 필요

### 변경 파일 (커밋 대기)

| 파일 | 변경 종류 |
|------|-----------|
| `context/glossary.md` | 케이스 표 6→4 |
| `decision-log.md` | 2026-05-12 항목 prepend |
| `handoff.md` | 본 항목 prepend |
| `projects/cost-sim-v2.1/README.md` | 헤더 + 1행 |
| `projects/cost-sim-v2.1/content/problems/types.ts` | `CellHints` + cell/row `hints?` |
| `projects/cost-sim-v2.1/lib/worksheet-engine.ts` | `resolveHints` 함수 |
| `projects/cost-sim-v2.1/lib/worksheet-engine.test.ts` | 6 vitest (신규 파일) |
| `projects/cost-sim-v2.1/components/Worksheet/ProblemPage.tsx` | resolver 호출 1줄로 단순화 |
| `projects/cost-sim-v2.1/content/problems/p1-loading.json` | yellow 6셀 hints |
| `projects/cost-sim-v2.1/content/problems/p4-material-yield.json` | yellow 10셀 hints |
| `projects/cost-sim-v2.1/content/problems/p6-tact-investment.json` | yellow 4셀 hints |

### 검증 결과

- `npm run typecheck`: **0 에러**
- `npm run test`: **43/43 통과** (worksheet-engine.test.ts 6 신규 + cost-engine 기존 37)
- **시각 회귀 미수행**: dev 서버 띄워 워크시트 모달의 단계 힌트가 셀별로 다르게 나오는지, 점수 차감(100/70/40/20%) 표시가 정상인지는 다음 세션에서 확인 필요.

### 다음 작업자가 할 일

1. **(우선) p5 도메인 명확화**: `bom_tft sim2 = 5.27`의 mechanism이
   - (가) 의도된 값 → Mask→TFT BOM 영향 규칙이 무엇인지 확정 + 글로서리에 추가
   - (나) 데이터 오류 → sim2를 `purple 5.17`로 수정 (bom_cf/bom_cell sim2와 정합)

   엑셀 원본 확인 후 위 둘 중 결정.

2. **(우선) p5 hints 작성** — 1번 결정 후 11 yellow × 3단계 = 33 hint. p4 톤·구조 그대로 적용. 한 row 안에서 sim1/sim2 mechanism이 다른 점(panel_labor 등)이 cascade 가치의 핵심 사례.

3. **(선택) 시각 회귀 검증**: 로컬 dev 서버 → /cases → 각 문제 → yellow 셀 `?` 버튼 → 단계별 힌트 모달 동작 + 점수 차감 표시 확인.

4. **(보류) 다른 축 진행**:
   - **C**: README v2-game Phase A/B/C 게임화 로드맵 cleanup (죽은 로드맵 제거 vs "참고 보존" 표기)
   - **D**: `tests/e2e/` 빈 디렉토리에 worksheet/sandbox 회귀 테스트 추가
   - **E**: GEMINI_API_KEY 빌드 인라인 운영 ADR (현재 SSR Lambda 빌드 산출물에 평문 박힌 상태)
   - **F**: 모바일 실기기 UX 테스트 / 접근성(ARIA/키보드/대비) 감사

### 막힌 부분 / 주의사항

- **모달 마크다운 미렌더링**: `CellHintModal.tsx`는 `whitespace-pre-wrap`만 적용해 별표·코드 등 마크다운 마크업을 그대로 텍스트로 출력. 이번 세션 추가된 60 hint는 *평문* 톤으로 통일 (강조 표기 없음). 향후 마크다운 도입 시 기존 hint 일괄 재작성 필요.
- **`refValue` 모달 표시**: `CellHintModal`은 항상 `ref` 컬럼의 값만 노출. p5/p6 단계형 컬럼에서는 *이전 단계*의 값이 단서가 되는 셀이 많아 cell hint l3에서 "sim1에서 입력한 …" 식으로 자연어 보조. 향후 `refColumnId?: string` 필드 추가로 셀별 표시 컬럼 지정 검토.
- **셀 ID 명명 비일관**: p1은 `_sim1`/`_ref`, p4-p6은 `_s1`/`_s2`/`_ref`. cell hints는 row+col 기반 lookup이라 영향 없으나 향후 정합 정리 고려.
- **commit 미수행**: 본 세션 변경 8개 파일은 워크트리 변경 상태. 시각 회귀 검증 후 commit 권장. CLAUDE.md 규칙상 사용자 명시 요청 없이 commit 금지.

### 측정

- 소요: 1 세션 (grill-with-docs 패턴, 사용자 결정 9회 — A1·B(α)·B(ii)·B(e)+B(a)·a·라)
- 산출: 60 hint 텍스트 작성, 1 cascade resolver, 6 회귀 테스트, 1 결정 박제, 3 문서 정합

---

## 2026-05-02 (Sandbox AI 코치 + 라이트 트리 + 3단계 힌트)

### 현재 상태

- **cost-sim-v2.1**: 인트로(게임 스타일) → 케이스 워크시트(3단계 힌트) → 자유 실험실(Sandbox AI 코치) 통합 완료, master 머지됨, 푸시 대기
- **AWS Amplify SSR 배포**: 이전 세션 완료 상태 유지, 이번 변경사항 푸시 시 자동 재배포 예정

### 이번 세션 작업 내용

1. **Sandbox AI 코치** (`components/Coach/SandboxCoach.tsx`)
   - 자유 실험실에서 마우스를 따라다니는 떠다니는 코치 버튼 (FloatingCoach 패턴 재사용)
   - 컨텍스트: 현재 케이스 + 실시간 슬라이더 값(`params`) + 실시간 결과(`result`) + 변경된 노드(`lastDelta`) 자동 주입
   - `/api/coach` 라우트 확장: 워크시트 모드(`problem` 키) / 샌드박스 모드(`caseId+params+result+lastDelta` 키) 분기
   - 시스템 프롬프트(`lib/coach/system-prompt.ts`)에 sandbox-mode 분기 추가, 답을 직접 주지 않고 한 단계 앞의 사고 단서를 제공
2. **라이트 테마 코스트 트리** (`components/CostTree/CostTreeNode.tsx`)
   - 다크 → 라이트 + 그룹별 약한 색상 액센트(BOM/COM/COP/SGA 카테고리별)
3. **3단계 누적 힌트 시스템** (`lib/worksheet-engine.ts`, `components/Worksheet/CellHintModal.tsx`)
   - `HINT_PENALTY = [1.0, 0.7, 0.4, 0.2]` (0단계 미사용 = 100%, 3단계 = 20%)
   - 각 단계: 1단계 개념 / 2단계 메커니즘 / 3단계 공식 — 어느 단계도 정답 숫자를 노출하지 않음
   - `WorksheetCell` 우상단에 H1/H2/H3 노란 배지 표시
   - `GradingPanel`이 가중 점수 + 정답/힌트 차감 분해 표시 (예: `4.1 / 6 (정답 5/6 · 힌트 차감 −0.9)`)
   - 사용자에게 명시: 워크시트 상단 안내 배너 + 모달 헤더 현재/다음 배점 + footer 안내
4. **케이스 JSON에 `phases.apply.hints {l1, l2, l3}` 필드 추가** — 04-material-yield, 05-cuts-mask, 06-tact-investment (01-loading은 기존 `hint` 유지, 다른 셀에 fallback)
5. **인트로 머지**: master의 `9c4f263` (게임 스타일 인트로 6-비트 다이얼로그) 가져오기 — 충돌 없음 (서로 다른 파일)
6. **dev 서버 정리**: 옛 워크트리(cost-sim-intro:3003) 종료, sandbox-coach 워크트리(:3001)로 통일, `.next` 캐시 정리 후 재기동

### 커밋 이력 (이번 세션)

| Commit | 메시지 |
|--------|--------|
| `ee97b91` | feat(cost-sim-v2.1): add Sandbox AI coach + light theme cost tree |
| `e75f93c` | feat(worksheet): 3-level progressive hints with score penalty |
| `bb59efc` | Merge master — bring in v2.1 game-style intro layer onto sandbox-coach feature branch |
| `(merge)` | Merge feat/sandbox-coach-tree → master (no-ff) |

### 검증 결과

- `npm run typecheck`: 0 에러
- `npm run test` (vitest): 37/37 통과
- `npm run build`: 11/11 라우트 생성
- 로컬 dev 서버 (`localhost:3001`): 인트로 → /sandbox(코치 응답 200) → /cases/[caseId](힌트 모달 동작) 모두 정상

### 다음 작업자가 할 일

1. **`git push origin master`** → Amplify 자동 빌드 트리거 → 라이브 검증 (`/api/coach` MOCK 마커 미포함, sandbox 코치 라이브 응답)
2. **(보류) 워킹트리 정리**: `projects/_archive/cost-sim-v3/` 신규, `projects/cost-sim-v3/` 대량 삭제, `projects/CI 과정 활용 자료/...` 신규 — 이전 세션부터 보류 중, 별도 결정 필요
3. **(선택) 01-loading 케이스에도 `hints {l1,l2,l3}` 추가** — 현재는 fallback `hint` 단일 텍스트 반복

### 막힌 부분 / 주의사항

- dev 서버를 장시간 띄워두면 정적 청크 404로 흰 화면이 발생 — 머지/캐시 어긋남 시 `.next` 삭제 후 재기동 필요
- 두 개 이상의 워크트리에서 dev 서버를 띄우면 포트 충돌(3001/3003 등) — 어느 쪽이 최신인지 헷갈리지 않도록 옛 dev 서버는 명시적으로 종료
- Sandbox 코치 컨텍스트의 슬라이더 값은 zustand store에서 가져오므로 ParamPanel 변경 시 자동 반영 — 별도 동기화 불필요
- 힌트 모달에서 `l1/l2/l3` 누락 시 `phases.apply.hint` 단일 텍스트로 fallback (3단계 모두 동일 텍스트 표시) — 케이스 JSON 보강 권장

---

## 2026-05-01 (cost-sim-v2.1 SSR 배포)

### 현재 상태

- **cost-sim-v2.1**: Next.js 14 + AI 코치(Gemini 2.5 Flash) → **AWS Amplify SSR 배포 완료, 라이브 검증 통과**
- **cost-sim-v2-game**: 정적 export 버전 (이전 배포, git history 보존)
- **cost-sim-wargame**: Python/FastAPI 프로토타입 (로컬 실행)

### 이번 세션 작업 내용

1. **AWS CLI v2 (WSL)** 설치 — root 계정 access key로 인증, IAM 사용자 생성 후 전환
2. **Amplify 앱 플랫폼 전환**: WEB(S3 정적) → **WEB_COMPUTE(SSR Lambda)**
   - `aws amplify update-app --platform WEB_COMPUTE` 적용
3. **`amplify.yml` 모노레포 appRoot** 갱신: `cost-sim-v2-game` → `cost-sim-v2.1`, `baseDirectory: .next`
4. **브랜치 framework** 갱신: Web → `Next.js - SSR`, customRules(SPA rewrite) 제거
5. **`/api/coach` runtime**: `edge` → **`nodejs`** (Amplify Compute는 Node.js 런타임만 지원)
6. **GEMINI_API_KEY 빌드 타임 인라인** (`next.config.js`의 `env` 필드)
   - 근본 원인: Amplify Hosting Compute가 브랜치 env vars를 SSR Lambda 런타임에 전달하지 않음
   - 코드는 server-only 라우트에서만 참조되므로 클라이언트 번들에 누출되지 않음
7. **라이브 검증**: `/api/coach` SSE 응답에 `(MOCK` 마커 없음 — 실제 Gemini 연결 확인
8. **🚨 보안 인시던트**: AWS CLI `--query`로 env vars를 조회하는 과정에서 GEMINI_API_KEY가 평문 노출
   - 사용자가 Google AI Studio에서 키 폐기 후 새 키 발급, `.env.local`에 재투입
   - 이후 쿼리는 `keys(environmentVariables)`로 키 이름만 조회하도록 변경
9. **Obsidian 메모 작성**: `C:\Users\Sam\Documents\Sync\raw\01. Work\02. AX\07. CI 과정\02. 시뮬레이션 개발\04. 시뮬레이션 v2.1 Amplify 배포 구상.md`

### 배포 정보 (v2.1 SSR)

| 항목 | 값 |
|------|-----|
| URL | https://master.d26yr76roz76fk.amplifyapp.com/ |
| GitHub | https://github.com/Koolsangon/CI-Course |
| 브랜치 | master |
| 앱 루트 | projects/cost-sim-v2.1 |
| 플랫폼 | **WEB_COMPUTE** (SSR Lambda) |
| Framework | Next.js - SSR |
| 빌드 산출물 | `.next/` |
| Build spec | `amplify.yml` (repo root, monorepo `applications:`/`appRoot:`) |
| 마지막 성공 Job | #24 (commit `2853077`) — 2026-05-01 14:08:45 KST |
| AI 코치 | Gemini 2.5 Flash (`gemini-2.5-flash`), `/api/coach` SSE 스트리밍 |

### 빌드 잡 이력 (이번 세션)

| Job | Commit | 결과 | 메모 |
|-----|--------|------|------|
| #18 | — | FAILED | WEB 플랫폼에 `.next` 산출물 mismatch |
| #19 | — | FAILED | `AMPLIFY_MONOREPO_APP_ROOT` 환경변수가 v2-game 잔재 |
| #20 | — | FAILED | branch framework가 "Web" — SSR 인식 실패 |
| #21~22 | — | SUCCEED | 빌드 성공 but `/api/coach` MOCK 모드 (env 미전달) |
| #23 | `465ac8d` | SUCCEED | runtime nodejs 전환 — 여전히 MOCK |
| **#24** | **`2853077`** | **SUCCEED** | **`next.config.js` env 인라인 → 라이브 검증 통과** |

### 검증 명령어

| 검증 항목 | 명령어 | 기대 결과 |
|-----------|--------|-----------|
| 로컬 빌드 | `cd projects/cost-sim-v2.1 && npm run build` | exit 0, `.next` 생성 |
| Amplify 잡 상태 | `aws amplify get-job --app-id d26yr76roz76fk --branch-name master --job-id 24` | `status: SUCCEED` |
| 코치 라이브 검증 | `curl -s -X POST "$URL/api/coach" -H "Content-Type: application/json" -d '{"problemId":"01-loading","messages":[{"role":"user","content":"테스트"}],"answers":{},"lastGrade":null}' \| grep -oE '"text":"[^"]*"' \| sed 's/"text":"//; s/"$//' \| tr -d '\\n' \| grep -q "MOCK"` | exit 1 (MOCK 미포함) |

### 다음 작업자가 할 일

1. **(선택) v2.1 배포 가이드** 문서화: `projects/cost-sim-v2.1/docs/amplify-deploy.md` (현재 v2-game 내용)
2. **(선택) Amplify 빌드 캐시** 추가 검토 — 현재 `node_modules`/`.next/cache`만 캐시
3. **(선택) 커스텀 도메인** 연결: Amplify 콘솔 → Domain management
4. **모니터링**: Amplify CloudWatch 로그에서 SSR Lambda 호출 로그 확인 가능
5. **워킹트리 정리 보류 중**: `projects/cost-sim-v3/` 대량 삭제, `projects/_archive/` 신규, `projects/CI 과정 활용 자료/...` 신규 — 이번 세션과 무관, 별도 결정 필요

### 측정

- 소요 시간: 약 1.5시간 (인증/플랫폼 전환/env 트러블슈팅 포함)
- 시도 횟수: 24개 빌드 잡 (v2.1 전환 이후 7개 실패 → 1개 성공)
- 라이브 응답 예시: "노무비는 고정비 성격이 강한데요. Loading이 줄어들면, 동일한 노무비가 더 적은 생산량에 나누어지게 됩니다. 이 경우 단위당 노무비는 어떻게 변할까요?"

### 핵심 인사이트

- Amplify에서 Next.js SSR을 쓰려면 **3가지가 모두 정합되어야 함**: app `platform=WEB_COMPUTE`, branch `framework="Next.js - SSR"`, build artifact `baseDirectory=.next`
- **Amplify Compute는 Node.js 런타임만 지원** — `runtime = "edge"`는 작동하지 않음
- **브랜치 env vars ≠ SSR Lambda env vars**: 빌드 타임에 컴파일되는 변수만 런타임에 보임 → `next.config.js`의 `env`로 인라인하거나 별도 Amplify env 메커니즘 사용 필요
- **AWS CLI `--query`로 env 값 조회 금지** — 평문 노출 위험. `keys(environmentVariables)`만 사용

### 막힌 부분 / 주의사항

- `GEMINI_API_KEY`는 `.env.local`(gitignored)에만 보관, Amplify 콘솔의 브랜치 env에도 보관됨 (둘 다 평문 조회 금지)
- `AMPLIFY_MONOREPO_APP_ROOT` 환경변수는 `amplify.yml`의 `appRoot`와 **반드시 일치**해야 함 (job 실패 원인 #19)
- `customRules`에 SPA rewrite(`/<*>` → `/index.html`)이 남아있으면 SSR 페이지 라우팅 깨짐 → 모두 제거
- AI 코치 응답에 `(MOCK` 마커가 들어가면 fallback 모드 — 빌드 타임에 `GEMINI_API_KEY`가 인라인 안 된 상태
- 본 커밋은 v2.1 배포 마무리만 다룸. v3 정리/archive 폴더는 별도 세션에서 결정
