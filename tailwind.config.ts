import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        "float-slow": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(0, -18px, 0) scale(1.04)" },
        },
        "float-medium": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(-12px, 14px, 0) scale(1.06)" },
        },
        "track-sweep": {
          "0%": { transform: "translateX(-12%)", opacity: "0.35" },
          "50%": { opacity: "0.55" },
          "100%": { transform: "translateX(12%)", opacity: "0.35" },
        },
        "track-rise": {
          "0%, 100%": { transform: "scaleY(0.96)", opacity: "0.35" },
          "50%": { transform: "scaleY(1.04)", opacity: "0.65" },
        },
        "bar-rise": {
          "0%, 100%": { transform: "scaleY(0.82)", opacity: "0.55" },
          "50%": { transform: "scaleY(1.08)", opacity: "1" },
        },
        "grid-drift": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(0, -12px, 0) scale(1.01)" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "0.6" },
        },
        "orbit-slow": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(28px, -16px, 0) scale(1.07)" },
        },
        "orbit-medium": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(-24px, 18px, 0) scale(1.08)" },
        },
        "orbit-fast": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(18px, -22px, 0) scale(1.1)" },
        },
        "wave-drift": {
          "0%, 100%": { transform: "translateX(0)" },
          "50%": { transform: "translateX(10px)" },
        },
        "ping-slow": {
          "0%": { transform: "scale(0.7)", opacity: "0.65" },
          "70%": { transform: "scale(2.1)", opacity: "0" },
          "100%": { transform: "scale(0.7)", opacity: "0" },
        },
      },
      animation: {
        "float-slow": "float-slow 14s ease-in-out infinite",
        "float-medium": "float-medium 18s ease-in-out infinite",
        "track-sweep": "track-sweep 12s ease-in-out infinite",
        "track-rise": "track-rise 9s ease-in-out infinite",
        "bar-rise": "bar-rise 3.8s ease-in-out infinite",
        "grid-drift": "grid-drift 20s ease-in-out infinite",
        "pulse-slow": "pulse-slow 10s ease-in-out infinite",
        "orbit-slow": "orbit-slow 22s ease-in-out infinite",
        "orbit-medium": "orbit-medium 18s ease-in-out infinite",
        "orbit-fast": "orbit-fast 14s ease-in-out infinite",
        "wave-drift": "wave-drift 16s ease-in-out infinite",
        "ping-slow": "ping-slow 3.2s ease-out infinite",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
export default config;
