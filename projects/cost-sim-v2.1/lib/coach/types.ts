import type { CostParams, CostResult } from "@/lib/cost-engine/types";
import type { DeltaTrace } from "@/lib/cost-engine/diff";

export type CoachRole = "user" | "assistant";
export type CoachMode = "worksheet" | "sandbox";

export interface CoachMessage {
  id: string;
  role: CoachRole;
  content: string;
  createdAt: number;
}

export interface CoachLastGrade {
  score: number | null;
  total: number;
  correctCells: string[];
  incorrectCells: string[];
}

export interface CoachSandboxState {
  params: CostParams;
  result: CostResult;
  lastDelta: DeltaTrace[];
}

export interface CoachRequestBody {
  problemId: string;
  mode?: CoachMode; // default: "worksheet"
  messages: Array<{ role: CoachRole; content: string }>;
  // worksheet mode
  answers?: Record<string, Record<string, number>>;
  lastGrade?: CoachLastGrade | null;
  // sandbox mode
  sandbox?: CoachSandboxState;
}

export type CoachStreamEvent =
  | { type: "text"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };
