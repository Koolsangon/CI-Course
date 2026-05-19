# Domain Docs

본 레포는 **single-context** 패턴입니다.

## 위치

| 자산 | 경로 | 용도 |
|------|------|------|
| 도메인 인덱스 | `CONTEXT.md` (root) | 4 케이스 + 7변수 + 핵심 용어 짧은 요약 (50~100줄) |
| 도메인 용어집 | `context/glossary.md` | 상세 도메인 용어 (CLAUDE.md `context/` 흐름) |
| 톤·스타일 | `context/coach-tone.md`, `projects/cost-sim-v2.1/content/coach-tone.md` | 학습자 안내 톤 |
| ADR 등가물 | `decision-log.md` (root) | 시간순 결정 기록. 각 entry는 *Scope / 결정 / 이유 / 영향 / 거부된 대안* 4-필드 |

## skill 사용 규칙

### `improve-codebase-architecture`, `diagnose`, `tdd` 등이 도메인 언어를 학습할 때

1. **먼저 `CONTEXT.md` 읽기** — 짧은 인덱스. 케이스·변수·핵심 메커니즘 한눈에
2. **상세는 `context/glossary.md`** — CONTEXT.md에서 cross-link 따라가기
3. **톤 참고는 `context/coach-tone.md`** — 학습자 안내 작성 시

### 아키텍처 결정을 참고할 때

`docs/adr/` 디렉토리는 **존재하지 않음** (의도). ADR 등가물은 `decision-log.md`의 시간순 entries.

각 entry 구조:

```
## YYYY-MM-DD

### {결정 제목}

- **Scope**: 어디에 영향
- **결정**: 무엇을
- **이유**: 왜
- **영향 범위**: 어디까지 파급
- **거부된 대안**: 왜 다른 옵션이 안 됐는지
```

skill이 "이 코드의 아키텍처 의도는?" 같은 질문을 다룰 때 — `decision-log.md`를 *시간 역순*으로 스캔해서 *Scope이 해당 영역*인 entry를 우선 참고.

### 결정을 새로 박을 때

CLAUDE.md 룰: "주요 결정 사항은 `decision-log.md`에 즉시 기록한다."

새 entry를 **prepend** (최신이 맨 위). 위 4-필드 구조 유지. 본 setup-matt-pocock-skills 결정도 다음 세션에서 entry로 박을 수 있음.

## 왜 single-context인가

본 레포는 *monorepo 구조이지만 실질 작업이 cost-sim-v2.1 단일*:

- `projects/cost-sim-v2.1/` ← 활성 (1차수 D+14 게임화 작업 중)
- `projects/cost-sim-v1/` ← frozen (2026-04-11)
- `projects/cost-sim-v2-game/` ← frozen (정적 export, git history 보존)
- `projects/cost-sim-wargame/` ← archived (Python FastAPI 프로토타입)
- `projects/cost-sim-v3/` ← archived

향후 cost-sim-v2.1과 *질적으로 다른 도메인* 프로젝트(예: 마케팅 시뮬레이션·HR 분석)가 추가되면 multi-context 전환 검토.

## 왜 docs/adr/ 신설을 안 했는가

- 기존 `decision-log.md` 흐름이 *CLAUDE.md에 박힌 결재 룰*과 일관
- 시간순 prepend 패턴이 *결정 사이 supersede 관계*를 자연 표현
- 마이그레이션 작업 비용 vs 효용 = 효용 미미
- skill들이 *path만 알면* 동일 동작
