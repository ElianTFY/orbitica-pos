import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs font-medium text-[#CFCFD4] uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            "w-full px-3.5 py-2 bg-[#141518] border border-[#26282E] rounded-lg text-sm text-[#E5E6EA] placeholder-[#6C707E] focus:outline-none focus:border-[#0EA5FF] focus:ring-1 focus:ring-[#0EA5FF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
        {helperText && !error && <p className="text-xs text-[#6C707E]">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
