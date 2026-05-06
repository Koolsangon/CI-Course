import type { CharacterId } from "./characters";

export type IntroBeatPosition = "left" | "right" | "center";

export interface IntroBeat {
  id: string;
  speaker: CharacterId;
  position?: IntroBeatPosition;
  text: string;
  /** Optional choice text shown as a single button before advancing. */
  choice?: string;
}

export const INTRO_SCRIPT: IntroBeat[] = [
  {
    id: "open",
    speaker: "narrator",
    position: "center",
    text: "2026년 봄. 나는 새로운 파트리더로 보임하였다. 첫 회의 30분 전, 원가 회의실 앞."
  },
  {
    id: "manager-1",
    speaker: "manager",
    position: "left",
    text: "어서 오세요, {playerAddress}. 이 라인은 매달 수억의 원가가 살아 움직이는 현장입니다. 흐름을 먼저 보는 사람이 결국 답을 냅니다."
  },
  {
    id: "lead-1",
    speaker: "lead",
    position: "right",
    text: "현업에선 결국 COP · COM · SGA 세 갈래만 잡으면 돼요. {playerAddress}이 어디를 흔들고 싶은지 같이 짚어봐요."
  },
  {
    id: "player-1",
    speaker: "player",
    position: "center",
    text: "...좋습니다. 어디부터 시작하면 됩니까?",
    choice: "좋습니다, 시작하죠"
  },
  {
    id: "manager-2",
    speaker: "manager",
    position: "left",
    text: "두 가지 도구가 있습니다. 변수를 직접 흔드는 자유 실험실, 그리고 엑셀처럼 풀어보는 원가 워크시트입니다."
  },
  {
    id: "close",
    speaker: "narrator",
    position: "center",
    text: "미션 시작 — 파트의 원가 흐름을 추적하라."
  }
];
