import { describe, it, expect, beforeEach } from "vitest";
import { useWorkStore } from "../work-store";

const INITIAL_STATE = {
  customPresets: [],
  scenarios: [],
  activePresetId: null
};

beforeEach(() => {
  useWorkStore.setState(INITIAL_STATE);
});

describe("work-store — presets", () => {
  it("saves a preset and returns its id", () => {
    const { savePreset } = useWorkStore.getState();
    const params = {
      price: 200,
      yields: { tft: 0.99, cf: 1.0, cell: 0.95, module: 0.972 },
      bom: { tft: 6.0, cf: 5.0, cell: 1.5, module: 75.0 },
      processing: {
        panel: { labor: 21.3, expense: 11.5, depreciation: 16.2 },
        module: { labor: 8.7, expense: 5.3, depreciation: 7.5 }
      },
      sga: { direct_dev: 4.7, transport: 0.3, business_unit: 16.0, operation: 1.2, corporate_oh: 6.2 },
      loading: 0.70
    };
    const id = savePreset("테스트 프리셋", params);
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
    const { customPresets } = useWorkStore.getState();
    expect(customPresets).toHaveLength(1);
    expect(customPresets[0].name).toBe("테스트 프리셋");
    expect(customPresets[0].id).toBe(id);
  });

  it("deletes a preset by id", () => {
    const { savePreset, deletePreset } = useWorkStore.getState();
    const params = {
      price: 200,
      yields: { tft: 0.99, cf: 1.0, cell: 0.95, module: 0.972 },
      bom: { tft: 6.0, cf: 5.0, cell: 1.5, module: 75.0 },
      processing: {
        panel: { labor: 21.3, expense: 11.5, depreciation: 16.2 },
        module: { labor: 8.7, expense: 5.3, depreciation: 7.5 }
      },
      sga: { direct_dev: 4.7, transport: 0.3, business_unit: 16.0, operation: 1.2, corporate_oh: 6.2 },
      loading: 0.70
    };
    const id = savePreset("삭제 테스트", params);
    deletePreset(id);
    const { customPresets } = useWorkStore.getState();
    expect(customPresets).toHaveLength(0);
  });

  it("throws when saving more than 10 presets", () => {
    const { savePreset } = useWorkStore.getState();
    const params = {
      price: 200,
      yields: { tft: 0.99, cf: 1.0, cell: 0.95, module: 0.972 },
      bom: { tft: 6.0, cf: 5.0, cell: 1.5, module: 75.0 },
      processing: {
        panel: { labor: 21.3, expense: 11.5, depreciation: 16.2 },
        module: { labor: 8.7, expense: 5.3, depreciation: 7.5 }
      },
      sga: { direct_dev: 4.7, transport: 0.3, business_unit: 16.0, operation: 1.2, corporate_oh: 6.2 },
      loading: 0.70
    };
    for (let i = 0; i < 10; i++) {
      useWorkStore.getState().savePreset(`프리셋 ${i}`, params);
    }
    expect(() => useWorkStore.getState().savePreset("초과 프리셋", params)).toThrow();
  });
});

describe("work-store — scenarios", () => {
  it("saves a scenario and returns its id", () => {
    const { saveScenario } = useWorkStore.getState();
    const params = {
      price: 200,
      yields: { tft: 0.99, cf: 1.0, cell: 0.95, module: 0.972 },
      bom: { tft: 6.0, cf: 5.0, cell: 1.5, module: 75.0 },
      processing: {
        panel: { labor: 21.3, expense: 11.5, depreciation: 16.2 },
        module: { labor: 8.7, expense: 5.3, depreciation: 7.5 }
      },
      sga: { direct_dev: 4.7, transport: 0.3, business_unit: 16.0, operation: 1.2, corporate_oh: 6.2 },
      loading: 0.70
    };
    const id = saveScenario("시나리오 A", "preset-1", params);
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
    const { scenarios } = useWorkStore.getState();
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].name).toBe("시나리오 A");
    expect(scenarios[0].id).toBe(id);
  });

  it("throws when saving more than 5 scenarios", () => {
    const { saveScenario } = useWorkStore.getState();
    const params = {
      price: 200,
      yields: { tft: 0.99, cf: 1.0, cell: 0.95, module: 0.972 },
      bom: { tft: 6.0, cf: 5.0, cell: 1.5, module: 75.0 },
      processing: {
        panel: { labor: 21.3, expense: 11.5, depreciation: 16.2 },
        module: { labor: 8.7, expense: 5.3, depreciation: 7.5 }
      },
      sga: { direct_dev: 4.7, transport: 0.3, business_unit: 16.0, operation: 1.2, corporate_oh: 6.2 },
      loading: 0.70
    };
    for (let i = 0; i < 5; i++) {
      useWorkStore.getState().saveScenario(`시나리오 ${i}`, "preset-1", params);
    }
    expect(() => useWorkStore.getState().saveScenario("초과 시나리오", "preset-1", params)).toThrow();
  });

  it("deletes a scenario by id", () => {
    const { saveScenario, deleteScenario } = useWorkStore.getState();
    const params = {
      price: 200,
      yields: { tft: 0.99, cf: 1.0, cell: 0.95, module: 0.972 },
      bom: { tft: 6.0, cf: 5.0, cell: 1.5, module: 75.0 },
      processing: {
        panel: { labor: 21.3, expense: 11.5, depreciation: 16.2 },
        module: { labor: 8.7, expense: 5.3, depreciation: 7.5 }
      },
      sga: { direct_dev: 4.7, transport: 0.3, business_unit: 16.0, operation: 1.2, corporate_oh: 6.2 },
      loading: 0.70
    };
    const id = saveScenario("삭제 시나리오", "preset-1", params);
    deleteScenario(id);
    const { scenarios } = useWorkStore.getState();
    expect(scenarios).toHaveLength(0);
  });
});

describe("work-store — sample presets", () => {
  it("loads sample presets from JSON (should have 2, first one contains OLED)", () => {
    const { loadSamplePresets } = useWorkStore.getState();
    loadSamplePresets();
    const { customPresets } = useWorkStore.getState();
    expect(customPresets).toHaveLength(2);
    expect(customPresets[0].name).toContain("OLED");
  });
});
