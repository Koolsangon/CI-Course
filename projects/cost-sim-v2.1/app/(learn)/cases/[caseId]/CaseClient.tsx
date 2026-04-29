"use client";

import { notFound, useParams } from "next/navigation";
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
  const caseId = params?.caseId;
  const caseDef = caseId ? getCase(caseId) : undefined;
  const problem = caseId ? PROBLEMS[caseId] : undefined;

  if (!caseId || !caseDef || !problem) return notFound();

  return <ProblemPage problem={problem} />;
}
