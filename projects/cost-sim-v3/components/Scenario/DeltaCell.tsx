"use client";

interface DeltaCellProps {
  value: number;
  isProfit: boolean;
  format?: "dollar" | "percent";
}

export default function DeltaCell({ value, isProfit, format = "dollar" }: DeltaCellProps) {
  if (Math.abs(value) < 0.005) {
    return (
      <span className="font-mono text-sm font-semibold text-[hsl(var(--muted))]">—</span>
    );
  }

  const isPositive = value > 0;
  // Good = profit increase OR cost decrease
  const isGood = isProfit ? isPositive : !isPositive;

  const arrow = isPositive ? "▲" : "▼";
  const absVal = Math.abs(value);
  const formatted =
    format === "percent"
      ? `${absVal.toFixed(2)}%p`
      : `$${absVal.toFixed(2)}`;

  const colorClass = isGood
    ? "text-[hsl(var(--success))]"
    : "text-[hsl(345_100%_40%)]";

  return (
    <span className={`font-mono text-sm font-semibold ${colorClass}`}>
      {arrow} {formatted}
    </span>
  );
}
