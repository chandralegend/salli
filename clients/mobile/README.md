# Salli Mobile (React Native)

Full feature parity with the web app — auth, dashboard, ledger CRUD, tax, Financial
Independence, the Scrooge AI agent, statement uploads, documents, and billing all work
here, wired to the live API. Mirrors the web app's design system (light `#F1F7F7` /
dark `#111110` canvas, `#E8FC85` lime accent, DM Sans + IBM Plex Mono) with full
light/dark theme support.

## Scope
- Login / signup via Supabase Auth (same credentials as web), with a dev-login
  fallback when Supabase env isn't configured
- Onboarding: 6-step wizard (welcome → about you → work & tax → income sources → goals → review)
- Dashboard: net worth, income/expenses YTD, recent transactions, upcoming deadlines
- Ledger: full CRUD — chart of accounts, journal entries (post + reverse), income statement
- Tax: computation, progressive band breakdown, APIT/AIT/FTC credits, FSI handling
- Financial Independence: FI score, portfolio projections (chart), allocation buckets,
  goals, AI strategy, advisor recommendations
- Agent ("Scrooge"): streaming chat, tool-call visualization, approval-required pauses
  (session history browsing and file attachments are not yet wired up — see below)
- Documents: agent notes/uploads + memories, markdown preview
- Statements: upload, parse, approve/skip, post to ledger
- Billing: plan grid + usage meters (checkout opens the web app's billing page in an
  in-app browser — Paddle has no native RN SDK)
- Reminders: list + mark done
- Dark mode: full toggle in Settings, persisted, matches web's palette exactly
- Not yet built: on-device SMS capture (Android), manual entry fallback (iOS)

## Stack
- React Native 0.81 (New Architecture) + Expo SDK 54
- expo-router (file-based navigation)
- NativeWind (Tailwind for React Native) with CSS-variable-backed dark mode tokens
- Zustand (state)
- @tanstack/react-query
- @supabase/supabase-js (session persisted via AsyncStorage)
- Generated OpenAPI client (`@hey-api/openapi-ts`, same `openapi.json` schema as web)
  — some newer endpoints (FI, documents, agent sessions, billing) aren't in the
  generated SDK yet on either client; those go through `lib/api-fetch.ts` instead
- react-native-gifted-charts (FI projections), react-native-markdown-display (Documents,
  AI rationale), expo-document-picker (Statements, file attachments), react-native-sse
  (Agent streaming), expo-web-browser (Billing checkout)

## Design
See `/DESIGN.md` — Mobile section. Same token palette (`tailwind.config.js` + `global.css`
mirror `clients/web/src/app/globals.css`'s `:root`/`.dark` blocks). Navigation is a
floating rounded dock (mirrors web's `AppSidebar.tsx`, not a full-width edge-to-edge bar):
Dashboard · Ledger · a raised "+" (opens Ledger's New Entry modal from anywhere) · Agent ·
Financial Independence. Tax, Reminders, Documents, Statements, Billing, and Settings live
under **More** (a nested stack, reachable via the avatar button in each screen's header
top-right, not shown in the dock itself).

## Getting started
```bash
cp .env.local.example .env.local   # fill in EXPO_PUBLIC_API_URL / Supabase keys
pnpm install
pnpm start        # or: pnpm ios / pnpm android / pnpm web
pnpm gen:api      # regenerate lib/api/* after the backend OpenAPI schema changes
```

Note: `EXPO_PUBLIC_API_URL` must be your machine's LAN IP (not `localhost`) to test on
a physical device or the Android emulator.

## Folder structure
```
mobile/
  app/                    # expo-router screens
    _layout.tsx           # fonts, React Query provider, dark-mode hydration, root stack
    index.tsx             # auth-gated redirect → (auth)/login or (tabs)
    onboarding.tsx         # standalone 6-step wizard
    (auth)/
      login.tsx
      signup.tsx
      forgot-password.tsx
    (tabs)/
      _layout.tsx          # floating dock (Dashboard · Ledger · + · Agent · Financial Independence)
      index.tsx           # Dashboard
      ledger.tsx           # full CRUD: accounts / entries / income statement
      agent.tsx            # Scrooge streaming chat
      financial-independence.tsx
      more/                # not in the dock — reached via AvatarMoreButton
        _layout.tsx        # nested stack with native headers
        index.tsx          # More menu
        tax.tsx
        reminders.tsx
        documents.tsx
        statements.tsx
        billing.tsx
        settings.tsx        # session, dark-mode toggle, about
  components/
    ui/                   # NativeWind-styled primitives (page-shell, bento-tile, pill-button, text-field)
    layout/
      FloatingTabBar.tsx    # the dock itself
      AvatarMoreButton.tsx  # header entry point into More
    auth/AuthShell.tsx
    Logo.tsx               # "රු" wordmark badge (theme-invariant)
    PostingRow.tsx
    DeadlineChip.tsx
  hooks/                  # useDashboard, useLedger, useReminders, useTax, useFi,
                          # useDocuments, useStatements, useBilling, useAgentSessions
  lib/
    api/                  # generated OpenAPI client (gitignored input: openapi.json is checked in)
    api-client.ts          # base URL + auth header interceptor
    api-fetch.ts           # apiFetch<T>() for endpoints not in the generated SDK
    auth.ts                # useAuth hook + Supabase auth actions
    supabase.ts
    store.ts               # zustand (token, auth-ready)
    theme.ts                # useThemeColors, useColorScheme, useDarkModeToggle
    utils.ts                # cn()
  assets/
```
