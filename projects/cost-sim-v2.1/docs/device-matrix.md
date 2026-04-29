# 디바이스 매트릭스 (AC6)

> v1.0 파일럿 대상 디바이스. Phase 7에서 실제 기기로 검증.

| 구분 | 기기 | OS/브라우저 | 해상도 | 방향 | 상태 |
|---|---|---|---|---|---|
| 필수 | iPhone 12 이상 | iOS Safari 16.4+ | 390×844 | 세로/가로 | ⏳ 파일럿에서 확인 |
| 필수 | Galaxy A52 이상 | Android Chrome 120+ | 412×892 | 세로/가로 | ⏳ 파일럿에서 확인 |
| 권장 | iPad 10세대 | iPadOS Safari 16.4+ | 820×1180 | 가로 우선 | ⏳ 파일럿에서 확인 |
| 권장 | Galaxy Tab S8 | Android Chrome 120+ | 800×1280 | 가로 우선 | ⏳ 파일럿에서 확인 |
| 권장 | MacBook/Windows PC | Chrome/Safari 최신 | 1440×900+ | — | ✅ dev 환경에서 검증 |

## 체크포인트 (각 기기)
- [ ] 홈 화면에서 Sandbox/Cases 진입 성공
- [ ] ParamPanel 슬라이더 터치 인터랙션 60fps 유지 (R8 — Framer Motion + reactflow 30+ 노드)
- [ ] Cost Tree 펄스 애니메이션 끊김 없음
- [ ] 세로→가로 회전 시 레이아웃 깨짐 없음
- [ ] DevTools offline 토글 상태에서 Sandbox 계속 작동 (AC5 — SW 캐시)
- [ ] 4 phase 완주 후 Reflect 노트가 서버로 전송되지 않음 (R9 — Network 탭 확인)

## 최적화 가드레일
- 트랜스폼/오파시티 애니메이션만 사용 (GPU 가속)
- `will-change` 직접 지정 금지 — Framer Motion이 내부 최적화
- 슬라이더 onChange는 Zustand로만 흐름 → 엔진 호출 ≤1ms (AC4)
