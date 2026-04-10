# CLAUDE.md - 프로젝트 운영 계약서

## 핵심 명령

- 모든 작업은 `plan.md`에 기록된 작업 목록을 기준으로 수행한다.
- 세션 종료 전 반드시 `handoff.md`를 갱신하여 현재 상태와 막힌 부분을 남긴다.
- 주요 결정 사항은 `decision-log.md`에 즉시 기록한다.
- 최종 산출물은 반드시 `outputs/` 폴더에 저장한다.

## 절대 금지 규칙

- `.env`, 자격증명, 비밀키 파일을 읽거나 커밋하지 않는다.
- 사용자 승인 없이 `outputs/` 폴더의 파일을 삭제하거나 덮어쓰지 않는다.
- `context/` 폴더의 파일을 사용자 승인 없이 수정하지 않는다.
- `git push --force`를 실행하지 않는다.

## 폴더 구조 규칙

| 폴더 | 용도 | 권한 |
|---|---|---|
| `context/` | 장기 배경지식 (브랜드 톤, 용어집) | 읽기 전용 (수정 시 승인 필요) |
| `projects/` | 개별 과제 작업 공간 | 읽기/쓰기 |
| `templates/` | 결과물 양식 뼈대 | 읽기 전용 (수정 시 승인 필요) |
| `outputs/` | 최종 산출물 결재함 | 쓰기 (삭제/덮어쓰기 시 승인 필요) |

## 검증 명령어

| 검증 항목 | 명령어 | 기대 결과 |
|-----------|--------|-----------|
| 엔진 단위 테스트 | `cd projects/cost-sim-wargame && python3 engine/cost_model.py` | 27/27 PASSED |
| API 서버 기동 | `cd projects/cost-sim-wargame && python3 run.py` | localhost:8000 응답 |
| API 통합 테스트 | `curl -s http://localhost:8000/api/reference` | JSON 응답 |
| 스크린샷 테스트 | `cd projects/cost-sim-wargame && python3 tests/capture.py` | screenshots/ 갱신 |

## 검증 원칙

- 구현 세션에서 자체 검증하지 않는다. 구현 후 새 세션에서 검증한다.
- 검증 시 `templates/verification-checklists.md`의 해당 유형 체크리스트를 사용한다.
- 검증 결과는 `handoff.md` 측정 섹션에 기록한다.

## 작업 흐름

1. `plan.md`에서 다음 작업 확인
2. `context/` 배경지식 참조
3. `projects/` 내 해당 과제 폴더에서 작업 수행
4. `templates/` 양식에 맞춰 결과물 작성
5. `outputs/`에 최종본 저장
6. `handoff.md` 갱신
