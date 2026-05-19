/**
 * Room data model (plan.md C.1+C.2).
 *
 * 본 단계 (Ralph iteration) 에서는 *in-memory* 저장소로 코드 스캐폴드. AWS DynamoDB
 * 마이그레이션은 HITL 단계 (별도 세션): table 생성 + Amplify SSR Lambda IAM 권한 +
 * storage.ts 의 in-memory Map 을 DynamoDB SDK 호출로 교체.
 *
 * DynamoDB single-table 매핑 (plan.md 명시):
 *   PK              SK                      RoleInMemory
 *   ROOM#{code}     META                    rooms.get(code).meta
 *   ROOM#{code}     PLAYER#{id}             rooms.get(code).players (Map by id)
 *   ROOM#{code}     ROUND#{N}               rooms.get(code).rounds (Map by N)
 *   ROOM#{code}     ROUND#{N}#PLAYER#{id}   rooms.get(code).submissions (Map "N:id")
 */

export type RoomStatus = "waiting" | "playing" | "ended";
export type RoundStatus = "not_started" | "in_progress" | "ended";

export interface RoomSettings {
  /** 라운드 시간 캡 (초). 기본 600 = 10분. */
  timeCapSec: number;
  /** 팀 개수 (1~10). 기본 5. */
  teamCount: number;
  /** 힌트 차감 ON/OFF — 학습자 worksheet 의 hintPenaltyEnabled 와 정합. */
  hintPenaltyEnabled: boolean;
  /** 발표 카테고리: full = 1·2·3등 모두, winner_only = 1등만. */
  announcementMode: "full" | "winner_only";
}

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  timeCapSec: 600,
  teamCount: 5,
  hintPenaltyEnabled: true,
  announcementMode: "full"
};

export interface RoomMeta {
  code: string;
  adminToken: string;
  createdAt: number;
  status: RoomStatus;
  /** 현재 활성 라운드 (1~4) — status=playing 시에만 의미. */
  currentRound?: number;
  settings: RoomSettings;
  /** 학습자 신규 입장 가능 여부. false 면 POST /players 거부. 기존 입장자 폴링은 정상. 기본 true. */
  enabled: boolean;
}

export interface Player {
  id: string;
  name: string;
  /** 팀 번호 (1~settings.teamCount). 강사가 PATCH 로 수정 가능. */
  team: number;
  joinedAt: number;
}

export interface RoundData {
  n: number;
  /** 케이스 ID (예: "01-loading"). */
  caseId: string;
  status: RoundStatus;
  startedAt?: number;
  endedAt?: number;
}

export interface Submission {
  playerId: string;
  roundN: number;
  /** 완료 시간 (초). 캡 도달 미완료 시 timeCapSec 로 기록. */
  completionTimeSec: number;
  /** 100% 정답 여부 — false 면 캡 도달로 자동 종료. */
  completed: boolean;
  /** 힌트 사용 단계 (0~3). */
  hintLevel: number;
  submittedAt: number;
}

export interface RoomState {
  meta: RoomMeta;
  players: Map<string, Player>;
  rounds: Map<number, RoundData>;
  /** key: `${roundN}:${playerId}` */
  submissions: Map<string, Submission>;
}

/** 폴링용 직렬화 형태 — Map → 객체. */
export interface RoomSnapshot {
  meta: RoomMeta;
  players: Player[];
  rounds: RoundData[];
  submissions: Submission[];
}
