/**
 * 라운드/팀 시간 집계 (plan.md C.4·C.5).
 *
 * 규칙 (decision-log.md 2026-05-13):
 *   - 개인 라운드 시간 = submission.completionTimeSec. 미제출 시 timeCapSec.
 *   - 개인 총 시간 = 4 라운드 합산.
 *   - 팀 라운드 시간 = 팀원 라운드 시간의 *최댓값* (가장 늦은 사람).
 *   - 팀 총 시간 = 4 라운드 max 합산.
 */

import type { Player, Submission } from "./types";

export interface PlayerScore {
  playerId: string;
  name: string;
  team: number;
  roundTimes: number[]; // index 0 = round 1
  totalTime: number;
}

export interface TeamScore {
  team: number;
  roundTimes: number[]; // max of team members per round
  totalTime: number;
  members: number;
}

/** 개인별 라운드 시간 + 총합. 미제출 라운드는 timeCapSec 적용. */
export function aggregatePlayerScores(
  players: Player[],
  submissions: Submission[],
  totalRounds: number,
  timeCapSec: number
): PlayerScore[] {
  const byPlayer = new Map<string, Map<number, Submission>>();
  for (const s of submissions) {
    if (!byPlayer.has(s.playerId)) byPlayer.set(s.playerId, new Map());
    byPlayer.get(s.playerId)!.set(s.roundN, s);
  }

  return players.map((p) => {
    const subs = byPlayer.get(p.id);
    const roundTimes: number[] = [];
    for (let n = 1; n <= totalRounds; n++) {
      const s = subs?.get(n);
      roundTimes.push(s ? s.completionTimeSec : timeCapSec);
    }
    return {
      playerId: p.id,
      name: p.name,
      team: p.team,
      roundTimes,
      totalTime: roundTimes.reduce((a, b) => a + b, 0)
    };
  });
}

/** 팀별: 각 라운드의 *팀원 최댓값* + 4 라운드 합. 빈 팀은 결과에서 제외. */
export function aggregateTeamScores(
  playerScores: PlayerScore[],
  totalRounds: number
): TeamScore[] {
  const byTeam = new Map<number, PlayerScore[]>();
  for (const ps of playerScores) {
    if (!byTeam.has(ps.team)) byTeam.set(ps.team, []);
    byTeam.get(ps.team)!.push(ps);
  }

  const teams: TeamScore[] = [];
  for (const [team, members] of byTeam.entries()) {
    const roundTimes: number[] = [];
    for (let n = 0; n < totalRounds; n++) {
      const maxTime = Math.max(...members.map((m) => m.roundTimes[n] ?? 0));
      roundTimes.push(maxTime);
    }
    teams.push({
      team,
      roundTimes,
      totalTime: roundTimes.reduce((a, b) => a + b, 0),
      members: members.length
    });
  }
  return teams;
}

/** 개인 1·2·3등 (totalTime 오름차순) — winner_only 모드면 1등만. */
export function rankPlayers(
  scores: PlayerScore[],
  mode: "full" | "winner_only" = "full"
): PlayerScore[] {
  const sorted = [...scores].sort((a, b) => a.totalTime - b.totalTime);
  return mode === "winner_only" ? sorted.slice(0, 1) : sorted.slice(0, 3);
}

/** 팀 1·2·3등 — 동일 규칙. */
export function rankTeams(
  teams: TeamScore[],
  mode: "full" | "winner_only" = "full"
): TeamScore[] {
  const sorted = [...teams].sort((a, b) => a.totalTime - b.totalTime);
  return mode === "winner_only" ? sorted.slice(0, 1) : sorted.slice(0, 3);
}
