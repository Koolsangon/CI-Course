import { forwardRef, type ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "accent";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[hsl(var(--fg))] text-[hsl(var(--bg))] hover:opacity-90 active:scale-[0.98]",
  accent:
    "bg-[hsl(var(--accent))] text-white hover:bg-[hsl(var(--accent-dim))] active:scale-[0.98]",
  secondary:
    "bg-[hsl(var(--surface-200))] text-[hsl(var(--fg))] border border-[hsl(var(--border))] hover:bg-[hsl(var(--surface-300)/0.5)] active:scale-[0.98]",
  ghost:
    "bg-transparent text-[hsl(var(--muted))] hover:text-[hsl(var(--fg))] hover:bg-[hsl(var(--surface-200)/0.5)] active:scale-[0.98]"
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-xl",
  md: "min-h-[44px] px-5 py-2.5 text-sm font-semibold rounded-xl",
  lg: "min-h-[52px] px-6 py-3 text-base font-semibold rounded-2xl"
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={[
          "inline-flex items-center justify-center gap-2 transition-all duration-150 select-none",
          "disabled:pointer-events-none disabled:opacity-40",
          variantClasses[variant],
          sizeClasses[size],
          className
        ].join(" ")}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
export default Button;
