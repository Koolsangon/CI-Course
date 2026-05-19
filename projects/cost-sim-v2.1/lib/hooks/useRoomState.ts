"use client";

import { useEffect, useState } from "react";
import type { RoomSnapshot } from "@/lib/room/types";

interface UseRoomStateResult {
  snapshot: RoomSnapshot | null;
  error: string | null;
  /** 룸이 존재하지 않거나 ended 상태 시 true — 호출자는 redirect 등 처리. */
  notFound: boolean;
}

/**
 * 2초 간격 폴링 hook (plan.md C.3).
 *
 *   - code 가 null/undefined 면 폴링 안 함 (room context 미보유 학습자)
 *   - 404 응답 시 notFound=true 로 마킹 (학습자가 룸 컨텍스트 정리하도록)
 *   - 다른 오류는 error 메시지로 노출 (네트워크 일시 장애 등) — 폴링은 계속
 */
export function useRoomState(code: string | null | undefined, intervalMs = 2000): UseRoomStateResult {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!code) {
      setSnapshot(null);
      setNotFound(false);
      return;
    }

    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch(`/api/rooms/${code}`, { cache: "no-store" });
        if (cancelled) return;
        if (res.status === 404) {
          setNotFound(true);
          setSnapshot(null);
          return;
        }
        if (!res.ok) {
          setError(`HTTP ${res.status}`);
          return;
        }
        const data = (await res.json()) as RoomSnapshot;
        if (cancelled) return;
        setSnapshot(data);
        setError(null);
        setNotFound(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "fetch failed");
      }
    }

    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [code, intervalMs]);

  return { snapshot, error, notFound };
}
