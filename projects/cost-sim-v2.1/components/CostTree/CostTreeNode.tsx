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

// Group → light accent palette (left bar + subtle tint, dark text on white)
// Each group keeps its semantic color for at-a-glance recognition,
// but values render as dark text on near-white surface for system consistency.
interface GroupStyle {
  bar: string;       // left accent bar (4px)
  tint: string;      // very subtle background tint
  label: string;     // colored group label / cap text
}

const groupStyles: Record<string, GroupStyle> = {
  root:       { bar: "bg-[hsl(var(--accent))]",         tint: "bg-[hsl(var(--accent)/0.04)]", label: "text-[hsl(var(--accent))]" },
  top:        { bar: "bg-[hsl(235_72%_50%)]",           tint: "bg-[hsl(235_72%_50%/0.04)]",   label: "text-[hsl(235_72%_38%)]" },
  com:        { bar: "bg-[hsl(199_80%_42%)]",           tint: "bg-[hsl(199_80%_42%/0.04)]",   label: "text-[hsl(199_80%_32%)]" },
  sga:        { bar: "bg-[hsl(263_60%_50%)]",           tint: "bg-[hsl(263_60%_50%/0.04)]",   label: "text-[hsl(263_60%_42%)]" },
  material:   { bar: "bg-[hsl(160_58%_38%)]",           tint: "bg-[hsl(160_58%_38%/0.04)]",   label: "text-[hsl(160_58%_28%)]" },
  processing: { bar: "bg-[hsl(38_80%_45%)]",            tint: "bg-[hsl(38_80%_45%/0.05)]",    label: "text-[hsl(38_80%_34%)]" },
  profit:     { bar: "bg-[hsl(235_72%_50%)]",           tint: "bg-[hsl(235_72%_50%/0.05)]",   label: "text-[hsl(235_72%_38%)]" },
  bom:        { bar: "bg-[hsl(var(--surface-400))]",    tint: "bg-[hsl(var(--surface-50))]",  label: "text-[hsl(var(--muted))]" }
};

function formatValue(value: number, unit?: "$" | "%"): string {
  if (unit === "%") return `${(value * 100).toFixed(1)}%`;
  const v = value.toFixed(1);
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
        "relative min-w-[172px] overflow-hidden rounded-xl border bg-white pl-4 pr-4 py-3 text-center",
        "border-[hsl(var(--border))]",
        "shadow-[0_1px_2px_rgba(10,10,10,0.04),0_4px_12px_rgba(10,10,10,0.04)]",
        style.tint,
        data.changed
          ? "ring-2 ring-[hsl(var(--danger))] shadow-[0_0_0_1px_hsl(var(--danger)/0.25),0_4px_16px_hsl(var(--danger)/0.18)]"
          : ""
      ].join(" ")}
    >
      {/* Left accent bar — group color */}
      <div
        aria-hidden
        className={["pointer-events-none absolute inset-y-0 left-0 w-1", style.bar].join(" ")}
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !rounded-full !border !border-[hsl(var(--border))] !bg-white"
      />
      <div className={["text-[10px] font-semibold uppercase tracking-wider", style.label].join(" ")}>
        {data.label}
      </div>
      <div
        className={[
          "mt-0.5 text-lg font-extrabold tabular-nums leading-tight",
          data.changed ? "text-[hsl(var(--danger))]" : "text-[hsl(var(--fg))]"
        ].join(" ")}
      >
        {formatValue(data.value, data.unit)}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !rounded-full !border !border-[hsl(var(--border))] !bg-white"
      />
    </motion.div>
  );
}

export default memo(CostTreeNodeComponent);
