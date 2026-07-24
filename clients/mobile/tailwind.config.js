/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Tokens resolve from CSS variables defined in global.css (:root / .dark) as
      // raw "R G B" channel triplets, so Tailwind's rgb(var(...) / <alpha-value>)
      // wrapper enables opacity modifiers (e.g. text-foreground/40, border-foreground/10) —
      // the mockup builds its entire text/border hierarchy this way (white at varying
      // opacity over black), so this is truer to the source than solid hex vars.
      colors: {
        background: "rgb(var(--color-background) / <alpha-value>)",
        foreground: "rgb(var(--color-foreground) / <alpha-value>)",

        card: "rgb(var(--color-card) / <alpha-value>)",
        "card-foreground": "rgb(var(--color-card-foreground) / <alpha-value>)",

        popover: "rgb(var(--color-popover) / <alpha-value>)",
        "popover-foreground": "rgb(var(--color-popover-foreground) / <alpha-value>)",

        primary: "rgb(var(--color-primary) / <alpha-value>)",
        "primary-foreground": "rgb(var(--color-primary-foreground) / <alpha-value>)",

        muted: "rgb(var(--color-muted) / <alpha-value>)",
        "muted-foreground": "rgb(var(--color-muted-foreground) / <alpha-value>)",

        // Destructive is a deliberately different, darker red from the
        // red-orange accent below, so "delete" never reads as just another CTA.
        destructive: "rgb(var(--color-destructive) / <alpha-value>)",
        "salli-success": "#1b6b47",

        // Salli accent — theme-invariant red-orange, the one fixed hue across
        // light/dark (matches the marketing site's primary: active states,
        // CTAs, icon fills).
        "salli-accent": "#f5310f",
        // Hero gradient stops (Login / Dashboard top) — always dark, both themes,
        // red-orange fading to ink instead of the old navy-to-black treatment.
        "salli-hero-1": "#f5310f",
        "salli-hero-2": "#b8280f",
        "salli-hero-3": "#5c1f13",
        "salli-hero-4": "#16130f",
        // Deep-ink card (Tax hero, New Entry amount hero) — theme-invariant.
        "salli-navy-card": "#221d17",
        // Tab bar / logo badge — theme-invariant (always dark dock, always white
        // badge), mirrors the old app's "stays dark in both modes" tokens.
        "salli-dock": "rgba(4,4,4,.97)",
        "salli-badge": "#FFFFFF",
        "salli-badge-foreground": "#f5310f",
      },
      fontFamily: {
        sans: ["Archivo_400Regular"],
        "sans-medium": ["Archivo_500Medium"],
        "sans-semibold": ["Archivo_600SemiBold"],
        "sans-bold": ["Archivo_700Bold"],
        "sans-extrabold": ["Archivo_800ExtraBold"],
        "sans-black": ["Archivo_900Black"],
        display: ["BricolageGrotesque_700Bold"],
        "display-semibold": ["BricolageGrotesque_600SemiBold"],
        "display-extrabold": ["BricolageGrotesque_800ExtraBold"],
        mono: ["JetBrainsMono_400Regular"],
        "mono-medium": ["JetBrainsMono_500Medium"],
        "mono-bold": ["JetBrainsMono_700Bold"],
      },
      borderRadius: {
        card: "20px",
        control: "14px",
        pill: "50px",
      },
    },
  },
  plugins: [],
};
