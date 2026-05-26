/**
 * POST /api/rooms/{code}/rounds/{n}/submissions — 학습자가 라운드 결과 기록.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addSubmission, getRoom } from "@/lib/room/storage";

export const runtime = "nodejs";

const SubmitBody = z.object({
  playerId: z.string().min(1),
  completionTimeSec: z.number().min(0).max(7200),
  completed: z.boolean(),
  hintLevel: z.number().int().min(0).max(3)
});

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string; n: string } }
) {
  const room = await getRoom(params.code);
  if (!room) {
    return NextResponse.json({ error: "room not found" }, { status: 404 });
  }

  const roundN = Number.parseInt(params.n, 10);
  if (!Number.isFinite(roundN) || roundN < 1 || roundN > 4) {
    return NextResponse.json({ error: `bad round number: ${params.n}` }, { status: 400 });
  }

  const round = room.rounds.get(roundN);
  if (!round) {
    return NextResponse.json({ error: `round ${roundN} not started` }, { status: 404 });
  }
  if (round.status !== "in_progress") {
    return NextResponse.json(
      { error: `round ${roundN} status=${round.status}` },
      { status: 409 }
    );
  }

  let body: z.infer<typeof SubmitBody>;
  try {
    body = SubmitBody.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "invalid request" },
      { status: 400 }
    );
  }

  if (!room.players.has(body.playerId)) {
    return NextResponse.json({ error: "player not in room" }, { status: 404 });
  }

  await addSubmission(params.code, {
    playerId: body.playerId,
    roundN,
    completionTimeSec: body.completionTimeSec,
    completed: body.completed,
    hintLevel: body.hintLevel,
    submittedAt: Date.now()
  });

  return NextResponse.json({ ok: true });
}
