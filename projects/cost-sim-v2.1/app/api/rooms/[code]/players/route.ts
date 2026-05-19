/**
 * POST /api/rooms/{code}/players — 학습자 입장 (이름 + 팀 번호). UUID 발급.
 *
 * 학습자는 입장 시점 이후 localStorage 에 자신의 playerId 보관. 모든 후속 submission 에서
 * 그 ID 를 본문에 동봉.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addPlayer, getRoom } from "@/lib/room/storage";

export const runtime = "nodejs";

const JoinBody = z.object({
  name: z.string().min(1).max(40),
  team: z.number().int().min(1).max(10)
});

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const room = getRoom(params.code);
  if (!room) {
    return NextResponse.json({ error: "room not found" }, { status: 404 });
  }

  let body: z.infer<typeof JoinBody>;
  try {
    body = JoinBody.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "invalid request" },
      { status: 400 }
    );
  }

  if (body.team > room.meta.settings.teamCount) {
    return NextResponse.json(
      { error: `team ${body.team} out of range (max ${room.meta.settings.teamCount})` },
      { status: 400 }
    );
  }

  if (room.meta.status === "ended") {
    return NextResponse.json(
      { error: "room has ended — cannot join" },
      { status: 409 }
    );
  }

  if (!room.meta.enabled) {
    return NextResponse.json(
      { error: "room is disabled — cannot join" },
      { status: 409 }
    );
  }

  const id = crypto.randomUUID();
  addPlayer(params.code, {
    id,
    name: body.name,
    team: body.team,
    joinedAt: Date.now()
  });

  return NextResponse.json({ id, name: body.name, team: body.team });
}
