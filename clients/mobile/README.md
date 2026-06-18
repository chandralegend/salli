# Salli Mobile (React Native — Phase 3b)

React Native client. Not yet scaffolded — web client ships first (Phase 3a).

## Scope (Phase 3b)
- Login via Supabase Auth (same credentials as web)
- Dashboard: net worth, recent transactions, upcoming deadlines (read-only)
- On-device SMS capture (Android only): parse financial SMS → draft journal entries
- Manual entry fallback for iOS (no SMS read permission)
- Does NOT include: Tax Agent chat, Statement upload, Tax computation UI (web-only in v1)

## Stack
- React Native 0.76+ (New Architecture)
- Expo SDK 52+
- expo-router (file-based navigation)
- NativeWind (Tailwind for React Native)
- Zustand (state)
- @tanstack/react-query
- @supabase/supabase-js

## Design
See `/DESIGN.md` — Mobile section. Same token palette, bottom tab bar navigation.

## Folder structure (to be created)
```
mobile/
  app/                    # expo-router screens
    (auth)/
      login.tsx
    (tabs)/
      index.tsx           # Dashboard
      ledger.tsx
      reminders.tsx
  components/
    ui/                   # NativeWind-styled primitives
    MetricCard.tsx
    PostingRow.tsx
    DeadlineChip.tsx
  lib/
    api.ts                # shared API client (generated, same as web)
    store.ts
  assets/
```
