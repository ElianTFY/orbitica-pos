import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", disabled, ...props }, ref) => {
    const base = "inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] disabled:opacity-50 disabled:cursor-not-allowed";
    
    const variants = {
      primary: "bg-[#0EA5FF] hover:bg-[#0284C7] text-white shadow-lg shadow-[#0EA5FF]/20 focus:ring-[#0EA5FF]",
      secondary: "bg-[#1A1B1F] hover:bg-[#26282E] text-[#E5E6EA] border border-[#26282E] focus:ring-[#3A3D46]",
      outline: "border border-[#26282E] hover:border-[#0EA5FF] text-[#CFCFD4] hover:text-white bg-transparent focus:ring-[#0EA5FF]",
      danger: "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 focus:ring-red-500",
      ghost: "hover:bg-[#1A1B1F] text-[#CFCFD4] hover:text-white focus:ring-[#26282E]",
    };

    const sizes = {
      sm: "text-xs px-2.5 py-1.5 gap-1.5",
      md: "text-sm px-4 py-2 gap-2",
      lg: "text-base px-5 py-2.5 gap-2.5",
      icon: "h-9 w-9 p-0",
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
