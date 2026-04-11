# Lighthouse 측정 가이드 (Phase 6 / Phase 7)

> 목표: Performance / Accessibility / Best Practices ≥ 90 (플랜 §6 Phase 6.5)

## 로컬 측정 절차

```bash
cd CI-Course/projects/cost-sim-v1
npm run build
npm start                 # production mode, http://localhost:3000
# 새 터미널에서:
npx lighthouse http://localhost:3000/sandbox \
  --only-categories=performance,accessibility,best-practices \
  --output=html --output-path=./docs/lh-sandbox.html --quiet
```

## 검사 대상 경로
- `/` — 홈
- `/sandbox` — 핵심 인터랙션 경로
- `/cases/01-loading` — Guided 4-phase 시작

## 예상 경고 및 대응
| 경고 | 대응 |
|---|---|
| Unused JavaScript (reactflow 초기 로드) | `next/dynamic`으로 CostTreeView 지연 로드 |
| Cumulative Layout Shift | dagre 레이아웃이 고정 크기 노드를 쓰므로 기본값 0 예상 |
| Contrast issues | Tailwind slate 팔레트 사용 중 — dark 모드에서 노드 라벨 대비 재확인 |
| Missing aria-label | ParamPanel 슬라이더 label 이미 래핑됨 — 추가 점검 필요 |

## 파일럿 (Phase 7) 시 재측정
실제 파일럿 환경에서 Chrome DevTools → Lighthouse 탭 → Mobile 프로파일로 재측정.
디바이스 매트릭스(docs/device-matrix.md)의 각 기기에 대해 1회씩.
