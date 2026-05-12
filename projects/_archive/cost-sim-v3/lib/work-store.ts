"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CostParams } from "./cost-engine/types";
import { cloneParams } from "./cost-engine/presets";
import samplePresetsData from "../content/sample-presets.json";

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export interface CustomPreset {
  id: string;
  name: string;
  params: CostParams;
  createdAt: number;
}

export interface Scenario {
  id: string;
  name: string;
  presetId: string;
  params: CostParams;
}

export interface WorkState {
  customPresets: CustomPreset[];
  scenarios: Scenario[];
  activePresetId: string | null;

  savePreset: (name: string, params: CostParams) => string;
  deletePreset: (id: string) => void;
  loadSamplePresets: () => void;

  saveScenario: (name: string, presetId: string, params: CostParams) => string;
  deleteScenario: (id: string) => void;

  setActivePreset: (id: string | null) => void;
}

export const useWorkStore = create<WorkState>()(
  persist(
    (set, get) => ({
      customPresets: [],
      scenarios: [],
      activePresetId: null,

      savePreset: (name, params) => {
        const { customPresets } = get();
        if (customPresets.length >= 10) {
          throw new Error("최대 10개의 프리셋만 저장할 수 있습니다.");
        }
        const id = generateId();
        const preset: CustomPreset = {
          id,
          name,
          params: cloneParams(params),
          createdAt: Date.now()
        };
        set({ customPresets: [...customPresets, preset] });
        return id;
      },

      deletePreset: (id) => {
        const { customPresets, activePresetId } = get();
        set({
          customPresets: customPresets.filter((p) => p.id !== id),
          activePresetId: activePresetId === id ? null : activePresetId
        });
      },

      loadSamplePresets: () => {
        const { customPresets } = get();
        if (customPresets.length > 0) return;
        const loaded: CustomPreset[] = (samplePresetsData as Array<{ name: string; params: CostParams }>).map(
          (item) => ({
            id: generateId(),
            name: item.name,
            params: cloneParams(item.params),
            createdAt: Date.now()
          })
        );
        set({ customPresets: loaded });
      },

      saveScenario: (name, presetId, params) => {
        const { scenarios } = get();
        if (scenarios.length >= 5) {
          throw new Error("최대 5개의 시나리오만 저장할 수 있습니다.");
        }
        const id = generateId();
        const scenario: Scenario = {
          id,
          name,
          presetId,
          params: cloneParams(params)
        };
        set({ scenarios: [...scenarios, scenario] });
        return id;
      },

      deleteScenario: (id) => {
        const { scenarios } = get();
        set({ scenarios: scenarios.filter((s) => s.id !== id) });
      },

      setActivePreset: (id) => {
        set({ activePresetId: id });
      }
    }),
    {
      name: "cost-sim-v3:work:v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        customPresets: state.customPresets,
        scenarios: state.scenarios,
        activePresetId: state.activePresetId
      })
    }
  )
);
