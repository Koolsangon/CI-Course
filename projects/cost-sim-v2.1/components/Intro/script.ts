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
    text: "2026년 봄. 자네는 갓 들어온 신입 사원이다. 첫 출근, 공장 정문 앞."
  },
  {
    id: "manager-1",
    speaker: "manager",
    position: "left",
    text: "어서 오게. 이 공장에선 매달 수억의 원가가 살아 움직여. 자네 임무는 그 흐름을 눈으로 보는 것."
  },
  {
    id: "lead-1",
    speaker: "lead",
    position: "right",
    text: "COP · COM · SGA — 이 세 갈래만 잡으면 돼요. 어렵지 않아요, 같이 가요."
  },
  {
    id: "player-1",
    speaker: "player",
    position: "center",
    text: "...좋습니다. 어디서부터 시작하면 됩니까?",
    choice: "좋습니다, 시작하죠"
  },
  {
    id: "manager-2",
    speaker: "manager",
    position: "left",
    text: "두 가지 도구가 있어. 변수를 직접 흔들어보는 자유 실험실과, 엑셀처럼 풀어보는 원가 워크시트."
  },
  {
    id: "close",
    speaker: "narrator",
    position: "center",
    text: "미션 시작 — 원가의 흐름을 추적하라."
  }
];
