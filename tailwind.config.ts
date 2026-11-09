import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: { brand: "#2563EB", sky: "#38BDF8", navy: "#0F172A", bg: "var(--bg)", soft: "var(--soft)", ink: "var(--ink)", muted: "var(--muted)", card: "var(--card)", line: "var(--line)" },
    animation: { float: "float 7s ease-in-out infinite" },
    keyframes: { float: { "50%": { transform: "translateY(-12px)" } } },
  } },
  plugins: [],
} satisfies Config;
