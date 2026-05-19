"use client";

import { notFound, useParams, useSearchParams } from "next/navigation";
import { getCase } from "@/lib/cases";
import ProblemPage from "@/components/Worksheet/ProblemPage";
import type { ProblemDef } from "@/content/problems/types";

import p1 from "@/content/problems/p1-loading.json";
import p4 from "@/content/problems/p4-material-yield.json";
import p5 from "@/content/problems/p5-cuts-mask.json";
import p6 from "@/content/problems/p6-tact-investment.json";

const PROBLEMS: Record<string, ProblemDef> = {
  "01-loading": p1 as unknown as ProblemDef,
  "04-material-yield": p4 as unknown as ProblemDef,
  "05-cuts-mask": p5 as unknown as ProblemDef,
  "06-tact-investment": p6 as unknown as ProblemDef
};

export default function CaseClient() {
  const params = useParams<{ caseId: string }>();
  const search = useSearchParams();
  const caseId = params?.caseId;
  const caseDef = caseId ? getCase(caseId) : undefined;
  const problem = caseId ? PROBLEMS[caseId] : undefined;

  if (!caseId || !caseDef || !problem) return notFound();

  // 게임 모드 컨텍스트 — 학습자가 룸 입장 후 강사 신호로 진입한 라운드.
  // `?game=true` 또는 `?room=XXXX&round=N` 어느 쪽이든 게임 모드로 인식.
  const gameParam = search?.get("game");
  const roomCode = search?.get("room") ?? undefined;
  const roundParam = search?.get("round");
  const roundN = roundParam ? Number(roundParam) : undefined;
  const gameMode = gameParam === "true" || !!roomCode;

  return (
    <ProblemPage
      problem={problem}
      caseId={caseId}
      gameMode={gameMode}
      roomCode={roomCode}
      roundN={Number.isFinite(roundN) ? roundN : undefined}
    />
  );
}
