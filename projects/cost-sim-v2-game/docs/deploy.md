# 배포 가이드 — Vercel + AI 코치 활성화

> cost-sim-v2-game을 Vercel에 배포하고 운영하는 방법.
> 본 문서는 GitHub repo `Koolsangon/CI-Course`의 monorepo 안에서
> `projects/cost-sim-v2-game`만 배포하는 시나리오 기준으로 작성되었습니다.

## 1. 최초 배포

### 1-1. 원클릭 import

브라우저에서 다음 링크를 열면 Vercel 프로젝트 import 폼이 자동으로 채워집니다:

```
https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FKoolsangon%2FCI-Course&project-name=cost-sim-v2-game&root-directory=projects%2Fcost-sim-v2-game
```

### 1-2. 수동 import

1. https://vercel.com/new → GitHub 연결
2. `Koolsangon/CI-Course` 저장소 import
3. **Configure Project**:
   - **Project Name**: `cost-sim-v2-game` (URL이 됨)
   - **Framework Preset**: Next.js (자동 감지)
   - **Root Directory**: `projects/cost-sim-v2-game` ← monorepo이므로 필수
   - Build Command / Output Directory / Install Command: 모두 기본값 그대로
4. Environment Variables는 비워둔 채로 **Deploy** 클릭
5. 약 2~3분 후 라이브 URL 발급 (`<project-name>.vercel.app`)

이후 master에 push할 때마다 자동 재배포되며, PR마다 별도 미리보기 URL이 자동 생성됩니다.

---

## 2. AI 코치 켜기

기본 상태에서는 정적 코치(케이스별 사전 작성 카피)만 표시되고 AI 호출이 차단되어 있습니다.
Anthropic Claude API를 연결해 코치 답변을 생성하려면 환경변수를 두 개 추가합니다.

### 2-1. Anthropic API 키 발급
1. https://console.anthropic.com 접속 → 회원가입/로그인
2. **API Keys** → **Create Key**
3. 키 형태: `sk-ant-api03-...` (전체 복사)

### 2-2. Vercel 프로젝트에 환경변수 추가
1. Vercel 대시보드 → 해당 프로젝트 (`cost-sim-v2-game`) 클릭
2. 상단 탭 **Settings** → 좌측 메뉴 **Environment Variables**
3. 다음 두 개를 추가:

| Key | Value | Environment |
|---|---|---|
| `NEXT_PUBLIC_AI_COACH_ENABLED` | `true` | Production · Preview · Development 모두 체크 |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` | Production · Preview · Development 모두 체크 |

4. 각 항목 **Save** 클릭

### 2-3. 재배포
환경변수만 추가하면 즉시 적용되지 않습니다. 강제 재배포가 필요합니다:

- 방법 A: **Deployments** 탭 → 가장 최근 deployment 우측 메뉴(`...`) → **Redeploy**
- 방법 B: 빈 commit이라도 master에 push → 자동 재배포

재배포가 끝나면 Coach Drawer 우하단에 "더 자세한 설명 (AI)" 버튼이 생기며, 클릭 시 Claude API를 호출해 정적 코치보다 더 구체적인 힌트를 받습니다.

### 2-4. AI 끄기
`NEXT_PUBLIC_AI_COACH_ENABLED`를 `false`로 변경하거나 두 환경변수 중 하나라도 삭제하면 정적 코치로 graceful degrade. 이미 발생한 호출 비용은 Anthropic console에서 확인 가능.

---

## 3. 진행 상태 초기화 (강의장 운영)

플레이어 진행 상태(별·캠페인·마스터리·스트릭·intro·리플렉션 메모)는 **localStorage**에 저장됩니다.
스토리지 키: `cost-sim-v2-game:profile:v1`

### 3-1. 단일 사용자 리셋
브라우저 DevTools → Application → Local Storage → 해당 키 삭제 → 새로고침.

또는 콘솔에서:
```js
localStorage.removeItem("cost-sim-v2-game:profile:v1");
location.reload();
```

### 3-2. 강의장 노트북 공유 시
한 장비를 여러 수강자가 돌려쓰는 경우, 각 세션 끝에 위 콘솔 명령으로 초기화하거나
Vercel preview URL을 매 세션마다 새로 발급해도 됩니다.

> **R9 / PIPA 안전성**: localStorage는 서버로 전송되지 않습니다. Reflect 자유응답 텍스트도 클라이언트에만 머무릅니다.

---

## 4. 주요 운영 정보

| 항목 | 값 |
|---|---|
| Framework | Next.js 14 (App Router) |
| Node | 20.x (Vercel 기본값) |
| Runtime | edge (`/api/ai/coach`만), 나머지는 nodejs |
| Bundle Budget | 250 KB First Load JS (현재 sandbox 226 KB / cases 238 KB) |
| Hosting Cost | Vercel Hobby 무료 (대역폭 100 GB/월) |
| 자동 재배포 트리거 | master push, PR open, 환경변수 변경 후 수동 Redeploy |

## 5. 문제 해결

| 증상 | 원인 / 조치 |
|---|---|
| Build 실패 ("Cannot find module") | Root Directory가 `projects/cost-sim-v2-game`로 설정됐는지 확인. Settings → General → Root Directory |
| 페이지 200이지만 빈 화면 | 브라우저 콘솔에서 hydration 에러 확인. 보통 zustand persist 키 mismatch — `cost-sim-v2-game:profile:v1` localStorage 삭제 후 새로고침 |
| Coach Drawer 버튼이 안 보임 | `NEXT_PUBLIC_AI_COACH_ENABLED` 값 확인. `true` 문자열이어야 함 (boolean true가 아닌 string) |
| AI 호출 후 정적 코치만 표시됨 | `/api/ai/coach` 라우트가 graceful degrade한 것. Vercel Functions 로그에서 Anthropic API 에러 확인 (rate limit / 잘못된 키 / 네트워크) |
| Sandbox 드롭다운이 안 열림 | 상단 헤더 `relative z-20` 픽스가 빠진 dev 빌드. v2-game master HEAD에서는 해결됨. Redeploy 권장. |
| 폰트가 깨짐 | Vercel 빌드 타임에 Google Fonts(Noto Sans KR) 다운로드. 빌드 로그에서 폰트 fetch 에러 확인. 거의 발생 안 함. |

## 6. 보스 케이스 잠금 해제 (테스트용)

기본 게이트는 6 케이스 모두 ★★★ 클리어 시 자동 잠금 해제. 강사 데모 등으로 미리 보고 싶을 때:

```js
// 브라우저 콘솔에서:
const cases = ["01-loading","02-labor","03-marginal","04-material-yield","05-cuts-mask","06-tact-investment"];
const data = JSON.parse(localStorage.getItem("cost-sim-v2-game:profile:v1") || '{"state":{},"version":1}');
data.state.caseScores = data.state.caseScores || {};
for (const id of cases) data.state.caseScores[id] = { stars: 3, accuracy: 1, moves: 1, hintUsed: false, score: 135, attempts: 1, committedProfit: 10 };
localStorage.setItem("cost-sim-v2-game:profile:v1", JSON.stringify(data));
location.reload();
```

또는 잠금과 무관하게 직접 URL `/cases/07-crisis`로 접근 가능합니다.
