"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Plus, Power, PowerOff, RefreshCw, Trash2 } from "lucide-react";
import { getAdminToken, loadAdminTokens, removeAdminToken, saveAdminToken } from "@/lib/instructor";
import type { RoomSnapshot } from "@/lib/room/types";
import { GAME_MODE_ENABLED } from "@/lib/features";
import GameDisabledNotice from "@/components/Room/GameDisabledNotice";

type RoomStatus =
  | { kind: "loading" }
  | { kind: "missing" } // 서버에 없음 (삭제됐거나 서버 재시작)
  | { kind: "active"; snapshot: RoomSnapshot }
  | { kind: "disabled"; snapshot: RoomSnapshot };

function classifyStatus(snapshot: RoomSnapshot): "active" | "disabled" {
  return snapshot.meta.enabled ? "active" : "disabled";
}

export default function InstructorIndexPage() {
  // GAME_MODE_ENABLED=false 시 강사 뷰 전체 차단 — 내부 컴포넌트를 마운트하지 않아
  // 룸 API 폴링 등 부작용도 발생하지 않는다.
  if (!GAME_MODE_ENABLED) return <GameDisabledNotice />;
  return <InstructorIndexContent />;
}

function InstructorIndexContent() {
  const router = useRouter();
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, RoomStatus>>({});
  const [creating, setCreating] = useState(false);
  const [acting, setActing] = useState<string | null>(null); // 작업 중인 code
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async (code: string) => {
    try {
      const res = await fetch(`/api/rooms/${code}`, { cache: "no-store" });
      if (res.status === 404) {
        setStatuses((s) => ({ ...s, [code]: { kind: "missing" } }));
        return;
      }
      if (!res.ok) {
        setStatuses((s) => ({ ...s, [code]: { kind: "missing" } }));
        return;
      }
      const snapshot = (await res.json()) as RoomSnapshot;
      setStatuses((s) => ({
        ...s,
        [code]: { kind: classifyStatus(snapshot), snapshot }
      }));
    } catch {
      setStatuses((s) => ({ ...s, [code]: { kind: "missing" } }));
    }
  }, []);

  const refreshAll = useCallback(async (codes: string[]) => {
    setStatuses((s) => {
      const next = { ...s };
      for (const c of codes) {
        if (!next[c]) next[c] = { kind: "loading" };
      }
      return next;
    });
    await Promise.all(codes.map(fetchStatus));
  }, [fetchStatus]);

  useEffect(() => {
    const map = loadAdminTokens();
    setTokens(map);
    void refreshAll(Object.keys(map));
  }, [refreshAll]);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      saveAdminToken(data.code, data.adminToken);
      router.push(`/instructor/${data.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "네트워크 오류");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleEnabled(code: string) {
    const adminToken = getAdminToken(code);
    if (!adminToken) return;
    const cur = statuses[code];
    if (cur?.kind !== "active" && cur?.kind !== "disabled") return;
    const nextEnabled = cur.kind === "disabled";
    setActing(code);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminToken, action: { type: "set_enabled", enabled: nextEnabled } })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      await fetchStatus(code);
    } catch (e) {
      setError(e instanceof Error ? e.message : "네트워크 오류");
    } finally {
      setActing(null);
    }
  }

  async function handleDelete(code: string) {
    const adminToken = getAdminToken(code);
    if (!adminToken) return;
    if (!window.confirm(`방 ${code} 을(를) 삭제하시겠습니까?\n학습자 데이터가 모두 사라지며 되돌릴 수 없습니다.`)) {
      return;
    }
    setActing(code);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${code}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminToken })
      });
      // 404 (이미 사라진 서버 상태)도 사용자 입장에서는 "삭제됨"으로 처리.
      if (!res.ok && res.status !== 404) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      removeAdminToken(code);
      setTokens((t) => {
        const next = { ...t };
        delete next[code];
        return next;
      });
      setStatuses((s) => {
        const next = { ...s };
        delete next[code];
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "네트워크 오류");
    } finally {
      setActing(null);
    }
  }

  function handleRefresh() {
    setError(null);
    void refreshAll(Object.keys(tokens));
  }

  const codes = Object.keys(tokens).sort();

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
        <h1 className="text-sm font-bold text-[hsl(var(--fg))]">강사 뷰</h1>
        <button
          type="button"
          onClick={handleRefresh}
          aria-label="상태 새로고침"
          title="모든 방 상태 새로고침"
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-xl text-[hsl(var(--muted))] transition-colors hover:bg-[hsl(var(--surface-200))] hover:text-[hsl(var(--fg))]"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center justify-center gap-2 rounded-2xl border border-[hsl(var(--accent))] bg-[hsl(var(--accent))] px-6 py-4 text-base font-bold text-white transition-colors hover:bg-[hsl(var(--accent)/0.9)] disabled:opacity-50"
        >
          <Plus className="h-5 w-5" />
          {creating ? "생성 중..." : "새 방 만들기"}
        </button>

        {error && (
          <p className="rounded-xl border border-[hsl(var(--danger)/0.4)] bg-[hsl(var(--danger)/0.05)] px-3 py-2 text-xs text-[hsl(var(--danger))]">
            {error}
          </p>
        )}

        {codes.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted))]">
              내가 만든 방
            </h2>
            <ul className="flex flex-col gap-1">
              {codes.map((code) => {
                const status = statuses[code] ?? { kind: "loading" };
                const isActing = acting === code;
                const isAvailable = status.kind === "active" || status.kind === "disabled";
                return (
                  <li
                    key={code}
                    className="flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] px-3 py-2"
                  >
                    <StatusDot status={status.kind} />
                    <Link
                      href={`/instructor/${code}`}
                      className="flex flex-1 items-center justify-between rounded-lg px-1 py-1 transition-colors hover:text-[hsl(var(--accent))]"
                    >
                      <span className="flex flex-col">
                        <span className="font-mono text-base font-bold tracking-widest text-[hsl(var(--fg))]">
                          {code}
                        </span>
                        <StatusLabel status={status} />
                      </span>
                      <ChevronRight className="h-4 w-4 text-[hsl(var(--muted))]" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleToggleEnabled(code)}
                      disabled={!isAvailable || isActing}
                      aria-label={status.kind === "active" ? "비활성화" : "활성화"}
                      title={
                        status.kind === "active"
                          ? "비활성화 — 학습자 신규 입장 차단"
                          : status.kind === "disabled"
                          ? "활성화 — 학습자 입장 허용"
                          : "서버에 방이 없어 토글할 수 없습니다"
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--muted))] transition-colors hover:bg-[hsl(var(--surface-200))] hover:text-[hsl(var(--accent))] disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      {status.kind === "active" ? (
                        <PowerOff className="h-4 w-4" />
                      ) : (
                        <Power className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(code)}
                      disabled={isActing}
                      aria-label="방 삭제"
                      title="방 삭제 (되돌릴 수 없음)"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--muted))] transition-colors hover:bg-[hsl(var(--danger)/0.1)] hover:text-[hsl(var(--danger))] disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <p className="text-[11px] leading-relaxed text-[hsl(var(--muted)/0.7)]">
          admin_token 은 이 브라우저의 localStorage 에 저장됩니다. 다른 기기에서 강사 뷰에 진입하려면
          새 방을 만들어야 합니다. 서버 재시작 시 in-memory 룸은 사라져 "서버 없음" 상태로 표시되며,
          이때 같은 코드로 재생성할 수는 없으니 새 방을 만들고 옛 항목을 삭제하세요.
        </p>
      </div>
    </main>
  );
}

function StatusDot({ status }: { status: RoomStatus["kind"] }) {
  const cls =
    status === "active"
      ? "bg-[hsl(var(--success))]"
      : status === "disabled"
      ? "bg-[hsl(var(--muted))]"
      : status === "missing"
      ? "bg-[hsl(var(--danger))]"
      : "bg-[hsl(var(--surface-200))]";
  return <span className={`h-2 w-2 flex-shrink-0 rounded-full ${cls}`} />;
}

function StatusLabel({ status }: { status: RoomStatus }) {
  if (status.kind === "loading") {
    return <span className="text-[10px] text-[hsl(var(--muted))]">상태 확인 중…</span>;
  }
  if (status.kind === "missing") {
    return <span className="text-[10px] font-semibold text-[hsl(var(--danger))]">서버에 없음 (삭제됨/재시작)</span>;
  }
  const meta = status.snapshot.meta;
  const playerCount = status.snapshot.players.length;
  const round = meta.currentRound !== undefined ? ` · R${meta.currentRound}` : "";
  const label = status.kind === "active" ? "활성" : "비활성";
  return (
    <span className="text-[10px] text-[hsl(var(--muted))]">
      <span className={status.kind === "active" ? "font-semibold text-[hsl(var(--success))]" : "font-semibold text-[hsl(var(--muted))]"}>
        {label}
      </span>
      {" · "}
      {meta.status}
      {round}
      {" · "}
      {playerCount}명
    </span>
  );
}
