/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Tokens resolve from CSS variables defined in global.css (:root / .dark),
      // mirroring clients/web/src/app/globals.css — keep both files in sync.
      colors: {
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",

        card: "var(--color-card)",
        "card-foreground": "var(--color-card-foreground)",

        popover: "var(--color-popover)",
        "popover-foreground": "var(--color-popover-foreground)",

        primary: "var(--color-primary)",
        "primary-foreground": "var(--color-primary-foreground)",

        secondary: "var(--color-secondary)",
        "secondary-foreground": "var(--color-secondary-foreground)",

        muted: "var(--color-muted)",
        "muted-foreground": "var(--color-muted-foreground)",

        accent: "var(--color-accent)",
        "accent-foreground": "var(--color-accent-foreground)",

        destructive: "var(--color-destructive)",

        border: "var(--color-border)",
        input: "var(--color-input)",
        ring: "var(--color-ring)",

        // Salli brand accent tokens — theme-invariant (always lime-on-dark),
        // used for the logo badge and tab bar which stay dark in both modes.
        "salli-lime": "#E8FC85",
        "salli-mint": "#A5FFB9",
        "salli-teal": "#D5E9EA",
        "salli-dark": "#010001",
        "salli-muted": "#7DA6A9",
      },
      fontFamily: {
        sans: ["DMSans_400Regular"],
        "sans-medium": ["DMSans_500Medium"],
        "sans-bold": ["DMSans_700Bold"],
        "sans-black": ["DMSans_900Black"],
        mono: ["IBMPlexMono_400Regular"],
        "mono-medium": ["IBMPlexMono_500Medium"],
      },
      borderRadius: {
        card: "20px",
        control: "14px",
      },
    },
  },
  plugins: [],
};
