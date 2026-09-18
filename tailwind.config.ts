import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", ...defaultTheme.fontFamily.sans],
        mono: ["var(--font-mono)", ...defaultTheme.fontFamily.mono],
      },
      colors: {
        slate: {
          "50": "#f8fafc",
          "100": "#f1f5f9",
          "200": "#e2e8f0",
          "300": "#cbd5e1",
          "400": "#94a3b8",
          "500": "#64748b",
          "600": "#475569",
          "700": "#334155",
          "800": "#1e293b",
          "900": "#0f172a",
          "950": "#020617",
        },
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
        rail: "hsl(var(--rail))",
        action: {
          DEFAULT: "hsl(var(--action))",
          foreground: "hsl(var(--action-foreground))",
        },
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        status: {
          pass: "hsl(var(--status-pass))",
          "pass-soft": "hsl(var(--status-pass-soft))",
          partial: "hsl(var(--status-partial))",
          "partial-soft": "hsl(var(--status-partial-soft))",
          fail: "hsl(var(--status-fail))",
          "fail-soft": "hsl(var(--status-fail-soft))",
          roadmap: "hsl(var(--status-roadmap))",
          "roadmap-soft": "hsl(var(--status-roadmap-soft))",
          pending: "hsl(var(--status-pending))",
          "pending-soft": "hsl(var(--status-pending-soft))",
        },
        scale: {
          "0": "hsl(var(--scale-0))",
          "1": "hsl(var(--scale-1))",
          "2": "hsl(var(--scale-2))",
          "3": "hsl(var(--scale-3))",
          "4": "hsl(var(--scale-4))",
          "5": "hsl(var(--scale-5))",
        },
      },
      fontSize: {
        "2xs": ["11px", { lineHeight: "14px" }],
        xs: ["12px", { lineHeight: "16px" }],
        sm: ["13px", { lineHeight: "18px" }],
        base: ["13px", { lineHeight: "19px" }],
        md: ["15px", { lineHeight: "22px" }],
        lg: ["16px", { lineHeight: "22px" }],
        xl: ["18px", { lineHeight: "24px" }],
        "2xl": ["22px", { lineHeight: "28px" }],
        "3xl": ["28px", { lineHeight: "34px" }],
        "4xl": ["36px", { lineHeight: "42px" }],
      },
      boxShadow: {
        overlay: "var(--shadow-overlay)",
        panel: "var(--shadow-panel)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    // Presentation mode of the decision view: one idea per screen.
    function presentationVariant({ addVariant }: { addVariant: (name: string, def: string) => void }) {
      addVariant("presentation", ".presentation &");
    },
  ],
} satisfies Config;

export default config;
