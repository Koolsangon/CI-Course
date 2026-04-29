# 강사용 1페이지 운영 매뉴얼 (v1.0)

> 대상: 강의장에서 Cost Sim v1을 운영하는 강사. 세션 시작 전 5분 이내로 숙지.

## 1. 세션 시작 (3분)
1. 강의실 Wi-Fi 확인 (없어도 진행 가능 — Sandbox/Guided는 오프라인 작동)
2. 수강자 전원 크롬/사파리에서 `https://<배포-URL>/` 접속 — 홈 화면 확인
3. 홈에서 Sandbox 탭 눌러 원가 트리 렌더 → 60fps 트리 표시 확인

## 2. 모드 토글
- **Sandbox**: 좌측 슬라이더 · 중앙 트리 · 우측 수식 인스펙터. 자유 탐색.
- **Guided Cases**: `/cases/01-loading` 부터 Hook → Discover → Apply → Reflect 4단계.
  - Apply 단계는 정답 근사값 입력 시 다음 단계 잠금 해제. 힌트 버튼 1회 사용 가능.
  - Reflect 메모는 **브라우저 로컬에만 저장됨**. 서버로 전송되지 않음(PIPA 안전망).

## 3. AI 코치 토글
- 기본값: OFF. `NEXT_PUBLIC_AI_COACH_ENABLED=true` + `ANTHROPIC_API_KEY` 설정 시 활성.
- OFF 상태에서도 케이스별 정적 코치 카피가 Coach Drawer에 표시됨.
- AI 장애 시 자동으로 정적 코치로 graceful degrade (AC7).

## 4. 네트워크 단절 대응
- 서비스 워커가 sandbox / cases 경로 + 컨텐츠 JSON을 캐시함.
- DevTools → Network → Offline 토글로 사전 점검. 첫 방문 후 2회차부터 오프라인 작동.
- 단절 시 AI 코치 버튼은 회색 처리 + 정적 코치로 폴백.

## 5. 긴급 리셋
| 증상 | 조치 |
|---|---|
| 트리 값이 갱신되지 않음 | 브라우저 새로고침 (Ctrl/Cmd+Shift+R) |
| Reflect 메모가 유실됨 | localStorage 기반이 아닌 인메모리 — 의도된 동작. 재시작 시 비움. |
| AI 코치 응답이 늦음 | 느리면 정적 카피가 즉시 보임. 대기 UX 불필요. |
| 애니메이션 끊김 | 해당 기기만 `prefers-reduced-motion` 설정 권고 |

## 6. 파일럿 측정 (Phase 7)
- 세션 시작 전: `/pilot/pre` 에서 사전 진단 10문항 (content/instrument/pre-post.json)
- 세션 종료 후: `/pilot/post` 에서 동일 10문항
- 목표: 평균 점수 상승 +30% (paired delta, AC2)

## 7. 문의/장애
- Sentry 또는 `docs/bundle-report.md` 참조
- 플랜 문서: `.omc/plans/2026-04-11-cost-sim-v1-redesign.md`
