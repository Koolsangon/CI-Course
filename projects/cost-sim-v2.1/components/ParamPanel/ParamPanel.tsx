"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, RotateCcw } from "lucide-react";
import { useStore } from "@/lib/store";
import { REFERENCE_CASE1 } from "@/lib/cost-engine/presets";
import {
  applyMerged,
  changedKeys,
  DEFAULT_DELTAS,
  REFERENCE_CUTS,
  REFERENCE_MASK,
  type SevenDeltas
} from "@/lib/cost-engine/merged-adapter";
import Slider from "@/components/ui/Slider";

type VarFormat =
  | "percent"
  | "percent_delta"
  | "percent_point"
  | "int"
  | "multiplier"
  | "dollar"
  | "billion_krw";

interface VarDef {
  key: keyof SevenDeltas;
  ko: string;
  description?: string;
  min: number;
  max: number;
  step: number;
  default: number;
  format: VarFormat;
}

const VARS: VarDef[] = [
  {
    key: "loading",
    ko: "Loading율",
    description: "설비 가동률. 가공비 6항목 분담의 분모.",
    min: 0.30,
    max: 1.00,
    step: 0.01,
    default: 0.70,
    format: "percent"
  },
  {
    key: "materialDelta",
    ko: "Module 재료비 변동률",
    description: "Module BOM 절감/증가. 분자에 작용.",
    min: -0.20,
    max: 0.20,
    step: 0.005,
    default: 0,
    format: "percent_delta"
  },
  {
    key: "yieldDelta",
    ko: "Module 수율 변동률",
    description: "Module 수율 변화 (%p). 분모 (누적수율) 에 작용.",
    min: -0.10,
    max: 0.05,
    step: 0.005,
    default: 0,
    format: "percent_point"
  },
  {
    key: "newCuts",
    ko: "새 면취수",
    description: `기준 ${REFERENCE_CUTS}개. 면취수 ↑ = 단위당 BOM·노무비 분담 ↓.`,
    min: 10,
    max: 40,
    step: 1,
    default: REFERENCE_CUTS,
    format: "int"
  },
  {
    key: "newMask",
    ko: "새 Mask 장수",
    description: `기준 ${REFERENCE_MASK}장. Mask ↑ = 공정 부담 ↑ → 노무비 ↑.`,
    min: 3,
    max: 10,
    step: 1,
    default: REFERENCE_MASK,
    format: "int"
  },
  {
    key: "tactMult",
    ko: "Tact 배수",
    description: "Tact Time 배수. Module 가공비 6항목에 곱셈으로 작용.",
    min: 0.80,
    max: 1.50,
    step: 0.01,
    default: 1.00,
    format: "multiplier"
  },
  {
    key: "investmentDelta",
    ko: "투자 금액",
    description: "Module 라인 투자 총액. 감가상각 자동 계산 (300K대·1,480원/$·5년 기준).",
    min: 0,
    max: 30,
    step: 0.5,
    default: 0,
    format: "billion_krw"
  }
];

const GROUPS: { title: string; keys: (keyof SevenDeltas)[] }[] = [
  { title: "Loading", keys: ["loading"] },
  { title: "재료비 & 수율", keys: ["materialDelta", "yieldDelta"] },
  { title: "면취수 & Mask", keys: ["newCuts", "newMask"] },
  { title: "Tact & 투자", keys: ["tactMult", "investmentDelta"] }
];

function fmt(v: VarDef, value: number): string {
  switch (v.format) {
    case "percent":
      return `${(value * 100).toFixed(0)}%`;
    case "percent_delta":
      return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
    case "percent_point":
      return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%p`;
    case "multiplier":
      return `${value.toFixed(2)}x`;
    case "int":
      return `${Math.round(value)}`;
    case "dollar":
      return `$${value.toFixed(2)}`;
    case "billion_krw":
      return `${value.toFixed(1)}억원`;
  }
}

/** 억원 → $달러 증가분 변환: 1억원 ÷ 300,000대 ÷ 1,480원/$ */
function billionKrwToDollar(billions: number): number {
  return (billions * 1e8) / 300000 / 1480;
}

export default function ParamPanel() {
  const [deltas, setDeltas] = useState<SevenDeltas>(DEFAULT_DELTAS);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const setParams = useStore((s) => s.setParams);
  const setSliderValues = useStore((s) => s.setSliderValues);
  const resetCaseDelta = useStore((s) => s.resetCase);

  const changed = useMemo(() => new Set(changedKeys(deltas)), [deltas]);

  useEffect(() => {
    setParams(applyMerged(REFERENCE_CASE1, deltas));
    // FormulaInspector 가 변동된 변수만 표시하려면 deltas 가 store 에서 읽혀야 함.
    setSliderValues(deltas as unknown as Record<string, number>);
  }, [deltas, setParams, setSliderValues]);

  function update<K extends keyof SevenDeltas>(key: K, value: SevenDeltas[K]) {
    // investmentDelta는 억원 단위로 입력받아 달러로 변환하여 store에 저장
    if (key === "investmentDelta") {
      setDeltas((prev) => ({ ...prev, [key]: billionKrwToDollar(value as number) }));
    } else {
      setDeltas((prev) => ({ ...prev, [key]: value }));
    }
  }

  function resetVar(key: keyof SevenDeltas) {
    update(key, DEFAULT_DELTAS[key]);
  }

  function resetAll() {
    setDeltas(DEFAULT_DELTAS);
    // store의 lastDelta를 초기화 → CostTree 빨간 박스·점선 즉시 제거
    resetCaseDelta();
  }

  function toggleGroup(title: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  return (
    <section className="flex flex-col gap-0 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] overflow-hidden shadow-card">
      <header className="flex items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.5)] px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-[hsl(var(--fg))] leading-tight">파라미터(변수)</h2>
          <p className="mt-0.5 text-[11px] text-[hsl(var(--muted))] leading-snug">
            변동 변수 {changed.size}개
          </p>
        </div>
        {changed.size > 0 && (
          <button
            type="button"
            onClick={resetAll}
            aria-label="모든 변수 기본값으로"
            className="flex items-center gap-1 rounded-lg border border-[hsl(var(--border))] px-2 py-1 text-[11px] font-medium text-[hsl(var(--muted))] transition-colors hover:bg-[hsl(var(--surface-200))] hover:text-[hsl(var(--fg))]"
          >
            <RotateCcw className="h-3 w-3" />
            전체 초기화
          </button>
        )}
      </header>

      <div className="flex flex-col">
        {GROUPS.map((group) => {
          const groupChanged = group.keys.filter((k) => changed.has(k)).length;
          const open = openGroups.has(group.title);
          return (
            <div key={group.title} className="border-b border-[hsl(var(--border))] last:border-b-0">
              <button
                type="button"
                onClick={() => toggleGroup(group.title)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-[hsl(var(--surface-200)/0.4)]"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[hsl(var(--fg))]">{group.title}</span>
                  {groupChanged > 0 && (
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" aria-label={`${groupChanged}개 변동`} />
                  )}
                </div>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-[hsl(var(--muted))] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                />
              </button>
              {open && (
                <div className="flex flex-col gap-4 px-4 pb-4 pt-1">
                  {group.keys.map((key) => {
                    const v = VARS.find((x) => x.key === key)!;
                    const value = deltas[key];
                    // investmentDelta는 store에 달러 단위 저장 → 표시는 억원으로 역변환
                    const displayValue = key === "investmentDelta"
                      ? value / billionKrwToDollar(1)
                      : value;
                    const isChanged = changed.has(key);
                    return (
                      <div key={key} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isChanged && (
                              <span
                                className="inline-flex h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[hsl(var(--accent))]"
                                aria-label="기본값에서 변경됨"
                              />
                            )}
                            <span className="truncate text-xs font-medium text-[hsl(var(--fg))]">{v.ko}</span>
                          </div>
                          {isChanged && (
                            <button
                              type="button"
                              onClick={() => resetVar(key)}
                              aria-label={`${v.ko} 기본값으로`}
                              title="기본값으로 복귀"
                              className="flex h-5 w-5 items-center justify-center rounded-md text-[hsl(var(--muted))] transition-colors hover:bg-[hsl(var(--surface-200))] hover:text-[hsl(var(--fg))]"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        <Slider
                          valueLabel={fmt(v, displayValue)}
                          minLabel={fmt(v, v.min)}
                          maxLabel={fmt(v, v.max)}
                          min={v.min}
                          max={v.max}
                          step={v.step}
                          value={displayValue}
                          onChange={(e) => update(key, parseFloat(e.target.value))}
                        />
                        {v.description && (
                          <p className="text-[11px] leading-snug text-[hsl(var(--muted)/0.7)] pl-0.5">
                            {v.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
