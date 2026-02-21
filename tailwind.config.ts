import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // shadcn CSS variable colors
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // fuega fire palette
        ember: {
          50: "#fef7ee",
          100: "#fdecda",
          200: "#fad5b4",
          300: "#f6b884",
          400: "#f19252",
          500: "#ed742e",
          600: "#de5a23",
          700: "#b8431e",
          800: "#933620",
          900: "#772e1d",
          950: "#40150d",
        },
        flame: {
          50: "#fff8ed",
          100: "#ffeed4",
          200: "#ffd9a8",
          300: "#ffbe71",
          400: "#ff9738",
          500: "#ff7a11",
          600: "#f05e06",
          700: "#c74407",
          800: "#9e360e",
          900: "#7f2f0f",
          950: "#451505",
        },
        ash: {
          50: "#f6f6f6",
          100: "#e7e7e7",
          200: "#d1d1d1",
          300: "#b0b0b0",
          400: "#888888",
          500: "#6d6d6d",
          600: "#5d5d5d",
          700: "#4f4f4f",
          800: "#454545",
          900: "#3d3d3d",
          950: "#1a1a1a",
        },
        spark: {
          DEFAULT: "#ff7a11",
          glow: "#ffbe71",
        },
        douse: {
          DEFAULT: "#3b82f6",
          deep: "#1e40af",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        "spark-rise": "sparkRise 0.6s ease-out",
        "douse-fall": "douseFall 0.6s ease-out",
        "flame-flicker": "flameFlicker 2s ease-in-out infinite",
      },
      keyframes: {
        sparkRise: {
          "0%": { transform: "translateY(0) scale(1)", opacity: "1" },
          "100%": { transform: "translateY(-20px) scale(1.2)", opacity: "0" },
        },
        douseFall: {
          "0%": { transform: "translateY(0) scale(1)", opacity: "1" },
          "100%": { transform: "translateY(20px) scale(0.8)", opacity: "0" },
        },
        flameFlicker: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
