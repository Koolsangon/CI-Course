/**
 * Room + Round state machine (plan.md C.1).
 *
 * Room transitions:
 *   waiting → playing (강사가 라운드 1 시작 신호)
 *   playing → playing (라운드 종료 후 강사가 다음 라운드 신호)
 *   playing → ended   (라운드 4 종료 후 강사가 종합 발표 신호)
 *
 * Round transitions:
 *   not_started → in_progress (강사 시작 신호)
 *   in_progress → ended       (모든 학습자 100% 정답 OR 10분 캡 OR 강사 강제 종료)
 */

import {
  type RoomState,
  type RoomSnapshot,
  type RoomStatus,
  type RoundData,
  type RoundStatus
} from "./types";

export type RoomAction =
  | { type: "start_round"; round: number; caseId: string }
  | { type: "end_round"; round: number }
  | { type: "advance_round" } // 다음 라운드 진행 (현재 라운드 종료 후 다음 round.n 자동)
  | { type: "end_game" };     // 4 라운드 모두 종료 → ended

const ROOM_TRANSITIONS: Record<RoomStatus, RoomStatus[]> = {
  waiting: ["playing"],
  playing: ["playing", "ended"],
  ended: []
};

const ROUND_TRANSITIONS: Record<RoundStatus, RoundStatus[]> = {
  not_started: ["in_progress"],
  in_progress: ["ended"],
  ended: []
};

export function canTransitionRoom(from: RoomStatus, to: RoomStatus): boolean {
  return ROOM_TRANSITIONS[from].includes(to);
}

export function canTransitionRound(from: RoundStatus, to: RoundStatus): boolean {
  return ROUND_TRANSITIONS[from].includes(to);
}

/**
 * 라운드 시작 — currentRound = n, round status = in_progress, room status = playing.
 * 이전 라운드가 in_progress 상태면 거부 (먼저 end_round 호출 필요).
 */
export function startRound(
  state: RoomState,
  roundN: number,
  caseId: string,
  now: number
): { ok: true; round: RoundData } | { ok: false; reason: string } {
  // 이전 라운드가 in_progress 면 거부.
  for (const r of state.rounds.values()) {
    if (r.status === "in_progress") {
      return { ok: false, reason: `round ${r.n} still in_progress` };
    }
  }

  if (state.meta.status === "ended") {
    return { ok: false, reason: "game already ended" };
  }

  const round: RoundData = {
    n: roundN,
    caseId,
    status: "in_progress",
    startedAt: now
  };

  state.rounds.set(roundN, round);
  state.meta.status = "playing";
  state.meta.currentRound = roundN;

  return { ok: true, round };
}

/**
 * 라운드 종료 — round status = ended, room.currentRound 유지 (다음 라운드 시작 전까지).
 */
export function endRound(
  state: RoomState,
  roundN: number,
  now: number
): { ok: true; round: RoundData } | { ok: false; reason: string } {
  const round = state.rounds.get(roundN);
  if (!round) return { ok: false, reason: `round ${roundN} not found` };
  if (round.status !== "in_progress") {
    return { ok: false, reason: `round ${roundN} status=${round.status}, expected in_progress` };
  }

  round.status = "ended";
  round.endedAt = now;
  return { ok: true, round };
}

/**
 * 라운드 결과 초기화 — round 객체 + 해당 라운드의 모든 submissions 제거.
 * currentRound 가 이 라운드였다면 undefined 로 정리. 다른 ended/in_progress 라운드가 없으면
 * room.status 를 waiting 으로 복귀.
 */
export function resetRound(
  state: RoomState,
  roundN: number
): { ok: true } | { ok: false; reason: string } {
  const round = state.rounds.get(roundN);
  if (!round) return { ok: false, reason: `round ${roundN} not found` };

  state.rounds.delete(roundN);
  const prefix = `${roundN}:`;
  for (const key of Array.from(state.submissions.keys())) {
    if (key.startsWith(prefix)) state.submissions.delete(key);
  }

  if (state.meta.currentRound === roundN) {
    state.meta.currentRound = undefined;
  }

  const anyActive = Array.from(state.rounds.values()).some(
    (r) => r.status === "in_progress" || r.status === "ended"
  );
  if (!anyActive && state.meta.status !== "ended") {
    state.meta.status = "waiting";
  }

  return { ok: true };
}

/**
 * 게임 종료 — 모든 라운드 ended 상태에서 호출. room.status = ended.
 */
export function endGame(
  state: RoomState
): { ok: true } | { ok: false; reason: string } {
  if (!canTransitionRoom(state.meta.status, "ended")) {
    return { ok: false, reason: `room status=${state.meta.status}, cannot end` };
  }
  for (const r of state.rounds.values()) {
    if (r.status !== "ended") {
      return { ok: false, reason: `round ${r.n} not ended` };
    }
  }
  state.meta.status = "ended";
  state.meta.currentRound = undefined;
  return { ok: true };
}

/** Map 직렬화 — 폴링 응답용. */
export function toSnapshot(state: RoomState): RoomSnapshot {
  return {
    meta: state.meta,
    players: Array.from(state.players.values()),
    rounds: Array.from(state.rounds.values()).sort((a, b) => a.n - b.n),
    submissions: Array.from(state.submissions.values())
  };
}
