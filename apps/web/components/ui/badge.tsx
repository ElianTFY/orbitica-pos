import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "blue";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-surface-secondary text-text-secondary border-border",
    success: "bg-semantic-success-bg text-semantic-success-text border-semantic-success-border",
    warning: "bg-semantic-warning-bg text-semantic-warning-text border-semantic-warning-border",
    danger: "bg-semantic-danger-bg text-semantic-danger-text border-semantic-danger-border",
    blue: "bg-primary-subtle text-primary border-primary/30",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold border tracking-wide uppercase font-mono select-none",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}