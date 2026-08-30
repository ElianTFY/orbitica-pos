"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type TextSizeMode = "normal" | "large" | "xlarge";

export interface AccessibilityPreferences {
  theme: ThemeMode;
  highContrast: boolean;
  reducedMotion: boolean;
  textSize: TextSizeMode;
}

const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  theme: "dark",
  highContrast: false,
  reducedMotion: false,
  textSize: "normal",
};

const STORAGE_KEY = "orbitica_accessibility_preferences_v1";

interface ThemeContextType {
  preferences: AccessibilityPreferences;
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  highContrast: boolean;
  reducedMotion: boolean;
  textSize: TextSizeMode;
  setTheme: (theme: ThemeMode) => void;
  setHighContrast: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  setTextSize: (size: TextSizeMode) => void;
  resetPreferences: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(DEFAULT_PREFERENCES);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  // Initialize and load saved preferences from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPreferences((prev) => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      console.warn("Could not load accessibility preferences:", e);
    }

    // Check system color scheme preference
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemTheme(mediaQuery.matches ? "dark" : "light");

    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handler);
    setMounted(true);

    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const resolvedTheme: "light" | "dark" =
    preferences.theme === "system" ? systemTheme : preferences.theme;

  // Apply DOM classes and data attributes whenever preferences or resolvedTheme change
  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;

    // Apply Theme
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
    root.setAttribute("data-theme", resolvedTheme);
    root.style.colorScheme = resolvedTheme;

    // Apply High Contrast
    if (preferences.highContrast) {
      root.setAttribute("data-contrast", "high");
    } else {
      root.removeAttribute("data-contrast");
    }

    // Apply Reduced Motion
    if (preferences.reducedMotion) {
      root.setAttribute("data-reduced-motion", "true");
    } else {
      root.removeAttribute("data-reduced-motion");
    }

    // Apply Text Size Scaling
    root.setAttribute("data-text-size", preferences.textSize);

    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (e) {
      console.warn("Could not save accessibility preferences:", e);
    }
  }, [preferences, resolvedTheme]);

  const setTheme = (theme: ThemeMode) => {
    setPreferences((prev) => ({ ...prev, theme }));
  };

  const setHighContrast = (highContrast: boolean) => {
    setPreferences((prev) => ({ ...prev, highContrast }));
  };

  const setReducedMotion = (reducedMotion: boolean) => {
    setPreferences((prev) => ({ ...prev, reducedMotion }));
  };

  const setTextSize = (textSize: TextSizeMode) => {
    setPreferences((prev) => ({ ...prev, textSize }));
  };

  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
  };

  return (
    <ThemeContext.Provider
      value={{
        preferences,
        theme: preferences.theme,
        resolvedTheme,
        highContrast: preferences.highContrast,
        reducedMotion: preferences.reducedMotion,
        textSize: preferences.textSize,
        setTheme,
        setHighContrast,
        setReducedMotion,
        setTextSize,
        resetPreferences,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}