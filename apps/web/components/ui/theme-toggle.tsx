"use client";

import React from "react";
import { Sun, Moon, Laptop } from "lucide-react";
import { useTheme, ThemeMode } from "@/features/theme/theme-context";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  variant?: "icon" | "segmented" | "dropdown";
}

export function ThemeToggle({ className, variant = "icon" }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  if (variant === "segmented") {
    return (
      <div
        role="radiogroup"
        aria-label="Selector de tema visual"
        className={cn(
          "inline-flex p-1 bg-surface-secondary border border-border rounded-xl",
          className
        )}
      >
        <button
          type="button"
          role="radio"
          aria-checked={theme === "light"}
          onClick={() => setTheme("light")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
            theme === "light"
              ? "bg-surface text-text-main shadow-sm border border-border"
              : "text-text-muted hover:text-text-main"
          )}
        >
          <Sun className="w-4 h-4 text-amber-500" />
          <span>Blanco</span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={theme === "dark"}
          onClick={() => setTheme("dark")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
            theme === "dark"
              ? "bg-surface text-text-main shadow-sm border border-border"
              : "text-text-muted hover:text-text-main"
          )}
        >
          <Moon className="w-4 h-4 text-primary" />
          <span>Negro</span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={theme === "system"}
          onClick={() => setTheme("system")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
            theme === "system"
              ? "bg-surface text-text-main shadow-sm border border-border"
              : "text-text-muted hover:text-text-main"
          )}
        >
          <Laptop className="w-4 h-4 text-text-muted" />
          <span>Sistema</span>
        </button>
      </div>
    );
  }

  // Quick 1-tap Icon Toggle (Toggles between light and dark)
  const toggleTheme = () => {
    if (resolvedTheme === "dark") {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  };

  const nextThemeName = resolvedTheme === "dark" ? "Cambiar a Tema Blanco" : "Cambiar a Tema Negro";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={nextThemeName}
      title={nextThemeName}
      className={cn(
        "relative p-2 rounded-xl border border-border bg-surface hover:bg-surface-hover text-text-secondary hover:text-text-main transition-colors focus-visible:ring-2 focus-visible:ring-primary",
        className
      )}
    >
      <span className="sr-only">{nextThemeName}</span>
      {resolvedTheme === "dark" ? (
        <Sun className="w-4 h-4 text-amber-400 hover:text-amber-300 transition-colors" />
      ) : (
        <Moon className="w-4 h-4 text-primary hover:text-primary-hover transition-colors" />
      )}
    </button>
  );
}