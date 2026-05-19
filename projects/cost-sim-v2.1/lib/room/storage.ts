/**
 * In-memory storage — Map<code, RoomState>.
 *
 * Production: DynamoDB SDK 로 교체 (HITL). 본 모듈은 동일 API 시그니처 유지하여 *교체 비용 최소화*.
 *
 * 주의: Next.js serverless Lambda 의 module-level 상태는 cold start 마다 리셋된다.
 * 또한 dev 모드 HMR / route handler module 격리 시 module-scope 변수가 재초기화될 수 있다 —
 * globalThis 에 매달아 module reload 너머에서 동일 Map identity 를 보장한다.
 * 로컬 dev + 단일 instance Amplify 에서 동작. 다중 instance 운영 = DynamoDB 필수.
 */

import type {
  Player,
  RoomMeta,
  RoomState,
  RoundData,
  Submission
} from "./types";

const globalForRooms = globalThis as unknown as { __costSimRooms?: Map<string, RoomState> };
const rooms: Map<string, RoomState> =
  globalForRooms.__costSimRooms ??
  (globalForRooms.__costSimRooms = new Map<string, RoomState>());

export function createRoom(meta: RoomMeta): RoomState {
  const state: RoomState = {
    meta,
    players: new Map(),
    rounds: new Map(),
    submissions: new Map()
  };
  rooms.set(meta.code, state);
  return state;
}

export function getRoom(code: string): RoomState | undefined {
  return rooms.get(code);
}

export function updateRoomMeta(
  code: string,
  patch: Partial<RoomMeta>
): RoomState | undefined {
  const room = rooms.get(code);
  if (!room) return undefined;
  room.meta = { ...room.meta, ...patch };
  return room;
}

export function addPlayer(code: string, player: Player): RoomState | undefined {
  const room = rooms.get(code);
  if (!room) return undefined;
  room.players.set(player.id, player);
  return room;
}

export function updatePlayer(
  code: string,
  playerId: string,
  patch: Partial<Player>
): RoomState | undefined {
  const room = rooms.get(code);
  if (!room) return undefined;
  const player = room.players.get(playerId);
  if (!player) return undefined;
  room.players.set(playerId, { ...player, ...patch });
  return room;
}

export function setRound(code: string, round: RoundData): RoomState | undefined {
  const room = rooms.get(code);
  if (!room) return undefined;
  room.rounds.set(round.n, round);
  return room;
}

export function addSubmission(
  code: string,
  submission: Submission
): RoomState | undefined {
  const room = rooms.get(code);
  if (!room) return undefined;
  const key = `${submission.roundN}:${submission.playerId}`;
  room.submissions.set(key, submission);
  return room;
}

export function deleteRoom(code: string): boolean {
  return rooms.delete(code);
}

/** 테스트 격리용 — 모든 룸 제거. */
export function _clearAllRooms(): void {
  rooms.clear();
}
