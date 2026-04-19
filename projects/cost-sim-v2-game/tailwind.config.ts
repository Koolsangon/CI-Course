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
        // Primary surface scale — LG neutral gray
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
        // Accent — LG Red
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          dim:     "hsl(var(--accent-dim) / <alpha-value>)",
          glow:    "hsl(var(--accent-glow) / <alpha-value>)",
        },
        // Semantic
        success: "hsl(var(--success) / <alpha-value>)",
        warn:    "hsl(var(--warn) / <alpha-value>)",
        danger:  "hsl(var(--danger) / <alpha-value>)",
        // LG brand colors (direct hex for one-off use)
        "lg-red":     "#A50034",
        "lg-active":  "#E4002B",
        "lg-deep":    "#7A0026",
        "lg-grey":    "#6B6B6B",
        // Legacy compat — keep tree.* working
        tree: {
          base:   "#FAFAFA",
          accent: "#A50034",
          warn:   "#ED6C02",
          good:   "#2E7D32",
          bad:    "#E4002B"
        }
      },
      fontFamily: {
        sans: ["var(--font-pretendard)", "Pretendard", "-apple-system", "BlinkMacSystemFont", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"]
      },
      borderRadius: {
        /* LG HRD shape scale: XS 4 / S 8 / M 12 / L 16 / XL 24 / Pill 999 */
        xl:  "16px",
        "2xl": "20px",
        "3xl": "24px",
      },
      spacing: {
        "safe-top":    "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-left":   "env(safe-area-inset-left)",
        "safe-right":  "env(safe-area-inset-right)",
      },
      boxShadow: {
        /* Neutral gray shadows only — no colored shadows per LG HRD spec */
        card:     "0 1px 2px rgba(10,10,10,0.04)",
        elevated: "0 8px 24px rgba(10,10,10,0.08)",
        glow:     "0 0 12px 0 hsl(var(--accent) / 0.15)",
        "glow-sm":"0 0 6px 0 hsl(var(--accent) / 0.2)",
        inner:    "inset 0 1px 0 0 rgb(255 255 255 / 0.04)",
        lg:       "0 24px 48px rgba(10,10,10,0.10)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" }
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
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
          "0%, 100%": { boxShadow: "0 0 6px 0 hsl(var(--accent) / 0.15)" },
          "50%":      { boxShadow: "0 0 14px 2px hsl(var(--accent) / 0.3)" }
        }
      },
      animation: {
        /* LG HRD motion: cubic-bezier(0.2, 0.8, 0.2, 1) — quick start, soft settle */
        "fade-in":    "fade-in 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)",
        "slide-up":   "slide-up 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)",
        "slide-down": "slide-down 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
