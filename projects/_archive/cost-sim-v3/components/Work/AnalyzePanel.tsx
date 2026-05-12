"use client";

import { useState, useMemo, useCallback } from "react";
import type { CostParams, CostResult } from "@/lib/cost-engine/types";
import { cloneParams } from "@/lib/cost-engine/presets";
import { calculate } from "@/lib/cost-engine/engine";
import Slider from "@/components/ui/Slider";

// ── Types ───────────────────────────────────────────────────────────────────

export interface AnalyzePanelProps {
  initialParams: CostParams;
  onChange: (params: CostParams, result: CostResult) => void;
}

interface SliderDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  format: "percent" | "dollar";
  get: (p: CostParams) => number;
  set: (p: CostParams, v: number) => CostParams;
}

// ── Slider definitions ──────────────────────────────────────────────────────

const SLIDERS: SliderDef[] = [
  {
    key: "loading",
    label: "Loading (가동률)",
    min: 0.1,
    max: 1.0,
    step: 0.01,
    format: "percent",
    get: (p) => p.loading,
    set: (p, v) => {
      const next = cloneParams(p);
      next.loading = v;
      return next;
    },
  },
  {
    key: "bom_module",
    label: "Module BOM",
    min: 20,
    max: 150,
    step: 0.5,
    format: "dollar",
    get: (p) => p.bom.module,
    set: (p, v) => {
      const next = cloneParams(p);
      next.bom.module = v;
      return next;
    },
  },
  {
    key: "yield_module",
    label: "Module 수율",
    min: 0.8,
    max: 1.0,
    step: 0.005,
    format: "percent",
    get: (p) => p.yields.module,
    set: (p, v) => {
      const next = cloneParams(p);
      next.yields.module = v;
      return next;
    },
  },
  {
    key: "panel_labor",
    label: "Panel 노무비",
    min: 0,
    max: 50,
    step: 0.1,
    format: "dollar",
    get: (p) => p.processing.panel.labor,
    set: (p, v) => {
      const next = cloneParams(p);
      next.processing.panel.labor = v;
      return next;
    },
  },
  {
    key: "module_labor",
    label: "Module 노무비",
    min: 0,
    max: 30,
    step: 0.1,
    format: "dollar",
    get: (p) => p.processing.module.labor,
    set: (p, v) => {
      const next = cloneParams(p);
      next.processing.module.labor = v;
      return next;
    },
  },
  {
    key: "panel_depreciation",
    label: "Panel 상각비",
    min: 0,
    max: 40,
    step: 0.1,
    format: "dollar",
    get: (p) => p.processing.panel.depreciation,
    set: (p, v) => {
      const next = cloneParams(p);
      next.processing.panel.depreciation = v;
      return next;
    },
  },
];

// ── Formatting helpers ──────────────────────────────────────────────────────

function formatValue(value: number, format: "percent" | "dollar"): string {
  if (format === "percent") return `${(value * 100).toFixed(1)}%`;
  return `$${value.toFixed(2)}`;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function AnalyzePanel({ initialParams, onChange }: AnalyzePanelProps) {
  const [params, setParams] = useState<CostParams>(() => cloneParams(initialParams));

  const result = useMemo(() => calculate(params), [params]);

  const handleSliderChange = useCallback(
    (def: SliderDef, rawValue: number) => {
      const next = def.set(params, rawValue);
      setParams(next);
      const nextResult = calculate(next);
      onChange(next, nextResult);
    },
    [params, onChange],
  );

  // Reset local params when initialParams identity changes (preset switch)
  const [prevInit, setPrevInit] = useState(initialParams);
  if (initialParams !== prevInit) {
    setPrevInit(initialParams);
    const cloned = cloneParams(initialParams);
    setParams(cloned);
  }

  return (
    <section className="flex flex-col gap-0 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] overflow-hidden shadow-card">
      {/* Header */}
      <header className="border-b border-[hsl(var(--border))] px-4 py-3 bg-[hsl(var(--surface-200)/0.5)]">
        <h2 className="text-sm font-bold text-[hsl(var(--fg))] leading-tight">
          파라미터 조정
        </h2>
        <p className="mt-0.5 text-xs text-[hsl(var(--muted))] leading-snug">
          슬라이더를 조작하여 원가 변화를 실시간 확인하세요
        </p>
      </header>

      {/* Sliders */}
      <div className="flex flex-col gap-5 px-4 py-4">
        {SLIDERS.map((def) => {
          const currentVal = def.get(params);
          return (
            <Slider
              key={def.key}
              label={def.label}
              valueLabel={formatValue(currentVal, def.format)}
              minLabel={formatValue(def.min, def.format)}
              maxLabel={formatValue(def.max, def.format)}
              min={def.min}
              max={def.max}
              step={def.step}
              value={currentVal}
              onChange={(e) => handleSliderChange(def, Number(e.target.value))}
            />
          );
        })}
      </div>

      {/* Summary */}
      <div className="px-4 py-4 bg-[hsl(var(--surface-200)/0.5)] border-t border-[hsl(var(--border))]">
        <p className="text-xs font-semibold text-[hsl(var(--muted))] mb-2 uppercase tracking-wide">
          실시간 요약
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col">
            <span className="text-xs text-[hsl(var(--muted))]">COP</span>
            <span className="text-sm font-mono font-semibold text-[hsl(var(--fg))]">
              {result.cop.toFixed(2)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-[hsl(var(--muted))]">영업이익</span>
            <span
              className={`text-sm font-mono font-semibold ${
                result.operating_profit >= 0 ? "text-emerald-500" : "text-red-400"
              }`}
            >
              {result.operating_profit >= 0 ? "+" : ""}
              {result.operating_profit.toFixed(2)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-[hsl(var(--muted))]">이익률</span>
            <span
              className={`text-sm font-mono font-semibold ${
                result.operating_margin >= 0 ? "text-emerald-500" : "text-red-400"
              }`}
            >
              {(result.operating_margin * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
