type ChipState = "active" | "done" | "locked";

interface PhaseChipProps {
  label: string;
  index: number;
  state: ChipState;
  onClick?: () => void;
}

export default function PhaseChip({ label, index, state, onClick }: PhaseChipProps) {
  const isClickable = state !== "locked";

  return (
    <button
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      aria-current={state === "active" ? "step" : undefined}
      className={[
        "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        "transition-all duration-200 select-none",
        state === "active"
          ? "bg-[hsl(var(--accent))] text-[hsl(226_36%_5%)] shadow-glow-sm"
          : state === "done"
          ? "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.3)]"
          : "bg-[hsl(var(--surface-200)/0.5)] text-[hsl(var(--muted))] cursor-default"
      ].join(" ")}
    >
      <span
        className={[
          "flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold",
          state === "active"
            ? "bg-[hsl(226_36%_5%/0.3)]"
            : state === "done"
            ? "bg-[hsl(var(--success)/0.2)]"
            : "bg-[hsl(var(--surface-300)/0.4)]"
        ].join(" ")}
      >
        {state === "done" ? "✓" : index}
      </span>
      {label}
    </button>
  );
}
