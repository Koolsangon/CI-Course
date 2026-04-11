"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  valueLabel?: string;
  minLabel?: string;
  maxLabel?: string;
}

const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ label, valueLabel, minLabel, maxLabel, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2">
        {(label || valueLabel) && (
          <div className="flex items-baseline justify-between gap-2">
            {label && (
              <span className="text-sm font-medium text-[hsl(var(--fg))]">
                {label}
              </span>
            )}
            {valueLabel && (
              <span className="tabular-nums text-base font-bold text-[hsl(var(--accent))]">
                {valueLabel}
              </span>
            )}
          </div>
        )}

        {/* Custom styled range input */}
        <div className="relative flex items-center">
          <input
            ref={ref}
            type="range"
            className={[
              "slider-thumb w-full appearance-none cursor-pointer",
              "h-2 rounded-full outline-none",
              "bg-[hsl(var(--surface-300)/0.4)]",
              "[&::-webkit-slider-thumb]:appearance-none",
              "[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5",
              "[&::-webkit-slider-thumb]:rounded-full",
              "[&::-webkit-slider-thumb]:bg-[hsl(var(--accent))]",
              "[&::-webkit-slider-thumb]:shadow-glow-sm",
              "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[hsl(226_36%_5%/0.8)]",
              "[&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing",
              "[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-100",
              "[&::-webkit-slider-thumb]:hover:scale-125 [&::-webkit-slider-thumb]:active:scale-110",
              "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5",
              "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none",
              "[&::-moz-range-thumb]:bg-[hsl(var(--accent))]",
              "[&::-moz-range-thumb]:cursor-grab",
              className
            ].join(" ")}
            {...props}
          />
        </div>

        {(minLabel || maxLabel) && (
          <div className="flex justify-between">
            <span className="text-[11px] text-[hsl(var(--muted))]">{minLabel}</span>
            <span className="text-[11px] text-[hsl(var(--muted))]">{maxLabel}</span>
          </div>
        )}
      </div>
    );
  }
);

Slider.displayName = "Slider";
export default Slider;
