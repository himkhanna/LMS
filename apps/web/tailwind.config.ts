import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#e3edff",
          100: "#c2d7ff",
          200: "#92b6ff",
          300: "#5d8eff",
          400: "#3a73f7",
          500: "#1e63f2",
          600: "#1a55d1",
          700: "#1645a8",
          800: "#0f2a5f",
          900: "#0a1e44",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
