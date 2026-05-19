# CONTEXT.md — 도메인 인덱스

> **본 레포의 도메인 짧은 요약 + 상세 자산으로 가는 인덱스**.
> 상세는 `context/glossary.md`, 결정은 `decision-log.md`, 톤은 `context/coach-tone.md` 참조.

## 프로젝트 1줄 요약

LG Display CI 과정 학습자를 위한 **개발 원가 산정 시뮬레이션 학습 도구**. 현재 활성 버전은 `projects/cost-sim-v2.1/` — Next.js 14 + AWS Amplify SSR 라이브 (`master.d26yr76roz76fk.amplifyapp.com`). 2026-05-27부터 6차수 30명씩 강의 운영 예정 (게임화 통합).

## 4 케이스 (canon, 2026-05-12 결정)

원가 변동의 4 메커니즘. 원본 엑셀 번호 그대로 유지 (리넘버 X).

| ID | 이름 | 핵심 메커니즘 |
|----|------|-----------|
| **01-loading** | Loading율 변동 | 고정비 성격의 가공비(노무비·경비·감상비)가 가동률 감소 시 단위당 분담액 증가. `새값 = 기준값 × (기준Loading ÷ 새Loading)` |
| **04-material-yield** | 재료비 절감 vs 수율 하락 | Module BOM 절감(분자↓)과 Module 수율 하락(분모↓)이 상쇄. `소요재료비 = Σ(BOM / 누적수율)` |
| **05-cuts-mask** | 면취수 · Mask 복합 | 면취수 증가는 TFT/CF/Cell BOM ↓ + Panel 가공비 ↓ (반비례), Mask 증가는 Panel 가공비 ↑ (정비례). 두 효과 곱셈 |
| **06-tact-investment** | Tact 지연 + 투자비 | Tact 배수는 Module 가공비 전체에 곱셈, 투자 상각비는 Module 감상비에 덧셈 |

cases 02·03 (인건비·한계이익률)은 v2.1 스코프 제외 — 개념만 Sandbox/인스펙터에 노출. 자세한 결정 배경은 `decision-log.md` 2026-05-12.

## 7 변동 변수 (cost-sim-v2.1 게임화 후 Multi-factor Sandbox)

| # | 변수 | 범위 / 기본값 | 영향 |
|---|------|------------|------|
| 1 | Loading율 | 30~100% / 70% | Panel·Module 가공비 6항목 (반비례 분담) |
| 2 | Module 재료비 변동률 | -20%~+20% / 0% | Module 소요재료비 (분자) |
| 3 | Module 수율 변동률 | -10%p~+5%p / 0%p | 누적수율 → 모든 소요재료비 + 가공비 (분모) |
| 4 | 새 면취수 | 10~40개 / 25개 (기준 25 reference 고정) | TFT/CF/Cell BOM + Panel 가공비 (반비례) |
| 5 | 새 Mask | 3~10장 / 6장 (기준 6 reference 고정) | Panel 가공비 (정비례) |
| 6 | Tact 배수 | 0.80~1.50x / 1.00x | Module 가공비 6항목 (곱셈) |
| 7 | 투자 상각비 증가분 | $0~5 / $0 | Module 감상비 (덧셈) |

## 핵심 용어

- **BOM** (Bill of Materials): 부품 단가. TFT/CF/Cell/Module 4단계.
- **수율** (Yield): 공정별 양품률. 누적수율 = TFT × CF × Cell × Module.
- **가공비**: 노무비 + 경비 + 감상비. Panel/Module 각 3항목 = 6 항목.
- **소요재료비**: `Σ(BOM / 누적수율)`. 수율이 분모이므로 수율↓ 시 소요재료비↑.
- **COM** (Cost of Manufacturing): 소요재료비 + 가공비.
- **COP** (Cost of Production): COM + SGA.
- **SGA**: 판관비. direct_dev / transport / business_unit / operation / corporate_oh 5항목.
- **영업이익**: Price − COP.
- **Loading율**: 설비 가동률. 가공비 분담의 분모로 작용.
- **Tact Time**: 단위 생산 시간. Module 가공비에 배수로 작용.
- **면취수**: 원판 1장에서 잘라내는 패널 수. 늘면 단위당 BOM·가공비 분담 ↓.
- **Mask**: 공정의 마스크 수. 늘면 공정 부담 ↑.

상세 용어집 — `context/glossary.md`.

## 학습 자산 두 동선 (v2.1)

| 동선 | 라우트 | 용도 |
|------|--------|------|
| **Sandbox** | `/sandbox` | 7변수 통합 Multi-factor 자유 탐험 (게임화 후) |
| **Worksheet** | `/cases/[id]` | 4 케이스 워크시트. 룸 컨텍스트 유무로 게임/연습 모드 분기 |

이전 모델 (v1/v2-game의 6 케이스 + 4-phase Guided)에서 v2.1은 **Sandbox + Worksheet 2-동선 모델**로 피벗.

## 게임화 룰 (1차수 2026-05-27 적용)

- **타임어택**: 4 라운드, 라운드당 10분 캡 (강사 설정에서 조정)
- **개인**: 라운드별 풀이 시간 합산. 1·2·3등 발표
- **팀**: 라운드별 *팀에서 가장 늦은 조원* 시간을 4 라운드 합산. 1·2·3등 발표
- **종료**: 100% 정답 자동 종료. 채점-부분초기화-재계산-채점 반복 허용. 정답 숫자 미노출 (O/X만)
- **힌트**: 문제 단위 3단계 (100/70/40/20% 차감, 강사 토글)
- **백엔드**: AWS Amplify SSR + DynamoDB + 폴링 2초

상세 — `outputs/cost-sim-v2.1-game-prd.md`, `decision-log.md` 2026-05-13.

## 톤·스타일

학습자 안내·강사 코멘트 톤은 `context/coach-tone.md` + `projects/cost-sim-v2.1/content/coach-tone.md` 참고.

핵심 원칙:
- *답을 직접 주지 않음*. 한 단계 앞의 사고 단서를 제공
- *원시 수식보다 자연어 비교* ("기본 70% 대비 새 50%")
- *경어 + 비격식 친근* ("~해 보세요", "~인가요")

## 결정 기록 (ADR 등가물)

`docs/adr/` 디렉토리 **없음** (의도). `decision-log.md` (root)가 ADR 등가물 — 시간순 prepend, 각 entry는 *Scope / 결정 / 이유 / 영향 / 거부된 대안* 4-필드.

skill 규칙 — `docs/agents/domain.md`.

## 빠른 시작

- 새 작업자: `plan.md` 현재 작업 섹션 → `handoff.md` 최신 entry → `decision-log.md` 최신 entry → 본 CONTEXT.md → `context/glossary.md`
- skill 호출 시: skill이 자동으로 본 CONTEXT.md 읽음. 추가 컨텍스트 필요 시 사용자에게 묻거나 `context/glossary.md` cross-link 따라가기
