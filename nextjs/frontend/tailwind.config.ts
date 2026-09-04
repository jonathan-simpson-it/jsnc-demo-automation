import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#f4f4ef",
        surface: "#ffffff",
        ink: "#161714",
        muted: "#5c5e56",
        line: "#d6d8d1",
        accent: "#1f4a63",
        "accent-soft": "#e6ecf0",
        ok: "#2e6b53",
        "ok-soft": "#e4ece7",
        error: "#b3261e",
      },
      fontFamily: {
        sans: [
          '"Inter"',
          '"Segoe UI"',
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        serif: ['"Georgia"', '"Times New Roman"', "Times", "serif"],
        mono: ['"IBM Plex Mono"', '"SFMono-Regular"', "Menlo", "monospace"],
      },
      borderRadius: { xs: "0.25rem", md: "0.375rem", lg: "0.5rem" },
      boxShadow: { soft: "0 12px 30px -24px rgba(18, 20, 16, 0.35)" },
    },
  },
  plugins: [],
};
export default config;
