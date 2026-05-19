# Issue Tracker — GitHub Issues

본 레포의 이슈는 **GitHub Issues**에 있습니다.

- 리포: `https://github.com/Koolsangon/CI-Course`
- CLI: `gh` (https://cli.github.com)
- 인증: `gh auth login` (HTTPS, 토큰 또는 OAuth)

`/to-issues`, `/triage`, `/to-prd`, `/qa` 같은 skill들이 이 트래커를 읽고/씁니다.

## 핵심 명령

| 동작 | 명령 |
|------|------|
| 이슈 목록 | `gh issue list -R Koolsangon/CI-Course` |
| 이슈 생성 | `gh issue create -R Koolsangon/CI-Course --title "..." --body "..." --label "ready-for-agent"` |
| 이슈 조회 | `gh issue view <number> -R Koolsangon/CI-Course` |
| 라벨 추가 | `gh issue edit <number> -R Koolsangon/CI-Course --add-label "ready-for-agent"` |
| 라벨 제거 | `gh issue edit <number> -R Koolsangon/CI-Course --remove-label "needs-triage"` |
| 코멘트 | `gh issue comment <number> -R Koolsangon/CI-Course --body "..."` |
| 닫기 | `gh issue close <number> -R Koolsangon/CI-Course --reason completed` |
| 라벨 목록 | `gh label list -R Koolsangon/CI-Course` |

## 새 이슈 생성 시 가이드

- **제목**: 50자 내, 행동 동사로 시작 (예: "워크시트 계산기 sticky bottom 적용")
- **본문**: 마크다운. PRD나 plan에서 가져오면 그대로 사용 가능
- **라벨**: 생성 시점에 *반드시 1개 이상* 부착. 기본은 `needs-triage`. 이미 specified된 작업은 `ready-for-agent`
- **assignee**: 솔로 작업이라 일반적으로 self-assign

## PRD/Plan을 이슈로 변환

- `outputs/cost-sim-v2.1-game-prd.md` 같은 PRD는 *한 issue body에 그대로 paste*하거나 `/to-issues` skill로 *작업 단위 issue 14개로 자동 분할*
- plan.md의 Phase 0 ~ Phase Z는 자연스러운 issue 단위 후보
- issue 발행 후엔 plan.md 항목에 `(#42)` 식으로 issue 번호 cross-link 권장

## 사내망 주의

- LG Display 사내망에서 GitHub 접근은 *현재 풀려 있는 상태* (Amplify 배포·라이브 운영 확인됨)
- `gh` CLI 첫 실행 시 OAuth 인증이 *외부 브라우저 콜백*을 요구 — 사내 PC에서 막힐 수 있음. 막히면 *Personal Access Token* 방식으로 우회: `gh auth login --with-token < token.txt`
- *gh CLI 자체가 환경에 없으면* `winget install GitHub.cli` 또는 https://cli.github.com 에서 직접 다운로드

## 솔로 작업 운영 노트

- 현재 본 레포는 *솔로 작업 + 6차수 운영*. 이슈는 주로 *학습자 버그 보고* + *내가 만든 작업 to-do*가 들어옴
- 학습자 보고는 *익명*일 가능성 — 발견 경로(차수·룸 코드·시각)를 본문에 명시
- 작업 to-do는 *plan.md 항목 단위*가 자연. 작업 완료 시 close + 커밋 메시지에 `Closes #42` 포함
