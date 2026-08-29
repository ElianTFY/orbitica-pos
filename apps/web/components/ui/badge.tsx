import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "blue";
}

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  const variants = {
    default: "bg-[#1A1B1F] text-[#CFCFD4] border border-[#26282E]",
    success: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    danger: "bg-red-500/10 text-red-400 border border-red-500/20",
    blue: "bg-[#0EA5FF]/10 text-[#0EA5FF] border border-[#0EA5FF]/20",
  };

  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium tracking-wide", variants[variant], className)} {...props}>
      {children}
    </span>
  );
}
