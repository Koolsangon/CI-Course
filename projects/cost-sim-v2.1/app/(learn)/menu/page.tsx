"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TreePine, Gamepad2, ArrowLeft, LogOut, Trophy, Medal } from "lucide-react";
import { useRoomState } from "@/lib/hooks/useRoomState";
import { clearRoomContext, loadRoomContext, type RoomContext } from "@/lib/player";
import {
  aggregatePlayerScores,
  aggregateTeamScores,
  rankPlayers,
  rankTeams
} from "@/lib/room/time-aggregator";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function MenuPage() {
  const router = useRouter();
  const [ctx, setCtx] = useState<RoomContext | null>(null);

  useEffect(() => {
    setCtx(loadRoomContext());
  }, []);

  const { snapshot, notFound } = useRoomState(ctx?.code ?? null);

  // 강사가 라운드 시작 → 자동으로 게임 모드 워크시트 진입.
  useEffect(() => {
    if (!snapshot || !ctx) return;
    if (snapshot.meta.status !== "playing" || snapshot.meta.currentRound === undefined) return;
    const current = snapshot.rounds.find((r) => r.n === snapshot.meta.currentRound);
    if (current?.status !== "in_progress") return;
    // 학습자가 이 라운드에 이미 제출했으면 머무름 (제출 후 /menu 로 복귀 — 이중 진입 차단).
    const mySub = snapshot.submissions.find(
      (s) => s.roundN === current.n && s.playerId === ctx.playerId
    );
    if (mySub) return;
    router.push(`/cases/${current.caseId}?game=true&room=${ctx.code}&round=${current.n}`);
  }, [snapshot, ctx, router]);

  // 룸이 사라지면 컨텍스트 정리.
  useEffect(() => {
    if (notFound && ctx) {
      clearRoomContext();
      setCtx(null);
    }
  }, [notFound, ctx]);

  function handleLeave() {
    clearRoomContext();
    setCtx(null);
    router.push("/");
  }

  // 종합 발표 — 룸 종료 시 개인·팀 순위.
  const announcement = useMemo(() => {
    if (!snapshot || snapshot.meta.status !== "ended") return null;
    const totalRounds = Math.max(...snapshot.rounds.map((r) => r.n), 0);
    const cap = snapshot.meta.settings.timeCapSec;
    const playerScores = aggregatePlayerScores(snapshot.players, snapshot.submissions, totalRounds, cap);
    const teamScores = aggregateTeamScores(playerScores, totalRounds);
    const mode = snapshot.meta.settings.announcementMode;
    return {
      players: rankPlayers(playerScores, mode),
      teams: rankTeams(teamScores, mode),
      totalRounds
    };
  }, [snapshot]);

  // 라운드 결과 — 가장 최근 종료된 라운드의 전체 리더보드 (학습자가 게임에서 빠져나온 직후).
  const lastEndedRound = useMemo(() => {
    if (!snapshot || snapshot.meta.status === "ended") return null;
    const ended = [...snapshot.rounds].filter((r) => r.status === "ended").sort((a, b) => b.n - a.n);
    if (ended.length === 0) return null;
    const r = ended[0];
    const subs = snapshot.submissions
      .filter((s) => s.roundN === r.n)
      .sort((a, b) => a.completionTimeSec - b.completionTimeSec);
    // 학습자가 이 라운드 제출자 중에 있을 때만 표시 (아직 안 푼 라운드는 결과 노출 X).
    const mySub = subs.find((s) => s.playerId === ctx?.playerId);
    if (!mySub) return null;
    return { round: r, submissions: subs, mySub };
  }, [snapshot, ctx?.playerId]);

  return (
    <main className="flex min-h-screen flex-col bg-[hsl(var(--bg))]">
      <header className="flex items-center gap-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-100)/0.85)] px-4 py-3 backdrop-blur-md">
        <Link
          href="/"
          className="flex h-8 w-8 items-center justify-center rounded-xl text-[hsl(var(--muted))] transition-colors hover:bg-[hsl(var(--surface-200))] hover:text-[hsl(var(--fg))]"
          aria-label="홈으로"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-sm font-bold text-[hsl(var(--fg))]">메뉴</h1>
        {ctx && (
          <div className="ml-auto flex items-center gap-2 text-xs text-[hsl(var(--muted))]">
            <span className="hidden sm:inline">{ctx.name} · 팀 {ctx.team}</span>
            <span className="rounded-md bg-[hsl(var(--accent)/0.12)] px-2 py-0.5 font-mono font-bold text-[hsl(var(--accent))]">
              {ctx.code}
            </span>
            <button
              type="button"
              onClick={handleLeave}
              aria-label="룸 나가기"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[hsl(var(--muted))] hover:bg-[hsl(var(--surface-200))] hover:text-[hsl(var(--danger))]"
              title="룸 나가기"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
        {/* 종합 발표 — 룸 종료 시 */}
        {announcement && (
          <section className="flex flex-col gap-4 rounded-2xl border border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.06)] px-5 py-5">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-[hsl(var(--accent))]" />
              <h2 className="text-lg font-bold text-[hsl(var(--accent))]">종합 발표 — 모든 라운드 종료</h2>
            </div>

            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[hsl(var(--fg))]">
                <Medal className="h-3.5 w-3.5" /> 개인 순위
              </h3>
              <ul className="flex flex-col gap-1">
                {announcement.players.map((p, idx) => (
                  <li
                    key={p.playerId}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                      p.playerId === ctx?.playerId
                        ? "bg-[hsl(var(--accent)/0.2)] font-semibold"
                        : "bg-[hsl(var(--surface-100))]"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-mono tabular-nums text-[hsl(var(--accent))]">{idx + 1}</span>
                      <span>{p.name}</span>
                      <span className="text-[10px] text-[hsl(var(--muted))]">팀 {p.team}</span>
                    </span>
                    <span className="font-mono tabular-nums text-[hsl(var(--fg)/0.8)]">{formatTime(p.totalTime)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[hsl(var(--fg))]">
                <Medal className="h-3.5 w-3.5" /> 팀 순위 (라운드별 최댓값 합)
              </h3>
              <ul className="flex flex-col gap-1">
                {announcement.teams.map((t, idx) => (
                  <li
                    key={t.team}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                      t.team === ctx?.team
                        ? "bg-[hsl(var(--accent)/0.2)] font-semibold"
                        : "bg-[hsl(var(--surface-100))]"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-mono tabular-nums text-[hsl(var(--accent))]">{idx + 1}</span>
                      <span>팀 {t.team}</span>
                      <span className="text-[10px] text-[hsl(var(--muted))]">({t.members}명)</span>
                    </span>
                    <span className="font-mono tabular-nums text-[hsl(var(--fg)/0.8)]">{formatTime(t.totalTime)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* 라운드 종료 직후 결과 + 다음 라운드 대기 */}
        {!announcement && lastEndedRound && (
          <section className="flex flex-col gap-3 rounded-2xl border border-[hsl(var(--accent)/0.4)] bg-[hsl(var(--accent)/0.05)] px-4 py-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-[hsl(var(--accent))]" />
              <h2 className="text-sm font-bold text-[hsl(var(--accent))]">
                라운드 {lastEndedRound.round.n} 결과
              </h2>
              <span className="ml-auto text-[10px] text-[hsl(var(--muted))]">
                다음 라운드 신호 대기 중…
              </span>
            </div>
            <ul className="flex flex-col gap-0.5">
              {lastEndedRound.submissions.slice(0, 5).map((s, idx) => {
                const player = snapshot?.players.find((p) => p.id === s.playerId);
                const isMe = s.playerId === ctx?.playerId;
                return (
                  <li
                    key={s.playerId}
                    className={`flex items-center justify-between rounded-lg px-2 py-1 text-xs ${
                      isMe ? "bg-[hsl(var(--accent)/0.18)] font-semibold" : ""
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-6 text-center font-mono tabular-nums text-[hsl(var(--muted))]">{idx + 1}</span>
                      <span>{player?.name ?? s.playerId.slice(0, 6)}</span>
                      {isMe && <span className="text-[10px] text-[hsl(var(--accent))]">(나)</span>}
                      {!s.completed && <span className="text-[10px] text-[hsl(var(--warn))]">(캡)</span>}
                    </span>
                    <span className="font-mono tabular-nums text-[hsl(var(--fg)/0.8)]">
                      {formatTime(s.completionTimeSec)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* 게임 모드 대기 (룸 컨텍스트 있고, 종합/라운드 결과 둘 다 없을 때) */}
        {ctx && !announcement && !lastEndedRound && (
          <div className="flex flex-col gap-2 rounded-2xl border border-[hsl(var(--accent)/0.4)] bg-[hsl(var(--accent)/0.05)] px-4 py-3">
            <div className="flex items-center gap-2">
              <Gamepad2 className="h-4 w-4 text-[hsl(var(--accent))]" />
              <span className="text-sm font-bold text-[hsl(var(--accent))]">게임 모드 대기 중</span>
            </div>
            <p className="text-xs text-[hsl(var(--muted))]">
              강사가 라운드를 시작하면 자동으로 워크시트로 이동합니다.{" "}
              {snapshot && (
                <span className="ml-1 font-mono">
                  상태: {snapshot.meta.status}
                  {snapshot.meta.currentRound !== undefined && ` · R${snapshot.meta.currentRound}`}
                </span>
              )}
            </p>
          </div>
        )}

        {!ctx && (
          <p className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] px-4 py-3 text-xs text-[hsl(var(--muted))]">
            현재 룸에 입장하지 않은 상태입니다. 자유 실험실과 워크시트는 그대로 이용 가능합니다.
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/sandbox"
            className="flex flex-col gap-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] px-4 py-4 transition-colors hover:border-[hsl(var(--accent)/0.4)]"
          >
            <div className="flex items-center gap-2">
              <TreePine className="h-4 w-4 text-[hsl(var(--accent))]" />
              <span className="text-sm font-bold text-[hsl(var(--fg))]">자유 실험실</span>
            </div>
            <p className="text-xs text-[hsl(var(--muted))]">7변수 슬라이더로 원가 트리를 자유 탐색합니다.</p>
          </Link>
          <Link
            href="/cases"
            className="flex flex-col gap-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] px-4 py-4 transition-colors hover:border-[hsl(var(--success)/0.4)]"
          >
            <div className="flex items-center gap-2">
              <Gamepad2 className="h-4 w-4 text-[hsl(var(--success))]" />
              <span className="text-sm font-bold text-[hsl(var(--fg))]">워크시트 (연습 모드)</span>
            </div>
            <p className="text-xs text-[hsl(var(--muted))]">4개 케이스 워크시트로 수식을 검증합니다.</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
