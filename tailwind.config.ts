import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f0f3ff",
          100: "#e3e8ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#7c8ff9",
          500: "#4a6cf7",
          600: "#3b5bdb",
          700: "#2f4ac5",
          800: "#243aaa",
          900: "#1e3090",
        },
        lavender: {
          50:  "#f5f6fd",
          100: "#eceef8",
          200: "#dde0f3",
          300: "#c8cceb",
          400: "#a9aede",
          500: "#8a91ce",
        },
        teal: {
          50:  "#f0fdf9",
          100: "#ccfbef",
          200: "#99f6e0",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
        },
      },
    },
  },
  plugins: [],
};

export default config;
