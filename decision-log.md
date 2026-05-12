# decision-log.md - 결정 사항 기록장

## 2026-05-12

### cost-sim-v2.1 케이스 로스터 4종으로 확정

- **Scope**: `projects/cost-sim-v2.1/`
- **결정**: Case 01-loading, 04-material-yield, 05-cuts-mask, 06-tact-investment 4개를 정전(canon)으로 둔다. 원본 엑셀 번호 그대로 유지(리넘버 X).
- **이유**:
  - v2.1은 v1/v2-game의 6-케이스 + 4-phase Guided 모델에서 **Sandbox + Worksheet 2-동선 모델**로 피벗 — 워크시트 채점·3단계 힌트 시스템의 마감 깊이가 케이스 수 확장보다 우선.
  - 빠진 두 메커니즘(인건비 변동 → SGA 30% 비중 / 한계이익률 역산)은 *개념*으로는 Sandbox 슬라이더·인스펙터에 여전히 노출됨.
- **영향 범위**:
  - `context/glossary.md` "6개 케이스 요약" → "4개 케이스 요약"으로 정리됨
  - `projects/cost-sim-v2.1/README.md` 6-케이스/Guided 4-phase 표현 → 4-케이스/Sandbox+Worksheet로 정리됨
  - 향후 케이스 추가 요구 발생 시 본 결정을 supersede하는 새 결정 필요
  - 신규 케이스 추가 SOP: `content/cases/*.json` + `content/problems/p*.json` + `content/case-adapters/index.ts` + `lib/cases.ts`(CASES/CASE_ORDER) 4곳 동시 갱신
- **거부된 대안**:
  - Case 02·03 콘텐츠 복원 — 워크시트 마감 우선이라 보류
  - 케이스 번호를 1/2/3/4로 연속 리넘버 — 엑셀 원본 traceability 손실

## 2026-04-09

### 프로젝트 폴더 구조 확정

- **결정**: 4대 기본 폴더(`context/`, `projects/`, `templates/`, `outputs/`) + 통제 레이어(`.claude/`) 구조 채택
- **이유**: 클로드가 읽을 배경지식(Context), 지킬 규칙(Harness), 기록할 상태(State)를 명확히 분리하기 위함
- **영향 범위**: 모든 향후 작업은 이 구조를 따름
