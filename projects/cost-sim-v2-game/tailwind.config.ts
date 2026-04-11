import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Primary surface scale — deep navy
        surface: {
          50:  "hsl(var(--surface-50) / <alpha-value>)",
          100: "hsl(var(--surface-100) / <alpha-value>)",
          200: "hsl(var(--surface-200) / <alpha-value>)",
          300: "hsl(var(--surface-300) / <alpha-value>)",
          400: "hsl(var(--surface-400) / <alpha-value>)",
          800: "hsl(var(--surface-800) / <alpha-value>)",
          900: "hsl(var(--surface-900) / <alpha-value>)",
          950: "hsl(var(--surface-950) / <alpha-value>)",
        },
        // Accent — electric cyan
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          dim:     "hsl(var(--accent-dim) / <alpha-value>)",
          glow:    "hsl(var(--accent-glow) / <alpha-value>)",
        },
        // Semantic
        success: "hsl(var(--success) / <alpha-value>)",
        warn:    "hsl(var(--warn) / <alpha-value>)",
        danger:  "hsl(var(--danger) / <alpha-value>)",
        // Legacy compat — keep tree.* working
        tree: {
          base:   "#0a0f1e",
          accent: "#06b6d4",
          warn:   "#f59e0b",
          good:   "#10b981",
          bad:    "#ef4444"
        }
      },
      fontFamily: {
        sans: ["var(--font-pretendard)", "Pretendard", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"]
      },
      borderRadius: {
        xl:  "16px",
        "2xl": "20px",
        "3xl": "28px",
      },
      spacing: {
        "safe-top":    "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-left":   "env(safe-area-inset-left)",
        "safe-right":  "env(safe-area-inset-right)",
      },
      boxShadow: {
        card:     "0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.3)",
        elevated: "0 4px 16px 0 rgb(0 0 0 / 0.5), 0 2px 4px -1px rgb(0 0 0 / 0.4)",
        glow:     "0 0 20px 0 hsl(var(--accent) / 0.25)",
        "glow-sm":"0 0 8px 0 hsl(var(--accent) / 0.35)",
        inner:    "inset 0 1px 0 0 rgb(255 255 255 / 0.06)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" }
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" }
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-8px)" },
          to:   { opacity: "1", transform: "translateY(0)" }
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.5" }
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 8px 0 hsl(var(--accent) / 0.2)" },
          "50%":      { boxShadow: "0 0 20px 4px hsl(var(--accent) / 0.5)" }
        }
      },
      animation: {
        "fade-in":    "fade-in 0.25s ease-out",
        "slide-up":   "slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down": "slide-down 0.2s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
