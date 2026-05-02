import { Factory, Wrench, HardHat, type LucideIcon } from "lucide-react";

export type CharacterId = "manager" | "lead" | "player" | "narrator";

export interface Character {
  id: CharacterId;
  name: string;
  role: string;
  color: string;
  icon: LucideIcon | null;
  avatarSrc?: string;
}

/**
 * Company hierarchy (low → high): 사원 · 선임 · 책임 · 팀장 · 담당 · 그룹장
 * Colors are tuned for legibility on a light/bright background.
 */
export const CHARACTERS: Record<CharacterId, Character> = {
  manager: {
    id: "manager",
    name: "박선행 그룹장",
    role: "Mentor",
    color: "#0369a1", // sky-700 — calm, authoritative
    icon: Factory,
    avatarSrc: "/intro/manager.png"
  },
  lead: {
    id: "lead",
    name: "강지수 팀장",
    role: "Colleague",
    color: "#6d28d9", // violet-700 — friendly, readable on light bg
    icon: Wrench,
    avatarSrc: "/intro/lead.png"
  },
  player: {
    id: "player",
    name: "나",
    role: "책임",
    color: "#15803d", // green-700
    icon: HardHat,
    avatarSrc: "/intro/player.png"
  },
  narrator: {
    id: "narrator",
    name: "",
    role: "",
    color: "#475569", // slate-600
    icon: null
  }
};
