"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Home } from "lucide-react";
import { loadRoomContext, type RoomContext } from "@/lib/player";
import { GAME_MODE_ENABLED } from "@/lib/features";

/**
 * 학습자가 룸 입장 후 다른 페이지(/sandbox, /cases, ProblemPage 연습 모드)에 진입했을 때
 * 헤더 우측에 표시하는 작은 배지 — 클릭하면 /menu (학습자의 "방") 로 복귀.
 *
 * roomContext 가 없으면 (룸 미입장) 렌더링하지 않는다 — 강사 없이 학습자가 자유 실험만
 * 하는 흐름에서는 노출되지 않음.
 */
export default function RoomBadge() {
  const [ctx, setCtx] = useState<RoomContext | null>(null);

  useEffect(() => {
    setCtx(loadRoomContext());
  }, []);

  if (!GAME_MODE_ENABLED || !ctx) return null;

  return (
    <Link
      href="/menu"
      title={`내 방 ${ctx.code} 로 돌아가기`}
      className="flex items-center gap-1.5 rounded-lg border border-[hsl(var(--accent)/0.4)] bg-[hsl(var(--accent)/0.08)] px-2 py-1 text-[11px] font-semibold text-[hsl(var(--accent))] transition-colors hover:bg-[hsl(var(--accent)/0.15)]"
    >
      <Home className="h-3 w-3" />
      <span className="hidden sm:inline">내 방</span>
      <span className="font-mono tracking-widest">{ctx.code}</span>
    </Link>
  );
}
