"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Play, Power, PowerOff, RotateCcw, StopCircle, Trash2, Trophy } from "lucide-react";
import { useRoomState } from "@/lib/hooks/useRoomState";
import { getAdminToken, removeAdminToken } from "@/lib/instructor";
import { CASE_ORDER, getCase } from "@/lib/cases";
import { DEFAULT_ROOM_SETTINGS, type RoomSettings } from "@/lib/room/types";
import {
  aggregatePlayerScores,
  aggregateTeamScores,
  rankPlayers,
  rankTeams
} from "@/lib/room/time-aggregator";

const DEFAULT_ROUND_CASES = CASE_ORDER; // ["01-loading", "04-material-yield", "05-cuts-mask", "06-tact-investment"]

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function InstructorRoomPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params?.code;
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!code) return;
    const t = getAdminToken(code);
    if (!t) {
      router.replace("/instructor");
      return;
    }
    setAdminToken(t);
  }, [code, router]);

  const { snapshot, notFound } = useRoomState(code ?? null);

  // 설정 패널 로컬 state — 폴링으로 reset 되지 않도록 dirty 추적.
  const [settingsDraft, setSettingsDraft] = useState<RoomSettings | null>(null);
  useEffect(() => {
    if (!settingsDraft && snapshot) {
      setSettingsDraft(snapshot.meta.settings);
    }
  }, [snapshot, settingsDraft]);

  async function patch(body: object) {
    if (!code || !adminToken) return;
    setActing(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminToken, ...body })
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? `HTTP ${res.status}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "네트워크 오류");
    } finally {
      setActing(false);
    }
  }

  function startRound(n: number) {
    const caseId = DEFAULT_ROUND_CASES[(n - 1) % DEFAULT_ROUND_CASES.length];
    void patch({ action: { type: "start_round", round: n, caseId } });
  }

  function endRound(n: number) {
    void patch({ action: { type: "end_round", round: n } });
  }

  function resetRoundAction(n: number) {
    if (!window.confirm(`라운드 ${n} 의 결과를 초기화하시겠습니까?\n이 라운드의 학습자 제출이 모두 삭제됩니다.`)) {
      return;
    }
    void patch({ action: { type: "reset_round", round: n } });
  }

  function toggleEnabled() {
    if (!snapshot) return;
    void patch({ action: { type: "set_enabled", enabled: !snapshot.meta.enabled } });
  }

  function endGame() {
    void patch({ action: { type: "end_game" } });
  }

  function applySettings() {
    if (!settingsDraft) return;
    void patch({ settings: settingsDraft });
  }

  function resetSettings() {
    setSettingsDraft(DEFAULT_ROOM_SETTINGS);
    void patch({ settings: DEFAULT_ROOM_SETTINGS });
  }

  async function deleteRoom() {
    if (!code || !adminToken) return;
    if (!window.confirm(`방 ${code} 을(를) 삭제하시겠습니까?\n학습자 데이터가 모두 사라지며 되돌릴 수 없습니다.`)) {
      return;
    }
    setActing(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${code}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminToken })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      removeAdminToken(code);
      router.replace("/instructor");
    } catch (e) {
      setError(e instanceof Error ? e.message : "네트워크 오류");
    } finally {
      setActing(false);
    }
  }

  // 종합 발표 — 모든 라운드 종료 시 개인·팀 순위.
  const announcement = useMemo(() => {
    if (!snapshot || snapshot.meta.status !== "ended") return null;
    const totalRounds = Math.max(...snapshot.rounds.map((r) => r.n), 0);
    const cap = snapshot.meta.settings.timeCapSec;
    const playerScores = aggregatePlayerScores(snapshot.players, snapshot.submissions, totalRounds, cap);
    const teamScores = aggregateTeamScores(playerScores, totalRounds);
    const mode = snapshot.meta.settings.announcementMode;
    return {
      players: rankPlayers(playerScores, mode),
      teams: rankTeams(teamScores, mode)
    };
  }, [snapshot]);

  if (notFound) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[hsl(var(--bg))] p-6">
        <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-[hsl(var(--danger)/0.4)] bg-[hsl(var(--surface-100))] p-6 text-center">
          <p className="text-sm font-bold text-[hsl(var(--danger))]">룸을 찾을 수 없습니다</p>
          <p className="text-xs text-[hsl(var(--muted))]">
            서버 재시작으로 in-memory 룸이 사라졌을 수 있어요. 새 룸을 만들어 주세요.
          </p>
          <Link
            href="/instructor"
            className="rounded-xl bg-[hsl(var(--accent))] px-4 py-2 text-sm font-semibold text-white"
          >
            강사 뷰로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  if (!snapshot || !adminToken) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[hsl(var(--bg))]">
        <p className="text-sm text-[hsl(var(--muted))]">로딩 중...</p>
      </main>
    );
  }

  const currentRound = snapshot.meta.currentRound;
  const playersByTeam: Record<number, typeof snapshot.players> = {};
  for (const p of snapshot.players) {
    if (!playersByTeam[p.team]) playersByTeam[p.team] = [];
    playersByTeam[p.team].push(p);
  }

  return (
    <main className="flex min-h-screen flex-col bg-[hsl(var(--bg))]">
      <header className="flex items-center gap-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-100)/0.85)] px-4 py-3 backdrop-blur-md">
        <Link
          href="/instructor"
          className="flex h-8 w-8 items-center justify-center rounded-xl text-[hsl(var(--muted))] transition-colors hover:bg-[hsl(var(--surface-200))] hover:text-[hsl(var(--fg))]"
          aria-label="강사 뷰 목록"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex flex-col">
          <h1 className="text-sm font-bold text-[hsl(var(--fg))]">강사 뷰</h1>
          <span className="font-mono text-xs font-bold tracking-widest text-[hsl(var(--accent))]">
            {snapshot.meta.code}
          </span>
        </div>
        <span className="ml-auto rounded-md bg-[hsl(var(--surface-200))] px-2 py-1 text-[10px] font-bold text-[hsl(var(--muted))]">
          {snapshot.meta.status}{currentRound !== undefined && ` · R${currentRound}`}
        </span>
        <span
          className={`rounded-md px-2 py-1 text-[10px] font-bold ${
            snapshot.meta.enabled
              ? "bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]"
              : "bg-[hsl(var(--muted)/0.15)] text-[hsl(var(--muted))]"
          }`}
          title={snapshot.meta.enabled ? "학습자 입장 허용 중" : "학습자 신규 입장 차단 중"}
        >
          {snapshot.meta.enabled ? "활성" : "비활성"}
        </span>
        <button
          type="button"
          onClick={toggleEnabled}
          disabled={acting}
          aria-label={snapshot.meta.enabled ? "비활성화" : "활성화"}
          title={snapshot.meta.enabled ? "비활성화 — 학습자 신규 입장 차단" : "활성화 — 학습자 입장 허용"}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-[hsl(var(--muted))] transition-colors hover:bg-[hsl(var(--surface-200))] hover:text-[hsl(var(--accent))] disabled:opacity-40"
        >
          {snapshot.meta.enabled ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={deleteRoom}
          disabled={acting}
          aria-label="방 삭제"
          title="방 삭제 (되돌릴 수 없음)"
          className="flex h-8 w-8 items-center justify-center rounded-xl text-[hsl(var(--muted))] transition-colors hover:bg-[hsl(var(--danger)/0.1)] hover:text-[hsl(var(--danger))] disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-5">
        {error && (
          <p className="rounded-xl border border-[hsl(var(--danger)/0.4)] bg-[hsl(var(--danger)/0.05)] px-3 py-2 text-xs text-[hsl(var(--danger))]">
            {error}
          </p>
        )}

        {/* 설정 패널 */}
        {settingsDraft && (
          <section className="flex flex-col gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] px-4 py-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted))]">설정</h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="flex flex-col gap-1">
                <span className="text-[hsl(var(--muted))]">시간 캡 (초)</span>
                <input
                  type="number"
                  min={60}
                  max={3600}
                  value={settingsDraft.timeCapSec}
                  onChange={(e) =>
                    setSettingsDraft({ ...settingsDraft, timeCapSec: parseInt(e.target.value, 10) || 600 })
                  }
                  className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.5)] px-2 py-1 tabular-nums"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[hsl(var(--muted))]">팀 수 (1~10)</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={settingsDraft.teamCount}
                  onChange={(e) =>
                    setSettingsDraft({ ...settingsDraft, teamCount: parseInt(e.target.value, 10) || 5 })
                  }
                  className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.5)] px-2 py-1 tabular-nums"
                />
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settingsDraft.hintPenaltyEnabled}
                  onChange={(e) =>
                    setSettingsDraft({ ...settingsDraft, hintPenaltyEnabled: e.target.checked })
                  }
                />
                <span>힌트 차감 ON</span>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[hsl(var(--muted))]">발표 카테고리</span>
                <select
                  value={settingsDraft.announcementMode}
                  onChange={(e) =>
                    setSettingsDraft({ ...settingsDraft, announcementMode: e.target.value as RoomSettings["announcementMode"] })
                  }
                  className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.5)] px-2 py-1"
                >
                  <option value="full">1·2·3등 모두</option>
                  <option value="winner_only">1등만</option>
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={resetSettings}
                disabled={acting}
                className="flex items-center gap-1 rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--muted))] hover:bg-[hsl(var(--surface-200))] hover:text-[hsl(var(--fg))] disabled:opacity-40"
                title="시간 캡·팀 수·힌트·발표 모드를 기본값으로 초기화"
              >
                <RotateCcw className="h-3 w-3" /> 기본값 초기화
              </button>
              <button
                type="button"
                onClick={applySettings}
                disabled={acting}
                className="rounded-lg border border-[hsl(var(--accent))] bg-[hsl(var(--accent))] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[hsl(var(--accent)/0.9)] disabled:opacity-40"
              >
                설정 적용
              </button>
            </div>
          </section>
        )}

        {/* 라운드 컨트롤 */}
        <section className="flex flex-col gap-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] px-4 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted))]">
            라운드 컨트롤
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((n) => {
              const round = snapshot.rounds.find((r) => r.n === n);
              const status = round?.status ?? "not_started";
              const inProgress = status === "in_progress";
              const ended = status === "ended";
              return (
                <div key={n} className="flex flex-col items-center gap-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.3)] p-2">
                  <span className="text-xs font-bold text-[hsl(var(--fg))]">R{n}</span>
                  <span className="text-[10px] text-[hsl(var(--muted))]">{getCase(DEFAULT_ROUND_CASES[n - 1])?.title}</span>
                  <span className={`text-[10px] font-mono ${inProgress ? "text-[hsl(var(--warn))]" : ended ? "text-[hsl(var(--success))]" : "text-[hsl(var(--muted))]"}`}>
                    {status}
                  </span>
                  {!round && (
                    <button
                      type="button"
                      onClick={() => startRound(n)}
                      disabled={acting || snapshot.meta.status === "ended"}
                      className="flex items-center gap-0.5 rounded-md bg-[hsl(var(--accent))] px-2 py-1 text-[10px] font-bold text-white hover:bg-[hsl(var(--accent)/0.9)] disabled:opacity-40"
                    >
                      <Play className="h-2.5 w-2.5" /> 시작
                    </button>
                  )}
                  {inProgress && (
                    <button
                      type="button"
                      onClick={() => endRound(n)}
                      disabled={acting}
                      className="flex items-center gap-0.5 rounded-md border border-[hsl(var(--warn))] px-2 py-1 text-[10px] font-bold text-[hsl(var(--warn))] hover:bg-[hsl(var(--warn)/0.1)] disabled:opacity-40"
                    >
                      <StopCircle className="h-2.5 w-2.5" /> 종료
                    </button>
                  )}
                  {round && (
                    <button
                      type="button"
                      onClick={() => resetRoundAction(n)}
                      disabled={acting}
                      title={`라운드 ${n} 결과 초기화 (제출 모두 삭제)`}
                      className="flex items-center gap-0.5 rounded-md border border-[hsl(var(--border))] px-2 py-0.5 text-[10px] text-[hsl(var(--muted))] hover:bg-[hsl(var(--surface-200))] hover:text-[hsl(var(--danger))] disabled:opacity-40"
                    >
                      <RotateCcw className="h-2.5 w-2.5" /> 초기화
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={endGame}
            disabled={acting || snapshot.meta.status === "ended"}
            className="mt-2 self-end rounded-lg border border-[hsl(var(--danger))] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger)/0.05)] disabled:opacity-40"
          >
            게임 종료 (종합 발표)
          </button>
        </section>

        {/* 학습자 대시보드 */}
        <section className="flex flex-col gap-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted))]">
              학습자 ({snapshot.players.length}명)
            </h2>
          </div>
          {snapshot.players.length === 0 ? (
            <p className="text-xs text-[hsl(var(--muted))]">아직 입장한 학습자가 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {snapshot.players.map((p) => {
                const submitted = snapshot.submissions.filter((s) => s.playerId === p.id).length;
                return (
                  <li key={p.id} className="flex items-center justify-between rounded-md px-2 py-1 text-xs hover:bg-[hsl(var(--surface-200)/0.3)]">
                    <span className="flex items-center gap-2">
                      <span className="rounded-md bg-[hsl(var(--accent)/0.12)] px-1.5 text-[10px] font-bold text-[hsl(var(--accent))]">팀 {p.team}</span>
                      <span className="text-[hsl(var(--fg))]">{p.name}</span>
                      <span className="font-mono text-[10px] text-[hsl(var(--muted)/0.7)]">{p.id.slice(0, 8)}</span>
                    </span>
                    <span className="font-mono text-[10px] text-[hsl(var(--muted))]">
                      {submitted}/4
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* 종합 발표 */}
        {announcement && (
          <section className="flex flex-col gap-3 rounded-2xl border border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.06)] px-4 py-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-[hsl(var(--accent))]" />
              <h2 className="text-sm font-bold text-[hsl(var(--accent))]">종합 발표</h2>
            </div>
            <div>
              <h3 className="mb-1 text-xs font-semibold text-[hsl(var(--fg))]">개인 순위</h3>
              <ul className="flex flex-col gap-0.5">
                {announcement.players.map((p, idx) => (
                  <li key={p.playerId} className="flex items-center justify-between rounded-md bg-[hsl(var(--surface-100))] px-2 py-1 text-xs">
                    <span>{idx + 1}. {p.name} (팀 {p.team})</span>
                    <span className="font-mono">{formatTime(p.totalTime)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-1 text-xs font-semibold text-[hsl(var(--fg))]">팀 순위</h3>
              <ul className="flex flex-col gap-0.5">
                {announcement.teams.map((t, idx) => (
                  <li key={t.team} className="flex items-center justify-between rounded-md bg-[hsl(var(--surface-100))] px-2 py-1 text-xs">
                    <span>{idx + 1}. 팀 {t.team} ({t.members}명)</span>
                    <span className="font-mono">{formatTime(t.totalTime)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
