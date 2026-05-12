import { type HTMLAttributes } from "react";

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
}

const maxWidthClasses = {
  sm:   "max-w-lg",
  md:   "max-w-3xl",
  lg:   "max-w-5xl",
  xl:   "max-w-7xl",
  full: "max-w-full"
};

export default function Container({
  maxWidth = "lg",
  className = "",
  children,
  ...props
}: ContainerProps) {
  return (
    <div
      className={[
        "mx-auto w-full px-4 md:px-6",
        "pl-[max(1rem,env(safe-area-inset-left))]",
        "pr-[max(1rem,env(safe-area-inset-right))]",
        maxWidthClasses[maxWidth],
        className
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}
