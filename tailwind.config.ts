import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    // flat ceramic: no rounding, no shadows anywhere
    borderRadius: { none: "0", full: "9999px", DEFAULT: "0" },
    boxShadow: { none: "none" },
    extend: {
      colors: {
        tile: "#F3EFE6",
        grout: "#D5CEC2",
        card: "#FFFDF8",
        ink: "#1E1A17",
        muted: "#7A7066",
        oxblood: { DEFAULT: "#6E2226", dark: "#561A1D", light: "#7F2C30" },
        forest: { DEFAULT: "#364935", dark: "#283727" },
        silver: "#A3A8AD",
        ledge: "#E7E0D4",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        cond: ["var(--font-cond)", "Arial Narrow", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
