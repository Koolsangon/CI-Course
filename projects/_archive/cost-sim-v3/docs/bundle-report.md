# Bundle Size Report (AC12)

> Target: 클라이언트 critical path ≤ 250KB gzip. 측정 기준 `npm run build` Next.js First Load JS.
> 작성일: 2026-04-11 (Phase 6)

## next build 측정 (production)

```
Route (app)                              Size     First Load JS
┌ ○ /                                    175 B          94.1 kB
├ ○ /_not-found                          873 B            88 kB
├ ƒ /api/ai/coach                        0 B                0 B   (edge)
├ ƒ /cases/[caseId]                      2.53 kB         223 kB
└ ○ /sandbox                             883 B           214 kB

+ First Load JS shared by all            87.1 kB
  ├ chunks/117-ed31a730d9aeb976.js       31.6 kB
  ├ chunks/fd9d1056-4b6c6456b3fa9296.js  53.6 kB
```

## 판정

| Route | First Load JS | AC12 (≤250KB) | 여유 |
|---|---|---|---|
| `/` (home) | 94.1 kB | ✅ PASS | +155.9 kB |
| `/sandbox` | 214 kB | ✅ PASS | +36 kB |
| `/cases/[caseId]` | 223 kB | ✅ PASS | +27 kB |
| `/api/ai/coach` | 0 kB | ✅ PASS (edge) | n/a |

모든 경로가 AC12 목표치 250KB 미만.

## 상위 청크 기여자 (추정)

- `reactflow` + `@dagrejs/dagre` → CostTree 경로만 소요
- `framer-motion` → 트리 펄스 + 코치 드로어 슬라이드
- `zustand` + `react-hook-form` + `zod` → 가벼움 (합계 <20kB)

## 추가 최적화 (여유가 더 필요할 때)

- `CoachDrawer`를 `next/dynamic`으로 lazy import → AI 활성 시에만 로드
- reactflow Controls/Background를 dynamic import로 뒤로 미루기 (sandbox 초기 프레임 가속)
- Framer Motion을 `motion.div` 대신 LayoutGroup 없이 scoped import

현재 수치는 이런 최적화 없이도 budget 아래라 v1.0 릴리스에는 충분.
