import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-purple': '#6366f1', // Approximate from image
        'brand-light-purple': '#a5b4fc',
      },
      backgroundImage: {
        'card-gradient': 'linear-gradient(to bottom right, #818cf8, #6366f1, #4f46e5)',
      }
    },
  },
  plugins: [],
};
export default config;
