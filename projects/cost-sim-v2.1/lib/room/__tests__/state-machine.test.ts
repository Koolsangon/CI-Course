import { describe, it, expect, beforeEach } from "vitest";
import {
  canTransitionRoom,
  canTransitionRound,
  startRound,
  endRound,
  endGame,
  resetRound,
  toSnapshot
} from "../state-machine";
import { addSubmission, createRoom, _clearAllRooms } from "../storage";
import { DEFAULT_ROOM_SETTINGS, type RoomMeta } from "../types";

function makeMeta(code: string): RoomMeta {
  return {
    code,
    adminToken: "tok123456",
    createdAt: 1000,
    status: "waiting",
    settings: DEFAULT_ROOM_SETTINGS,
    enabled: true
  };
}

describe("Room state transitions", () => {
  beforeEach(async () => { await _clearAllRooms(); });

  it("waiting → playing 허용, ended 거부", () => {
    expect(canTransitionRoom("waiting", "playing")).toBe(true);
    expect(canTransitionRoom("waiting", "ended")).toBe(false);
  });

  it("playing → playing (다음 라운드) 및 ended 허용", () => {
    expect(canTransitionRoom("playing", "playing")).toBe(true);
    expect(canTransitionRoom("playing", "ended")).toBe(true);
  });

  it("ended 는 final state — 어떤 전이도 거부", () => {
    expect(canTransitionRoom("ended", "playing")).toBe(false);
    expect(canTransitionRoom("ended", "ended")).toBe(false);
  });
});

describe("Round state transitions", () => {
  it("not_started → in_progress 허용, ended 거부", () => {
    expect(canTransitionRound("not_started", "in_progress")).toBe(true);
    expect(canTransitionRound("not_started", "ended")).toBe(false);
  });

  it("in_progress → ended 허용", () => {
    expect(canTransitionRound("in_progress", "ended")).toBe(true);
  });
});

describe("startRound + endRound + endGame 흐름", () => {
  beforeEach(async () => { await _clearAllRooms(); });

  it("startRound — round 1 시작 → room.status=playing, currentRound=1", async () => {
    const room = await createRoom(makeMeta("ABCD"));
    const r = startRound(room, 1, "01-loading", 2000);
    expect(r.ok).toBe(true);
    expect(room.meta.status).toBe("playing");
    expect(room.meta.currentRound).toBe(1);
    expect(room.rounds.get(1)?.status).toBe("in_progress");
  });

  it("startRound — 이전 라운드 in_progress 상태에서 다음 라운드 거부", async () => {
    const room = await createRoom(makeMeta("ABCD"));
    startRound(room, 1, "01-loading", 2000);
    const r = startRound(room, 2, "04-material-yield", 3000);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("in_progress");
  });

  it("endRound → 다음 라운드 시작 가능", async () => {
    const room = await createRoom(makeMeta("ABCD"));
    startRound(room, 1, "01-loading", 2000);
    endRound(room, 1, 3000);
    const r2 = startRound(room, 2, "04-material-yield", 4000);
    expect(r2.ok).toBe(true);
    expect(room.meta.currentRound).toBe(2);
  });

  it("endGame — 모든 라운드 종료 후 ended", async () => {
    const room = await createRoom(makeMeta("ABCD"));
    for (let n = 1; n <= 4; n++) {
      startRound(room, n, "01-loading", 2000 + n * 1000);
      endRound(room, n, 2500 + n * 1000);
    }
    const r = endGame(room);
    expect(r.ok).toBe(true);
    expect(room.meta.status).toBe("ended");
    expect(room.meta.currentRound).toBeUndefined();
  });

  it("endGame — 미완료 라운드 있으면 거부", async () => {
    const room = await createRoom(makeMeta("ABCD"));
    startRound(room, 1, "01-loading", 2000);
    // round 1 미종료
    const r = endGame(room);
    expect(r.ok).toBe(false);
  });
});

describe("resetRound — 라운드 결과 초기화", () => {
  beforeEach(async () => { await _clearAllRooms(); });

  it("ended 라운드 reset — round + 그 라운드 submissions 제거", async () => {
    const room = await createRoom(makeMeta("ABCD"));
    startRound(room, 1, "01-loading", 2000);
    await addSubmission("ABCD", {
      playerId: "p1",
      roundN: 1,
      completionTimeSec: 120,
      completed: true,
      hintLevel: 0,
      submittedAt: 2500
    });
    endRound(room, 1, 3000);

    const r = resetRound(room, 1);
    expect(r.ok).toBe(true);
    expect(room.rounds.has(1)).toBe(false);
    expect(room.submissions.has("1:p1")).toBe(false);
    expect(room.meta.currentRound).toBeUndefined();
    expect(room.meta.status).toBe("waiting");
  });

  it("다른 라운드 submissions 는 보존", async () => {
    const room = await createRoom(makeMeta("ABCD"));
    startRound(room, 1, "01-loading", 2000);
    await addSubmission("ABCD", {
      playerId: "p1",
      roundN: 1,
      completionTimeSec: 120,
      completed: true,
      hintLevel: 0,
      submittedAt: 2500
    });
    endRound(room, 1, 3000);
    startRound(room, 2, "04-material-yield", 4000);
    await addSubmission("ABCD", {
      playerId: "p1",
      roundN: 2,
      completionTimeSec: 90,
      completed: true,
      hintLevel: 1,
      submittedAt: 4500
    });

    resetRound(room, 1);
    expect(room.submissions.has("2:p1")).toBe(true);
    expect(room.rounds.get(2)?.status).toBe("in_progress");
  });

  it("존재하지 않는 라운드 — 거부", async () => {
    const room = await createRoom(makeMeta("ABCD"));
    const r = resetRound(room, 3);
    expect(r.ok).toBe(false);
  });
});

describe("toSnapshot — Map 직렬화", () => {
  beforeEach(async () => { await _clearAllRooms(); });

  it("빈 룸 — 빈 배열들 반환", async () => {
    const room = await createRoom(makeMeta("ABCD"));
    const snap = toSnapshot(room);
    expect(snap.meta.code).toBe("ABCD");
    expect(snap.players).toEqual([]);
    expect(snap.rounds).toEqual([]);
    expect(snap.submissions).toEqual([]);
  });

  it("라운드 순서 정렬 (n 오름차순)", async () => {
    const room = await createRoom(makeMeta("ABCD"));
    startRound(room, 1, "01-loading", 2000);
    endRound(room, 1, 3000);
    startRound(room, 2, "04-material-yield", 4000);
    const snap = toSnapshot(room);
    expect(snap.rounds.map((r) => r.n)).toEqual([1, 2]);
  });
});
