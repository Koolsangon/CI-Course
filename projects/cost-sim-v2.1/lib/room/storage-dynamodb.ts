/**
 * DynamoDB storage — in-memory storage.ts 의 production 대체 모듈.
 *
 * Single-table 설계 (types.ts 주석 참조):
 *   PK: ROOM#{code}  SK: META                  → RoomMeta
 *   PK: ROOM#{code}  SK: PLAYER#{id}            → Player
 *   PK: ROOM#{code}  SK: ROUND#{N:3pad}         → RoundData
 *   PK: ROOM#{code}  SK: ROUND#{N:3pad}#PLAYER#{id} → Submission
 *
 * 환경변수:
 *   AWS_REGION          (기본: ap-northeast-2)
 *   DYNAMODB_TABLE_NAME (필수)
 *
 * 의존: @aws-sdk/client-dynamodb  @aws-sdk/lib-dynamodb
 *
 * Map 타입 처리:
 *   DynamoDB는 JS Map을 직접 저장할 수 없다.
 *   각 Player / RoundData / Submission 을 별도 SK 아이템으로 저장하고,
 *   읽을 때 Query → Map 재조립 방식으로 해결한다.
 */

import {
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  type PutCommandInput,
  type GetCommandInput,
  type UpdateCommandInput,
  type DeleteCommandInput,
  type QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";

import type {
  Player,
  RoomMeta,
  RoomState,
  RoundData,
  Submission,
} from "./types";

// ─── DynamoDB 클라이언트 싱글톤 ──────────────────────────────────────────────
// Lambda cold start 너머에서 재사용하기 위해 globalThis에 보관

const _g = globalThis as unknown as { __costSimDdb?: DynamoDBDocumentClient };

function getClient(): DynamoDBDocumentClient {
  if (!_g.__costSimDdb) {
    const base = new DynamoDBClient({
      region: process.env.AWS_REGION ?? "ap-northeast-2",
    });
    _g.__costSimDdb = DynamoDBDocumentClient.from(base, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return _g.__costSimDdb;
}

function table(): string {
  const t = process.env.DYNAMODB_TABLE_NAME;
  if (!t) throw new Error("환경변수 DYNAMODB_TABLE_NAME 이 설정되지 않았습니다.");
  return t;
}

// ─── SK / PK 헬퍼 ────────────────────────────────────────────────────────────

const PK = (code: string) => `ROOM#${code}`;
const SK_META = "META";
const SK_PLAYER = (id: string) => `PLAYER#${id}`;
/** 라운드 번호를 3자리 패딩 → 사전순 정렬 보장 */
const SK_ROUND = (n: number) => `ROUND#${String(n).padStart(3, "0")}`;
const SK_SUBMISSION = (n: number, playerId: string) =>
  `ROUND#${String(n).padStart(3, "0")}#PLAYER#${playerId}`;

// ─── DynamoDB 아이템 내부 타입 ────────────────────────────────────────────────

type WithKey = { PK: string; SK: string };
type MetaItem = WithKey & RoomMeta;
type PlayerItem = WithKey & Player;
type RoundItem = WithKey & RoundData;
type SubmissionItem = WithKey & Submission;

// ─── 내부 헬퍼 ───────────────────────────────────────────────────────────────

async function put(item: Record<string, unknown>): Promise<void> {
  const input: PutCommandInput = { TableName: table(), Item: item };
  await getClient().send(new PutCommand(input));
}

async function getItem(key: WithKey): Promise<Record<string, unknown> | undefined> {
  const input: GetCommandInput = { TableName: table(), Key: key };
  const res = await getClient().send(new GetCommand(input));
  return res.Item as Record<string, unknown> | undefined;
}

/**
 * ROOM#{code} 파티션의 모든 아이템을 조회하여 RoomState 로 재조립.
 * 룸이 없으면 undefined 반환.
 */
async function assembleRoom(code: string): Promise<RoomState | undefined> {
  const input: QueryCommandInput = {
    TableName: table(),
    KeyConditionExpression: "PK = :pk",
    ExpressionAttributeValues: { ":pk": PK(code) },
  };
  const res = await getClient().send(new QueryCommand(input));
  const items = res.Items ?? [];
  if (items.length === 0) return undefined;

  let meta: RoomMeta | undefined;
  const players = new Map<string, Player>();
  const rounds = new Map<number, RoundData>();
  const submissions = new Map<string, Submission>();

  for (const item of items) {
    const sk = item.SK as string;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { PK: _pk, SK: _sk, ...rest } = item;

    if (sk === SK_META) {
      meta = rest as RoomMeta;
    } else if (sk.startsWith("PLAYER#")) {
      const p = rest as Player;
      players.set(p.id, p);
    } else if (/^ROUND#\d{3}$/.test(sk)) {
      const r = rest as RoundData;
      rounds.set(r.n, r);
    } else if (/^ROUND#\d{3}#PLAYER#/.test(sk)) {
      const s = rest as Submission;
      submissions.set(`${s.roundN}:${s.playerId}`, s);
    }
  }

  if (!meta) return undefined;
  return { meta, players, rounds, submissions };
}

/** UpdateExpression 동적 빌더 */
function buildUpdateExpr(patch: Record<string, unknown>): {
  UpdateExpression: string;
  ExpressionAttributeNames: Record<string, string>;
  ExpressionAttributeValues: Record<string, unknown>;
} | null {
  const parts: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    const n = `#f_${k}`;
    const vk = `:v_${k}`;
    parts.push(`${n} = ${vk}`);
    names[n] = k;
    values[vk] = v;
  }

  if (parts.length === 0) return null;
  return {
    UpdateExpression: `SET ${parts.join(", ")}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────
// 모든 함수는 async (DynamoDB I/O). storage.ts 와 동일 시그니처 + Promise 래핑.

export async function createRoom(meta: RoomMeta): Promise<RoomState> {
  const item: MetaItem = { PK: PK(meta.code), SK: SK_META, ...meta };
  await put(item as unknown as Record<string, unknown>);
  return { meta, players: new Map(), rounds: new Map(), submissions: new Map() };
}

export async function getRoom(code: string): Promise<RoomState | undefined> {
  return assembleRoom(code);
}

export async function updateRoomMeta(
  code: string,
  patch: Partial<RoomMeta>
): Promise<RoomState | undefined> {
  const key: WithKey = { PK: PK(code), SK: SK_META };
  const existing = await getItem(key);
  if (!existing) return undefined;

  const expr = buildUpdateExpr(patch as Record<string, unknown>);
  if (!expr) return assembleRoom(code); // 변경 없음

  const input: UpdateCommandInput = { TableName: table(), Key: key, ...expr };
  await getClient().send(new UpdateCommand(input));
  return assembleRoom(code);
}

export async function addPlayer(
  code: string,
  player: Player
): Promise<RoomState | undefined> {
  const metaKey: WithKey = { PK: PK(code), SK: SK_META };
  if (!(await getItem(metaKey))) return undefined;

  const item: PlayerItem = { PK: PK(code), SK: SK_PLAYER(player.id), ...player };
  await put(item as unknown as Record<string, unknown>);
  return assembleRoom(code);
}

export async function updatePlayer(
  code: string,
  playerId: string,
  patch: Partial<Player>
): Promise<RoomState | undefined> {
  const key: WithKey = { PK: PK(code), SK: SK_PLAYER(playerId) };
  if (!(await getItem(key))) return undefined;

  const expr = buildUpdateExpr(patch as Record<string, unknown>);
  if (!expr) return assembleRoom(code);

  const input: UpdateCommandInput = { TableName: table(), Key: key, ...expr };
  await getClient().send(new UpdateCommand(input));
  return assembleRoom(code);
}

export async function setRound(
  code: string,
  round: RoundData
): Promise<RoomState | undefined> {
  const metaKey: WithKey = { PK: PK(code), SK: SK_META };
  if (!(await getItem(metaKey))) return undefined;

  const item: RoundItem = { PK: PK(code), SK: SK_ROUND(round.n), ...round };
  await put(item as unknown as Record<string, unknown>);
  return assembleRoom(code);
}

export async function addSubmission(
  code: string,
  submission: Submission
): Promise<RoomState | undefined> {
  const metaKey: WithKey = { PK: PK(code), SK: SK_META };
  if (!(await getItem(metaKey))) return undefined;

  const item: SubmissionItem = {
    PK: PK(code),
    SK: SK_SUBMISSION(submission.roundN, submission.playerId),
    ...submission,
  };
  await put(item as unknown as Record<string, unknown>);
  return assembleRoom(code);
}

export async function deleteRoom(code: string): Promise<boolean> {
  // DynamoDB는 파티션 전체 삭제를 지원하지 않으므로 Query → 개별 Delete
  const queryInput: QueryCommandInput = {
    TableName: table(),
    KeyConditionExpression: "PK = :pk",
    ExpressionAttributeValues: { ":pk": PK(code) },
    ProjectionExpression: "PK, SK",
  };
  const res = await getClient().send(new QueryCommand(queryInput));
  const items = res.Items ?? [];
  if (items.length === 0) return false;

  // 순차 삭제 (아이템 수가 적어 BatchWrite 불필요; 필요 시 25개 묶음 BatchWriteItem으로 교체)
  await Promise.all(
    items.map((item) => {
      const input: DeleteCommandInput = {
        TableName: table(),
        Key: { PK: item.PK, SK: item.SK },
      };
      return getClient().send(new DeleteCommand(input));
    })
  );
  return true;
}

/**
 * 테스트 격리용 stub — DynamoDB 환경에서는 전체 스캔 삭제가 고비용이므로
 * 실질적 구현을 생략한다. 테스트는 in-memory fallback(env 미설정) 사용을 권장.
 */
export async function _clearAllRooms(): Promise<void> {
  console.warn(
    "[storage-dynamodb] _clearAllRooms()는 테스트 전용입니다. " +
      "DynamoDB 환경에서는 동작하지 않습니다. DYNAMODB_TABLE_NAME 을 해제하고 " +
      "in-memory 스토리지로 테스트하세요."
  );
}
