import { describe, it, expect } from "vitest";
import {
  aggregatePlayerScores,
  aggregateTeamScores,
  rankPlayers,
  rankTeams
} from "../time-aggregator";
import type { Player, Submission } from "../types";

const TIME_CAP = 600;

function p(id: string, name: string, team: number): Player {
  return { id, name, team, joinedAt: 1000 };
}

function sub(playerId: string, roundN: number, timeSec: number, completed = true): Submission {
  return {
    playerId,
    roundN,
    completionTimeSec: timeSec,
    completed,
    hintLevel: 0,
    submittedAt: 2000
  };
}

describe("aggregatePlayerScores", () => {
  it("4 라운드 모두 제출한 학습자 — 합 = 라운드 시간 sum", () => {
    const players = [p("u1", "Alice", 1)];
    const subs = [sub("u1", 1, 120), sub("u1", 2, 180), sub("u1", 3, 90), sub("u1", 4, 150)];
    const scores = aggregatePlayerScores(players, subs, 4, TIME_CAP);
    expect(scores[0].roundTimes).toEqual([120, 180, 90, 150]);
    expect(scores[0].totalTime).toBe(540);
  });

  it("미제출 라운드 — timeCapSec 적용", () => {
    const players = [p("u1", "Alice", 1)];
    const subs = [sub("u1", 1, 120), sub("u1", 3, 90)]; // round 2, 4 미제출
    const scores = aggregatePlayerScores(players, subs, 4, TIME_CAP);
    expect(scores[0].roundTimes).toEqual([120, TIME_CAP, 90, TIME_CAP]);
    expect(scores[0].totalTime).toBe(120 + TIME_CAP + 90 + TIME_CAP);
  });
});

describe("aggregateTeamScores", () => {
  it("팀 라운드 시간 = 팀원 최댓값", () => {
    const players = [p("u1", "A", 1), p("u2", "B", 1), p("u3", "C", 2)];
    const subs = [
      sub("u1", 1, 120), sub("u2", 1, 200), sub("u3", 1, 150),
      sub("u1", 2, 80),  sub("u2", 2, 100), sub("u3", 2, 90),
      sub("u1", 3, 60),  sub("u2", 3, 70),  sub("u3", 3, 50),
      sub("u1", 4, 40),  sub("u2", 4, 50),  sub("u3", 4, 30)
    ];
    const playerScores = aggregatePlayerScores(players, subs, 4, TIME_CAP);
    const teamScores = aggregateTeamScores(playerScores, 4);

    // 팀 1: 라운드별 max(u1, u2) = (200, 100, 70, 50). 합 420.
    const team1 = teamScores.find((t) => t.team === 1)!;
    expect(team1.roundTimes).toEqual([200, 100, 70, 50]);
    expect(team1.totalTime).toBe(420);
    expect(team1.members).toBe(2);

    // 팀 2: u3 단독 — max = u3 (150, 90, 50, 30). 합 320.
    const team2 = teamScores.find((t) => t.team === 2)!;
    expect(team2.roundTimes).toEqual([150, 90, 50, 30]);
    expect(team2.totalTime).toBe(320);
  });

  it("빈 팀 — 결과에 없음 (player 없으면 팀 미생성)", () => {
    const players = [p("u1", "A", 1)];
    const subs = [sub("u1", 1, 100)];
    const playerScores = aggregatePlayerScores(players, subs, 1, TIME_CAP);
    const teamScores = aggregateTeamScores(playerScores, 1);
    expect(teamScores.map((t) => t.team)).toEqual([1]);
  });
});

describe("rankPlayers / rankTeams", () => {
  it("rankPlayers — full 모드: 상위 3", () => {
    const players = [p("u1", "A", 1), p("u2", "B", 1), p("u3", "C", 1), p("u4", "D", 1)];
    const subs = [
      sub("u1", 1, 100), sub("u2", 1, 200), sub("u3", 1, 50), sub("u4", 1, 300)
    ];
    const scores = aggregatePlayerScores(players, subs, 1, TIME_CAP);
    const top = rankPlayers(scores, "full");
    expect(top.map((p) => p.playerId)).toEqual(["u3", "u1", "u2"]);
  });

  it("rankPlayers — winner_only 모드: 1등만", () => {
    const players = [p("u1", "A", 1), p("u2", "B", 1)];
    const subs = [sub("u1", 1, 100), sub("u2", 1, 200)];
    const scores = aggregatePlayerScores(players, subs, 1, TIME_CAP);
    expect(rankPlayers(scores, "winner_only").map((p) => p.playerId)).toEqual(["u1"]);
  });

  it("rankTeams — full 모드: 상위 3", () => {
    const teams = [
      { team: 1, roundTimes: [100], totalTime: 100, members: 2 },
      { team: 2, roundTimes: [50],  totalTime: 50,  members: 1 },
      { team: 3, roundTimes: [200], totalTime: 200, members: 3 }
    ];
    const top = rankTeams(teams, "full");
    expect(top.map((t) => t.team)).toEqual([2, 1, 3]);
  });
});
