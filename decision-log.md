# decision-log.md - 결정 사항 기록장

## 2026-04-09

### 프로젝트 폴더 구조 확정

- **결정**: 4대 기본 폴더(`context/`, `projects/`, `templates/`, `outputs/`) + 통제 레이어(`.claude/`) 구조 채택
- **이유**: 클로드가 읽을 배경지식(Context), 지킬 규칙(Harness), 기록할 상태(State)를 명확히 분리하기 위함
- **영향 범위**: 모든 향후 작업은 이 구조를 따름
