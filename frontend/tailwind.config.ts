import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#F97316",
          dark: "#EA580C",
          soft: "#FFF7ED"
        },
        surface: "#FAFAFA",
        slateText: "#334155"
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
} satisfies Config;

