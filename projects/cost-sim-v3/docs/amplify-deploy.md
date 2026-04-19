# AWS Amplify 배포 가이드 — cost-sim-v2-game

## 개요

Next.js 14 앱을 AWS Amplify에 정적 사이트(Static Export)로 배포하는 방법을 정리한다.
Amplify 플랫폼이 **WEB (S3 정적 호스팅)**일 때 적용되는 설정이다.

> **배포 URL**: https://master.d26yr76roz76fk.amplifyapp.com/

---

## 프로젝트 구조

```
CI-Course/                          ← GitHub 리포 루트
├── amplify.yml                     ← Amplify 빌드 스펙
└── projects/
    └── cost-sim-v2-game/           ← Next.js 앱 (모노레포 서브디렉토리)
        ├── next.config.js
        ├── package.json
        ├── app/
        ├── out/                    ← 빌드 산출물 (정적 HTML)
        └── ...
```

---

## 핵심 설정 파일

### 1. `next.config.js`

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',              // 정적 HTML 생성 (out/ 디렉토리)
  reactStrictMode: true,
  images: { unoptimized: true }, // 정적 export 필수 (Image Optimization 비활성화)
  experimental: {
    typedRoutes: false
  }
};

module.exports = nextConfig;
```

| 설정 | 설명 |
|------|------|
| `output: 'export'` | `next build` 시 `out/` 디렉토리에 정적 HTML 생성. Amplify WEB(S3) 플랫폼에서 필수 |
| `images: { unoptimized: true }` | Next.js Image Optimization은 서버가 필요하므로 정적 export에서 반드시 비활성화 |

### 2. `amplify.yml` (리포 루트)

```yaml
version: 1
applications:
  - appRoot: projects/cost-sim-v2-game
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: out
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
```

| 설정 | 설명 |
|------|------|
| `applications` + `appRoot` | 모노레포 필수. Amplify가 서브디렉토리를 빌드 루트로 인식 |
| `baseDirectory: out` | `output: 'export'`가 생성하는 정적 파일 디렉토리 |
| `npm ci` | `package-lock.json` 기반 결정적 설치 |

---

## 동적 라우트 처리

정적 export에서 동적 라우트(`[caseId]`)는 `generateStaticParams`로 빌드 타임에 모든 경로를 사전 생성해야 한다.

### `app/(learn)/cases/[caseId]/page.tsx` (서버 컴포넌트)

```tsx
import { CASES } from "@/lib/cases";
import CaseClient from "./CaseClient";

export const dynamicParams = false;  // 미리 생성된 경로 외 404 반환

export function generateStaticParams() {
  return Object.keys(CASES).map((caseId) => ({ caseId }));
}

export default function CasePage() {
  return <CaseClient />;
}
```

### `app/(learn)/cases/[caseId]/CaseClient.tsx` (클라이언트 컴포넌트)

```tsx
"use client";
// 기존 page.tsx의 클라이언트 로직을 그대로 이동
// useParams()로 caseId를 읽고, 상태 관리 및 UI 렌더링 수행
```

**왜 분리하는가?**
- `page.tsx`는 서버 컴포넌트여야 `generateStaticParams`를 export 가능
- `"use client"` 로직은 별도 파일(`CaseClient.tsx`)로 분리

---

## API Route 제약

정적 export(`output: 'export'`)에서는 **API Route를 사용할 수 없다**.

- `app/api/` 하위의 `route.ts` 파일은 빌드 시 에러 발생
- 서버 사이드 로직이 필요한 기능은 클라이언트 측 fallback 제공 필요
- 이 프로젝트에서는 AI Coach가 정적 코칭 텍스트로 자동 대체됨

---

## Amplify 콘솔 설정

### 최초 앱 생성

1. [AWS Amplify 콘솔](https://console.aws.amazon.com/amplify/) 접속
2. **Create new app** → **Host web app**
3. **GitHub** 선택 → `Koolsangon/CI-Course` 리포, `master` 브랜치
4. 모노레포 설정: Amplify가 `amplify.yml`의 `appRoot`를 자동 감지
5. **Save and deploy**

### 플랫폼 확인

| 플랫폼 | 서빙 방식 | 확인 방법 |
|--------|----------|----------|
| **WEB** | S3 정적 파일 | `curl -sI` 응답에 `server: AmazonS3` |
| **WEB_COMPUTE** | Lambda SSR | `server: CloudFront` + SSR 동작 |

```bash
# 플랫폼 확인 명령
curl -sI https://master.d26yr76roz76fk.amplifyapp.com/ | grep server
# 기대 결과: server: AmazonS3
```

> WEB 플랫폼에서는 반드시 `output: 'export'`를 사용해야 한다.
> SSR이 필요하면 Amplify 콘솔에서 플랫폼을 WEB_COMPUTE로 변경 후
> `output: 'export'`를 제거하고 `baseDirectory: .next`로 변경한다.

---

## 배포 검증 (Playwright)

```bash
# 배포 후 Playwright 검증 실행
cd projects/cost-sim-v2-game
AMPLIFY_URL="https://master.d26yr76roz76fk.amplifyapp.com" \
  npx playwright test tests/e2e/amplify-deploy.spec.ts
```

검증 항목:
- `/` → HTTP 200 + "살아있는 원가 트리" 헤딩
- `/sandbox` → HTTP 200
- `/cases/01-loading` → HTTP 200
- `/daily` → HTTP 200

---

## 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| 빌드 에러: `Monorepo spec provided without "applications" key` | Amplify 모노레포 모드인데 `amplify.yml`에 `applications:` 키 없음 | `amplify.yml`에 `applications:` + `appRoot:` 형식 사용 |
| 전체 404 (빈 흰 페이지) | 플랫폼이 WEB(S3)인데 `output: 'standalone'` 사용 | `output: 'export'`로 변경, `baseDirectory: out` |
| 동적 라우트 404 | `generateStaticParams` 없음 | 서버 컴포넌트 page.tsx에 `generateStaticParams` 추가 |
| 빌드 에러: API route 관련 | 정적 export에서 API Route 미지원 | API route 삭제, 클라이언트 측 fallback 구현 |
| `next/image` 에러 | 정적 export에서 Image Optimization 미지원 | `images: { unoptimized: true }` 설정 |

---

## 빌드 결과 예시

```
Route (app)                              Size     First Load JS
┌ ○ /                                    8.59 kB         147 kB
├ ○ /_not-found                          873 B          88.2 kB
├ ● /cases/[caseId]                      16.2 kB         245 kB
├   ├ /cases/01-loading
├   ├ /cases/02-labor
├   ├ /cases/03-marginal
├   └ [+4 more paths]
├ ○ /daily                               6.45 kB         145 kB
└ ○ /sandbox                             2.41 kB         232 kB

○  (Static)  prerendered as static content
●  (SSG)     prerendered as static HTML
```

모든 라우트가 `○` (Static) 또는 `●` (SSG)여야 Amplify WEB 플랫폼에서 정상 동작한다.
`ƒ` (Dynamic)이 있으면 WEB_COMPUTE 플랫폼이 필요하다.
