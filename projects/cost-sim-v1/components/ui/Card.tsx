import { forwardRef, type HTMLAttributes } from "react";

type CardVariant = "default" | "elevated" | "glass";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const variantClasses: Record<CardVariant, string> = {
  default:
    "rounded-2xl border bg-[hsl(var(--surface-100))] border-[hsl(var(--border))] shadow-card",
  elevated:
    "rounded-2xl border bg-[hsl(var(--surface-100))] border-[hsl(var(--border))] shadow-elevated",
  glass:
    "glass-card"
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "default", className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${variantClasses[variant]} ${className}`}
        {...props}
      />
    );
  }
);

Card.displayName = "Card";
export default Card;
