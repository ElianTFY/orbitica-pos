import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-main)",
        surface: {
          DEFAULT: "var(--bg-surface)",
          secondary: "var(--bg-surface-secondary)",
          hover: "var(--bg-surface-hover)",
          active: "var(--bg-surface-active)",
          input: "var(--bg-input)",
        },
        border: {
          DEFAULT: "var(--border-subtle)",
          strong: "var(--border-strong)",
          focus: "var(--border-focus)",
        },
        text: {
          main: "var(--text-main)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          inverse: "var(--text-inverse)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          active: "var(--primary-active)",
          text: "var(--primary-text)",
          subtle: "var(--primary-subtle)",
        },
        semantic: {
          "success-bg": "var(--success-bg)",
          "success-border": "var(--success-border)",
          "success-text": "var(--success-text)",
          "warning-bg": "var(--warning-bg)",
          "warning-border": "var(--warning-border)",
          "warning-text": "var(--warning-text)",
          "danger-bg": "var(--danger-bg)",
          "danger-border": "var(--danger-border)",
          "danger-text": "var(--danger-text)",
          "info-bg": "var(--info-bg)",
          "info-border": "var(--info-border)",
          "info-text": "var(--info-text)",
        },
        orbitica: {
          blue: "var(--primary)",
          "blue-hover": "var(--primary-hover)",
          "blue-glow": "var(--primary-glow)",
          silver: "var(--text-secondary)",
          light: "var(--text-main)",
          dark: "var(--bg-main)",
        },
      },
      boxShadow: {
        card: "var(--shadow-card)",
        modal: "var(--shadow-modal)",
        glow: "0 0 25px var(--primary-glow)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;