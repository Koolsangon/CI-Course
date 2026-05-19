# cost-sim-v2.1 게임화 PRD

> **버전**: 1.0 (2026-05-13)
> **GitHub Issue**: [#2](https://github.com/Koolsangon/CI-Course/issues/2) (`ready-for-agent`)
> **타겟 1차수**: 2026-05-27 (D+14, 고정)
> **운영 규모**: 30명 × 6차수, LG Display 사내 강의실
> **상위 문서**: `plan.md`, `decision-log.md` 2026-05-13 (16개 결정)

---

## Problem Statement

LG Display CI 과정 학습자는 *개발 원가 산정*을 머리로만 이해하면 실무 활용이 어렵다. 현재 cost-sim-v2.1은 4 케이스 워크시트 + Sandbox 구조로 *학습 도구로는 동작*하나 다음 문제로 학습 동기를 끌어올리지 못한다:

- **Sandbox 한 케이스 단위 조작 한계**: 한 번에 케이스 하나만 선택해 1~2 변수만 조작 → 변수 간 *복합 효과*(예: 재료비 절감 + 수율 하락 + Tact 지연 동시 발생) 학습 불가
- **워크시트 풀이 시 인지 부담 누적**:
  - 계산기가 표를 밀어내는 jumping 현상
  - 키보드 입력 제한 (숫자만, 연산자는 버튼)
  - 셀별 60개 힌트가 학습자에게 *어디서 어느 힌트를 봐야 하는지* 결정 부담을 줌
  - 단위 표기 불일치 ($/% 혼동)
- **LLM 자유 질문의 비용 대비 효과**: 과금 발생하면서도 *문제 단위로 정형화된 힌트가 더 학습에 효과적*
- **학습 동기 메커니즘 부재**: 학습 결과를 *경쟁·협력·발표*로 연결할 시스템 없음

강사 측에서도 6차수 30명 운영 중 학습자 참여도 추적·발표를 *수기*로 처리 → 강의 흐름이 끊기고 학습자 몰입도 낮음.

## Solution

cost-sim-v2.1을 **타임어택 기반 실시간 멀티플레이어 학습 게임**으로 확장한다.

1. **7-변수 Multi-factor Sandbox**: 케이스 드롭다운 제거, 좌측 패널에 7개 변동 변수(Loading·재료비·수율·면취수·Mask·Tact·투자상각비) accordion. 학습자가 여러 변수 동시 조작 → *우측 인스펙터에 변동 변수만 자연어 형식*("기본 70% → 새 50%")으로 표시 → 복합 효과 직관 학습.

2. **워크시트 UX 재설계**:
   - 계산기 화면 하단 sticky bottom 항상 표시 (표 jumping 제거)
   - 키보드 자유 텍스트 입력 + `%` 자동 변환 + 사칙연산 + 괄호
   - 단위 통일 ($/%) + 총수율 행 추가 (엑셀 원본 정합)
   - 셀별 60 힌트 → 문제 단위 3단계 12 힌트 (100/70/40/20% 차감, 강사 토글)
   - 채점 결과 정답 미노출 (O/X 마크만) + 다시풀기 시 *틀린 셀만 초기화*

3. **실시간 멀티플레이어 게이미피케이션**:
   - 룸 코드 기반 입장 (강사 뷰에서 발급) + 이름·팀 자율 입력
   - 강사 신호로 룸 전체 동시 출발 → 4 라운드 × 문제별 10분 캡 타임어택
   - 100% 정답 도달 자동 종료 → 시간 기록
   - 매 라운드 즉시 발표 (강사 코멘트 + 전체 리더보드 학습자 화면에도)
   - 팀 시간 = 라운드별 *가장 늦은 조원* 시간의 4 라운드 합산 (무임승차 방지)
   - 4 라운드 끝 → 종합 발표 (개인 1·2·3 + 팀 1·2·3)

4. **AWS Amplify SSR + DynamoDB + 클라이언트 폴링 2초** 백엔드 (Firebase/Supabase는 사내망 차단 가능성, AWS는 사내망 검증 완료).

5. **강사 뷰** (`/instructor`): 룸 생성, 학습자 입장 대시보드, 설정 패널(시간 캡·팀 수·힌트 차감 토글), 라운드 신호, 실시간 진행 모니터, 발표 컨트롤.

학습자는 강의 전·후 *Sandbox에서 자유 탐험* + 강의 중 *게임 모드로 워크시트 4문제 라운드 진행*. 동일 워크시트 화면이 *룸 컨텍스트 유무*에 따라 게임 모드 / 연습 모드로 분기 — 신규 라우트 안 만듦.

## User Stories

### 학습자 — 입장·인트로

1. 학습자로서, 강사가 알려준 URL과 룸 코드를 입력해 게임에 입장하고 싶다, 별도 회원가입 없이 빠르게 참여할 수 있도록.
2. 학습자로서, 내 이름과 팀 번호를 직접 입력하고 싶다, 강사가 사전 등록할 부담 없이 자율적으로 참여할 수 있도록.
3. 학습자로서, 입력한 이름·팀 번호를 게임 시작 전까지 수정할 수 있고 싶다, 실수로 잘못 입력한 경우 정정할 수 있도록.
4. 학습자로서, 룸 입장 후 캐릭터 인트로 6 다이얼로그를 보면서 대기 상태로 들어가고 싶다, 게임 분위기에 자연스럽게 몰입할 수 있도록.
5. 학습자로서, 강사가 시작 신호를 누를 때까지 대기 화면에서 다른 학습자와 함께 기다리고 싶다, 동시 출발의 긴장감을 느낄 수 있도록.

### 학습자 — 게임 모드 (워크시트)

6. 학습자로서, 강사 신호 동시에 라운드 1 워크시트로 자동 이동하고 싶다, 출발 신호의 일사불란을 경험할 수 있도록.
7. 학습자로서, 화면 상단의 타이머가 카운트되는 것을 보면서 풀이를 진행하고 싶다, 시간 압박을 인지하면서 풀 수 있도록.
8. 학습자로서, 워크시트 yellow 셀에 키보드로 숫자를 직접 입력하고 싶다, 마우스 클릭 없이 빠르게 답을 적을 수 있도록.
9. 학습자로서, "70%" 또는 "21.3*70%/50%" 같은 수식을 셀이나 계산기에 직접 입력하면 결과로 자동 계산되고 싶다, 머릿속 계산 단계를 줄여 시간을 절약할 수 있도록.
10. 학습자로서, 화면 하단에 계산기가 항상 고정돼 있고 표가 위아래로 안 움직이고 싶다, 셀 선택할 때마다 시각 이동이 없는 편안한 환경에서 풀 수 있도록.
11. 학습자로서, 표 셀을 클릭하면 그 값이 계산기 토큰으로 들어오고 동시에 자유 텍스트로 키보드 타이핑도 가능하고 싶다, 두 입력 방식 중 익숙한 쪽으로 선택할 수 있도록.
12. 학습자로서, 채점 결과로 정답 숫자는 안 보이고 O/X 마크만 보고 싶다, 답을 베끼지 않고 스스로 다시 풀 동기를 받을 수 있도록.
13. 학습자로서, 다시 풀기를 누르면 맞은 셀은 그대로 두고 틀린 셀만 비워지고 싶다, 처음부터 다시 입력하지 않고 틀린 부분만 집중할 수 있도록.
14. 학습자로서, 문제 헤더의 "힌트" 버튼을 누르면 3 단계 힌트를 단계적으로 볼 수 있고 싶다, 막힐 때 단계별로 단서를 받되 점수 손해를 의식할 수 있도록.
15. 학습자로서, 힌트 단계가 올라갈수록 그 문제의 점수가 100/70/40/20%로 줄어드는 것을 사전에 알고 결정하고 싶다, 힌트 사용을 의식적으로 선택할 수 있도록.
16. 학습자로서, 모든 yellow 셀이 정답인 순간 자동으로 라운드가 종료되고 시간이 기록되고 싶다, "제출" 버튼을 별도로 안 눌러도 게임이 자동 진행되도록.
17. 학습자로서, 10분 캡에 도달하면 자동으로 라운드가 종료되고 미완료 상태로 기록되고 싶다, 시간 압박이 절대적으로 작동하도록.
18. 학습자로서, 풀이 중 사이드/하단에 미니 리더보드(자기 등수 + 위·아래 2명)를 보고 싶다, 현재 내 위치를 실시간으로 인지할 수 있도록.
19. 학습자로서, 단위가 명확히 $와 %로 표기되고 싶다, 금액과 비율을 헷갈리지 않고 풀 수 있도록.
20. 학습자로서, 표의 총수율 행이 엑셀 원본과 같은 위치에 있고 싶다, 실무 자료와 동일한 시각 구조로 학습할 수 있도록.

### 학습자 — 라운드 사이

21. 학습자로서, 라운드를 끝낸 후 다른 학습자가 끝낼 때까지 대기 화면을 보고 싶다, 누가 얼마나 진행 중인지 인지할 수 있도록.
22. 학습자로서, 매 라운드 종료 직후 강사 코멘트와 라운드 순위 + 팀 결과를 보고 싶다, 방금 푼 문제의 핵심 메커니즘이 따끈할 때 정리할 수 있도록.
23. 학습자로서, 매 라운드 결과에서 전체 학습자 리더보드를 내 화면에서 볼 수 있고 싶다, 누가 1등인지 동기 자극을 받을 수 있도록.
24. 학습자로서, 다음 라운드로 자동 이동되지 않고 강사 신호를 기다리고 싶다, 강사가 호흡을 조절하면서 학습을 이끌 수 있도록.
25. 학습자로서, 4 라운드 끝나면 종합 발표 화면에서 개인 1·2·3등과 팀 1·2·3등을 보고 싶다, 게임 클라이맥스를 경험할 수 있도록.

### 학습자 — Sandbox

26. 학습자로서, 게임 시작 전 또는 후에 Sandbox 메뉴로 가서 자유롭게 변수를 조작하고 싶다, 게임과 별개로 개념 탐험을 할 수 있도록.
27. 학습자로서, Sandbox 좌측에 7개 변동 변수가 접힌 상태로 나열되고 클릭한 것만 펼쳐지고 싶다, 화면 복잡도를 통제하면서 원하는 변수만 조작할 수 있도록.
28. 학습자로서, 여러 변수를 동시에 펼쳐서 두 슬라이더를 같이 보면서 조작하고 싶다, 변수 간 복합 효과를 시각적으로 비교할 수 있도록.
29. 학습자로서, 슬라이더가 기본값에서 벗어난 변수에 점 표지가 보이고 싶다, 지금 어떤 변수를 변동시켰는지 한눈에 알 수 있도록.
30. 학습자로서, 변동시킨 슬라이더 옆에 ↩ 아이콘으로 그 변수만 reference로 되돌릴 수 있고 싶다, 다른 변수 영향 없이 한 변수만 reset할 수 있도록.
31. 학습자로서, 전체 reset 버튼으로 7개 변수 모두 reference로 한 번에 되돌릴 수 있고 싶다, 새 시나리오를 처음부터 시작할 수 있도록.
32. 학습자로서, 우측 인스펙터에 "기본 X → 새 X (변화량)" 형식으로 변동된 변수만 자연어로 보고 싶다, 복잡한 원시 수식 없이 *왜 결과가 바뀌었는지* 이해할 수 있도록.
33. 학습자로서, 변동시키지 않은 변수는 인스펙터에 안 보이고 싶다, 시선이 변경된 변수에 집중되도록.
34. 학습자로서, 면취수·Mask는 기준값(25, 6)이 reference로 고정되고 *새값*만 슬라이더로 조작하고 싶다, 슬라이더 9개가 아닌 7개로 단순하게 사용할 수 있도록.
35. 학습자로서, 처음 진입 시 모든 슬라이더가 "변동 없음" 위치(Loading 70%, 재료비 0%, 수율 0%p, 새 면취수 25, 새 Mask 6, Tact 1.0x, 투자 $0)에서 시작하고 싶다, 기본 레퍼런스 상태에서 의도적 변동을 만들 수 있도록.

### 학습자 — 연습 모드

36. 학습자로서, 강의 후 자유 학습용으로 `/cases` 워크시트에 직접 진입하고 싶다, 게임 컨텍스트 없이도 자유 풀이를 할 수 있도록.
37. 학습자로서, 연습 모드 워크시트에서는 타이머와 리더보드 없이 풀이 자체에만 집중할 수 있고 싶다, 부담 없이 자기 페이스로 학습할 수 있도록.

### 강사

38. 강사로서, `/instructor`에서 "새 방 생성" 버튼 한 번으로 룸 코드와 admin_token을 발급받고 싶다, 별도 셋업 없이 매 차수마다 빠르게 게임을 준비할 수 있도록.
39. 강사로서, admin_token이 localStorage에 자동 저장되고 새로고침해도 강사 뷰에 자동 복귀하고 싶다, 강의 중 실수로 닫아도 빠르게 돌아올 수 있도록.
40. 강사로서, 강사 뷰에서 시간 캡(분), 팀 수, 힌트 차감 ON/OFF를 매 차수마다 조정하고 싶다, 학습자 수준과 강의 흐름에 맞게 룰을 유연하게 운영할 수 있도록.
41. 강사로서, 입장한 학습자 30명의 이름·팀·UUID를 실시간 대시보드에서 보고 싶다, 시작 전 출석 + 팀 배정 확인할 수 있도록.
42. 강사로서, 학습자가 팀 번호를 잘못 입력한 경우 대시보드에서 직접 수정하고 싶다, 학습자 실수가 팀 점수를 오염시키지 않도록.
43. 강사로서, "라운드 1 시작" 버튼을 누르면 룸의 모든 학습자가 동시에 라운드 1 화면으로 이동하고 싶다, 일사불란한 출발 신호를 줄 수 있도록.
44. 강사로서, 라운드 진행 중 학습자별 완료 여부·시간을 실시간 대시보드에서 보고 싶다, 누가 빠른지 누가 막혔는지 즉시 파악할 수 있도록.
45. 강사로서, 라운드 종료 후 "다음 라운드 시작" 신호를 직접 누르고 싶다, 라운드 사이 1~2분 코멘트 시간을 확보할 수 있도록.
46. 강사로서, 매 라운드 결과 화면에서 라운드 순위 + 팀 결과 + 누적 현황을 한 번에 보고 싶다, 학습자에게 코멘트할 핵심 데이터를 즉시 확인할 수 있도록.
47. 강사로서, 4 라운드 끝나면 종합 발표 화면을 학습자 화면과 동기화하면서 띄우고 싶다, 1·2·3등을 무대 효과 있게 발표할 수 있도록.
48. 강사로서, 6차수 운영 중 차수마다 다른 룸 코드를 사용하고 싶다, 한 차수 데이터가 다른 차수에 섞이지 않도록.

### 시스템 / 운영

49. 시스템으로서, 학습자가 100% 정답에 도달한 시각은 *서버 측 Lambda timestamp*로 기록하고 싶다, 학습자 노트북 시계 조작이나 새로고침으로 시간을 리셋할 수 없도록.
50. 시스템으로서, 학습자가 새로고침해도 같은 UUID·이름·팀이 복원되고 라운드 진행 상태가 유지되고 싶다, 일시적 네트워크 끊김에도 게임이 깨지지 않도록.
51. 시스템으로서, 미완료자(10분 캡 도달)는 캡 시간으로 합산하고 게임에 끝까지 참여시키고 싶다, 한 명의 미완료가 팀 전체를 무효화하지 않도록.
52. 시스템으로서, 팀 시간은 라운드별 *가장 늦은 조원의 시간*을 4 라운드 합산해 산정하고 싶다, 무임승차를 방지하면서 조원 간 상호 지원을 유도할 수 있도록.
53. 시스템으로서, 폴링 간격은 라운드 진행 중 2초·대기 화면 5초로 적응하고 싶다, 백엔드 호출량을 최소화하면서 학습자 체감 반응성을 유지할 수 있도록.
54. 시스템으로서, LLM 코치 코드와 `GEMINI_API_KEY` 환경변수를 완전 제거하고 싶다, 과금 발생 없이 학습 환경을 단순화할 수 있도록.
55. 시스템으로서, 라이브 도메인 `master.d26yr76roz76fk.amplifyapp.com`을 그대로 유지하고 싶다, 학습자에게 알리는 URL이 차수마다 안 바뀌도록.

## Implementation Decisions

### 신규 / 확장 깊은 모듈

**M1. formula-parser (신규)**

자유 텍스트 수식 평가의 모든 책임을 1줄 인터페이스 뒤에 캡슐화.

```
parseFormula(input: string, refs?: Record<string, number>): number | null
```

- 입력 처리: `%` 자동 변환 (`"70%"` → 0.7), 사칙연산, 괄호, 공백 허용
- refs 치환: 셀 라벨 기반 키워드를 숫자로 대체 (예: `"panel_labor * (loading_old/loading_new)"`)
- 무효 입력 시 `null` 반환 (예외 던지지 않음)
- 기존 `CellCalculator.evaluateTokens`·`tokenize`·`parseExpression`을 추출 + 기능 확장
- 토큰 모델과 자유 텍스트 입력 *둘 다* 이 모듈을 거쳐 평가됨 (단일 진실원)

**M2. room-state-machine (신규)**

룸 lifecycle을 순수 함수 상태 전이로 표현.

```
type RoomState =
  | { phase: "pending"; players: Player[]; settings: RoomSettings }
  | { phase: "playing"; round: 1|2|3|4; startedAt: number; players: Player[]; submissions: Submission[]; settings: RoomSettings }
  | { phase: "between_rounds"; lastRound: 1|2|3|4; players: Player[]; submissions: Submission[]; settings: RoomSettings }
  | { phase: "finished"; players: Player[]; submissions: Submission[]; settings: RoomSettings }

type RoomEvent =
  | { kind: "join"; player: Player }
  | { kind: "update_settings"; settings: Partial<RoomSettings> }
  | { kind: "start_round"; round: 1|2|3|4 }
  | { kind: "submit"; playerId: string; round: 1|2|3|4; finishedAt: number; capReached: boolean; hintLevel: 0|1|2|3 }
  | { kind: "round_timeout" }
  | { kind: "next_round" }
  | { kind: "finish" }

transition(prev: RoomState, event: RoomEvent): RoomState | Error
canTransition(prev: RoomState, event: RoomEvent): boolean
```

- 잘못된 전이 거부 (예: `playing` 중 `join` → Error)
- `submit` 이벤트로 모든 학습자가 완료되면 자동으로 `between_rounds`로 전이 (서버 측에서 `transition` 호출 후 결과 phase 확인)
- 라운드 타임아웃 시 미완료자를 자동 capReached=true로 마킹
- 6차수 안정성의 핵심 — 모든 룸 변경은 *이 함수만* 거침

**M3. time-aggregator (신규)**

점수 산정의 모든 로직을 픽스처 기반 순수 함수로.

```
type Submission = {
  playerId: string;
  teamNumber: number;
  round: 1|2|3|4;
  finishedAt: number;       // Lambda timestamp
  capReached: boolean;
  hintLevel: 0|1|2|3;
}

computeIndividualRanking(
  submissions: Submission[],
  roomStartedAtByRound: Record<1|2|3|4, number>,
  settings: { capSec: number; penaltyEnabled: boolean }
): IndividualRanking[]

computeTeamRanking(
  submissions: Submission[],
  roomStartedAtByRound: Record<1|2|3|4, number>,
  settings: { capSec: number; penaltyEnabled: boolean }
): TeamRanking[]
```

- 개인 누적: 라운드별 풀이 시간(finishedAt − startedAt) 합산, 미완료자 캡 합산 (m1)
- 팀 시간: 라운드별 *팀 내 max finishedAt 시간*을 4 라운드 합산 (I)
- 힌트 차감: penaltyEnabled=true 시 정답 셀 가중치 100/70/40/20%, false 시 항상 100%
- 결과: 정렬된 ranking + 각 항목의 라운드별 breakdown
- 발표 화면이 호출하는 *유일한* 점수 계산 진입점

**M4. merged-case-adapter (신규)**

```
type SevenVars = {
  newLoading: number;             // 0.30~1.00 (기본 0.70)
  materialChangePct: number;      // -0.20~+0.20 (기본 0)
  moduleYieldChange: number;      // -0.10~+0.05 (기본 0)
  newCuts: number;                // 10~40 (기본 25)
  newMask: number;                // 3~10 (기본 6)
  tactMultiplier: number;         // 0.80~1.50 (기본 1.00)
  investmentDepreciationDelta: number;  // 0~5 (기본 0)
}

applyAllSeven(base: CostParams, vars: SevenVars): CostParams
```

- 기존 4 어댑터(`applyLoadingChange`, `applyMaterialYieldChange`, `applyCutsMaskChange`, `applyTactInvestmentChange`)를 *변경 순서대로 직렬 호출*: Loading → 재료비 → 수율 → 면취수 → Mask → Tact → 투자상각비
- 엔진 자체는 Sacred — 27 골든 픽스처 그대로
- Sandbox `ParamPanel`이 호출하는 *유일한* 어댑터

**M5. hint-state-manager (신규)**

```
type HintState = Record<problemId, 0 | 1 | 2 | 3>

bumpLevel(state: HintState, problemId: string): HintState
computeMultiplier(level: 0|1|2|3, penaltyEnabled: boolean): 1.0 | 0.7 | 0.4 | 0.2 | 1.0
```

- 문제 단위 힌트 레벨 추적 (셀별 cascade 폐기)
- 레벨 3에서 멈춤 (더 이상 bump 안 함)
- penaltyEnabled=false 시 모든 레벨에서 1.0 반환

**M6. worksheet-engine (기존 확장)**

- `resolveHints` cascade(cell → row → case → fallback) → *case 레벨 단일 lookup*으로 단순화
- `CellHints` 인터페이스 제거, `CellDef.hints`·`RowDef.hints` 필드 제거
- 신규: `resetIncorrect(answers, grades): answers` — 정답 셀 유지, 틀린 셀만 비움
- 유지: `gradeYellowCells`, `computeBlue`, `computeWeightedScore` (시그니처 동일)

### 백엔드 / 인프라

- **AWS Amplify SSR (WEB_COMPUTE Lambda, 기존)** + **DynamoDB single-table** + 클라이언트 폴링 2초
- DynamoDB 스키마 (single-table):
  - `PK = ROOM#{4자코드}`
  - `SK`:
    - `META` — 룸 설정 (capSec, teamCount, penaltyEnabled, status), 생성 시각, admin_token 해시
    - `PLAYER#{uuid}` — 이름, 팀번호, 입장 시각
    - `ROUND#{N}` — 라운드 시작 시각
    - `ROUND#{N}#PLAYER#{uuid}` — finishedAt, capReached, hintLevel
- IAM: Amplify SSR Lambda 서비스 롤에 *해당 테이블 read/write*만 부착 (최소 권한)
- 환경변수: `AWS_REGION`, `DYNAMODB_TABLE_NAME` (`GEMINI_API_KEY` 제거)
- 시간 timestamp: Lambda 측 `Date.now()` — 클라이언트 시계 무관

### API Routes (Next.js App Router)

| Method | Path | 호출자 | 책임 |
|--------|------|-------|------|
| `POST` | `/api/rooms` | 강사 | 룸 생성 (코드 4자 + admin_token 12자 발급, 충돌 시 재시도) |
| `POST` | `/api/rooms/{code}/players` | 학습자 | 입장 (body: name, teamNumber). UUID 자동 생성 → 응답에 포함 |
| `PATCH` | `/api/rooms/{code}` | 강사 | 설정 변경, 라운드 시작 신호, 다음 라운드 신호, 종합 발표. admin_token 검증 |
| `POST` | `/api/rooms/{code}/rounds/{N}/submissions` | 학습자 | 라운드 완료 기록 (서버 timestamp 사용) |
| `GET` | `/api/rooms/{code}` | 모두 | 폴링. ETag 기반 304 응답 가능 (변경 없으면 DB 호출 생략) |

모든 라우트는 `room-state-machine`의 `transition`을 거쳐 상태 변경. 잘못된 전이는 400 응답.

### 라우트 / 흐름

| 라우트 | 용도 | 분기 |
|--------|------|------|
| `/` | 룸코드 입력 (학습자 진입점) | — |
| `/intro` | 기존 6비트 다이얼로그 (그대로 유지) | 룸코드 보유 시만 진입 |
| `/menu` | Sandbox / 게임 모드 선택 | 룸 상태(`pending`/`playing`/`between_rounds`/`finished`)에 따라 옵션 활성/비활성 |
| `/sandbox` | 7변수 통합 Multi-factor Sandbox | 자유 진입 |
| `/cases/[id]` | 워크시트 | **`?game=true` + 룸 컨텍스트 있으면 게임 모드, 없으면 연습 모드** |
| `/results` | 라운드 결과 / 종합 발표 화면 | 룸 상태에 따라 렌더링 |
| `/instructor` | 강사 새 방 생성 | admin_token 발급 |
| `/instructor/[code]` | 강사 뷰 본체 | admin_token 검증 |

게임 모드 워크시트는 *기존 `/cases/[id]` 위에 룸 컨텍스트 분기*로 구현 — 신규 라우트 안 만듦. zustand store에 `roomContext`가 있으면 타이머·미니 리더보드·정답 미노출.

### 강사 설정 패널 (가변 파라미터)

모두 PATCH `/api/rooms/{code}` 통해 변경:

- 시간 캡 (분, 기본 10)
- 팀 수 (기본 5, 범위 1~10)
- 힌트 차감 ON/OFF (기본 ON)
- 발표 카테고리 토글 (기본: 개인 1·2·3 + 팀 1·2·3 활성)

### 제거 / 폐기

- LLM 코치: `components/Coach/*`, `lib/coach/*`, `app/api/coach`, `FloatingCoach`, `SandboxCoach`, Amplify `GEMINI_API_KEY`, `next.config.js`의 env 인라인
- 셀별 힌트 60개 데이터: `content/problems/*.json`의 `cells[].hints`·`rows[].hints` 필드, `types.ts`의 `CellHints` 인터페이스, `worksheet-engine.test.ts`의 cascade 6 tests
- 케이스 드롭다운: `SandboxPage`의 `useState caseId` + 드롭다운 UI
- 별도 4 어댑터 호출 패턴: `applyCaseAdapter`는 보존하되 호출처에서 `applyAllSeven`으로 대체

## Testing Decisions

### 좋은 테스트의 기준

- **외부 행동만 테스트**: 모듈의 공개 인터페이스 (input → output)만 검증. 내부 토크나이저 함수·private 헬퍼의 구현 방식은 테스트 대상 X
- **픽스처 기반**: 정답 데이터(27 골든 픽스처 + 신규 점수 케이스)와 사용자 입력 케이스를 별도 파일로 관리. 회귀 시 픽스처만 갱신
- **실패 경로 명시**: parseFormula `null` 반환, room-state-machine `Error` 반환 같은 무효 입력도 정상 분기로 검증
- **회귀 보장**: 기존 27 골든 픽스처 + 기존 37 vitest는 *모듈 추출 후에도 정확히 동일 결과* 유지

### 모듈별 테스트 계획

**M1 formula-parser** (vitest, 반드시)
- 정상: `"70%"` → 0.7, `"21.3"` → 21.3, `"21.3 * 70%"` → 14.91, `"21.3 * (70%/50%)"` → 29.82, `"(70-50)*21.3/100"` → 4.26, 공백 변형
- refs 치환: `parseFormula("a * b", { a: 21.3, b: 0.7 })` → 14.91
- 무효: `"21.3 +"`, `""`, `"abc"`, `"21.3 / 0"`, `"21.3 + (50%"`, `"21.3 * * 0.7"` → 모두 `null`
- 회귀: 기존 토큰 평가 케이스를 *parseFormula로 우회*해도 같은 결과

**M2 room-state-machine** (vitest, 반드시)
- 정상 전이:
  - `pending` + `join` → `pending` (player 추가)
  - `pending` + `start_round(1)` → `playing(1)` (startedAt 부착)
  - `playing(1)` + `submit` → `playing(1)` (모든 학습자 완료 안 됨)
  - `playing(1)` + 모든 학습자 `submit` 누적 → `between_rounds(1)`
  - `between_rounds(1)` + `next_round` → `playing(2)`
  - `playing(4)` + 모든 학습자 `submit` → `between_rounds(4)` → `next_round` → `finished`
- 잘못된 전이: `playing(1)` + `join` → Error, `pending` + `submit` → Error, `between_rounds(2)` + `start_round(1)` → Error, `finished` + 모든 이벤트 → Error
- 타임아웃: `playing(N)` + `round_timeout` → `between_rounds(N)` + 미완료자 자동 `capReached=true`

**M3 time-aggregator** (vitest, 반드시)
- 정상 3 학습자 × 4 라운드 픽스처: 개인 누적 정렬 + 팀 라운드별 max 합산 정렬
- 미완료자 캡: 한 학습자가 라운드 2 캡 도달 → 그 라운드 시간 = capSec, 누적에 합산
- 1명 미완료 팀: 5인 팀 중 1명만 캡 도달 → 팀 라운드 시간 = 캡 (max), 다른 멤버 무관
- 무임승차 검증: 김OO 빠르고 박OO 느린 라운드 → 팀 시간 = 박OO 시간
- 힌트 차감 토글: penaltyEnabled=false 시 모든 정답 가중치 1.0
- 엣지: 모두 캡 / 모두 같은 시각 / 1 라운드만 진행

**M4 merged-case-adapter** (vitest, 반드시)
- **27 골든 픽스처 통과**: 각 픽스처를 *7변수 입력*으로 변환 후 `applyAllSeven` 호출 → 같은 결과 (sacred 보존)
- 신규 7변수 동시 적용 픽스처 5~10개: Loading 50% + 재료비 -5% + 수율 -4%p 같은 조합을 엔진 직접 계산값과 비교
- Commutative 확인: Loading 후 수율 vs 수율 후 Loading → 결과 동일

**M5 hint-state-manager** (vitest, 권장)
- 정상: 빈 상태 → bump → 레벨 1, 또 bump → 레벨 2, 4번 bump → 레벨 3에서 멈춤
- 차감 ON: 레벨 0/1/2/3 → 1.0/0.7/0.4/0.2
- 차감 OFF: 모든 레벨 → 1.0

**M6 worksheet-engine** (vitest, 기존 37 유지)
- cascade 6 tests 제거
- 신규: `resetIncorrect` 부분 reset — 18셀 grade에서 12 정답 + 6 오답 → 부분 reset → 12 정답 answer 그대로 + 6 오답 비움

### E2E (Playwright)

- **기존 14 spec 유지** (sandbox 드롭다운 / guided flow / design QA / formula inspector / case 3 mutation 등). 드롭다운 제거로 깨지는 spec은 *통합 sandbox*에 맞춰 수정
- **신규 게임 critical path** 1 spec: 룸 입장 → 인트로 → 메뉴 → 대기 → 강사 신호 (mock 또는 별도 탭 시뮬레이션) → 라운드 1 → yellow 셀 모두 정답 입력 → 자동 종료 → 시간 기록 확인 → 대기 화면
- **신규 Sandbox 7변수 회귀** 1 spec: 7개 슬라이더 모두 동작 + accordion multi-open + 변동 표지 + 개별 reset

### Prior Art

- `lib/cost-engine/engine.test.ts` (27 골든 픽스처) — M4 prior art
- `lib/worksheet-engine.test.ts` (기존 37 테스트) — M6 prior art
- `tests/e2e/` (기존 14 Playwright spec) — 신규 E2E spec prior art

## Out of Scope

- **모바일 / 태블릿 지원**: 1차수 강의 노트북 동시접속 가정. 모바일 반응형은 best-effort (기존 코드 유지)
- **다국어 지원**: 한국어 단일
- **포상 보조 카테고리** (라운드 영웅·히든 솔버·점프상): 사용자 결정으로 제외. 개인 1·2·3 + 팀 1·2·3만 자동 부각
- **WebSocket 진짜 실시간**: 폴링 2초로 충분, 작업량 1주 더 들어가는 만큼 일정 위험 ↑
- **AppSync / DataStore**: 30명·6차수 규모에 오버킬
- **6차수 끝난 후 룸 데이터 cleanup script**: 별도 운영 작업
- **케이스 02·03 복원** (인건비·한계이익률): 2026-05-12 결정 supersede 필요. 본 PRD에선 4 케이스 유지
- **답 유출 방지** (학습자 사이 답 공유): 사용자 우려 표명 X. 차수마다 새 룸 코드로 자동 격리만
- **CSV 학습자 명단 사전 등록**: 자율 입력 모델 채택. 강사 대시보드에서 동적 수정만
- **부분 정답 인정**: 100% 정답만 라운드 종료. 부분 점수 제도 없음
- **시즌제 / 데일리 챌린지 / 마스터리 미터**: cost-sim-v2-game 원 plan의 Phase C 항목. v2.1 게임화 스코프 외
- **강사 사전 리허설 모드** (혼자서 30명 시뮬레이션): 작업량 제한으로 D-2 셀프 리허설은 *1탭 1인*만. 풀 30명 동시 부하 테스트는 1차수 1차 실전 데이터로
- **부정행위 정교 방지** (개발자 도구 비활성·iframe sandbox 등): 학습자 신뢰 + 서버 timestamp만으로 충분. 추가 방어 없음

## Further Notes

### 외부 의존성

- **엑셀 원본 파일** (B.3 작업 의존성): 총수율 행 위치·표 순서. 사용자가 D+2 (2026-05-15) 까지 `context/` 또는 `projects/cost-sim-v2.1/docs/`에 제공 (스크린샷 또는 파일). 미제공 시 추정으로 진행 + 사용자 확인 게이트
- **AWS IAM 권한 셋업**: Amplify SSR Lambda 서비스 롤에 DynamoDB read/write 부착. 이전 세션 AWS CLI v2(WSL) 인증 완료 상태 (decision-log 2026-05-01). 환경변수 평문 노출 사고 이력 있음 — 동일 사고 재발 주의 (`aws --query` 사용 시 `keys(environmentVariables)`만)
- **DynamoDB 신규 테이블 생성**: 본 PRD 실행 시작 시 콘솔 또는 CLI로 생성. On-demand billing mode

### 위험 / 운영 노트

- **1차수 일정 D+14 = 2026-05-27 고정**. 추정 22~28일 작업을 압축. Buffer 0. AI 가속 + 풀집중 + 일부 야간 작업 필요
- **D-2 (2026-05-25) Fallback 게이트**: 셀프 리허설로 게이미피케이션 동작 여부 판단. 미동작 시 1차수는 *워크시트 UX 적용 + 수동 운영*으로 자동 전환 (강사가 시간 수기 측정 + Google 시트)
- **사내망 검증 (Z.2)**: LG Display 사내 노트북에서 라이브 URL 접근. AWS는 사용 가능 확인됨. DynamoDB 호출이 사내망 방화벽 통과하는지 D+13 미리 검증 필요
- **6차수 운영 안정성**: 첫 차수 데이터가 누적된 채 다음 차수 진행. 룸 코드별 자동 격리로 데이터 섞임은 차단. 6차수 끝난 후 별도 cleanup script
- **게임 모드 워크시트 재진입 차단**: 라운드 종료 후 학습자가 임의 뒤로 가기로 다시 풀이 화면 진입 시 → zustand store의 라운드 완료 플래그로 *결과 화면이 강사 신호 받기 전까지* 락

### 검증 명령어

| 검증 항목 | 명령어 | 기대 결과 |
|-----------|--------|-----------|
| Typecheck | `cd projects/cost-sim-v2.1 && npm run typecheck` | 0 에러 |
| Unit tests | `cd projects/cost-sim-v2.1 && npm run test` | 통과 (M1~M5 신규 + M6 기존 37) |
| Build | `cd projects/cost-sim-v2.1 && npm run build` | 0 warning |
| E2E | `cd projects/cost-sim-v2.1 && npx playwright test` | 기존 14 + 신규 2 spec |
| 라이브 룸 생성 | `curl -X POST https://master.d26yr76roz76fk.amplifyapp.com/api/rooms` | `{code, admin_token}` 응답 |
| 사내망 검증 | LG Display 사내 노트북에서 라이브 URL 접근 | 룸 입장 정상 |

### 관련 문서

- `plan.md` — 14.5일 작업 분해 (Phase 0 → B → A → C → Z)
- `decision-log.md` 2026-05-13 — 16개 결정 박제 (Scope / 결정 / 이유 / 영향 / 거부된 대안)
- `handoff.md` 2026-05-13 — 다음 세션 시작 가이드
- `context/glossary.md` — 4 케이스 + 7변수 도메인 용어
- `projects/cost-sim-v2.1/README.md` — 4 케이스 Sandbox+Worksheet 모델

---

*PRD 작성: 2026-05-13. 사용자가 별도 GitHub Issues 등록을 원하면 본 마크다운을 이슈 body에 그대로 붙여 사용 가능.*
