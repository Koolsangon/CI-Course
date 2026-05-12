"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronDown } from "lucide-react";
import { calculate } from "@/lib/cost-engine/engine";
import type { CostParams } from "@/lib/cost-engine/types";
import Button from "@/components/ui/Button";

// ── Flat form schema ───────────────────────────────────────────────────────

const formSchema = z.object({
  // 기본 정보
  price: z.number().min(0.01).max(10000),
  loading: z.number().min(0.01).max(1.0),
  // BOM
  bom_tft: z.number().min(0).max(5000),
  bom_cf: z.number().min(0).max(5000),
  bom_cell: z.number().min(0).max(5000),
  bom_module: z.number().min(0).max(5000),
  // Yields
  yield_tft: z.number().min(0.01).max(1.0),
  yield_cf: z.number().min(0.01).max(1.0),
  yield_cell: z.number().min(0.01).max(1.0),
  yield_module: z.number().min(0.01).max(1.0),
  // Processing — panel
  panel_labor: z.number().min(0).max(5000),
  panel_expense: z.number().min(0).max(5000),
  panel_depreciation: z.number().min(0).max(5000),
  // Processing — module
  module_labor: z.number().min(0).max(5000),
  module_expense: z.number().min(0).max(5000),
  module_depreciation: z.number().min(0).max(5000),
  // SGA
  sga_direct_dev: z.number().min(0).max(5000),
  sga_transport: z.number().min(0).max(5000),
  sga_business_unit: z.number().min(0).max(5000),
  sga_operation: z.number().min(0).max(5000),
  sga_corporate_oh: z.number().min(0).max(5000),
});

export type PresetFormValues = z.infer<typeof formSchema>;

// ── Conversion helpers ─────────────────────────────────────────────────────

export function toFormValues(p: CostParams): PresetFormValues {
  return {
    price: p.price,
    loading: p.loading,
    bom_tft: p.bom.tft,
    bom_cf: p.bom.cf,
    bom_cell: p.bom.cell,
    bom_module: p.bom.module,
    yield_tft: p.yields.tft,
    yield_cf: p.yields.cf,
    yield_cell: p.yields.cell,
    yield_module: p.yields.module,
    panel_labor: p.processing.panel.labor,
    panel_expense: p.processing.panel.expense,
    panel_depreciation: p.processing.panel.depreciation,
    module_labor: p.processing.module.labor,
    module_expense: p.processing.module.expense,
    module_depreciation: p.processing.module.depreciation,
    sga_direct_dev: p.sga.direct_dev,
    sga_transport: p.sga.transport,
    sga_business_unit: p.sga.business_unit,
    sga_operation: p.sga.operation,
    sga_corporate_oh: p.sga.corporate_oh,
  };
}

export function toCostParams(v: PresetFormValues): CostParams {
  return {
    price: v.price,
    loading: v.loading,
    bom: {
      tft: v.bom_tft,
      cf: v.bom_cf,
      cell: v.bom_cell,
      module: v.bom_module,
    },
    yields: {
      tft: v.yield_tft,
      cf: v.yield_cf,
      cell: v.yield_cell,
      module: v.yield_module,
    },
    processing: {
      panel: {
        labor: v.panel_labor,
        expense: v.panel_expense,
        depreciation: v.panel_depreciation,
      },
      module: {
        labor: v.module_labor,
        expense: v.module_expense,
        depreciation: v.module_depreciation,
      },
    },
    sga: {
      direct_dev: v.sga_direct_dev,
      transport: v.sga_transport,
      business_unit: v.sga_business_unit,
      operation: v.sga_operation,
      corporate_oh: v.sga_corporate_oh,
    },
  };
}

// ── Default params ─────────────────────────────────────────────────────────

const DEFAULT_PARAMS: CostParams = {
  price: 100,
  loading: 0.8,
  bom: { tft: 20, cf: 15, cell: 10, module: 5 },
  yields: { tft: 0.95, cf: 0.95, cell: 0.97, module: 0.98 },
  processing: {
    panel: { labor: 5, expense: 3, depreciation: 8 },
    module: { labor: 3, expense: 2, depreciation: 4 },
  },
  sga: {
    direct_dev: 2,
    transport: 1.5,
    business_unit: 1,
    operation: 1,
    corporate_oh: 0.5,
  },
};

// ── Props ──────────────────────────────────────────────────────────────────

export interface PresetFormProps {
  initialParams?: CostParams;
  onSave: (name: string, params: CostParams) => void;
  onAnalyze: (params: CostParams) => void;
}

// ── Sub-components ─────────────────────────────────────────────────────────

type AccordionSection = "basic" | "bom" | "processing" | "sga";

interface AccordionHeaderProps {
  label: string;
  section: AccordionSection;
  open: AccordionSection | null;
  onToggle: (s: AccordionSection) => void;
}

function AccordionHeader({ label, section, open, onToggle }: AccordionHeaderProps) {
  const isOpen = open === section;
  return (
    <button
      type="button"
      onClick={() => onToggle(section)}
      className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-[hsl(var(--fg))] bg-[hsl(var(--surface-200)/0.5)] hover:bg-[hsl(var(--surface-200))] transition-colors"
    >
      <span>{label}</span>
      <ChevronDown
        size={16}
        className={`text-[hsl(var(--muted))] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
      />
    </button>
  );
}

interface FieldProps {
  label: string;
  name: keyof PresetFormValues;
  step?: number;
  register: ReturnType<typeof useForm<PresetFormValues>>["register"];
  errors: Partial<Record<keyof PresetFormValues, { message?: string }>>;
}

function Field({ label, name, step = 0.01, register, errors }: FieldProps) {
  const error = errors[name];
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-[hsl(var(--muted))] font-medium">{label}</label>
      <input
        type="number"
        step={step}
        {...register(name, { valueAsNumber: true })}
        className={[
          "w-full rounded-xl border bg-[hsl(var(--surface-100))] px-3 py-2 text-sm font-mono text-[hsl(var(--fg))]",
          "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] transition-all",
          error
            ? "border-red-400"
            : "border-[hsl(var(--border))] hover:border-[hsl(var(--accent)/0.4)]",
        ].join(" ")}
      />
      {error && (
        <span className="text-xs text-red-400">{error.message}</span>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function PresetForm({ initialParams, onSave, onAnalyze }: PresetFormProps) {
  const [openSection, setOpenSection] = useState<AccordionSection | null>("basic");
  const [presetName, setPresetName] = useState("");

  const defaults = useMemo(
    () => toFormValues(initialParams ?? DEFAULT_PARAMS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const {
    register,
    watch,
    formState: { errors, isValid },
  } = useForm<PresetFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaults,
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

  function handleToggle(section: AccordionSection) {
    setOpenSection((prev) => (prev === section ? null : section));
  }

  function handleSave() {
    if (!isValid || !presetName.trim()) return;
    onSave(presetName.trim(), toCostParams(values));
  }

  function handleAnalyze() {
    if (!isValid) return;
    onAnalyze(toCostParams(values));
  }

  const fieldProps = { register, errors: errors as Partial<Record<keyof PresetFormValues, { message?: string }>> };

  return (
    <div className="flex flex-col gap-0 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] shadow-card overflow-hidden">
      {/* ── 기본 정보 ── */}
      <AccordionHeader label="기본 정보" section="basic" open={openSection} onToggle={handleToggle} />
      {openSection === "basic" && (
        <div className="grid grid-cols-2 gap-4 px-4 py-4 border-b border-[hsl(var(--border))]">
          <Field label="판매가 (Price)" name="price" step={0.01} {...fieldProps} />
          <Field label="가동률 (Loading)" name="loading" step={0.01} {...fieldProps} />
        </div>
      )}

      {/* ── BOM ── */}
      <AccordionHeader label="BOM (소요재료비)" section="bom" open={openSection} onToggle={handleToggle} />
      {openSection === "bom" && (
        <div className="grid grid-cols-2 gap-4 px-4 py-4 border-b border-[hsl(var(--border))]">
          <Field label="BOM TFT" name="bom_tft" step={0.1} {...fieldProps} />
          <Field label="BOM CF" name="bom_cf" step={0.1} {...fieldProps} />
          <Field label="BOM Cell" name="bom_cell" step={0.1} {...fieldProps} />
          <Field label="BOM Module" name="bom_module" step={0.1} {...fieldProps} />
        </div>
      )}

      {/* ── Yields / Processing ── */}
      <AccordionHeader label="Yields / Processing" section="processing" open={openSection} onToggle={handleToggle} />
      {openSection === "processing" && (
        <div className="grid grid-cols-2 gap-4 px-4 py-4 border-b border-[hsl(var(--border))]">
          <Field label="수율 TFT" name="yield_tft" step={0.001} {...fieldProps} />
          <Field label="수율 CF" name="yield_cf" step={0.001} {...fieldProps} />
          <Field label="수율 Cell" name="yield_cell" step={0.001} {...fieldProps} />
          <Field label="수율 Module" name="yield_module" step={0.001} {...fieldProps} />
          <Field label="Panel 노무비" name="panel_labor" step={0.1} {...fieldProps} />
          <Field label="Panel 경비" name="panel_expense" step={0.1} {...fieldProps} />
          <Field label="Panel 상각비" name="panel_depreciation" step={0.1} {...fieldProps} />
          <Field label="Module 노무비" name="module_labor" step={0.1} {...fieldProps} />
          <Field label="Module 경비" name="module_expense" step={0.1} {...fieldProps} />
          <Field label="Module 상각비" name="module_depreciation" step={0.1} {...fieldProps} />
        </div>
      )}

      {/* ── SGA ── */}
      <AccordionHeader label="SGA (판관비)" section="sga" open={openSection} onToggle={handleToggle} />
      {openSection === "sga" && (
        <div className="grid grid-cols-2 gap-4 px-4 py-4 border-b border-[hsl(var(--border))]">
          <Field label="개발비 직접" name="sga_direct_dev" step={0.1} {...fieldProps} />
          <Field label="운반비" name="sga_transport" step={0.1} {...fieldProps} />
          <Field label="사업부 OH" name="sga_business_unit" step={0.1} {...fieldProps} />
          <Field label="운영비" name="sga_operation" step={0.1} {...fieldProps} />
          <Field label="법인 OH" name="sga_corporate_oh" step={0.1} {...fieldProps} />
        </div>
      )}

      {/* ── Live COP preview ── */}
      <div className="px-4 py-4 bg-[hsl(var(--surface-200)/0.5)] border-b border-[hsl(var(--border))]">
        <p className="text-xs font-semibold text-[hsl(var(--muted))] mb-2 uppercase tracking-wide">실시간 미리보기</p>
        {preview ? (
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col">
              <span className="text-xs text-[hsl(var(--muted))]">COP</span>
              <span className="text-sm font-mono font-semibold text-[hsl(var(--fg))]">
                {preview.cop.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-[hsl(var(--muted))]">영업이익</span>
              <span
                className={`text-sm font-mono font-semibold ${
                  preview.operating_profit >= 0
                    ? "text-emerald-500"
                    : "text-red-400"
                }`}
              >
                {preview.operating_profit >= 0 ? "+" : ""}
                {preview.operating_profit.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-[hsl(var(--muted))]">이익률</span>
              <span
                className={`text-sm font-mono font-semibold ${
                  preview.operating_margin >= 0
                    ? "text-emerald-500"
                    : "text-red-400"
                }`}
              >
                {(preview.operating_margin * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[hsl(var(--muted))]">유효하지 않은 값이 있습니다.</p>
        )}
      </div>

      {/* ── Actions bar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-4">
        <input
          type="text"
          placeholder="프리셋 이름 입력..."
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
          className="flex-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] px-3 py-2 text-sm text-[hsl(var(--fg))] placeholder:text-[hsl(var(--muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] transition-all"
        />
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!isValid || !presetName.trim()}
            onClick={handleSave}
          >
            저장
          </Button>
          <Button
            type="button"
            variant="accent"
            size="sm"
            disabled={!isValid}
            onClick={handleAnalyze}
          >
            분석 시작
          </Button>
        </div>
      </div>
    </div>
  );
}
