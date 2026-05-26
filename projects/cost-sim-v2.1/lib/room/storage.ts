/**
 * Storage 진입점 — 환경변수에 따라 DynamoDB 또는 in-memory 를 선택한다.
 *
 * - DYNAMODB_TABLE_NAME 이 설정된 경우 → storage-dynamodb.ts (production)
 * - 미설정 시 → 아래 in-memory 구현 (local dev / 테스트)
 *
 * 두 모드의 함수 시그니처가 다른 점 주의:
 *   in-memory  : 동기 (RoomState | undefined)
 *   DynamoDB   : 비동기 (Promise<RoomState | undefined>)
 *
 * 호출 측(API route handler)은 항상 await 를 사용하여 두 모드 모두 처리한다.
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

// ─── DynamoDB 모드 분기 ──────────────────────────────────────────────────────

const USE_DYNAMODB = Boolean(process.env.DYNAMODB_TABLE_NAME);

// DynamoDB 모드일 때만 동적으로 모듈을 로드 (번들 트리쉐이킹 + 테스트 분리)
let _ddb: typeof import("./storage-dynamodb") | null = null;

async function ddb(): Promise<typeof import("./storage-dynamodb")> {
  if (!_ddb) {
    _ddb = await import("./storage-dynamodb");
  }
  return _ddb;
}

// ─── In-memory 구현 ──────────────────────────────────────────────────────────

const globalForRooms = globalThis as unknown as { __costSimRooms?: Map<string, RoomState> };
const rooms: Map<string, RoomState> =
  globalForRooms.__costSimRooms ??
  (globalForRooms.__costSimRooms = new Map<string, RoomState>());

function _createRoomSync(meta: RoomMeta): RoomState {
  const state: RoomState = {
    meta,
    players: new Map(),
    rounds: new Map(),
    submissions: new Map()
  };
  rooms.set(meta.code, state);
  return state;
}

function _getRoomSync(code: string): RoomState | undefined {
  return rooms.get(code);
}

function _updateRoomMetaSync(
  code: string,
  patch: Partial<RoomMeta>
): RoomState | undefined {
  const room = rooms.get(code);
  if (!room) return undefined;
  room.meta = { ...room.meta, ...patch };
  return room;
}

function _addPlayerSync(code: string, player: Player): RoomState | undefined {
  const room = rooms.get(code);
  if (!room) return undefined;
  room.players.set(player.id, player);
  return room;
}

function _updatePlayerSync(
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

function _setRoundSync(code: string, round: RoundData): RoomState | undefined {
  const room = rooms.get(code);
  if (!room) return undefined;
  room.rounds.set(round.n, round);
  return room;
}

function _addSubmissionSync(
  code: string,
  submission: Submission
): RoomState | undefined {
  const room = rooms.get(code);
  if (!room) return undefined;
  const key = `${submission.roundN}:${submission.playerId}`;
  room.submissions.set(key, submission);
  return room;
}

function _deleteRoomSync(code: string): boolean {
  return rooms.delete(code);
}

// ─── Public API (항상 Promise 반환) ──────────────────────────────────────────

export async function createRoom(meta: RoomMeta): Promise<RoomState> {
  if (USE_DYNAMODB) return (await ddb()).createRoom(meta);
  return _createRoomSync(meta);
}

export async function getRoom(code: string): Promise<RoomState | undefined> {
  if (USE_DYNAMODB) return (await ddb()).getRoom(code);
  return _getRoomSync(code);
}

export async function updateRoomMeta(
  code: string,
  patch: Partial<RoomMeta>
): Promise<RoomState | undefined> {
  if (USE_DYNAMODB) return (await ddb()).updateRoomMeta(code, patch);
  return _updateRoomMetaSync(code, patch);
}

export async function addPlayer(
  code: string,
  player: Player
): Promise<RoomState | undefined> {
  if (USE_DYNAMODB) return (await ddb()).addPlayer(code, player);
  return _addPlayerSync(code, player);
}

export async function updatePlayer(
  code: string,
  playerId: string,
  patch: Partial<Player>
): Promise<RoomState | undefined> {
  if (USE_DYNAMODB) return (await ddb()).updatePlayer(code, playerId, patch);
  return _updatePlayerSync(code, playerId, patch);
}

export async function setRound(
  code: string,
  round: RoundData
): Promise<RoomState | undefined> {
  if (USE_DYNAMODB) return (await ddb()).setRound(code, round);
  return _setRoundSync(code, round);
}

export async function addSubmission(
  code: string,
  submission: Submission
): Promise<RoomState | undefined> {
  if (USE_DYNAMODB) return (await ddb()).addSubmission(code, submission);
  return _addSubmissionSync(code, submission);
}

export async function deleteRoom(code: string): Promise<boolean> {
  if (USE_DYNAMODB) return (await ddb()).deleteRoom(code);
  return _deleteRoomSync(code);
}

/** 테스트 격리용 — 모든 룸 제거 (in-memory 모드 전용). */
export async function _clearAllRooms(): Promise<void> {
  if (USE_DYNAMODB) {
    return (await ddb())._clearAllRooms();
  }
  rooms.clear();
}
