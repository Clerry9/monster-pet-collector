import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ['"Luckiest Guy"', 'cursive'],
        body: ['Nunito', 'sans-serif'],
      },
      boxShadow: {
        chunky: '0 4px 0 0 hsl(var(--wood-dark)), 0 8px 16px -2px hsl(22 60% 15% / 0.35)',
        'chunky-sm': '0 3px 0 0 hsl(var(--wood-dark)), 0 5px 10px -2px hsl(22 60% 15% / 0.3)',
      },
      colors: {
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
        coin: "hsl(var(--coin))",
        gold: "hsl(var(--gold))",
        "gold-deep": "hsl(var(--gold-deep))",
        wood: "hsl(var(--wood))",
        "wood-dark": "hsl(var(--wood-dark))",
        "wood-light": "hsl(var(--wood-light))",
        cream: "hsl(var(--cream))",
        "cream-light": "hsl(var(--cream-light))",
        "candy-red": "hsl(var(--candy-red))",
        "energy-pink": "hsl(var(--energy-pink))",
        "monster-bg": "hsl(var(--monster-bg))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "10%": { transform: "translateX(-6px) rotate(-1deg)" },
          "20%": { transform: "translateX(5px) rotate(1deg)" },
          "30%": { transform: "translateX(-4px) rotate(-0.5deg)" },
          "40%": { transform: "translateX(3px) rotate(0.5deg)" },
          "50%": { transform: "translateX(-2px)" },
          "60%": { transform: "translateX(1px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shake: "shake 0.5s ease-in-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
