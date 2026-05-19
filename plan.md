# 작업 계획

## 현재 작업: cost-sim-v2.1 게임화 (1차수 D-14 = 2026-05-27)

> **PRD Issue**: [#2 cost-sim-v2.1 게임화 PRD](https://github.com/Koolsangon/CI-Course/issues/2) (`ready-for-agent`)
> **PRD 문서**: `outputs/cost-sim-v2.1-game-prd.md` (422줄, 55 user stories)

### GitHub Issues (17 vertical slices)

| Phase | Slice | Issue | Type |
|-------|-------|-------|------|
| 0 | S1 LLM 코치 코드 완전 제거 | [#3](https://github.com/Koolsangon/CI-Course/issues/3) | AFK |
| 0 | S2 셀별 60 hints 제거 + worksheet-engine 단순화 | [#4](https://github.com/Koolsangon/CI-Course/issues/4) | AFK |
| B.1 | S3 계산기 sticky bottom + 표 padding | [#7](https://github.com/Koolsangon/CI-Course/issues/7) | AFK |
| B.2 | S4 formula-parser + 키보드 자유 텍스트 + % 자동 변환 | [#13](https://github.com/Koolsangon/CI-Course/issues/13) | AFK |
| B.3 | S5 단위 통일 + 총수율 행 + 표 순서 | [#8](https://github.com/Koolsangon/CI-Course/issues/8) | **HITL** |
| B.4 | S6 hint-state-manager + 문제 단위 모달 + 차감 토글 | [#9](https://github.com/Koolsangon/CI-Course/issues/9) | AFK |
| B.5 | S7 다시풀기 부분 초기화 + O/X + 정답 미노출 | [#14](https://github.com/Koolsangon/CI-Course/issues/14) | AFK |
| B.6 | S8 워크시트 게임 모드 컨텍스트 분기 + 타이머 (mock) | [#15](https://github.com/Koolsangon/CI-Course/issues/15) | AFK |
| A.1+A.3+A.4 | S9 merged-case-adapter + 7변수 통합 ParamPanel + 드롭다운 제거 | [#5](https://github.com/Koolsangon/CI-Course/issues/5) | AFK |
| A.2 | S10 Sandbox 인스펙터 톤 조정 | [#10](https://github.com/Koolsangon/CI-Course/issues/10) | AFK |
| C.1+C.2 | S11 DynamoDB + room-state-machine + time-aggregator + API 5개 | [#6](https://github.com/Koolsangon/CI-Course/issues/6) | AFK |
| C.3 | S12 학습자 흐름 라우트 + 폴링 hook | [#11](https://github.com/Koolsangon/CI-Course/issues/11) | AFK |
| C.4 | S13 게임 모드 워크시트 (타이머·리더보드·자동 종료) | [#16](https://github.com/Koolsangon/CI-Course/issues/16) | AFK |
| C.5 | S14 라운드 결과 + 종합 발표 화면 | [#17](https://github.com/Koolsangon/CI-Course/issues/17) | AFK |
| C.6 | S15 강사 뷰 `/instructor` | [#12](https://github.com/Koolsangon/CI-Course/issues/12) | **HITL** |
| Z.1+Z.2 | S16 Amplify 라이브 배포 + 사내망 검증 | [#18](https://github.com/Koolsangon/CI-Course/issues/18) | **HITL** |
| Z.3 | S17 1차수 강의 진행 (2026-05-27) | [#19](https://github.com/Koolsangon/CI-Course/issues/19) | **HITL** |

### 컨텍스트

- **1차수 강의 일정**: 2026-05-27 (D+14, 고정)
- **6차수 운영**: 각 차수 30명, LG Display 사내 강의실, 회사 노트북
- **백엔드**: AWS Amplify SSR(WEB_COMPUTE) + DynamoDB + 클라이언트 폴링 2초
  - Firebase/Supabase는 사내망 차단 가능성 → AWS로 결정
- **추정 작업량**: 22~28일분 (1인 풀타임)을 D+14 안에 압축. AI 가속에 베팅. Buffer 0.
- **상세 결정 트리**: `decision-log.md` 2026-05-13 항목 (16개 결정)

### Fallback 게이트 — D-2 리허설 시점에 판단

| 시점 | 판단 |
|------|------|
| **D+12 (D-2) 학습자 노트북 1대 셀프 리허설** | 게이미피케이션 풀 동작 → 그대로 1차수 진행 |
| | 미동작 (예: 폴링/룸 상태 머신 깨짐) → 1차수는 *B 적용 워크시트 + 수동 운영*으로 fallback (강사가 시간 수기 측정) |

### 작업 순서: Phase 0 → B → A → C → Z

---

### Phase 0 — Cleanup (D+1, 1일)

| # | 작업 | 완료 기준 |
|---|------|----------|
| 0.1 | LLM 코치 코드 완전 제거 — `components/Coach/*`, `lib/coach/*`, `app/api/coach`, `FloatingCoach`, `SandboxCoach`, Amplify `GEMINI_API_KEY`, `next.config.js`의 env 인라인 | `typecheck` 0, vitest 통과, `/api/coach` 응답 404 |
| 0.2 | 셀별 60 hints 데이터 제거 — `content/problems/*.json`의 `cells[].hints`·`rows[].hints`, `types.ts`의 `CellHints` 인터페이스, `worksheet-engine.test.ts`의 cascade 6 tests | `resolveHints`가 case 레벨 단일 lookup, 기존 모달 정상 동작 |

---

### Phase B — 워크시트 UX (D+2 ~ D+5, 4일)

| # | 작업 | 완료 기준 |
|---|------|----------|
| B.1 | **계산기 sticky bottom** — 화면 하단 fixed, 항상 표시 (placeholder 안내 + 셀 선택 시 활성화). 표 `padding-bottom`을 calculator 높이만큼 확보 | 셀 5번 클릭 + 표 마지막 row까지 스크롤 가능 |
| B.2 | **키보드 자유 텍스트 입력 + % 자동 변환** — Calculator에 자유 텍스트 input 추가. `"70%" → 0.7`, `"21.3 * 70%" → 14.91` 파싱. 토큰 모델 유지 (셀 클릭 = 토큰 추가). 셀에 직접 타이핑도 가능 (yellow 셀 = input field) | 마우스/키보드 양 모드 동작, % 혼합 수식 정상 |
| B.3 | **단위 통일 + 총수율 행 + 표 순서** — 금액 $·수율 %·영업이익률 % 명확. 총수율 행 추가 (TFT × CF × Cell × Module = 91.4%). 표 순서 엑셀 원본 정합 | p1/p4/p5/p6 모두 4문제 일관 |
| B.4 | **힌트 단순화 + 콘텐츠 검증 + 차감 토글** — 셀별 hints 제거 후 `phases.apply.hints` 활용. 문제 헤더에 "힌트" 버튼 1개. 차감 100/70/40/20% 유지하되 *강사 설정에서 토글 가능*. **12개 힌트(4문제 × 3단계)가 그 문제의 모든 yellow 셀 풀이에 적절한지 검증 필수** | 4문제 힌트 모달 동작, 토글 OFF 시 차감 없음 |
| B.5 | **다시풀기 + O/X + 정답 미노출** — `handleReset`을 *틀린 셀만 비우는 부분 reset*으로 변경. 채점 결과에 정답 숫자 노출 안 함, O/X 마크만 | 18셀 중 12 정답 → 다시풀기 → 6 빈 셀 + 12 유지 |
| B.6 | **게임 모드 컨텍스트 분기** — `/cases/[id]`가 `roomCode + roundN` 컨텍스트 있으면 게임 모드(타이머·미니 리더보드·정답 미노출), 없으면 연습 모드(기존) | `?game=true` 진입 시 타이머 노출 |

**⚠️ B.3 작업자 의존**: 엑셀 원본 파일(총수율 행 위치·표 순서) 사용자 제공 필요. 사용자가 D+2 까지 `context/` 또는 `projects/cost-sim-v2.1/docs/`에 원본 위치 또는 스크린샷 제공.

---

### Phase A — Sandbox Multi-factor 통합 (D+6 ~ D+8, 3일)

| # | 작업 | 완료 기준 |
|---|------|----------|
| A.1 | **7변수 통합 ParamPanel** — Loading·재료비 변동률·수율 변동률·새 면취수·새 Mask·Tact 배수·투자 상각비 증가분. 면취수·Mask 기준값 reference 고정, 새값만 슬라이더. 기본값 = "변동 없음" (Loading 70%, 재료비 0%, 수율 0%p, 면취수 25, Mask 6, Tact 1.0x, 투자 $0). Multi-open accordion 기본 모두 닫힘. 변동 표지(점·↩ 아이콘) | 7 슬라이더 동작, 변동 표지 정확 |
| A.2 | **우측 인스펙터 톤 조정** — 변동된 변수만 표시 (기본값 그대로면 안 보임). "기본 X → 새 X (변화량)" 자연어 형식 보강. 기존 토큰 치환 유지하되 *변동 변수마다 그룹 묶음*. 결과 4줄(processing_cost·com·cop·operating_profit) 누적 변화 | 7변수 중 임의 조합 변동 시 정확히 그것만 인스펙터에 노출 |
| A.3 | **케이스 드롭다운 제거 + 통합 sandbox** — 헤더 드롭다운 제거, `useState caseId` 제거, `lib/cases.ts` 통합 reference로 단순화. `SandboxPage` 7변수 단일 화면 | `/sandbox` 진입 시 즉시 통합 화면 |
| A.4 | **7변수 동시 적용 단일 어댑터** — 현 4 어댑터를 통합. 변경 순서: Loading → 재료비 → 수율 → 면취수 → Mask → Tact → 투자상각비. 엔진 자체는 sacred — 27 golden fixtures 보존 | 27 fixtures 통과, 7변수 동시 변경 시 cost-tree 정확 반영 |

---

### Phase C — 게이미피케이션 (D+9 ~ D+13, 5일)

| # | 작업 | 완료 기준 |
|---|------|----------|
| C.1 | **DynamoDB 테이블 + IAM** — Single-table: `PK ROOM#{code}`, `SK META/PLAYER#{id}/ROUND#{N}/ROUND#{N}#PLAYER#{id}`. Amplify SSR Lambda 서비스 롤에 DynamoDB read/write. 환경변수 `AWS_REGION`, `DYNAMODB_TABLE_NAME` | `aws dynamodb get-item` 응답 |
| C.2 | **API routes 5개** — `POST /api/rooms` (강사: 룸 코드 4자 + admin_token 12자 발급), `POST /api/rooms/{code}/players` (학습자 입장), `PATCH /api/rooms/{code}` (강사 설정·신호), `POST /api/rooms/{code}/rounds/{N}/submissions` (학습자 정답 기록), `GET /api/rooms/{code}` (폴링). 시각은 서버 Lambda timestamp | curl로 5 라우트 응답, 룸 lifecycle 정상 |
| C.3 | **학습자 흐름 라우트 + 폴링 hook** — `/` 룸코드 입력, `/intro` 기존 6비트 유지(룸코드 보유 시만 진입), `/menu` Sandbox/게임 모드 선택, 게임 모드 대기 룸은 강사 신호 폴링. 강사 신호 받으면 `/cases/{caseId}?game=true` 자동 이동. `useRoomState` hook: 2초 폴링, 상태에 따라 redirect/render | 룸 입장 → 인트로 → 메뉴 → 대기 → 라운드 자동 진입 |
| C.4 | **게임 모드 워크시트** — 상단 타이머 카운터 + 라운드 N 표기. 사이드/하단에 미니 리더보드(자기 등수 + 위·아래 2명). 100% 정답 도달 시 자동 종료 → submission API 호출 → 대기 화면. 10분 캡 도달 시 자동 종료(캡 시간 기록) | 라운드 진입 → 타이머 → 100% 정답 → 시간 기록 → 대기 |
| C.5 | **라운드 결과 + 종합 발표 화면** — 매 라운드 종료 후 학습자/강사 모두 결과(전체 리더보드 α2 + 팀별 결과). 강사 신호 폴링 → 자동 다음 라운드. 4 라운드 끝 후 종합 발표 (개인 1·2·3 + 팀 1·2·3) | 4 라운드 종합 발표까지 진행, 데이터 정확 |
| C.6 | **강사 뷰 `/instructor`** — 새 방 생성(admin_token 발급, localStorage 저장). `/instructor/{code}` 본체: 설정 패널(시간 캡·팀 수·힌트 차감 토글), 입장 학습자 대시보드(이름·팀·UUID, 팀 번호 오타 수정 가능), 라운드 시작 버튼 4개, 실시간 진행 대시보드(학습자별 완료 여부·시간), 다음 라운드 신호, 종합 발표 컨트롤 | 강사 1 + 학습자 6(1인 6 탭) 시뮬레이션 정상 흐름 |

---

### Phase Z — 라이브 배포 + 리허설 (D+14, 1일)

| # | 작업 | 완료 기준 |
|---|------|----------|
| Z.1 | **Amplify 라이브 배포 검증** — `amplify.yml` 동작, 라이브 URL `/api/rooms` POST 응답 | Amplify 잡 SUCCEED, 라이브 룸 생성 가능 |
| Z.2 | **사내망 검증** — LG Display 사내 노트북에서 라이브 URL 접근. DynamoDB 호출이 사내망 방화벽 통과 | 사내 노트북에서 룸 입장 정상 |
| Z.3 | **1차수 강의 진행** — 강사 방 생성 → 30명 입장 → 4 라운드 진행 → 종합 발표 | 강의 정상 완료 |

---

## 검증 명령어

| 검증 항목 | 명령어 | 기대 결과 |
|-----------|--------|-----------|
| Typecheck | `cd projects/cost-sim-v2.1 && npm run typecheck` | 0 에러 |
| Unit tests | `cd projects/cost-sim-v2.1 && npm run test` | 통과 (cascade 6 tests 제거, 신규 sandbox/worksheet 회귀 추가) |
| Build | `cd projects/cost-sim-v2.1 && npm run build` | 0 warning |
| E2E | `cd projects/cost-sim-v2.1 && npx playwright test` | 기존 14 spec 통과 + 신규 게임 critical path |
| 라이브 룸 생성 | `curl -X POST https://master.d26yr76roz76fk.amplifyapp.com/api/rooms` | `{code, admin_token}` 응답 |
| 폴링 | `curl https://master.d26yr76roz76fk.amplifyapp.com/api/rooms/{code}` | room state JSON |

---

## 마일스톤

| 마일스톤 | 날짜 | 의미 |
|---------|------|------|
| **Phase 0 완료** | D+1 (5/14) | LLM/hints cleanup 완료 |
| **Phase B 완료** | D+5 (5/18) | 워크시트 UX 6항목 완성. 학습자가 *연습 모드*로 미리 풀이 가능 |
| **Phase A 완료** | D+8 (5/21) | Sandbox 통합 sandbox 완성 |
| **Phase C 완료** | D+13 (5/26) | 게이미피케이션 풀 동작 |
| **D-2 Fallback 게이트** | D+12 (5/25) | 셀프 리허설 → 게이미피케이션 미동작 시 Plan B 전환 |
| **1차수 강의** | D+14 (5/27) | 라이브 |

---

## Archived: cost-sim-wargame v0.3 prototype

> 본 plan.md는 cost-sim-v2.1 게임화로 재정의됨 (2026-05-13).
> 아래는 이전 작업 (Python/FastAPI wargame 프로토타입) 노트.

### 이전 작업 상태: v0.3 프로토타입 완료

개발원가 시뮬레이션 War Game 웹앱 프로토타입이 동작하는 상태.
엔진 27/27 테스트 통과, 6개 케이스 API/프론트엔드 연동 완료.

상세 구현 보고서: `outputs/implementation-report.md`

### 이전 작업 남은 작업 (보류)

| # | 작업 | 완료 기준 | 상태 |
|---|------|-----------|------|
| 1 | War Game 라운드-케이스 연동 | 라운드별 다른 케이스 자동 배정, 3라운드 시나리오 흐름 정상 | 보류 (cost-sim-v2.1에서 별도 모델로 진행) |
| 2 | 모바일 실기기 UX 테스트 | 최소 2개 기기에서 6케이스 정상 동작 | 보류 |
| 3 | WebSocket 부하 테스트 | 10명 동시접속 시 라운드 진행 안정 | 보류 (v2.1에서 폴링으로 변경) |
| 4 | DB 저장소 연동 (선택) | 서버 재시작 후 게임 세션 유지 | 보류 (v2.1에서 DynamoDB) |

### 이전 작업 완료된 작업

- [x] 원가 계산 엔진: 6개 케이스 전체 구현 + 27개 테스트 통과
- [x] FastAPI 백엔드: 시뮬레이션 API 7개 + 게임 API 5개 + AI 채팅
- [x] AI 어시스턴트: 플러그인 방식 (템플릿 + Claude API)
- [x] 모바일 반응형 프론트엔드: 6케이스 전체 지원 (app.js v2)
- [x] 하네스 엔지니어링: 3축 보강 (용어집, 톤가이드, 체크리스트, 측정 섹션)
