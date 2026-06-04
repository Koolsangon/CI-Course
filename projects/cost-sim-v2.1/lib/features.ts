/**
 * 기능 토글 (feature flags).
 *
 * GAME_MODE_ENABLED — 게임방(실시간 경쟁) 기능 전체 스위치.
 *   false 로 두면 룸 기반 게임 모드의 모든 UI 진입점을 숨긴다:
 *     - 홈의 "강사가 알려준 룸 코드 입력" 폼 (학습자 룸 입장)
 *     - 학습자 메뉴의 게임 섹션(종합 발표 / 라운드 결과 / 게임 대기)
 *     - 룸 입장 배지(RoomBadge)
 *     - 강사 뷰(/instructor, /instructor/[code]) — 방 생성·라운드 제어
 *
 *   룸 서버(/api/rooms, DynamoDB) 의존 + 유지보수 인계 사정으로 비활성화한 상태.
 *   관련 코드·라우트·API·테스트는 그대로 보존되어 있으므로, 다시 켜려면 이 값만
 *   true 로 바꾸면 된다.
 *
 *   영향 없는 상시 기능: 자유 실험실(/sandbox), 원가 워크시트(/cases).
 */
export const GAME_MODE_ENABLED = false;
