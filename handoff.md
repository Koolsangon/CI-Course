# handoff.md - 인수인계 메모

## 최종 갱신: 2026-04-09 (2차)

### 현재 상태

- 개발원가 War Game 프로토타입 구현 완료
- 원가 계산 엔진: 엑셀 6개 문제 기준 데이터와 정확히 일치 (27/27 테스트 통과)
- FastAPI 백엔드: 6개 케이스 시뮬레이션 API + War Game 세션 관리 + AI 채팅
- 모바일 반응형 프론트엔드: 6개 케이스 전체 지원 (app.js v2 재작성 완료)
- AI 어시스턴트: 플러그인 방식 (API 키 없으면 템플릿, 있으면 Claude API)

### 서버 실행 방법

```bash
cd projects/cost-sim-wargame
python3 run.py
# http://localhost:8000 에서 접속
```

### 프로젝트 구조

```
projects/cost-sim-wargame/
├── engine/cost_model.py    # COP 원가 계산 엔진 (엑셀 로직 이식)
├── api/main.py             # FastAPI 백엔드 (REST + WebSocket)
├── ai/assistant.py         # AI 어시스턴트 (플러그인 방식)
├── frontend/
│   ├── index.html          # 메인 HTML (SPA)
│   ├── css/style.css       # 모바일 반응형 CSS
│   └── js/app.js           # 프론트엔드 로직
└── run.py                  # 서버 실행 스크립트
```

### 다음 작업자가 할 일

1. AI 연동 활성화: `ANTHROPIC_API_KEY` 환경변수 설정 시 Claude API 자동 활성화
2. 실제 교육 환경에서 모바일 UX 테스트
3. 다중 동시접속 테스트 (WebSocket 부하)
4. War Game 라운드별 케이스 연동 (현재 라운드는 Loading+재료비 고정)

### 막힌 부분 / 주의사항

- 엑셀 4번 문제 Simulation 열(col 15~16)에 빈 셀이 많음 → 학습자가 입력하는 형태로 추정
- AI 채팅의 템플릿 응답은 기본적인 원가 용어만 커버 → API 연동 시 품질 대폭 향상
- 인메모리 세션 저장 → 서버 재시작 시 게임 데이터 소실 (프로토타입 수준)
