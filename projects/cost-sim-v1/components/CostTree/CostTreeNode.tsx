"use client";

import { memo, useEffect, useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { motion, useAnimationControls } from "framer-motion";

export interface CostTreeNodeData {
  label: string;
  value: number;
  unit?: "$" | "%";
  group: string;
  formula?: string;
  changed?: boolean;
}

// Group → gradient + text token
const groupStyles: Record<string, { bg: string; text: string; border: string }> = {
  root:       { bg: "from-[hsl(226_36%_14%)] to-[hsl(226_36%_10%)]",   text: "text-white",                   border: "border-[hsl(var(--accent)/0.4)]" },
  top:        { bg: "from-[hsl(235_72%_30%)] to-[hsl(235_72%_24%)]",   text: "text-white",                   border: "border-[hsl(235_72%_55%/0.35)]" },
  com:        { bg: "from-[hsl(199_80%_25%)] to-[hsl(199_80%_20%)]",   text: "text-white",                   border: "border-[hsl(199_80%_55%/0.35)]" },
  sga:        { bg: "from-[hsl(263_60%_28%)] to-[hsl(263_60%_22%)]",   text: "text-white",                   border: "border-[hsl(263_60%_60%/0.35)]" },
  material:   { bg: "from-[hsl(160_58%_22%)] to-[hsl(160_58%_17%)]",   text: "text-[hsl(160_72%_80%)]",      border: "border-[hsl(160_58%_45%/0.35)]" },
  processing: { bg: "from-[hsl(38_80%_22%)] to-[hsl(38_80%_17%)]",     text: "text-[hsl(38_92%_80%)]",       border: "border-[hsl(38_80%_50%/0.35)]" },
  bom:        { bg: "from-[hsl(222_16%_16%)] to-[hsl(222_16%_12%)]",   text: "text-[hsl(222_12%_72%)]",      border: "border-[hsl(222_16%_28%/0.6)]" }
};

function formatValue(value: number, unit?: "$" | "%"): string {
  if (unit === "%") return `${(value * 100).toFixed(1)}%`;
  const v = Math.abs(value) >= 100 ? value.toFixed(1) : value.toFixed(2);
  return unit === "$" ? `$${v}` : v;
}

function CostTreeNodeComponent({ data }: NodeProps<CostTreeNodeData>) {
  const controls = useAnimationControls();
  const [lastValue, setLastValue] = useState(data.value);

  useEffect(() => {
    if (Math.abs(data.value - lastValue) > 1e-6) {
      // Keep original 200ms pulse — GPU-accelerated transform only
      controls.start({
        scale: [1, 1.1, 1],
        transition: { duration: 0.2, ease: "easeOut" }
      });
      setLastValue(data.value);
    }
  }, [data.value, lastValue, controls]);

  const style = groupStyles[data.group] ?? groupStyles.bom;

  return (
    <motion.div
      animate={controls}
      title={data.formula}
      className={[
        "relative min-w-[172px] rounded-2xl border bg-gradient-to-b px-4 py-3 text-center",
        "shadow-[0_2px_8px_hsl(220_36%_4%/0.5)]",
        style.bg,
        style.text,
        style.border,
        data.changed
          ? "ring-2 ring-[hsl(var(--accent))] shadow-[0_0_18px_3px_hsl(var(--accent)/0.35)]"
          : ""
      ].join(" ")}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !rounded-full !border-none !bg-[hsl(var(--surface-300))]"
      />
      <div className="text-[11px] font-semibold uppercase tracking-wider opacity-70">
        {data.label}
      </div>
      <div className="mt-0.5 text-lg font-extrabold tabular-nums leading-tight">
        {formatValue(data.value, data.unit)}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !rounded-full !border-none !bg-[hsl(var(--surface-300))]"
      />
    </motion.div>
  );
}

export default memo(CostTreeNodeComponent);
