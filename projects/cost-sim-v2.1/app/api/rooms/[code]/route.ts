/**
 * GET    /api/rooms/{code} — 폴링용 룸 state 스냅샷. 학습자/강사 모두.
 * PATCH  /api/rooms/{code} — 강사 설정 + 라운드 신호. adminToken 필수.
 * DELETE /api/rooms/{code} — 강사 방 삭제. adminToken 필수.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { deleteRoom, getRoom, updateRoomMeta } from "@/lib/room/storage";
import { startRound, endRound, endGame, resetRound, toSnapshot } from "@/lib/room/state-machine";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { code: string } }
) {
  const room = getRoom(params.code);
  if (!room) {
    return NextResponse.json({ error: "room not found" }, { status: 404 });
  }
  return NextResponse.json(toSnapshot(room));
}

const SettingsPatch = z.object({
  timeCapSec: z.number().int().min(60).max(3600).optional(),
  teamCount: z.number().int().min(1).max(10).optional(),
  hintPenaltyEnabled: z.boolean().optional(),
  announcementMode: z.enum(["full", "winner_only"]).optional()
}).partial();

const ActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("start_round"),
    round: z.number().int().min(1).max(4),
    caseId: z.string().min(1)
  }),
  z.object({
    type: z.literal("end_round"),
    round: z.number().int().min(1).max(4)
  }),
  z.object({
    type: z.literal("reset_round"),
    round: z.number().int().min(1).max(4)
  }),
  z.object({
    type: z.literal("set_enabled"),
    enabled: z.boolean()
  }),
  z.object({ type: z.literal("end_game") })
]);

const PatchBody = z.object({
  adminToken: z.string().min(1),
  settings: SettingsPatch.optional(),
  action: ActionSchema.optional()
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const room = getRoom(params.code);
  if (!room) {
    return NextResponse.json({ error: "room not found" }, { status: 404 });
  }

  let body: z.infer<typeof PatchBody>;
  try {
    body = PatchBody.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "invalid request" },
      { status: 400 }
    );
  }

  if (body.adminToken !== room.meta.adminToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (body.settings) {
    updateRoomMeta(params.code, {
      settings: { ...room.meta.settings, ...body.settings }
    });
  }

  if (body.action) {
    const a = body.action;
    const now = Date.now();
    let r: { ok: true } | { ok: false; reason: string };
    if (a.type === "start_round") {
      r = startRound(room, a.round, a.caseId, now);
    } else if (a.type === "end_round") {
      r = endRound(room, a.round, now);
    } else if (a.type === "reset_round") {
      r = resetRound(room, a.round);
    } else if (a.type === "set_enabled") {
      updateRoomMeta(params.code, { enabled: a.enabled });
      r = { ok: true };
    } else {
      r = endGame(room);
    }
    if (!r.ok) {
      return NextResponse.json({ error: r.reason }, { status: 409 });
    }
  }

  return NextResponse.json(toSnapshot(room));
}

const DeleteBody = z.object({ adminToken: z.string().min(1) });

export async function DELETE(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const room = getRoom(params.code);
  if (!room) {
    return NextResponse.json({ error: "room not found" }, { status: 404 });
  }

  let body: z.infer<typeof DeleteBody>;
  try {
    body = DeleteBody.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "invalid request" },
      { status: 400 }
    );
  }

  if (body.adminToken !== room.meta.adminToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  deleteRoom(params.code);
  return NextResponse.json({ ok: true });
}
