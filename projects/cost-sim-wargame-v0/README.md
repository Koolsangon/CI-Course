# 개발원가 War Game (v0.3) — ⚠️ DEPRECATED

> **이 프로젝트는 Deprecated 상태입니다.**
>
> 후속 버전: [`CI-Course/projects/cost-sim-v1/`](../cost-sim-v1/) — 재설계된 Next.js 14 + Living Cost Tree
> 재설계 플랜: `.omc/plans/2026-04-11-cost-sim-v1-redesign.md`
>
> **이 폴더의 코드를 직접 실행하지 마세요.** FastAPI 서버, HTML 프론트엔드, WebSocket war game 로직은 v1.0에서 완전히 대체되었습니다.
>
> **`engine/cost_model.py`는 삭제 금지** — v1.0의 `scripts/gen-fixtures.py`가 이 파일을 골든 픽스처 oracle로 직접 임포트합니다. 엔진 수식 변경 시에만 여기서 수정 후 fixture 재생성.

---

## 원본 설명 (참고용)

디스플레이/반도체 제조업의 개발원가(COP) 시뮬레이션을 모바일 반응형 웹앱으로 구현한 교육용 War Game 플랫폼입니다.

기존 엑셀 워크시트 기반 시뮬레이션을 대체하여, 슬라이더 조작 → 실시간 원가 변동 시각화 → 팀 대항전 경쟁 구조를 통해 교육 몰입도를 높입니다.

---

## 빠른 시작

```bash
# 의존성 설치
pip install fastapi uvicorn

# 서버 실행
cd projects/cost-sim-wargame
python3 run.py

# 브라우저에서 접속
# http://localhost:8000
```

AI 코칭 기능을 활성화하려면 환경변수를 설정합니다:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
python3 run.py
```

---

## 화면 구성

앱은 3개 탭으로 구성됩니다.

### 1. 시뮬레이션 탭

6개 원가 변동 케이스를 선택하고, 슬라이더로 파라미터를 조작하면 실시간으로 원가 구조 변화를 확인할 수 있습니다.

| 케이스 | 변경 변수 | 조작 슬라이더 | 핵심 학습 포인트 |
|--------|-----------|---------------|-----------------|
| 1. Loading | 가동률 변화 | Loading 20~100% | 고정비 배분 → 가공비 상승 구조 |
| 2. 인건비 | 인건비 배수 | 0.5~3.0X | 노무비 + 판관비 연쇄 영향 |
| 3. 한계이익률 | 목표 한계이익률 | 40~80% | 변동비 역산, 재료비 절감 목표 도출 |
| 4. 재료비/수율 | 재료비%, 수율%p | 각각 -20~+20 | 절감 vs 손실 trade-off |
| 5. 면취수/Mask | 면취수, Mask 수 | 20~35개, 4~10매 | Panel 비용 두 인자 상반 효과 |
| 6. T/T+투자 | Tact 배수, 상각비 | 1.0~2.0X, 0~$5 | Module 가공비 + 상각비 동시 영향 |

화면 요소:
- **핵심 지표 비교**: Reference vs Simulation 영업이익 + 보조 지표
- **차트**: 케이스별 원가 구조 바 차트 (Before/After)
- **상세 결과 테이블**: Price부터 한계이익까지 전체 COP 항목

### 2. War Game 탭

팀 대항전 형식의 3라운드 경쟁 게임입니다.

**게임 흐름:**

1. **팀 구성** (2~6팀): 팀 이름 입력 → 게임 시작
2. **라운드 진행** (3라운드, 각 3분 제한):
   - AI가 시나리오 제시 (예: "Loading 50% 하락 예상")
   - 각 팀이 슬라이더로 원가 파라미터 조정
   - "의사결정 제출" 클릭 → AI 코칭 피드백
3. **라운드 종료**: 팀별 영업이익 순위 공개 + AI 전략 분석
4. **최종 결과**: 3라운드 누적 점수로 우승팀 결정

**라운드별 시나리오:**
- R1: Loading 하락 대응 (가공비 구조 이해)
- R2: 재료비 vs 수율 Trade-off 의사결정
- R3: 복합 위기 상황 (돌발 이벤트 포함)

**돌발 이벤트** (랜덤 발생):
환율 급등, 경쟁사 가격 공세, 공정 혁신, 에너지 비용 상승, 신규 고객 확보 등

### 3. 학습 탭

- **COP 원가 구조 도넛 차트**: 소요재료비, Panel/Module 가공비, SG&A, 영업이익 비중
- **핵심 공식**: COP, COM, 소요재료비, 가공비, 영업이익, EBITDA, 한계이익 산식
- **6가지 시뮬레이션 핵심 포인트**: 각 케이스의 원가 변동 메커니즘 요약

### AI 어시스턴트 (하단 패널)

화면 하단의 "AI 어시스턴트에게 질문하기"를 터치하면 채팅 패널이 열립니다.

- **API 키 미설정 시**: 주요 원가 용어(수율, 가공비, 재료비, COP, 면취수, Mask, Tact, 인건비, 한계이익)에 대한 템플릿 응답
- **API 키 설정 시**: Claude API를 활용한 실시간 원가 전문가 Q&A

---

## 원가 구조 (COP 모델)

```
Price ($200)
├── COM (제조원가) = 소요재료비 + 가공비
│   ├── 소요재료비 = Σ(공정별 BOM / 해당공정~최종 누적수율)
│   │   ├── BOM = TFT($6) + CF($5) + Cell($1.5) + Module($75)
│   │   └── 수율 = TFT(99%) × CF(100%) × Cell(95%) × Module(97.2%)
│   └── 가공비 = Panel(노무비+경비+상각비) + Module(노무비+경비+상각비)
├── SG&A (판관비) = 직접개발비 + 운반비 + 사업부비용 + Operation + Corporate OH
└── 산출 지표
    ├── COP = COM + SG&A
    ├── 영업이익 = Price - COP
    ├── Cash Cost = COP - 상각비
    ├── EBITDA = Price - Cash Cost
    ├── 변동비 = 소요재료비 + 운반비
    └── 한계이익 = Price - 변동비
```

---

## 프로젝트 구조

```
projects/cost-sim-wargame/
├── engine/
│   └── cost_model.py      # COP 원가 계산 엔진 (엑셀 로직 이식, 27/27 테스트 통과)
├── api/
│   └── main.py             # FastAPI 백엔드 (REST API + WebSocket + 게임 세션)
├── ai/
│   └── assistant.py        # AI 어시스턴트 (Claude API 플러그인 방식)
├── frontend/
│   ├── index.html           # 메인 HTML (SPA, 3탭 구성)
│   ├── css/style.css        # 모바일 반응형 CSS
│   └── js/app.js            # 프론트엔드 로직 (6케이스 동적 UI)
├── run.py                   # 서버 실행 스크립트
└── README.md                # 이 파일
```

---

## API 엔드포인트

### 시뮬레이션

| Method | Endpoint | 설명 | 주요 파라미터 |
|--------|----------|------|--------------|
| GET | `/api/reference/{case_num}` | 케이스별 Reference 데이터 | case_num: 1~6 |
| POST | `/api/simulate/loading` | Case 1: Loading 변화 | loading: 0.0~1.0 |
| POST | `/api/simulate/labor` | Case 2: 인건비 변화 | multiplier: 0.5~3.0 |
| POST | `/api/simulate/marginal-profit` | Case 3: 한계이익률 역산 | target_rate: 0.4~0.8 |
| POST | `/api/simulate/material-yield` | Case 4: 재료비/수율 변화 | material_change_pct, module_yield_change |
| POST | `/api/simulate/cuts-mask` | Case 5: 면취수/Mask | new_cuts, new_mask |
| POST | `/api/simulate/tact-investment` | Case 6: T/T+투자비 | tact_multiplier, investment_delta |

### War Game

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/game/create` | 게임 생성 (team_names, total_rounds) |
| GET | `/api/game/{id}` | 게임 상태 조회 |
| POST | `/api/game/{id}/start-round` | 라운드 시작 |
| POST | `/api/game/{id}/submit` | 팀 의사결정 제출 |
| POST | `/api/game/{id}/surprise` | 돌발 이벤트 트리거 |
| GET | `/api/game/{id}/leaderboard` | 리더보드 조회 |
| WS | `/ws/game/{id}` | 실시간 동기화 |

### AI 채팅

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/chat` | AI 질의응답 (message, context) |

---

## 기술 스택

| 영역 | 기술 | 사유 |
|------|------|------|
| Frontend | HTML/CSS/JS + Chart.js | 빠른 프로토타이핑, 별도 빌드 불필요 |
| Backend | Python + FastAPI | 원가 모델 계산 + AI 연동에 적합 |
| Real-time | WebSocket (FastAPI) | 팀 대항전 실시간 동기화 |
| AI | Claude API (Anthropic SDK) | 시나리오 생성, 코칭, 판정 |
| 차트 | Chart.js 4.x | 모바일 터치 친화적 인터랙티브 차트 |

---

## 교육 운영 가이드

### 사전 준비

1. 서버 실행 환경 준비 (Python 3.10+, pip)
2. `pip install fastapi uvicorn` 설치
3. (선택) `ANTHROPIC_API_KEY` 설정으로 AI 코칭 활성화
4. `python3 run.py`로 서버 실행
5. 교육생에게 서버 IP:8000 주소 공유 (같은 네트워크)

### 수업 진행 순서

1. **학습 탭** (10분): COP 원가 구조 설명, 핵심 공식 리뷰
2. **시뮬레이션 탭** (20분): 6개 케이스를 순서대로 시연하며 각 변수의 영향 체험
3. **War Game 탭** (30분): 팀 구성 → 3라운드 대항전 → 최종 결과 토론

### 주의사항

- 인메모리 세션 저장 → 서버 재시작 시 게임 데이터 소실
- 동시 접속자가 많을 경우 WebSocket 부하 확인 필요
- 모바일 브라우저 권장 (Chrome, Safari)
