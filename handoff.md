# handoff.md - 인수인계 메모

## 최종 갱신: 2026-05-12 (4-케이스 정합 + 워크시트 셀별 힌트 시스템 도입)

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
