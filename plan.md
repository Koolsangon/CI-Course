# 개발원가 시뮬레이션 War Game - 작업 보고서

작성일: 2026-04-09
PR: https://github.com/Koolsangon/CI-Course/pull/1

---

## 1. 프로젝트 개요

### 목표

기존 엑셀 기반 개발원가 시뮬레이션 워크시트(6개 문제)를 모바일 반응형 웹앱 + 생성형 AI 기반 팀 대항전 War Game으로 전환한다.

### 배경

- **현재**: 엑셀 노란 셀에 답 입력 → 채점 버튼 → O/X 확인
- **한계**: 교육 몰입도 부족, 실전 의사결정 훈련 불가, 팀 경쟁 구조 없음
- **목표**: 실시간 파라미터 조작 → 즉각 시각화 → AI 코칭 → 팀 대항전

---

## 2. 기존 자료 분석

### 분석한 원본 자료

| 파일 | 내용 |
|------|------|
| 교재(학습)_효과분석Simulation_실습_워크시트_v0.1.xls | 6개 시뮬레이션 문제 + 정답 시트 |
| 교재(강의)_M1.2개발원가및요인별Sim._v0.1.pptx | COP 원가 구조 강의 교재 |
| 작업용_교수설계서_v0.5.xlsx | 교수 설계 문서 |

### 원가 구조 (COP 모델)

```
Price ($200)
├── COM (제조원가) = 소요재료비 + 가공비
│   ├── 소요재료비 = Σ(공정별 BOM / 해당공정~최종 누적수율)
│   │   └── BOM = TFT($6) + CF($5) + Cell($1.5) + Module($75) = $87.5
│   │   └── 누적수율 = TFT(99%) × CF(100%) × Cell(95%) × Module(97.2%) = 91.4%
│   └── 가공비 = Panel(노무비+경비+상각비) + Module(노무비+경비+상각비)
│       ├── Panel = $21.3 + $11.5 + $16.2 = $49.0
│       └── Module = $8.7 + $5.3 + $7.5 = $21.5
├── SG&A (판관비) = $28.4
│   └── 직접개발비($4.7) + 운반비($0.3) + 사업부($16.0) + Operation($1.2) + Corporate OH($6.2)
└── 산출 지표
    ├── COP = $189.7  →  영업이익 = $10.3 (이익률 5.2%)
    ├── Cash Cost = $166.0  →  EBITDA = $34.0
    └── 변동비 = $91.1  →  한계이익 = $108.9
```

### 핵심 발견: 소요재료비 계산 방식

엑셀 분석 중 소요재료비가 단순 BOM/누적수율이 아닌 것을 발견:

```
소요재료비 = TFT_BOM/(TFT×CF×Cell×Module수율)
           + CF_BOM/(CF×Cell×Module수율)
           + Cell_BOM/(Cell×Module수율)
           + Module_BOM/Module수율
           = 6.0/0.914 + 5.0/0.923 + 1.5/0.923 + 75.0/0.972
           = $90.76  ← 엑셀 값과 정확히 일치
```

각 공정의 BOM을 **해당 공정부터 최종까지의 누적수율**로 나누는 방식

---

## 3. 6개 시뮬레이션 케이스 분석 & 구현

### Case 1: Loading 변화 (가동률 70% → 50%)

| 항목 | Reference | Simulation | 변화 |
|------|-----------|------------|------|
| 가공비 | $70.5 | $98.7 | +$28.2 (×1.4) |
| Panel 노무비 | $21.3 | $29.8 | ×1.4 |
| 영업이익 | $10.3 | -$17.9 | 적자 전환 |

핵심 로직: 가공비 = 고정비/생산량 → Loading 하락 시 기준Loading/새Loading 비율로 증가

### Case 2: 인건비 1.5배

| 항목 | Reference | Simulation | 변화 |
|------|-----------|------------|------|
| Panel 노무비 | $10.0 | $15.0 | ×1.5 |
| Module 노무비 | $2.1 | $3.15 | ×1.5 |
| SGA | $28.4 | $32.66 | 인건비 비중 30% 연동 |
| 영업이익 | $36.6 | $26.3 | -$10.3 |

핵심 로직: 노무비 직접 ×1.5 + SGA 중 인건비 비중(30%)도 연동 변화

### Case 3: 한계이익률 53% → 60%

핵심 로직: 목표율에서 역산

- 한계이익 = Price × 목표율 = $200 × 60% = $120
- 변동비 = Price - 한계이익 = $80
- 필요 재료비 절감 수준 도출

### Case 4: 재료비 5%↓ + 모듈수율 4%p↓

| 항목 | Reference | Step① 재료비5%↓ | Step② +수율4%p↓ |
|------|-----------|-----------------|-----------------|
| Module BOM | $75.0 | $71.25 | $71.25 |
| Module 수율 | 97.2% | 97.2% | 93.2% |
| 소요재료비 | $90.8 | $86.9 | $90.6 |

핵심 로직: 재료비 절감 효과($3.9)가 수율 하락에 의한 소요재료비 증가로 거의 상쇄

### Case 5: 면취수 25→29, Mask 6→7

| 항목 | Reference | ① 면취수29 | ② +Mask7 |
|------|-----------|-----------|----------|
| TFT BOM | $6.0 | $5.17 | $5.17 |
| Panel 노무비 | $21.3 | $18.36 | $21.42 |

핵심 로직:
- 면취수 증가 → BOM(TFT/CF/Cell)과 Panel 가공비 모두 old/new 비율로 감소
- Mask 증가 → Panel 가공비 new_mask/old_mask 비율로 증가

### Case 6: Tact 1.2X + 투자 13억

| 항목 | Reference | ① Tact 1.2X | ② +투자13억 |
|------|-----------|-------------|------------|
| Module 노무비 | $8.7 | $10.4 | $10.4 |
| Module 상각비 | $7.5 | $9.0 | $10.9 |

핵심 로직: Tact 지연 → Module 가공비 전체 ×1.2, 투자 → Module 상각비에 +$1.9

---

## 4. 구현 결과

### 프로젝트 구조

```
projects/cost-sim-wargame/
├── engine/
│   └── cost_model.py        # COP 원가 계산 엔진 (584줄)
│                              - 6개 Reference 프리셋
│                              - 6개 시뮬레이션 함수
│                              - 27개 자체 검증 테스트
├── api/
│   └── main.py              # FastAPI 백엔드 (472줄)
│                              - 시뮬레이션 API 7개
│                              - War Game 세션 API 5개
│                              - WebSocket 실시간 동기화
│                              - AI 채팅 API
├── ai/
│   └── assistant.py         # AI 어시스턴트 (264줄)
│                              - 플러그인 방식 (API키 유무 자동 전환)
│                              - 라운드 시나리오 3종
│                              - 돌발 이벤트 5종
│                              - 코칭 템플릿 + 팀 비교 분석
├── frontend/
│   ├── index.html           # SPA 메인 페이지 (250줄)
│   ├── css/style.css        # 모바일 반응형 CSS (626줄)
│   └── js/app.js            # 프론트엔드 로직 (896줄) ← v2 재작성 완료
├── run.py                   # 서버 실행 스크립트
└── README.md                # 앱 설명서
```

### API 엔드포인트 목록

| Method | Path | 설명 |
|--------|------|------|
| GET | `/` | 프론트엔드 SPA |
| GET | `/api/reference` | 기본 Reference 데이터 |
| GET | `/api/reference/{case_num}` | 케이스별 Reference |
| POST | `/api/simulate` | 자유 파라미터 시뮬레이션 |
| POST | `/api/simulate/loading` | Case 1: Loading 변화 |
| POST | `/api/simulate/labor` | Case 2: 인건비 변화 |
| POST | `/api/simulate/marginal-profit` | Case 3: 한계이익률 역산 |
| POST | `/api/simulate/material-yield` | Case 4: 재료비/수율 변화 |
| POST | `/api/simulate/cuts-mask` | Case 5: 면취수/Mask 변화 |
| POST | `/api/simulate/tact-investment` | Case 6: T/T+투자비 변화 |
| POST | `/api/game/create` | 게임 세션 생성 |
| POST | `/api/game/{id}/start-round` | 라운드 시작 |
| POST | `/api/game/{id}/submit` | 팀 의사결정 제출 |
| GET | `/api/game/{id}/leaderboard` | 리더보드 조회 |
| POST | `/api/game/{id}/surprise` | 돌발 이벤트 발생 |
| WS | `/ws/game/{id}` | 실시간 동기화 |
| POST | `/api/chat` | AI 채팅 |

### War Game 흐름

```
┌─────────────────────────────────────────────────────┐
│  라운드 1: Loading 하락 위기                          │
│  "고객사 주문량 급감 → Loading 70%→50% 하락"          │
│  → 가공비 구조 이해 + 흑자 유지 방안 도출              │
├─────────────────────────────────────────────────────┤
│  라운드 2: 재료비 vs 수율 Trade-off                   │
│  "대체 부품으로 재료비 5% 절감, 단 수율 4%p 하락 위험"  │
│  → 복합 변수 최적화 의사결정                          │
├─────────────────────────────────────────────────────┤
│  라운드 3: 복합 위기 (돌발 이벤트 포함)                │
│  "판가 5% 인하 + 원자재 10% 상승 + Cell 수율 개선 기회" │
│  → 종합 비상 대응 전략 수립                           │
└─────────────────────────────────────────────────────┘
```

### AI 어시스턴트 (플러그인 방식)

| 모드 | 조건 | 기능 |
|------|------|------|
| 템플릿 모드 | API 키 없음 (기본) | 사전 작성된 시나리오/코칭/채팅 응답 사용. 비용 $0 |
| AI 모드 | ANTHROPIC_API_KEY 설정 | Claude API로 동적 시나리오 생성, 맥락 코칭, 전략 분석 |

돌발 이벤트 5종: 환율 급등, 경쟁사 가격 공세, 공정 혁신 성공, 에너지 비용 상승, 신규 고객 확보

---

## 5. 검증 결과

### 엔진 검증 (27/27 PASS)

```
=== Case 1: Loading 70%→50% ===
  PASS Panel 노무비: 29.82 (expected 29.8)
  PASS Panel 경비: 16.10 (expected 16.1)
  PASS Panel 상각비: 22.68 (expected 22.7)
  PASS Module 노무비: 12.18 (expected 12.2)
  PASS Module 경비: 7.42 (expected 7.4)
  PASS Module 상각비: 10.50 (expected 10.5)

=== Case 2: 인건비 1.5배 ===
  PASS Panel 노무비: 15.00 (expected 15.0)
  PASS Module 노무비: 3.15 (expected 3.15)
  PASS SGA: 32.61 (expected 32.66)
  PASS COP: 173.69 (expected 173.71)
  PASS 영업이익: 26.31 (expected 26.29)

=== Case 4: 재료비5%↓ + 수율4%p↓ ===
  PASS Module BOM: 71.25 (expected 71.25)
  PASS Module수율: 0.93 (expected 0.932)
  PASS 소요재료비: 90.63 (expected 90.6)

=== Case 5a: 면취수 25→29 ===
  PASS TFT BOM: 5.17 (expected 5.172)
  PASS CF BOM: 4.31 (expected 4.31)
  PASS Cell BOM: 1.29 (expected 1.293)
  PASS Panel 노무비: 18.36 (expected 18.36)
  PASS Panel 경비: 9.91 (expected 9.91)
  PASS Panel 상각비: 13.97 (expected 13.97)

=== Case 5b: 면취수29 + Mask 6→7 ===
  PASS Panel 노무비: 21.42 (expected 21.42)
  PASS Panel 경비: 11.57 (expected 11.57)
  PASS Panel 상각비: 16.29 (expected 16.29)

=== Case 6a: Tact 1.2X ===
  PASS Module 노무비: 10.44 (expected 10.44)
  PASS Module 경비: 6.36 (expected 6.36)
  PASS Module 상각비: 9.00 (expected 9.0)

=== Case 6b: Tact 1.2X + 투자 13억 ===
  PASS Module 상각비: 10.90 (expected 10.9)

Result: 27 PASSED, 0 FAILED / 27 total
```

### API 통합 검증 (6/6 케이스 정상)

| Case | Reference 영업이익 | Simulation 영업이익 | 상태 |
|------|-------------------|-------------------|------|
| 1. Loading 50% | $10.3 | -$17.9 (적자) | PASS |
| 2. 인건비 1.5X | $36.6 | $26.3 | PASS |
| 3. 한계이익률 | 현재 53% | 목표 60% | PASS |
| 4. 재료비/수율 | $10.3 | $10.5 | PASS |
| 5. 면취수/Mask | $10.3 | $11.9 | PASS |
| 6. T/T+투자 | $10.3 | $4.1 | PASS |

---

## 6. 기술 스택

| 영역 | 기술 | 사유 |
|------|------|------|
| Frontend | HTML/CSS/JS + Chart.js | 빠른 프로토타이핑, 빌드 불필요 |
| Backend | Python 3.11 + FastAPI | 원가 모델 계산 + AI SDK 연동 |
| Real-time | WebSocket (FastAPI 내장) | 팀 대항전 실시간 동기화 |
| AI | Anthropic SDK (플러그인) | 시나리오/코칭/판정, 없어도 동작 |
| 차트 | Chart.js 4.4 | 모바일 터치 친화적 인터랙티브 차트 |

---

## 7. 실행 방법

```bash
# 의존성 설치
pip install fastapi uvicorn

# 서버 실행
cd projects/cost-sim-wargame
python3 run.py

# http://localhost:8000 접속
```

AI 모드 활성화 (선택):

```bash
export ANTHROPIC_API_KEY=sk-ant-xxxxx
python3 run.py
```

---

## 8. 현재 상태 & 남은 작업

### 완료 (v0.3)

- [x] 원가 계산 엔진: 6개 케이스 전체 구현 + 27개 테스트 통과
- [x] FastAPI 백엔드: 시뮬레이션 API 7개 + 게임 API 5개 + 채팅
- [x] AI 어시스턴트: 플러그인 방식 (템플릿 + Claude API)
- [x] 모바일 반응형 CSS: 전체 UI 컴포넌트
- [x] War Game: 3라운드 팀 대항전 구조 + 리더보드 + 타이머
- [x] 프론트엔드 HTML: 6개 케이스 UI 구조
- [x] **app.js 6케이스 전체 연동**: v2 재작성 완료 (764줄 → 896줄)
  - 케이스별 동적 파라미터 패널 (CASE_CONFIG 기반)
  - 6개 케이스 슬라이더/차트/테이블 분기 처리
  - Case 3 한계이익률 역산 전용 UI
  - 케이스별 최적화된 차트 레이아웃
- [x] README.md 앱 설명서 작성

### 남은 작업

- [ ] War Game 라운드별 케이스 연동 (현재 라운드는 Loading+재료비 고정)
- [ ] 모바일 실기기 UX 테스트
- [ ] 다중 동시접속 WebSocket 부하 테스트
- [ ] (선택) DB 저장소 연동 (현재 인메모리)

### 주의사항

- 엑셀 일부 Simulation 열은 학습자가 채우는 노란 셀이라 빈 값 → 정답 시트 기준으로 검증
- SGA 인건비 비중 30%는 엑셀 역산으로 도출 (28.4 → 32.66 matching)
- 인메모리 세션 → 서버 재시작 시 게임 데이터 소실 (프로토타입 수준)

---

## 9. 커밋 히스토리

| 커밋 | 내용 |
|------|------|
| 77dd03e | 초기 프로젝트 구조 세팅 |
| 5c61349 | 불필요한 교육체계 프로파일 pptx 파일 삭제 |
| 6eeedfe | feat: 개발원가 시뮬레이션 War Game 프로토타입 구현 |
| 65a96b2 | chore: .gitignore 추가 및 pycache 제거 |
| 1a8955f | feat: 6개 시뮬레이션 케이스 전체 지원 확장 |
| 05204ac | Merge pull request #1 (feat/cost-sim-wargame) |

PR: https://github.com/Koolsangon/CI-Course/pull/1

---

## 10. 엑셀 vs War Game 비교

| 기능 | 엑셀 워크시트 | War Game 웹앱 |
|------|-------------|--------------|
| 입력 방식 | 노란 셀에 수동 입력 | 슬라이더 드래그 (실시간) |
| 피드백 | O/X 채점 | AI 코칭 (맥락 설명) |
| 시각화 | 없음 | Before/After 차트 |
| 경쟁 요소 | 없음 | 팀 대항전 리더보드 |
| 시나리오 | 고정 6문제 | AI 동적 생성 + 돌발 이벤트 |
| 접근성 | PC + Excel | 모바일 브라우저 |
| 난이도 | 고정 | AI 동적 조절 가능 |
| 자연어 질의 | 불가 | "수율 1%p 올리면?" 즉답 |
