# 작업 유형별 검증 체크리스트

> 작업 완료 후 **별도 검증 세션**에서 해당 유형의 체크리스트를 실행한다.
> 결과는 handoff.md 측정 섹션에 기록한다.

## 엔진(cost_model.py) 수정 시

- [ ] `cd projects/cost-sim-wargame && python3 engine/cost_model.py` → 27/27 PASSED
- [ ] 변경한 케이스의 Reference/Simulation 값이 엑셀 원본과 일치
- [ ] 다른 케이스에 영향 없음 (회귀 확인 - 전체 27개 테스트)
- [ ] 소요재료비 계산: 각 공정 BOM / 해당공정~최종 누적수율 공식 준수

## API 엔드포인트 추가/수정 시

- [ ] 서버 기동: `python3 run.py` → localhost:8000 응답
- [ ] 해당 엔드포인트 curl 테스트 → 정상 JSON 응답
- [ ] 잘못된 입력 시 적절한 에러 코드 반환 (400/422)
- [ ] 기존 엔드포인트 정상 동작 확인 (최소 `/api/reference`)
- [ ] WebSocket 관련 변경 시: 연결/해제 사이클 에러 없음

## 프론트엔드(app.js / HTML / CSS) 수정 시

- [ ] 데스크톱 브라우저: 6개 케이스 탭 전환 정상 동작
- [ ] 모바일 뷰포트(375px): 레이아웃 깨짐 없음
- [ ] 슬라이더 조작 → 차트/테이블 실시간 갱신 확인
- [ ] `python3 tests/capture.py` → screenshots/ 갱신 후 시각 확인
- [ ] Case 3 (한계이익률): 역산 전용 UI 정상 동작

## War Game 기능 수정 시

- [ ] 게임 생성(POST /api/game/create) → 세션 ID 반환
- [ ] 라운드 시작 → 팀 제출 → 리더보드 조회 흐름 정상
- [ ] WebSocket 연결/해제 시 에러 없음
- [ ] 돌발 이벤트(POST /api/game/{id}/surprise) 정상 동작
- [ ] 타이머 동작 확인

## AI 어시스턴트 수정 시

- [ ] API 키 없이 실행: 템플릿 모드 정상 응답
- [ ] API 키 설정 시: Claude API 호출 정상 (키 있는 환경에서)
- [ ] 코칭 톤이 brand-voice.md 가이드 준수 (격려 톤, 정답 비노출)
