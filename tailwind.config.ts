import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0b0d12",
        panel: "#12151d",
        edge: "#232838",
        accent: "#6d8cff",
      },
    },
  },
  plugins: [],
};

export default config;
