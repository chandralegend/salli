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
        // brand accent below, so "delete" never reads as just another CTA.
        destructive: "rgb(var(--color-destructive) / <alpha-value>)",
        "salli-success": "#1b6b47",

        // Salli brand accent — fixed red-orange, same value both themes
        // (see global.css --color-salli-accent). Active states, CTAs, icon fills.
        "salli-accent": "rgb(var(--color-salli-accent) / <alpha-value>)",
        // brand/bright — theme-invariant, for pressed/highlight states and
        // the Voice Mode orb core (brighter than salli-accent).
        "salli-bright": "#FF784E",
        // AI accent — lavender. Reserved for AI actions so they never read as
        // spending state, which is what brand orange now means exclusively.
        "salli-ai": "rgb(var(--color-salli-ai) / <alpha-value>)",
        // Hero block (Tax payable, New Entry amount, Debt/Insurance summaries)
        // — deliberately dark in BOTH themes, which is why it is not `primary`.
        // 16 of its 24 call sites hardcode white text, so inverting it in dark
        // would render them white-on-white. On the near-black canvas it
        // separates by its 2px ink border instead of by fill.
        "salli-hero": "#000000",
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
        // One container radius for the whole app — cards, inputs, buttons,
        // sheets, tiles. 12px: 16 reads too soft against a 2px ink border and
        // a hard offset shadow. `control` used to be a second, smaller value
        // and is deliberately gone rather than aliased, so there is no second
        // name for one value to drift apart again.
        card: "12px",
        // Micro-labels and square checkboxes — the 18-22px elements where the
        // container radius would clamp to a capsule and a checkbox would read
        // as a radio button. Was four different values (4/5/6/7px) for one
        // kind of element, which is the same inconsistency at a smaller scale.
        badge: "6px",
        // Genuine capsules only: filter chips, segmented controls, progress
        // bars. A different shape on purpose, not an inconsistency.
        pill: "50px",
      },
    },
  },
  plugins: [],
};
