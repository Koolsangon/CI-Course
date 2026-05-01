# handoff.md - 인수인계 메모

## 최종 갱신: 2026-05-01 (cost-sim-v2.1 SSR 배포)

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
