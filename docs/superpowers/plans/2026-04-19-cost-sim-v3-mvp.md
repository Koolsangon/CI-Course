# Cost Sim v3 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add practical cost analysis features (custom data input, What-if scenario comparison, clipboard export) to the education game, creating a tool that bridges training and real work.

**Architecture:** Copy v2-game to cost-sim-v3. Add `(work)/analyze` and `(work)/compare` routes with new components. Share existing CostTree/FormulaInspector/CoachDrawer. Separate work-store from education store. Zero modifications to cost-engine or education store.

**Tech Stack:** Next.js 14, React 18, Zustand (persist), Tailwind CSS, React Hook Form + Zod, existing cost-engine

**Spec:** `docs/superpowers/specs/2026-04-19-cost-sim-v3-mvp-design.md`

---

### Task 1: Project Setup

**Files:**
- Create: `projects/cost-sim-v3/` (copy of `projects/cost-sim-v2-game/`)
- Modify: `projects/cost-sim-v3/package.json`

- [ ] **Step 1: Copy v2-game to cost-sim-v3**

```bash
cd CI-Course/projects
cp -r cost-sim-v2-game cost-sim-v3
```

- [ ] **Step 2: Update package.json**

In `projects/cost-sim-v3/package.json`, change:
```json
{
  "name": "cost-sim-v3",
  "version": "3.0.0-alpha.0"
}
```

- [ ] **Step 3: Verify golden fixtures pass**

```bash
cd projects/cost-sim-v3
npm install
npm test
```

Expected: 33/33 tests pass (including 27 golden fixtures).

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: Build succeeds with First Load JS under 250KB.

- [ ] **Step 5: Commit**

```bash
git add projects/cost-sim-v3
git commit -m "chore: copy v2-game to cost-sim-v3 as v3 MVP base"
```

---

### Task 2: Export Utilities (TDD)

**Files:**
- Create: `projects/cost-sim-v3/lib/export.ts`
- Create: `projects/cost-sim-v3/lib/__tests__/export.test.ts`

- [ ] **Step 1: Write failing test**

Create `lib/__tests__/export.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { toTSV } from "../export";
import type { CostResult } from "../cost-engine/types";

const makeResult = (overrides: Partial<CostResult> = {}): CostResult => ({
  price: 200,
  cumulative_yield: 0.912,
  bom_total: 87.5,
  material_cost: 91.23,
  processing_cost: 70.5,
  panel_labor: 21.3,
  panel_expense: 11.5,
  panel_depreciation: 16.2,
  module_labor: 8.7,
  module_expense: 5.3,
  module_depreciation: 7.5,
  com: 161.73,
  sga: 28.4,
  cop: 190.13,
  operating_profit: 9.87,
  operating_margin: 0.04935,
  cash_cost: 166.43,
  ebitda: 33.57,
  variable_cost: 91.53,
  marginal_profit: 108.47,
  ...overrides,
});

describe("toTSV", () => {
  it("generates tab-separated table with header and delta column", () => {
    const a = makeResult({ operating_profit: 10 });
    const b = makeResult({ operating_profit: 15 });
    const tsv = toTSV(a, b, "Base", "Improved");

    const lines = tsv.split("\n");
    // Header row
    expect(lines[0]).toBe("항목\tBase\tImproved\tΔ");
    // Find operating profit row
    const opLine = lines.find((l) => l.startsWith("영업이익\t"));
    expect(opLine).toBeDefined();
    const cols = opLine!.split("\t");
    expect(cols[1]).toBe("10.00");
    expect(cols[2]).toBe("15.00");
    expect(cols[3]).toBe("+5.00");
  });

  it("shows negative delta with minus sign", () => {
    const a = makeResult({ cop: 170 });
    const b = makeResult({ cop: 180 });
    const tsv = toTSV(a, b, "A", "B");
    const copLine = tsv.split("\n").find((l) => l.startsWith("COP\t"));
    expect(copLine).toContain("-10.00");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd projects/cost-sim-v3 && npx vitest run lib/__tests__/export.test.ts
```

Expected: FAIL — `toTSV` not found.

- [ ] **Step 3: Implement export.ts**

Create `lib/export.ts`:

```typescript
import type { CostResult } from "./cost-engine/types";

interface Row {
  label: string;
  key: keyof CostResult;
  /** true = higher is better (profit), false = lower is better (cost) */
  isProfit: boolean;
  format: "dollar" | "percent";
}

const ROWS: Row[] = [
  { label: "Price", key: "price", isProfit: false, format: "dollar" },
  { label: "소요재료비", key: "material_cost", isProfit: false, format: "dollar" },
  { label: "가공비", key: "processing_cost", isProfit: false, format: "dollar" },
  { label: "COM", key: "com", isProfit: false, format: "dollar" },
  { label: "SGA", key: "sga", isProfit: false, format: "dollar" },
  { label: "COP", key: "cop", isProfit: false, format: "dollar" },
  { label: "영업이익", key: "operating_profit", isProfit: true, format: "dollar" },
  { label: "영업이익률", key: "operating_margin", isProfit: true, format: "percent" },
  { label: "Cash Cost", key: "cash_cost", isProfit: false, format: "dollar" },
  { label: "EBITDA", key: "ebitda", isProfit: true, format: "dollar" },
  { label: "변동비", key: "variable_cost", isProfit: false, format: "dollar" },
  { label: "한계이익", key: "marginal_profit", isProfit: true, format: "dollar" },
];

export { ROWS };
export type { Row };

function fmt(value: number, format: "dollar" | "percent"): string {
  if (format === "percent") return (value * 100).toFixed(2) + "%";
  return value.toFixed(2);
}

function fmtDelta(delta: number, format: "dollar" | "percent"): string {
  const sign = delta >= 0 ? "+" : "";
  if (format === "percent") return sign + (delta * 100).toFixed(2) + "%";
  return sign + delta.toFixed(2);
}

export function toTSV(
  a: CostResult,
  b: CostResult,
  nameA: string,
  nameB: string
): string {
  const header = ["항목", nameA, nameB, "Δ"].join("\t");
  const rows = ROWS.map((r) => {
    const va = a[r.key] as number;
    const vb = b[r.key] as number;
    const delta = vb - va;
    return [r.label, fmt(va, r.format), fmt(vb, r.format), fmtDelta(delta, r.format)].join("\t");
  });
  return [header, ...rows].join("\n");
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd projects/cost-sim-v3 && npx vitest run lib/__tests__/export.test.ts
```

Expected: 2/2 PASS.

- [ ] **Step 5: Commit**

```bash
cd projects/cost-sim-v3
git add lib/export.ts lib/__tests__/export.test.ts
git commit -m "feat(v3): add TSV export + clipboard copy utility"
```

---

### Task 3: Work Store (TDD)

**Files:**
- Create: `projects/cost-sim-v3/lib/work-store.ts`
- Create: `projects/cost-sim-v3/lib/__tests__/work-store.test.ts`

- [ ] **Step 1: Write failing test**

Create `lib/__tests__/work-store.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { useWorkStore } from "../work-store";
import { REFERENCE_CASE1 } from "../cost-engine/presets";
import { cloneParams } from "../cost-engine/presets";

describe("work-store", () => {
  beforeEach(() => {
    useWorkStore.setState({
      customPresets: [],
      scenarios: [],
      activePresetId: null,
    });
  });

  describe("presets", () => {
    it("saves a preset and returns its id", () => {
      const id = useWorkStore.getState().savePreset("Test", cloneParams(REFERENCE_CASE1));
      expect(id).toBeTruthy();
      expect(useWorkStore.getState().customPresets).toHaveLength(1);
      expect(useWorkStore.getState().customPresets[0].name).toBe("Test");
    });

    it("deletes a preset by id", () => {
      const id = useWorkStore.getState().savePreset("Test", cloneParams(REFERENCE_CASE1));
      useWorkStore.getState().deletePreset(id);
      expect(useWorkStore.getState().customPresets).toHaveLength(0);
    });

    it("throws when saving more than 10 presets", () => {
      for (let i = 0; i < 10; i++) {
        useWorkStore.getState().savePreset(`P${i}`, cloneParams(REFERENCE_CASE1));
      }
      expect(() =>
        useWorkStore.getState().savePreset("P10", cloneParams(REFERENCE_CASE1))
      ).toThrow();
    });
  });

  describe("scenarios", () => {
    it("saves a scenario and returns its id", () => {
      const id = useWorkStore.getState().saveScenario("S1", "preset-1", cloneParams(REFERENCE_CASE1));
      expect(id).toBeTruthy();
      expect(useWorkStore.getState().scenarios).toHaveLength(1);
    });

    it("throws when saving more than 5 scenarios", () => {
      for (let i = 0; i < 5; i++) {
        useWorkStore.getState().saveScenario(`S${i}`, "p1", cloneParams(REFERENCE_CASE1));
      }
      expect(() =>
        useWorkStore.getState().saveScenario("S5", "p1", cloneParams(REFERENCE_CASE1))
      ).toThrow();
    });

    it("deletes a scenario by id", () => {
      const id = useWorkStore.getState().saveScenario("S1", "p1", cloneParams(REFERENCE_CASE1));
      useWorkStore.getState().deleteScenario(id);
      expect(useWorkStore.getState().scenarios).toHaveLength(0);
    });
  });

  describe("sample presets", () => {
    it("loads sample presets from JSON", () => {
      useWorkStore.getState().loadSamplePresets();
      const presets = useWorkStore.getState().customPresets;
      expect(presets.length).toBeGreaterThanOrEqual(2);
      expect(presets[0].name).toContain("OLED");
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd projects/cost-sim-v3 && npx vitest run lib/__tests__/work-store.test.ts
```

Expected: FAIL — `useWorkStore` not found.

- [ ] **Step 3: Create sample-presets.json**

Create `content/sample-presets.json`:

```json
[
  {
    "name": "55인치 OLED 기준",
    "params": {
      "price": 220.0,
      "yields": { "tft": 0.98, "cf": 0.99, "cell": 0.94, "module": 0.96 },
      "bom": { "tft": 7.5, "cf": 6.0, "cell": 2.0, "module": 82.0 },
      "processing": {
        "panel": { "labor": 23.5, "expense": 12.8, "depreciation": 18.0 },
        "module": { "labor": 9.5, "expense": 5.8, "depreciation": 8.2 }
      },
      "sga": {
        "direct_dev": 5.2,
        "transport": 0.4,
        "business_unit": 17.5,
        "operation": 1.4,
        "corporate_oh": 6.8
      },
      "loading": 0.75
    }
  },
  {
    "name": "65인치 LCD 기준",
    "params": {
      "price": 165.0,
      "yields": { "tft": 0.99, "cf": 1.0, "cell": 0.96, "module": 0.98 },
      "bom": { "tft": 4.5, "cf": 3.8, "cell": 1.2, "module": 55.0 },
      "processing": {
        "panel": { "labor": 15.0, "expense": 8.2, "depreciation": 12.5 },
        "module": { "labor": 6.0, "expense": 3.8, "depreciation": 5.5 }
      },
      "sga": {
        "direct_dev": 3.8,
        "transport": 0.25,
        "business_unit": 12.0,
        "operation": 0.9,
        "corporate_oh": 4.8
      },
      "loading": 0.82
    }
  }
]
```

- [ ] **Step 4: Implement work-store.ts**

Create `lib/work-store.ts`:

```typescript
"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CostParams } from "./cost-engine/types";
import { cloneParams } from "./cost-engine/presets";
import sampleData from "@/content/sample-presets.json";

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
  updatePreset: (id: string, name: string, params: CostParams) => void;
  deletePreset: (id: string) => void;
  loadSamplePresets: () => void;

  saveScenario: (name: string, presetId: string, params: CostParams) => string;
  deleteScenario: (id: string) => void;
  setActivePreset: (id: string | null) => void;
}

function genId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
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
          throw new Error("프리셋은 최대 10개까지 저장할 수 있습니다.");
        }
        const id = genId();
        const preset: CustomPreset = {
          id,
          name,
          params: cloneParams(params),
          createdAt: Date.now(),
        };
        set({ customPresets: [...customPresets, preset] });
        return id;
      },

      updatePreset: (id, name, params) => {
        const { customPresets } = get();
        set({
          customPresets: customPresets.map((p) =>
            p.id === id ? { ...p, name, params: cloneParams(params) } : p
          ),
        });
      },

      deletePreset: (id) => {
        const { customPresets, activePresetId } = get();
        set({
          customPresets: customPresets.filter((p) => p.id !== id),
          activePresetId: activePresetId === id ? null : activePresetId,
        });
      },

      loadSamplePresets: () => {
        const { customPresets } = get();
        if (customPresets.length > 0) return;
        const samples: CustomPreset[] = sampleData.map((s) => ({
          id: genId(),
          name: s.name,
          params: s.params as CostParams,
          createdAt: Date.now(),
        }));
        set({ customPresets: samples, activePresetId: samples[0]?.id ?? null });
      },

      saveScenario: (name, presetId, params) => {
        const { scenarios } = get();
        if (scenarios.length >= 5) {
          throw new Error("시나리오는 최대 5개까지 저장할 수 있습니다. 기존 시나리오를 삭제해 주세요.");
        }
        const id = genId();
        set({
          scenarios: [...scenarios, { id, name, presetId, params: cloneParams(params) }],
        });
        return id;
      },

      deleteScenario: (id) => {
        const { scenarios } = get();
        set({ scenarios: scenarios.filter((s) => s.id !== id) });
      },

      setActivePreset: (id) => set({ activePresetId: id }),
    }),
    {
      name: "cost-sim-v3:work:v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({
        customPresets: state.customPresets,
        scenarios: state.scenarios,
        activePresetId: state.activePresetId,
      }),
    }
  )
);
```

- [ ] **Step 5: Run tests**

```bash
cd projects/cost-sim-v3 && npx vitest run lib/__tests__/work-store.test.ts
```

Expected: All tests PASS.

- [ ] **Step 6: Run full test suite for regression**

```bash
cd projects/cost-sim-v3 && npm test
```

Expected: All existing tests + new tests pass.

- [ ] **Step 7: Commit**

```bash
cd projects/cost-sim-v3
git add lib/work-store.ts lib/__tests__/work-store.test.ts content/sample-presets.json
git commit -m "feat(v3): add work-store with preset/scenario CRUD + sample data"
```

---

### Task 4: DeltaCell Component

**Files:**
- Create: `projects/cost-sim-v3/components/Scenario/DeltaCell.tsx`

- [ ] **Step 1: Create DeltaCell.tsx**

```typescript
"use client";

interface DeltaCellProps {
  value: number;
  isProfit: boolean;
  format?: "dollar" | "percent";
}

export default function DeltaCell({ value, isProfit, format = "dollar" }: DeltaCellProps) {
  if (Math.abs(value) < 0.005) {
    return <span className="text-[hsl(var(--muted))]">—</span>;
  }

  const isPositive = value > 0;
  const isGood = isProfit ? isPositive : !isPositive;
  const arrow = isPositive ? "▲" : "▼";
  const color = isGood
    ? "text-[hsl(var(--success))]"
    : "text-[hsl(345_100%_40%)]";

  const formatted =
    format === "percent"
      ? `${(Math.abs(value) * 100).toFixed(2)}%p`
      : `$${Math.abs(value).toFixed(2)}`;

  return (
    <span className={`font-mono text-sm font-semibold ${color}`}>
      {arrow} {formatted}
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd projects/cost-sim-v3
git add components/Scenario/DeltaCell.tsx
git commit -m "feat(v3): add DeltaCell component for scenario comparison"
```

---

### Task 5: CompareView Component

**Files:**
- Create: `projects/cost-sim-v3/components/Scenario/CompareView.tsx`

- [ ] **Step 1: Create CompareView.tsx**

```typescript
"use client";

import { useMemo } from "react";
import { calculate } from "@/lib/cost-engine/engine";
import type { CostParams, CostResult } from "@/lib/cost-engine/types";
import { ROWS } from "@/lib/export";
import DeltaCell from "./DeltaCell";

interface CompareViewProps {
  scenarioA: { name: string; params: CostParams };
  scenarioB: { name: string; params: CostParams };
}

export default function CompareView({ scenarioA, scenarioB }: CompareViewProps) {
  const resultA = useMemo(() => calculate(scenarioA.params), [scenarioA.params]);
  const resultB = useMemo(() => calculate(scenarioB.params), [scenarioB.params]);

  const biggestChange = useMemo(() => {
    let maxKey = "";
    let maxDelta = 0;
    for (const r of ROWS) {
      if (r.key === "price" || r.format === "percent") continue;
      const delta = Math.abs((resultB[r.key] as number) - (resultA[r.key] as number));
      if (delta > maxDelta) {
        maxDelta = delta;
        maxKey = r.label;
      }
    }
    return maxKey;
  }, [resultA, resultB]);

  const opDelta = resultB.operating_profit - resultA.operating_profit;
  const opPctChange =
    resultA.operating_profit !== 0
      ? ((opDelta / Math.abs(resultA.operating_profit)) * 100).toFixed(1)
      : "N/A";

  function fmtVal(val: number, format: "dollar" | "percent"): string {
    if (format === "percent") return (val * 100).toFixed(2) + "%";
    return "$" + val.toFixed(2);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.5)]">
              <th className="px-4 py-3 text-left font-semibold text-[hsl(var(--fg))]">항목</th>
              <th className="px-4 py-3 text-right font-semibold text-[hsl(var(--fg))]">{scenarioA.name}</th>
              <th className="px-4 py-3 text-right font-semibold text-[hsl(var(--fg))]">{scenarioB.name}</th>
              <th className="px-4 py-3 text-right font-semibold text-[hsl(var(--fg))]">Δ</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const va = resultA[row.key] as number;
              const vb = resultB[row.key] as number;
              const delta = vb - va;
              return (
                <tr
                  key={row.key}
                  className="border-b border-[hsl(var(--border)/0.5)] last:border-0"
                >
                  <td className="px-4 py-2.5 font-medium text-[hsl(var(--fg))]">{row.label}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-[hsl(var(--muted))]">
                    {fmtVal(va, row.format)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-[hsl(var(--fg))]">
                    {fmtVal(vb, row.format)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <DeltaCell value={delta} isProfit={row.isProfit} format={row.format} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="rounded-xl bg-[hsl(var(--surface-200)/0.5)] px-4 py-3 text-sm text-[hsl(var(--fg))]">
        <span className="font-semibold">변동 요약:</span>{" "}
        가장 큰 변화 항목은 <strong>{biggestChange}</strong>.
        영업이익 {opDelta >= 0 ? "+" : ""}${opDelta.toFixed(2)} ({opPctChange}%)
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd projects/cost-sim-v3
git add components/Scenario/CompareView.tsx
git commit -m "feat(v3): add CompareView table with delta highlighting"
```

---

### Task 6: PresetForm Component

**Files:**
- Create: `projects/cost-sim-v3/components/CustomPreset/PresetForm.tsx`

- [ ] **Step 1: Create PresetForm.tsx**

```typescript
"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronDown } from "lucide-react";
import { calculate } from "@/lib/cost-engine/engine";
import type { CostParams } from "@/lib/cost-engine/types";

const num = (min: number, max: number) => z.number().min(min).max(max);

const costParamsSchema = z.object({
  price: num(0.01, 10000),
  loading: num(0.01, 1),
  bom_tft: num(0, 5000),
  bom_cf: num(0, 5000),
  bom_cell: num(0, 5000),
  bom_module: num(0, 5000),
  yield_tft: num(0.01, 1),
  yield_cf: num(0.01, 1),
  yield_cell: num(0.01, 1),
  yield_module: num(0.01, 1),
  panel_labor: num(0, 5000),
  panel_expense: num(0, 5000),
  panel_depreciation: num(0, 5000),
  module_labor: num(0, 5000),
  module_expense: num(0, 5000),
  module_depreciation: num(0, 5000),
  sga_direct_dev: num(0, 5000),
  sga_transport: num(0, 5000),
  sga_business_unit: num(0, 5000),
  sga_operation: num(0, 5000),
  sga_corporate_oh: num(0, 5000),
});

type FormValues = z.infer<typeof costParamsSchema>;

function toFormValues(p: CostParams): FormValues {
  return {
    price: p.price, loading: p.loading,
    bom_tft: p.bom.tft, bom_cf: p.bom.cf, bom_cell: p.bom.cell, bom_module: p.bom.module,
    yield_tft: p.yields.tft, yield_cf: p.yields.cf, yield_cell: p.yields.cell, yield_module: p.yields.module,
    panel_labor: p.processing.panel.labor, panel_expense: p.processing.panel.expense,
    panel_depreciation: p.processing.panel.depreciation,
    module_labor: p.processing.module.labor, module_expense: p.processing.module.expense,
    module_depreciation: p.processing.module.depreciation,
    sga_direct_dev: p.sga.direct_dev, sga_transport: p.sga.transport,
    sga_business_unit: p.sga.business_unit, sga_operation: p.sga.operation,
    sga_corporate_oh: p.sga.corporate_oh,
  };
}

function toCostParams(v: FormValues): CostParams {
  return {
    price: v.price, loading: v.loading,
    bom: { tft: v.bom_tft, cf: v.bom_cf, cell: v.bom_cell, module: v.bom_module },
    yields: { tft: v.yield_tft, cf: v.yield_cf, cell: v.yield_cell, module: v.yield_module },
    processing: {
      panel: { labor: v.panel_labor, expense: v.panel_expense, depreciation: v.panel_depreciation },
      module: { labor: v.module_labor, expense: v.module_expense, depreciation: v.module_depreciation },
    },
    sga: {
      direct_dev: v.sga_direct_dev, transport: v.sga_transport,
      business_unit: v.sga_business_unit, operation: v.sga_operation, corporate_oh: v.sga_corporate_oh,
    },
  };
}

interface PresetFormProps {
  initialParams?: CostParams;
  onSave: (name: string, params: CostParams) => void;
  onAnalyze: (params: CostParams) => void;
}

interface FieldDef {
  key: keyof FormValues;
  label: string;
  step: number;
}

const GROUPS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "기본 정보",
    fields: [
      { key: "price", label: "Price ($)", step: 1 },
      { key: "loading", label: "Loading", step: 0.01 },
    ],
  },
  {
    title: "BOM (소요재료비)",
    fields: [
      { key: "bom_tft", label: "TFT ($)", step: 0.1 },
      { key: "bom_cf", label: "CF ($)", step: 0.1 },
      { key: "bom_cell", label: "Cell ($)", step: 0.1 },
      { key: "bom_module", label: "Module ($)", step: 0.1 },
    ],
  },
  {
    title: "Yields / Processing",
    fields: [
      { key: "yield_tft", label: "수율 TFT", step: 0.01 },
      { key: "yield_cf", label: "수율 CF", step: 0.01 },
      { key: "yield_cell", label: "수율 Cell", step: 0.01 },
      { key: "yield_module", label: "수율 Module", step: 0.01 },
      { key: "panel_labor", label: "Panel 노무비 ($)", step: 0.1 },
      { key: "panel_expense", label: "Panel 경비 ($)", step: 0.1 },
      { key: "panel_depreciation", label: "Panel 상각비 ($)", step: 0.1 },
      { key: "module_labor", label: "Module 노무비 ($)", step: 0.1 },
      { key: "module_expense", label: "Module 경비 ($)", step: 0.1 },
      { key: "module_depreciation", label: "Module 상각비 ($)", step: 0.1 },
    ],
  },
  {
    title: "SGA (판관비)",
    fields: [
      { key: "sga_direct_dev", label: "직접개발비 ($)", step: 0.1 },
      { key: "sga_transport", label: "운반비 ($)", step: 0.1 },
      { key: "sga_business_unit", label: "사업부비용 ($)", step: 0.1 },
      { key: "sga_operation", label: "Operation ($)", step: 0.1 },
      { key: "sga_corporate_oh", label: "Corporate OH ($)", step: 0.1 },
    ],
  },
];

export default function PresetForm({ initialParams, onSave, onAnalyze }: PresetFormProps) {
  const [openGroup, setOpenGroup] = useState(0);
  const [presetName, setPresetName] = useState("");

  const defaultValues = initialParams ? toFormValues(initialParams) : undefined;

  const {
    register,
    watch,
    formState: { isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(costParamsSchema),
    defaultValues,
    mode: "onChange",
  });

  const values = watch();
  const preview = useMemo(() => {
    try {
      const params = toCostParams(values);
      return calculate(params);
    } catch {
      return null;
    }
  }, [values]);

  const currentParams = toCostParams(values);

  return (
    <div className="flex flex-col gap-3">
      {/* Accordion groups */}
      {GROUPS.map((group, gi) => (
        <div
          key={group.title}
          className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] overflow-hidden"
        >
          <button
            type="button"
            onClick={() => setOpenGroup(openGroup === gi ? -1 : gi)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-[hsl(var(--fg))] hover:bg-[hsl(var(--surface-200)/0.3)]"
          >
            {group.title}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${openGroup === gi ? "rotate-180" : ""}`}
            />
          </button>
          {openGroup === gi && (
            <div className="grid grid-cols-2 gap-3 px-4 pb-4">
              {group.fields.map((f) => (
                <label key={f.key} className="flex flex-col gap-1">
                  <span className="text-xs text-[hsl(var(--muted))]">{f.label}</span>
                  <input
                    type="number"
                    step={f.step}
                    {...register(f.key, { valueAsNumber: true })}
                    className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.5)] px-3 py-2 text-sm font-mono text-[hsl(var(--fg))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)]"
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* COP Preview */}
      {preview && (
        <div className="rounded-xl bg-[hsl(var(--surface-200)/0.5)] px-4 py-3 flex items-center gap-4 text-sm">
          <span className="text-[hsl(var(--muted))]">COP: <strong className="text-[hsl(var(--fg))]">${preview.cop.toFixed(2)}</strong></span>
          <span className="text-[hsl(var(--muted))]">영업이익: <strong className="text-[hsl(var(--fg))]">${preview.operating_profit.toFixed(2)}</strong></span>
          <span className="text-[hsl(var(--muted))]">이익률: <strong className="text-[hsl(var(--fg))]">{(preview.operating_margin * 100).toFixed(1)}%</strong></span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <input
          type="text"
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
          placeholder="프리셋 이름 (예: 55인치 Q3)"
          className="flex-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.5)] px-3 py-2 text-sm text-[hsl(var(--fg))] placeholder:text-[hsl(var(--muted)/0.5)]"
        />
        <button
          type="button"
          disabled={!isValid || !presetName.trim()}
          onClick={() => onSave(presetName.trim(), currentParams)}
          className="rounded-lg bg-[hsl(var(--surface-200))] px-4 py-2 text-sm font-semibold text-[hsl(var(--fg))] disabled:opacity-40 hover:bg-[hsl(var(--surface-200)/0.8)]"
        >
          저장
        </button>
        <button
          type="button"
          disabled={!isValid}
          onClick={() => onAnalyze(currentParams)}
          className="rounded-lg bg-[hsl(var(--accent))] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:bg-[hsl(var(--accent)/0.9)]"
        >
          분석 시작
        </button>
      </div>
    </div>
  );
}

export { toCostParams, toFormValues };
```

- [ ] **Step 2: Verify build**

```bash
cd projects/cost-sim-v3 && npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
cd projects/cost-sim-v3
git add components/CustomPreset/PresetForm.tsx
git commit -m "feat(v3): add PresetForm with accordion groups + live COP preview"
```

---

### Task 7: PresetManager Component

**Files:**
- Create: `projects/cost-sim-v3/components/CustomPreset/PresetManager.tsx`

- [ ] **Step 1: Create PresetManager.tsx**

```typescript
"use client";

import { useMemo } from "react";
import { Trash2, ArrowRight } from "lucide-react";
import { calculate } from "@/lib/cost-engine/engine";
import type { CustomPreset } from "@/lib/work-store";

interface PresetManagerProps {
  presets: CustomPreset[];
  onSelect: (preset: CustomPreset) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

function PresetCard({
  preset,
  onSelect,
  onDelete,
}: {
  preset: CustomPreset;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const result = useMemo(() => calculate(preset.params), [preset.params]);
  const date = new Date(preset.createdAt).toLocaleDateString("ko-KR");

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] p-4 transition-all hover:border-[hsl(var(--accent)/0.5)]">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-[hsl(var(--fg))] truncate">{preset.name}</div>
        <div className="mt-1 flex items-center gap-3 text-xs text-[hsl(var(--muted))]">
          <span>Price: ${preset.params.price}</span>
          <span>영업이익: ${result.operating_profit.toFixed(1)}</span>
          <span>{date}</span>
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--muted))] opacity-0 group-hover:opacity-100 hover:bg-[hsl(345_100%_32%/0.1)] hover:text-[hsl(345_100%_40%)] transition-all"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <button
        onClick={onSelect}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.1)] transition-all"
      >
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function PresetManager({ presets, onSelect, onDelete, onNew }: PresetManagerProps) {
  return (
    <div className="flex flex-col gap-3">
      {presets.map((p) => (
        <PresetCard
          key={p.id}
          preset={p}
          onSelect={() => onSelect(p)}
          onDelete={() => onDelete(p.id)}
        />
      ))}
      <button
        onClick={onNew}
        className="rounded-xl border border-dashed border-[hsl(var(--border))] px-4 py-3 text-sm font-semibold text-[hsl(var(--muted))] hover:border-[hsl(var(--accent)/0.5)] hover:text-[hsl(var(--accent))] transition-all"
      >
        + 새 프리셋 만들기
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd projects/cost-sim-v3
git add components/CustomPreset/PresetManager.tsx
git commit -m "feat(v3): add PresetManager card list with CRUD"
```

---

### Task 8: AnalyzePanel Wrapper

**Files:**
- Create: `projects/cost-sim-v3/components/Work/AnalyzePanel.tsx`

- [ ] **Step 1: Create AnalyzePanel.tsx**

This is a standalone panel that manages CostParams via local React state, renders sliders for all CostParams fields, and calls `calculate()` on change. It does NOT use the education store.

```typescript
"use client";

import { useState, useMemo, useCallback } from "react";
import { calculate } from "@/lib/cost-engine/engine";
import { cloneParams } from "@/lib/cost-engine/presets";
import type { CostParams, CostResult } from "@/lib/cost-engine/types";
import Slider from "@/components/ui/Slider";

interface AnalyzePanelProps {
  initialParams: CostParams;
  onChange: (params: CostParams, result: CostResult) => void;
}

interface SliderDef {
  key: string;
  label: string;
  getValue: (p: CostParams) => number;
  setValue: (p: CostParams, v: number) => CostParams;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}

const SLIDERS: SliderDef[] = [
  {
    key: "loading", label: "Loading",
    getValue: (p) => p.loading, setValue: (p, v) => ({ ...p, loading: v }),
    min: 0.1, max: 1.0, step: 0.01,
    format: (v) => `${(v * 100).toFixed(0)}%`,
  },
  {
    key: "bom_module", label: "Module BOM",
    getValue: (p) => p.bom.module, setValue: (p, v) => ({ ...p, bom: { ...p.bom, module: v } }),
    min: 20, max: 150, step: 0.5,
    format: (v) => `$${v.toFixed(1)}`,
  },
  {
    key: "yield_module", label: "Module 수율",
    getValue: (p) => p.yields.module, setValue: (p, v) => ({ ...p, yields: { ...p.yields, module: v } }),
    min: 0.8, max: 1.0, step: 0.005,
    format: (v) => `${(v * 100).toFixed(1)}%`,
  },
  {
    key: "panel_labor", label: "Panel 노무비",
    getValue: (p) => p.processing.panel.labor,
    setValue: (p, v) => ({ ...p, processing: { ...p.processing, panel: { ...p.processing.panel, labor: v } } }),
    min: 0, max: 50, step: 0.1,
    format: (v) => `$${v.toFixed(1)}`,
  },
  {
    key: "module_labor", label: "Module 노무비",
    getValue: (p) => p.processing.module.labor,
    setValue: (p, v) => ({ ...p, processing: { ...p.processing, module: { ...p.processing.module, labor: v } } }),
    min: 0, max: 30, step: 0.1,
    format: (v) => `$${v.toFixed(1)}`,
  },
  {
    key: "panel_depreciation", label: "Panel 상각비",
    getValue: (p) => p.processing.panel.depreciation,
    setValue: (p, v) => ({ ...p, processing: { ...p.processing, panel: { ...p.processing.panel, depreciation: v } } }),
    min: 0, max: 40, step: 0.1,
    format: (v) => `$${v.toFixed(1)}`,
  },
];

export default function AnalyzePanel({ initialParams, onChange }: AnalyzePanelProps) {
  const [params, setParams] = useState<CostParams>(() => cloneParams(initialParams));

  const result = useMemo(() => calculate(params), [params]);

  const handleSlider = useCallback(
    (slider: SliderDef, value: number) => {
      const next = slider.setValue(cloneParams(params), value);
      setParams(next);
      onChange(next, calculate(next));
    },
    [params, onChange]
  );

  return (
    <section className="flex flex-col gap-0 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] overflow-hidden shadow-card">
      <header className="border-b border-[hsl(var(--border))] px-4 py-3 bg-[hsl(var(--surface-200)/0.5)]">
        <h2 className="text-sm font-bold text-[hsl(var(--fg))]">파라미터 조정</h2>
        <p className="mt-0.5 text-xs text-[hsl(var(--muted))]">
          슬라이더로 변수를 조정하면 원가 트리가 실시간으로 반응합니다
        </p>
      </header>
      <div className="flex flex-col gap-5 px-4 py-4">
        {SLIDERS.map((s) => {
          const val = s.getValue(params);
          return (
            <Slider
              key={s.key}
              label={s.label}
              valueLabel={s.format(val)}
              minLabel={s.format(s.min)}
              maxLabel={s.format(s.max)}
              min={s.min}
              max={s.max}
              step={s.step}
              value={val}
              onChange={(e) => handleSlider(s, Number(e.target.value))}
            />
          );
        })}
      </div>

      {/* Quick summary */}
      <div className="border-t border-[hsl(var(--border))] px-4 py-3 flex flex-wrap gap-4 text-xs text-[hsl(var(--muted))]">
        <span>COP: <strong className="text-[hsl(var(--fg))]">${result.cop.toFixed(2)}</strong></span>
        <span>영업이익: <strong className="text-[hsl(var(--fg))]">${result.operating_profit.toFixed(2)}</strong></span>
        <span>이익률: <strong className="text-[hsl(var(--fg))]">{(result.operating_margin * 100).toFixed(1)}%</strong></span>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify Slider component accepts value/onChange props**

Read `components/ui/Slider.tsx` to confirm it supports controlled mode (value + onChange props). If it only supports ref-based (register), add value/onChange support.

- [ ] **Step 3: Commit**

```bash
cd projects/cost-sim-v3
git add components/Work/AnalyzePanel.tsx
git commit -m "feat(v3): add AnalyzePanel wrapper with direct CostParams sliders"
```

---

### Task 9: Analyze Page

**Files:**
- Create: `projects/cost-sim-v3/app/(work)/analyze/page.tsx`

- [ ] **Step 1: Create analyze page**

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, GitCompare, Plus } from "lucide-react";
import Link from "next/link";

import { useWorkStore } from "@/lib/work-store";
import { calculate } from "@/lib/cost-engine/engine";
import { cloneParams } from "@/lib/cost-engine/presets";
import type { CostParams, CostResult } from "@/lib/cost-engine/types";

import CostTreeView from "@/components/CostTree/CostTreeView";
import AnalyzePanel from "@/components/Work/AnalyzePanel";
import PresetForm from "@/components/CustomPreset/PresetForm";
import PresetManager from "@/components/CustomPreset/PresetManager";

type View = "analyze" | "new-preset" | "manage";

export default function AnalyzePage() {
  const router = useRouter();
  const {
    customPresets, scenarios, activePresetId,
    loadSamplePresets, setActivePreset, savePreset, deletePreset, saveScenario,
  } = useWorkStore();

  const [view, setView] = useState<View>("analyze");
  const [currentParams, setCurrentParams] = useState<CostParams | null>(null);
  const [currentResult, setCurrentResult] = useState<CostResult | null>(null);
  const [scenarioName, setScenarioName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Load sample presets on first visit
  useEffect(() => {
    loadSamplePresets();
  }, [loadSamplePresets]);

  // Load active preset params
  const activePreset = customPresets.find((p) => p.id === activePresetId);
  useEffect(() => {
    if (activePreset) {
      const p = cloneParams(activePreset.params);
      setCurrentParams(p);
      setCurrentResult(calculate(p));
    }
  }, [activePreset]);

  // Auto-select first preset if none active
  useEffect(() => {
    if (!activePresetId && customPresets.length > 0) {
      setActivePreset(customPresets[0].id);
    }
  }, [activePresetId, customPresets, setActivePreset]);

  const handleParamChange = useCallback((params: CostParams, result: CostResult) => {
    setCurrentParams(params);
    setCurrentResult(result);
  }, []);

  const handleSaveScenario = () => {
    if (!currentParams || !activePresetId || !scenarioName.trim()) return;
    try {
      saveScenario(scenarioName.trim(), activePresetId, currentParams);
      setScenarioName("");
      setShowSaveDialog(false);
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (view === "new-preset") {
    return (
      <main className="min-h-screen mesh-bg px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <button onClick={() => setView("analyze")} className="mb-4 flex items-center gap-1 text-sm text-[hsl(var(--muted))] hover:text-[hsl(var(--fg))]">
            <ArrowLeft className="h-4 w-4" /> 분석으로 돌아가기
          </button>
          <h1 className="text-xl font-bold text-[hsl(var(--fg))] mb-4">새 프리셋</h1>
          <PresetForm
            onSave={(name, params) => {
              const id = savePreset(name, params);
              setActivePreset(id);
              setView("analyze");
            }}
            onAnalyze={(params) => {
              const id = savePreset("임시 프리셋", params);
              setActivePreset(id);
              setView("analyze");
            }}
          />
        </div>
      </main>
    );
  }

  if (view === "manage") {
    return (
      <main className="min-h-screen mesh-bg px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <button onClick={() => setView("analyze")} className="mb-4 flex items-center gap-1 text-sm text-[hsl(var(--muted))] hover:text-[hsl(var(--fg))]">
            <ArrowLeft className="h-4 w-4" /> 분석으로 돌아가기
          </button>
          <h1 className="text-xl font-bold text-[hsl(var(--fg))] mb-4">프리셋 관리</h1>
          <PresetManager
            presets={customPresets}
            onSelect={(p) => { setActivePreset(p.id); setView("analyze"); }}
            onDelete={deletePreset}
            onNew={() => setView("new-preset")}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen mesh-bg">
      {/* Top bar */}
      <div className="border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-100)/0.8)] backdrop-blur-sm px-4 py-3">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[hsl(var(--muted))] hover:text-[hsl(var(--fg))]">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-base font-bold text-[hsl(var(--fg))]">실무 분석</h1>
            {/* Preset selector */}
            <select
              value={activePresetId ?? ""}
              onChange={(e) => setActivePreset(e.target.value || null)}
              className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.5)] px-3 py-1.5 text-sm text-[hsl(var(--fg))]"
            >
              {customPresets.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button onClick={() => setView("manage")} className="text-xs text-[hsl(var(--muted))] hover:text-[hsl(var(--accent))]">관리</button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSaveDialog(true)}
              disabled={!currentParams}
              className="flex items-center gap-1 rounded-lg bg-[hsl(var(--surface-200))] px-3 py-1.5 text-sm font-semibold text-[hsl(var(--fg))] disabled:opacity-40 hover:bg-[hsl(var(--surface-200)/0.8)]"
            >
              <Save className="h-3.5 w-3.5" /> 시나리오 저장
            </button>
            <button
              onClick={() => router.push("/compare")}
              disabled={scenarios.length < 2}
              className="flex items-center gap-1 rounded-lg bg-[hsl(var(--accent))] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40 hover:bg-[hsl(var(--accent)/0.9)]"
            >
              <GitCompare className="h-3.5 w-3.5" /> 비교 ({scenarios.length})
            </button>
          </div>
        </div>
      </div>

      {/* Save scenario dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-2xl bg-[hsl(var(--surface-100))] p-6 shadow-elevated max-w-sm w-full mx-4">
            <h3 className="text-base font-bold text-[hsl(var(--fg))] mb-3">시나리오 저장</h3>
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              placeholder="예: 수율 2%p 개선"
              className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.5)] px-3 py-2 text-sm text-[hsl(var(--fg))] mb-3"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowSaveDialog(false)} className="rounded-lg px-4 py-2 text-sm text-[hsl(var(--muted))]">취소</button>
              <button onClick={handleSaveScenario} disabled={!scenarioName.trim()} className="rounded-lg bg-[hsl(var(--accent))] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">저장</button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        {currentParams && currentResult ? (
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
            <AnalyzePanel initialParams={currentParams} onChange={handleParamChange} />
            <CostTreeView result={currentResult} />
          </div>
        ) : (
          <div className="text-center py-20 text-[hsl(var(--muted))]">
            <p>프리셋을 선택하거나 새로 만들어 주세요.</p>
            <button onClick={() => setView("new-preset")} className="mt-4 flex items-center gap-1 mx-auto text-[hsl(var(--accent))]">
              <Plus className="h-4 w-4" /> 새 프리셋 만들기
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Check CostTreeView props**

Read `components/CostTree/CostTreeView.tsx` to verify it accepts a `result` prop directly, or if it reads from the education store. If it reads from store, create a thin wrapper that passes result as prop.

- [ ] **Step 3: Verify build**

```bash
cd projects/cost-sim-v3 && npm run build
```

- [ ] **Step 4: Commit**

```bash
cd projects/cost-sim-v3
git add app/\(work\)/analyze/page.tsx
git commit -m "feat(v3): add /analyze page with preset selection + scenario save"
```

---

### Task 10: Compare Page

**Files:**
- Create: `projects/cost-sim-v3/app/(work)/compare/page.tsx`

- [ ] **Step 1: Create compare page**

```typescript
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardCopy, Check, Trash2 } from "lucide-react";

import { useWorkStore } from "@/lib/work-store";
import { calculate } from "@/lib/cost-engine/engine";
import { toTSV, copyToClipboard } from "@/lib/export";
import CompareView from "@/components/Scenario/CompareView";

export default function ComparePage() {
  const { scenarios, deleteScenario } = useWorkStore();
  const [selected, setSelected] = useState<[string, string]>(() => {
    if (scenarios.length >= 2) return [scenarios[0].id, scenarios[1].id];
    return ["", ""];
  });
  const [copied, setCopied] = useState(false);

  const scenarioA = scenarios.find((s) => s.id === selected[0]);
  const scenarioB = scenarios.find((s) => s.id === selected[1]);

  const canCompare = scenarioA && scenarioB && scenarioA.id !== scenarioB.id;

  const handleCopy = async () => {
    if (!scenarioA || !scenarioB) return;
    const resultA = calculate(scenarioA.params);
    const resultB = calculate(scenarioB.params);
    const tsv = toTSV(resultA, resultB, scenarioA.name, scenarioB.name);
    const ok = await copyToClipboard(tsv);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleSelect = (id: string) => {
    if (selected[0] === id) setSelected(["", selected[1]]);
    else if (selected[1] === id) setSelected([selected[0], ""]);
    else if (!selected[0]) setSelected([id, selected[1]]);
    else if (!selected[1]) setSelected([selected[0], id]);
    else setSelected([selected[1], id]); // Replace oldest
  };

  return (
    <main className="min-h-screen mesh-bg px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/analyze" className="mb-4 flex items-center gap-1 text-sm text-[hsl(var(--muted))] hover:text-[hsl(var(--fg))]">
          <ArrowLeft className="h-4 w-4" /> 분석으로 돌아가기
        </Link>

        <h1 className="text-xl font-bold text-[hsl(var(--fg))] mb-4">시나리오 비교</h1>

        {/* Scenario selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          {scenarios.map((s) => {
            const isSelected = selected.includes(s.id);
            return (
              <div key={s.id} className="flex items-center gap-1">
                <button
                  onClick={() => toggleSelect(s.id)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                    isSelected
                      ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))]"
                      : "border-[hsl(var(--border))] text-[hsl(var(--muted))] hover:border-[hsl(var(--accent)/0.5)]"
                  }`}
                >
                  {isSelected ? "✓ " : ""}{s.name}
                </button>
                <button
                  onClick={() => deleteScenario(s.id)}
                  className="text-[hsl(var(--muted))] hover:text-[hsl(345_100%_40%)]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Compare table */}
        {canCompare ? (
          <>
            <CompareView
              scenarioA={{ name: scenarioA.name, params: scenarioA.params }}
              scenarioB={{ name: scenarioB.name, params: scenarioB.params }}
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-lg bg-[hsl(var(--surface-200))] px-4 py-2 text-sm font-semibold text-[hsl(var(--fg))] hover:bg-[hsl(var(--surface-200)/0.8)]"
              >
                {copied ? <Check className="h-4 w-4 text-[hsl(var(--success))]" /> : <ClipboardCopy className="h-4 w-4" />}
                {copied ? "복사됨!" : "클립보드 복사"}
              </button>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--surface-100)/0.5)] px-6 py-12 text-center text-[hsl(var(--muted))]">
            {scenarios.length < 2
              ? "비교하려면 시나리오를 2개 이상 저장해 주세요."
              : "위에서 시나리오 2개를 선택해 주세요."}
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd projects/cost-sim-v3 && npm run build
```

- [ ] **Step 3: Commit**

```bash
cd projects/cost-sim-v3
git add app/\(work\)/compare/page.tsx
git commit -m "feat(v3): add /compare page with scenario selection + clipboard export"
```

---

### Task 11: Home Page Integration

**Files:**
- Modify: `projects/cost-sim-v3/app/page.tsx`

- [ ] **Step 1: Add "실무 분석" card to modes array**

In `app/page.tsx`, add to the `modes` array (after the Daily Challenge entry):

```typescript
import { BarChart3 } from "lucide-react";

// Add this to the modes array:
{
  href: "/analyze",
  icon: BarChart3,
  label: "실무 분석",
  sublabel: "What-if 시나리오",
  description:
    "내 제품의 실제 원가 데이터를 입력하고, 변수 변경에 따른 원가 구조 변화를 분석합니다.",
  accent: "from-[hsl(210_80%_40%/0.08)] to-[hsl(210_80%_40%/0.02)]",
  border: "border-[hsl(210_80%_40%/0.2)] hover:border-[hsl(210_80%_40%/0.5)]",
  iconColor: "text-[hsl(210_80%_50%)]",
  tag: "실무"
},
```

Also update the grid: change `sm:grid-cols-3` to `sm:grid-cols-4` (or keep 3 and let the 4th card wrap to the next row on mobile).

- [ ] **Step 2: Import the icon**

Add `BarChart3` to the lucide-react import at the top of `page.tsx`.

- [ ] **Step 3: Verify build and visual check**

```bash
cd projects/cost-sim-v3 && npm run build && npm run dev
```

Open `http://localhost:3000` — verify the new "실무 분석" card appears.

- [ ] **Step 4: Run existing E2E tests for regression**

```bash
cd projects/cost-sim-v3 && npm test
```

Expected: All 33 tests pass.

- [ ] **Step 5: Commit**

```bash
cd projects/cost-sim-v3
git add app/page.tsx
git commit -m "feat(v3): add '실무 분석' card to home page"
```

---

### Task 12: Integration Verification

- [ ] **Step 1: Run full test suite**

```bash
cd projects/cost-sim-v3 && npm test
```

Expected: All tests pass (33 existing + new work-store + export tests).

- [ ] **Step 2: Build check**

```bash
cd projects/cost-sim-v3 && npm run build
```

Verify First Load JS is under 250KB.

- [ ] **Step 3: Manual smoke test**

```bash
cd projects/cost-sim-v3 && npm run dev
```

Test this flow:
1. Home → "실무 분석" card → `/analyze`
2. Sample presets auto-loaded → "55인치 OLED 기준" selected
3. Adjust Loading slider → Cost Tree updates
4. Click "시나리오 저장" → name it "현재 상태" → save
5. Adjust Module 수율 slider → different result
6. Click "시나리오 저장" → name it "수율 개선" → save
7. Click "비교 (2)" → `/compare`
8. Both scenarios selected → table shows with green/red deltas
9. Click "클립보드 복사" → paste into text editor → verify TSV

Also verify:
- `/sandbox` still works (교육 기능)
- `/cases/01-loading` guided flow works
- `/daily` challenge works

- [ ] **Step 4: Final commit**

```bash
cd projects/cost-sim-v3
git add -A
git commit -m "chore(v3): integration verification pass"
```
