"use client";

import { useStore } from "@/lib/store";
import { TrendingUp, TrendingDown, Activity, Equal } from "lucide-react";
import { calculate } from "@/lib/cost-engine/engine";
import { REFERENCE_CASE1 } from "@/lib/cost-engine/presets";
import {
  DEFAULT_DELTAS,
  changedKeys,
  type SevenDeltas
} from "@/lib/cost-engine/merged-adapter";

const FIELD_LABELS: Record<string, string> = {
  processing_cost: "가공비 합계",
  com: "COM (제조원가)",
  cop: "COP (총원가)",
  operating_profit: "영업이익"
};

interface VarDisplay {
  key: keyof SevenDeltas;
  group: string;
  ko: string;
  fmt: (v: number) => string;
  describe: (base: number, next: number) => string;
}

const REF_DELTAS = DEFAULT_DELTAS;

function pct0(v: number): string {
  return `${(v * 100).toFixed(0)}%`;
}
function pct1Signed(v: number): string {
  return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
}
function pct1pSigned(v: number): string {
  return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%p`;
}
function intStr(v: number): string {
  return Math.round(v).toString();
}
function multX(v: number): string {
  return `${v.toFixed(2)}x`;
}
function dollar(v: number): string {
  return `$${v.toFixed(2)}`;
}

const VAR_DISPLAYS: VarDisplay[] = [
  {
    key: "loading",
    group: "Loading율 변경",
    ko: "Loading율",
    fmt: pct0,
    describe: (b, n) => `기존 ${pct0(b)} → 변경 ${pct0(n)} (증감 ${pct1pSigned(n - b)})`
  },
  {
    key: "materialDelta",
    group: "재료비& 수율 변경",
    ko: "Module 재료비",
    fmt: pct1Signed,
    describe: (_b, n) => `기존 0% → 변경 ${pct1Signed(n)} (증감 ${pct1Signed(n)})`
  },
  {
    key: "yieldDelta",
    group: "재료비& 수율 변경",
    ko: "Module 수율",
    fmt: pct1pSigned,
    describe: (_b, n) => `기존 0%p → 변경 ${pct1pSigned(n)} (증감 ${pct1pSigned(n)})`
  },
  {
    key: "newCuts",
    group: "면취수&Mask 수 변경",
    ko: "면취수",
    fmt: intStr,
    describe: (b, n) => `기존 ${intStr(b)}개 → 변경 ${intStr(n)}개 (증감 ${n > b ? "+" : ""}${n - b}개)`
  },
  {
    key: "newMask",
    group: "면취수&Mask 수 변경",
    ko: "Mask 수",
    fmt: intStr,
    describe: (b, n) => `기존 ${intStr(b)}장 → 변경 ${intStr(n)}장 (증감 ${n > b ? "+" : ""}${n - b}장)`
  },
  {
    key: "tactMult",
    group: "Tact time&투자 변경",
    ko: "Tact time 배수",
    fmt: multX,
    describe: (b, n) => `기존 ${multX(b)} → 변경 ${multX(n)} (증감 ${n > b ? "+" : ""}${((n - b) * 100).toFixed(0)}%)`
  },
  {
    key: "investmentDelta",
    group: "Tact time&투자 변경",
    ko: "투자비",
    fmt: dollar,
    describe: (_b, n) => {
      // 달러 → 억원 역변환 (1억원 = 300K대 × 1480원/$ 기준)
      const billions = (n * 300000 * 1480) / 1e8;
      return `기존 0억원 → 변경 ${billions.toFixed(1)}억원 (증감 +${billions.toFixed(1)}억원)`;
    }
  }
];

const RESULT_FIELDS = ["processing_cost", "com", "cop", "operating_profit"];

function fmtDollar(n: number): string {
  return `$${n.toFixed(2)}`;
}

export default function FormulaInspector() {
  const sliderValues = useStore((s) => s.sliderValues);
  const result = useStore((s) => s.result);

  // 슬라이더 패널이 setSliderValues 로 deltas 를 흘려보냄. 누락된 키는 기본값으로 채움.
  const deltas: SevenDeltas = {
    loading: typeof sliderValues.loading === "number" ? sliderValues.loading : REF_DELTAS.loading,
    materialDelta: typeof sliderValues.materialDelta === "number" ? sliderValues.materialDelta : REF_DELTAS.materialDelta,
    yieldDelta: typeof sliderValues.yieldDelta === "number" ? sliderValues.yieldDelta : REF_DELTAS.yieldDelta,
    newCuts: typeof sliderValues.newCuts === "number" ? sliderValues.newCuts : REF_DELTAS.newCuts,
    newMask: typeof sliderValues.newMask === "number" ? sliderValues.newMask : REF_DELTAS.newMask,
    tactMult: typeof sliderValues.tactMult === "number" ? sliderValues.tactMult : REF_DELTAS.tactMult,
    investmentDelta: typeof sliderValues.investmentDelta === "number" ? sliderValues.investmentDelta : REF_DELTAS.investmentDelta
  };

  const changed = new Set(changedKeys(deltas));
  const changedList = VAR_DISPLAYS.filter((v) => changed.has(v.key));

  // 변동 변수를 group 으로 묶음.
  const grouped: Record<string, VarDisplay[]> = {};
  for (const v of changedList) {
    if (!grouped[v.group]) grouped[v.group] = [];
    grouped[v.group].push(v);
  }

  // 결과 4줄 — reference (변동 없음) 와 비교한 누적 변화.
  const reference = calculate(REFERENCE_CASE1);

  return (
    <aside className="flex flex-col gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] overflow-hidden shadow-card">
      <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.5)] px-4 py-3">
        <Activity className="h-3.5 w-3.5 text-[hsl(var(--accent))]" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--muted))]">
          수식 인스펙터
        </h3>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-4">
        {changedList.length === 0 ? (
          <p className="text-xs leading-relaxed text-[hsl(var(--muted))]">
            슬라이더를 움직이면 변동된 변수와 결과 변화가 여기에 표시됩니다. 모두 기본값 상태입니다.
          </p>
        ) : (
          <>
            {/* 변동 변수 (그룹별) */}
            <div className="flex flex-col gap-2.5">
              {Object.entries(grouped).map(([group, vars]) => (
                <div key={group} className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--accent)/0.7)]">
                    {group}
                  </span>
                  <div className="flex flex-col gap-1">
                    {vars.map((v) => {
                      const base = REF_DELTAS[v.key];
                      const next = deltas[v.key];
                      return (
                        <div
                          key={v.key}
                          className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.5)] px-2.5 py-1.5"
                        >
                          <div className="text-[10px] font-semibold text-[hsl(var(--accent))] mb-0.5">
                            {v.ko}
                          </div>
                          <code className="font-mono text-[11px] text-[hsl(var(--fg)/0.85)] leading-snug break-words">
                            {v.describe(base, next)}
                          </code>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* 결과 4줄 — reference 와 비교 */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--accent)/0.7)]">
                결과
              </span>
              <ul className="flex flex-col gap-1.5">
                {RESULT_FIELDS.map((field) => {
                  const beforeVal = (reference as unknown as Record<string, number>)[field];
                  const afterVal = (result as unknown as Record<string, number>)[field];
                  if (typeof beforeVal !== "number" || typeof afterVal !== "number") return null;
                  const delta = afterVal - beforeVal;
                  const negligible = Math.abs(delta) < 1e-6;
                  const isUp = delta > 0;
                  const colorClass = negligible
                    ? "text-[hsl(var(--muted))]"
                    : isUp
                      ? "text-[hsl(var(--danger))]"
                      : "text-[hsl(var(--success))]";
                  return (
                    <li
                      key={field}
                      className="flex flex-col gap-0.5 rounded-lg border border-[hsl(var(--border)/0.5)] bg-[hsl(var(--surface-200)/0.3)] px-2.5 py-1.5"
                    >
                      <div className="flex items-center gap-1.5">
                        {negligible ? (
                          <Equal className="h-3.5 w-3.5 flex-shrink-0 text-[hsl(var(--muted))]" />
                        ) : isUp ? (
                          <TrendingUp className="h-3.5 w-3.5 flex-shrink-0 text-[hsl(var(--danger))]" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5 flex-shrink-0 text-[hsl(var(--success))]" />
                        )}
                        <span className="text-xs font-semibold text-[hsl(var(--fg)/0.9)]">
                          {FIELD_LABELS[field] ?? field}
                        </span>
                        <span className={`ml-auto text-[10px] tabular-nums ${colorClass}`}>
                          {delta >= 0 ? "+" : ""}
                          {delta.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-baseline gap-1 pl-5 text-[11px] tabular-nums">
                        <span className="text-[hsl(var(--muted))]">{fmtDollar(beforeVal)}</span>
                        <span className="text-[hsl(var(--muted)/0.4)]">→</span>
                        <span className={`font-bold ${colorClass}`}>{fmtDollar(afterVal)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
