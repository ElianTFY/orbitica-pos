import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", disabled, type = "button", ...props }, ref) => {
    const base = "inline-flex items-center justify-center font-semibold transition-all duration-150 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed select-none touch-manipulation";

    const variants = {
      primary: "bg-primary hover:bg-primary-hover active:bg-primary-active text-white shadow-sm shadow-primary/20 focus-visible:ring-primary",
      secondary: "bg-surface-secondary hover:bg-surface-hover active:bg-surface-active text-text-main border border-border focus-visible:ring-primary",
      outline: "border border-border hover:border-primary hover:bg-surface-hover text-text-secondary hover:text-text-main bg-transparent focus-visible:ring-primary",
      danger: "bg-semantic-danger-bg hover:bg-red-500/20 active:bg-red-500/30 text-semantic-danger-text border border-semantic-danger-border focus-visible:ring-red-500",
      ghost: "hover:bg-surface-hover active:bg-surface-active text-text-secondary hover:text-text-main focus-visible:ring-primary",
    };

    const sizes = {
      sm: "text-xs px-3 py-1.5 gap-1.5 min-h-[32px]",
      md: "text-xs sm:text-sm px-4 py-2 gap-2 min-h-[38px]",
      lg: "text-sm sm:text-base px-5 py-2.5 gap-2.5 min-h-[44px]",
      icon: "h-9 w-9 p-0",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";