import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        plaster: { DEFAULT: "#F2E6D3", deep: "#E6D3B6", shade: "#D9C2A0" },
        card: "#FCF7EF",
        ink: "#3B2A1F",
        glaze: { DEFAULT: "#93302A", deep: "#6E1F1A", light: "#B9483B" },
        brass: { DEFAULT: "#B08A45", light: "#E3C684", deep: "#7A5A28" },
        bottle: { DEFAULT: "#2F4A3B", deep: "#22372B", light: "#4E6B57" },
        honey: "#D98E3A",
        sun: "#FFE2B3",
        marble: "#F6F0E8",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        script: ["var(--font-script)", "cursive"],
      },
      boxShadow: {
        // sun is up and to the left, so everything casts down and right
        card: "1px 1px 0 rgba(255,255,255,0.7) inset, 0 1px 2px rgba(59,42,31,0.08), 12px 18px 40px -18px rgba(92,52,20,0.38)",
        lift: "1px 1px 0 rgba(255,255,255,0.7) inset, 0 2px 4px rgba(59,42,31,0.1), 22px 32px 60px -22px rgba(92,52,20,0.45)",
        tag: "0 1px 1px rgba(59,42,31,0.15), 6px 8px 14px -6px rgba(92,52,20,0.4)",
        brass: "0 0 0 1px #7A5A28, 0 0 0 3px #E3C684, 0 0 0 4px #9C7637, 14px 22px 44px -16px rgba(60,32,10,0.55)",
      },
    },
  },
  plugins: [],
} satisfies Config;
