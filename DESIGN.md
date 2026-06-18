---
version: "salli-v1"
name: "Salli — Personal Finance & Tax"
description: "Salli is a dark-first personal finance and tax preparation platform for Sri Lanka. The interface draws from the Aura/Neuform design language: high information density, bento-grid card layouts, and a lime-on-dark palette. The experience is calm, precise, and data-forward — the numbers are always the hero."
colors:
  primary: "#A3E635"
  primary-dim: "#84CC16"
  secondary: "#FFFFFF"
  accent: "#A3E635"
  background: "#0D0F12"
  surface: "#161A1E"
  surface-raised: "#1E2228"
  surface-border: "#2D3139"
  text-primary: "#F5F5F5"
  text-secondary: "#9CA3AF"
  text-muted: "#4B5563"
  border: "#2D3139"
  success: "#A3E635"
  income: "#A3E635"
  expense: "#F87171"
  warning: "#FBB**F24"
  destructive: "#F87171"
typography:
  display-lg:
    fontFamily: "Inter"
    fontSize: "64px"
    fontWeight: 500
    lineHeight: "1.04"
    letterSpacing: "-0.02em"
  display-md:
    fontFamily: "Inter"
    fontSize: "40px"
    fontWeight: 500
    lineHeight: "1.1"
  heading:
    fontFamily: "Inter"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: "1.3"
  body-md:
    fontFamily: "Inter"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "1.6"
  body-sm:
    fontFamily: "Inter"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "1.5"
  label-md:
    fontFamily: "JetBrains Mono"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: "1.2"
  label-sm:
    fontFamily: "JetBrains Mono"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: "1.2"
    letterSpacing: "0.05em"
  number-lg:
    fontFamily: "JetBrains Mono"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: "1.1"
  number-xl:
    fontFamily: "JetBrains Mono"
    fontSize: "48px"
    fontWeight: 700
    lineHeight: "1.0"
spacing:
  base: "8px"
  gap: "16px"
  card-padding: "24px"
  section-padding: "80px"
rounded:
  card: "16px"
  control: "10px"
  pill: "9999px"
  chip: "8px"
components:
  card:
    background: "surface token (#161A1E) with 1px surface-border and no shadow"
    radius: "16px"
    padding: "24px"
    hover: "surface-raised on hover with 200ms ease transition"
  metric-card:
    background: "surface"
    label: "label-sm in text-muted"
    value: "number-lg in text-primary"
    delta: "label-md in success (positive) or destructive (negative)"
  button-primary:
    background: "primary (#A3E635)"
    text: "background (#0D0F12) — dark text on lime"
    radius: "control (10px)"
    hover: "primary-dim"
  button-ghost:
    background: "transparent"
    text: "text-secondary"
    border: "1px solid border"
    radius: "control"
  sidebar:
    background: "surface"
    active-item: "primary with background text, pill shape"
    inactive-item: "text-secondary, hover surface-raised"
  badge-income:
    background: "primary at 15% opacity"
    text: "primary"
    radius: "pill"
  badge-expense:
    background: "destructive at 15% opacity"
    text: "destructive"
    radius: "pill"
  agent-bubble-user:
    background: "surface-raised"
    text: "text-primary"
    radius: "16px 16px 4px 16px"
  agent-bubble-assistant:
    background: "primary at 10% opacity"
    border: "1px solid primary at 30% opacity"
    text: "text-primary"
    radius: "16px 16px 16px 4px"
  streaming-cursor:
    animation: "blink 1s step-end infinite"
    color: "primary"
---

# Salli — Design System

Adapted from the Aura / Neuform design language by Meng To. The source visual DNA — bento-grid density, lime-on-dark palette, Inter + JetBrains Mono typography, 40px-radius cards, staggered entrance motion — is preserved and mapped to Salli's finance and tax domain.

## Brand voice

Salli is a quiet authority. Numbers are always precise (JetBrains Mono for every monetary value), language is direct and non-alarmist, and the interface never competes with the data it displays. Lime green (#A3E635) marks things that are good news — income, positive balances, completed actions.

## Color roles

| Token | Hex | Role |
|---|---|---|
| `primary` | `#A3E635` | CTAs, income indicators, active nav, success states |
| `background` | `#0D0F12` | Page / app shell |
| `surface` | `#161A1E` | Cards, panels, sidebar |
| `surface-raised` | `#1E2228` | Hover state, elevated panels, dropdowns |
| `surface-border` | `#2D3139` | Card borders, dividers |
| `text-primary` | `#F5F5F5` | Headings, primary values |
| `text-secondary` | `#9CA3AF` | Labels, descriptions |
| `text-muted` | `#4B5563` | Placeholders, disabled |
| `income` | `#A3E635` | Positive amounts, credits |
| `expense` | `#F87171` | Negative amounts, debits, tax due |
| `warning` | `#FBBF24` | Upcoming deadlines, pending items |

## Typography rules

- **All monetary amounts** use JetBrains Mono — including balances, tax figures, posting amounts, and currency codes.
- **Large hero numbers** (net worth, total income, tax payable on the dashboard) use `number-xl` (JetBrains Mono 48px 700).
- **Metric labels** ("Net Worth", "Tax Payable", "APIT Credit") use `label-sm` in `text-muted`.
- **UI labels, navigation, descriptions** use Inter.
- **Bank references, account codes, IDs** use `label-md` (JetBrains Mono 13px).

## Layout

### Dashboard (bento grid)

First viewport on `/dashboard`: a bento grid of metric cards — Net Worth (large), Tax Payable (highlighted if >0), Recent Transactions strip, Tax Agent quick-start. Follows the Aura "Vitality Dashboard" composition: large focal metric top-left, supporting metrics in a 2×2 cluster right, a wide horizontal strip below.

Grid:
```
[ Net Worth (2×2)     ] [ Tax Payable ][ Income YTD ]
[                     ] [ Expense YTD ][ APIT Credit ]
[ Recent Transactions (4 cols wide)                  ]
[ Agent Prompt          ][ Upcoming Deadlines        ]
```

### Sidebar

Persistent sidebar on desktop (240px), bottom tab bar on mobile. Items: Dashboard · Ledger · Statements · Tax · Agent · Reminders · Settings. Active item uses a pill shape with `primary` background and dark text — same pattern as Aura's navigation.

### Spacing rhythm

Cards use `24px` padding. Grid gaps are `16px`. Section-level spacing (between bento rows) is `32px`. Max content width `1280px`, centered.

## Components (shadcn base + Salli overrides)

All primitive components (Button, Input, Dialog, Dropdown, Table, Tabs, Badge, Card, Sheet, Tooltip) come from **shadcn/ui**. Override the CSS variables in `globals.css` to apply the Salli tokens.

Key overrides:
- `--background`: `#0D0F12`
- `--card`: `#161A1E`
- `--card-foreground`: `#F5F5F5`
- `--primary`: `#A3E635`
- `--primary-foreground`: `#0D0F12`
- `--border`: `#2D3139`
- `--radius`: `10px`

## Salli-specific components

### `<MetricCard>`
Compact card: muted label top-left, mono number center, optional delta badge bottom-right. Used for Net Worth, Tax Payable, Income YTD, etc.

### `<PostingRow>`
A single journal entry posting. Date in `label-md`, description in `body-sm`, account name in `text-secondary`, amount in `number` with `income`/`expense` color. Debit/credit shown as a tiny pill badge.

### `<AgentChat>`
Split: scrollable message history (top), sticky input bar with lime send button (bottom). Assistant messages have a subtle lime-tinted border. Streaming tokens render as they arrive; a blinking lime cursor shows generation is live.

### `<TaxBandTable>`
Compact table: Band, Rate, Taxable in Band (JetBrains Mono), Tax (JetBrains Mono). Last row bold = Total. Right-aligned numbers. Used in the Tax page.

### `<StatementUpload>`
Drag-and-drop zone: dashed border (`surface-border`), lime dashed on hover, icon + "Drop your bank statement" text. Accepts PDF, XLSX, CSV. Progress bar in `primary` on upload.

### `<DeadlineChip>`
Pill badge: `warning` for upcoming (≤14 days), `expense` for overdue, `success` for done. Date in JetBrains Mono.

## Motion

Follow the Aura motion vocabulary:
- **Card entrance**: `opacity 0→1` + `translateY 8px→0` over `300ms ease-out`, staggered `50ms` per card.
- **Number count-up**: animate metric card values on first render (200ms, `ease-out`).
- **Hover lift**: cards translate `−2px` on hover, `150ms ease`.
- **Agent token stream**: tokens fade in `opacity 0→1` over `100ms`.
- **Page transition**: fade `200ms ease`.

No heavy WebGL or Three.js — this is a data tool, not a portfolio. Subtle gradient mesh on the landing page only.

## Mobile (React Native — Phase 3b)

Use the same design tokens mapped to React Native StyleSheet. Navigation: bottom tab bar with the same 5 items. SMS capture screen uses a minimal list view — each parsed SMS row is a `<PostingRow>` equivalent. The mobile client does **not** implement the Tax Agent chat or statement upload (web-only in v1).

## Guardrails

- Every monetary value rendered in JetBrains Mono — no exceptions.
- The lime green `#A3E635` is used only for positive signals and primary actions. It is never used for warnings or errors.
- Do not use a white or light background. The dark-first palette is non-negotiable for this product.
- Card radius is `16px` (desktop). Do not use `40px` radius (the original Aura value) — it reads as mobile-app in a desktop data tool.
- No generic SaaS hero sections, feature grids, or marketing copy on authenticated pages.
- Tax figures are always accompanied by their YA (Year of Assessment) label.
- "Not formal tax advice" disclaimer appears near every tax computation output.
