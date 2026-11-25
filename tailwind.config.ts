import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#F4EFE6",
        grout: "#E2D9C8",
        parchment: "#FAF7F2",
        oxblood: { DEFAULT: "#6B2428", deep: "#521A1D", soft: "#8C3A3E" },
        awning: { DEFAULT: "#3B4D3B", deep: "#2C3A2C", soft: "#5A6E57" },
        ink: "#2A211C",
        crust: "#B7793A",
        walnut: "#5B3A26",
        celadon: "#A9BFA8",
        butter: "#F2D98B",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        script: ["var(--font-script)", "cursive"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(42,33,28,0.06), 0 8px 24px -12px rgba(42,33,28,0.25)",
        tag: "0 2px 0 rgba(42,33,28,0.08), 0 6px 14px -6px rgba(42,33,28,0.35)",
      },
    },
  },
  plugins: [],
} satisfies Config;
