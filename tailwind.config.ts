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
          50:  "#f0f7ff",
          100: "#e0efff",
          200: "#baddff",
          300: "#84c0ff",
          400: "#489bff",
          500: "#1a74ff",
          600: "#0052f5",
          700: "#003fd4",
          800: "#0035ab",
          900: "#003088",
        },
      },
    },
  },
  plugins: [],
};

export default config;
