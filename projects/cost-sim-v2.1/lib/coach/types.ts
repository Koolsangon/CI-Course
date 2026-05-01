export type CoachRole = "user" | "assistant";

export interface CoachMessage {
  id: string;
  role: CoachRole;
  content: string;
  createdAt: number;
}

export interface CoachRequestBody {
  problemId: string;
  messages: Array<{ role: CoachRole; content: string }>;
  answers: Record<string, Record<string, number>>;
  lastGrade: {
    score: number | null;
    total: number;
    correctCells: string[];
    incorrectCells: string[];
  } | null;
}

export type CoachStreamEvent =
  | { type: "text"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };
