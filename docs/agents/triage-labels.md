# Triage Labels

본 레포는 **5 canonical 라벨** 기본값을 그대로 사용합니다 (override 없음).

| 라벨 | 의미 | 다음 상태 후보 |
|------|------|-----------|
| `needs-triage` | 강사·관리자가 평가 필요 (신규 issue 기본값) | `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix` |
| `needs-info` | 보고자(학습자) 응답 대기 | 답변 도착 시 다시 `needs-triage` |
| `ready-for-agent` | 완전히 specified, AFK 에이전트가 인간 컨텍스트 없이 집어갈 수 있는 상태 | 작업 시작 시 라벨 유지, 완료 시 close |
| `ready-for-human` | 인간 구현/판단 필요 (에이전트로는 어려움) | 작업 시작 시 라벨 유지, 완료 시 close |
| `wontfix` | 처리 안 함 (의도된 동작 / 스코프 외 / 중복 등) | close (reason: not planned) |

## 라벨 적용 흐름 (`/triage` skill)

```
신규 issue ─┬─ 라벨 없음 → needs-triage 자동 부착
            └─ 본 사람이 평가 ─┬─ 정보 부족 → needs-info
                              ├─ 명확 + AFK 가능 → ready-for-agent
                              ├─ 명확 + 인간 필요 → ready-for-human
                              └─ 처리 안 함 → wontfix + close
```

## GitHub에 라벨이 없을 때

본 레포는 *활성 issue 없음* 상태로 시작 → GitHub UI 또는 `gh label create`로 5개 라벨 만들기:

```bash
gh label create needs-triage    --color FBCA04 --description "Needs maintainer evaluation"   -R Koolsangon/CI-Course
gh label create needs-info      --color D4C5F9 --description "Waiting on reporter"             -R Koolsangon/CI-Course
gh label create ready-for-agent --color 0E8A16 --description "AFK-ready, fully specified"     -R Koolsangon/CI-Course
gh label create ready-for-human --color 1D76DB --description "Needs human implementation"     -R Koolsangon/CI-Course
gh label create wontfix         --color CCCCCC --description "Will not be actioned"           -R Koolsangon/CI-Course
```

또는 `/to-issues` skill 첫 실행 시 자동 생성 (skill에 따라 다름).

## 6차수 운영 시 라벨 사용 예

- 학습자가 *룸 입장 실패* 보고 → `needs-triage` + `bug` (옵션) → 강사가 *재현 정보 부족*이면 `needs-info`로 전환
- 본인이 plan.md의 *Phase B.4 힌트 검증* 작업을 issue로 등록 → `ready-for-agent` (콘텐츠 검증이라 AFK 가능)
- 학습자가 *기능 제안* (예: "라운드 후 풀이 해설 영상도 보고 싶음") → `needs-triage` → 평가 후 *스코프 외*면 `wontfix` + close, 또는 *향후 차수에 반영*이면 `ready-for-human` 보류
