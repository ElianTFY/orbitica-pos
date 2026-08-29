import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0A",
        surface: {
          DEFAULT: "#141518",
          secondary: "#1A1B1F",
          hover: "#222328",
        },
        border: {
          DEFAULT: "#26282E",
          focus: "#3A3D46",
        },
        orbitica: {
          blue: "#0EA5FF",
          "blue-hover": "#0284C7",
          "blue-glow": "rgba(14, 165, 255, 0.15)",
          silver: "#CFCFD4",
          light: "#E5E6EA",
          dark: "#0A0A0A",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
