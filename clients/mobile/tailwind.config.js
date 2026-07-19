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

        destructive: "rgb(var(--color-destructive) / <alpha-value>)",

        // Salli accent — theme-invariant electric blue, the one fixed hue across
        // light/dark (mockup: #2563EB everywhere — active states, CTAs, icon fills).
        "salli-accent": "#2563EB",
        // Hero gradient stops (Login / Dashboard top) — always dark, both themes,
        // matching the mockup's fixed navy-to-black hero treatment.
        "salli-hero-1": "#0B20E0",
        "salli-hero-2": "#0912B0",
        "salli-hero-3": "#060A6A",
        "salli-hero-4": "#020518",
        // Deep-navy card (Tax hero, New Entry amount hero) — theme-invariant.
        "salli-navy-card": "#0E1A50",
        // Tab bar / logo badge — theme-invariant (always dark dock, always white
        // badge), mirrors the old app's "stays dark in both modes" tokens.
        "salli-dock": "rgba(4,4,4,.97)",
        "salli-badge": "#FFFFFF",
        "salli-badge-foreground": "#0912B0",
      },
      fontFamily: {
        sans: ["Inter_400Regular"],
        "sans-medium": ["Inter_500Medium"],
        "sans-semibold": ["Inter_600SemiBold"],
        "sans-bold": ["Inter_700Bold"],
        "sans-extrabold": ["Inter_800ExtraBold"],
        "sans-black": ["Inter_900Black"],
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
