/**
 * POST /api/rooms — 강사가 새 룸 생성. 룸 코드 4자 + admin_token 12hex 발급.
 *
 * Auth: 없음. 누구나 룸 생성 가능. admin_token 만 *생성자 만이* 본다 (응답에만 노출).
 *       이후 instructor 액션은 PATCH 시 adminToken 본문 동봉.
 */

import { NextResponse } from "next/server";
import { createRoom, getRoom } from "@/lib/room/storage";
import { DEFAULT_ROOM_SETTINGS, type RoomMeta } from "@/lib/room/types";

export const runtime = "nodejs";

// 0·O·1·I 처럼 헷갈리는 문자 제외. 32 문자 × 4 자리 = 1,048,576 조합.
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function genCode(): string {
  let s = "";
  for (let i = 0; i < 4; i++) {
    s += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)];
  }
  return s;
}

function genToken(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST() {
  // 코드 충돌 회피 — 최대 10회 재시도.
  let code = genCode();
  for (let i = 0; i < 10 && (await getRoom(code)); i++) {
    code = genCode();
  }
  if ((await getRoom(code)) !== undefined) {
    return NextResponse.json({ error: "code collision after 10 tries" }, { status: 503 });
  }

  const meta: RoomMeta = {
    code,
    adminToken: genToken(),
    createdAt: Date.now(),
    status: "waiting",
    settings: DEFAULT_ROOM_SETTINGS,
    enabled: true
  };
  await createRoom(meta);

  return NextResponse.json({ code, adminToken: meta.adminToken });
}
