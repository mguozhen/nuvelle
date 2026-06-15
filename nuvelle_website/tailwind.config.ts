import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        nuvelle: {
          pink: "#ff5fbf",
          violet: "#b25cff",
          ink: "#09090b"
        }
      }
    }
  },
  plugins: []
} satisfies Config;

export default config;
