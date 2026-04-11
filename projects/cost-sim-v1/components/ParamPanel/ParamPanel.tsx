"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { useStore } from "@/lib/store";
import { getCase, type CaseVariable } from "@/lib/cases";
import { applyCaseAdapter } from "@/content/case-adapters";
import Slider from "@/components/ui/Slider";

export interface ParamPanelProps {
  caseId: string;
}

function buildSchema(vars: CaseVariable[]) {
  const shape: Record<string, z.ZodNumber> = {};
  for (const v of vars) shape[v.key] = z.number().min(v.min).max(v.max);
  return z.object(shape);
}

function formatLabel(v: CaseVariable, value: number): string {
  switch (v.format) {
    case "percent":
      return `${(value * 100).toFixed(0)}%`;
    case "percent_delta":
      return `${(value * 100 >= 0 ? "+" : "")}${(value * 100).toFixed(1)}%`;
    case "percent_point":
      return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%p`;
    case "multiplier":
      return `${value.toFixed(2)}x`;
    case "int":
      return `${Math.round(value)}${v.unit}`;
    case "dollar":
      return `$${value.toFixed(2)}`;
    default:
      return String(value);
  }
}

export default function ParamPanel({ caseId }: ParamPanelProps) {
  const caseDef = getCase(caseId);
  const loadCase = useStore((s) => s.loadCase);
  const setParams = useStore((s) => s.setParams);

  const defaults = useMemo(() => {
    if (!caseDef) return {};
    const out: Record<string, number> = {};
    for (const v of caseDef.variables) out[v.key] = v.default;
    return out;
  }, [caseDef]);

  const { register, watch, reset } = useForm({
    resolver: caseDef ? zodResolver(buildSchema(caseDef.variables)) : undefined,
    defaultValues: defaults
  });

  // Load case reference params into the store on mount / case change, then
  // immediately apply the case adapter with the default slider values so the
  // tree reflects the case's starting scenario (e.g. Loading 50%) rather than
  // lingering on the reference preset until the user moves a slider.
  useEffect(() => {
    if (!caseDef) return;
    loadCase(caseDef.id, caseDef.reference);
    reset(defaults);
    const initial = applyCaseAdapter(caseDef.adapter, caseDef.reference, defaults);
    if (initial) setParams(initial);
  }, [caseDef, loadCase, reset, defaults, setParams]);

  useEffect(() => {
    if (!caseDef) return;
    const sub = watch((values) => {
      const coerced: Record<string, number> = {};
      for (const [k, v] of Object.entries(values)) {
        if (typeof v === "number") coerced[k] = v;
      }
      const next = applyCaseAdapter(caseDef.adapter, caseDef.reference, coerced);
      if (next) setParams(next);
    });
    return () => sub.unsubscribe();
  }, [watch, caseDef, setParams]);

  if (!caseDef) {
    return (
      <div className="p-4 text-[hsl(var(--muted))] text-sm">
        알 수 없는 케이스: {caseId}
      </div>
    );
  }

  const values = watch();

  return (
    <section className="flex flex-col gap-0 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] overflow-hidden shadow-card">
      <header className="border-b border-[hsl(var(--border))] px-4 py-3 bg-[hsl(var(--surface-200)/0.5)]">
        <h2 className="text-sm font-bold text-[hsl(var(--fg))] leading-tight">
          {caseDef.title}
        </h2>
        <p className="mt-0.5 text-xs text-[hsl(var(--muted))] leading-snug line-clamp-2">
          {caseDef.scenario}
        </p>
      </header>

      <div className="flex flex-col gap-5 px-4 py-4">
        {caseDef.variables.map((v) => {
          const currentVal = values[v.key] ?? v.default;
          return (
            <Slider
              key={v.key}
              label={v.ko}
              valueLabel={formatLabel(v, currentVal)}
              minLabel={formatLabel(v, v.min)}
              maxLabel={formatLabel(v, v.max)}
              min={v.min}
              max={v.max}
              step={v.step}
              {...register(v.key, { valueAsNumber: true })}
            />
          );
        })}
      </div>
    </section>
  );
}
