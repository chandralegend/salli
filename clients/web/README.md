# web

Minimal "finance-trust" web client for Salli — behavior-identical to `clients/web`
(same routes, hooks, and API contracts), with a simpler visual system: white canvas,
near-black ink, deep-navy `#0A2540` emphasis, semantic-only green/amber/red, shadcn/ui.

## Dev

```bash
corepack pnpm install
corepack pnpm dev        # http://localhost:3003
```

Backend: the FastAPI server from the repo root. Point `NEXT_PUBLIC_API_URL` at it
(`.env.local` — defaults to `http://localhost:8010` because :8000 may be taken locally):

```bash
# from the repo root — Supabase vars cleared so the "Dev login (skip auth)" button works
SUPABASE_URL= SUPABASE_JWT_SECRET= SUPABASE_ANON_KEY= SUPABASE_SERVICE_ROLE_KEY= \
  uv run uvicorn salli.interfaces.api.main:app --port 8010
```

Without `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `/login` shows a
**Dev login** button (token `dev-seed-user`). With them set, email/password + Google
OAuth via Supabase work as in `clients/web`.

Note: if `DATABASE_URL` goes through the Supabase **transaction pooler** (`:6543`),
asyncpg prepared statements fail intermittently; use the session pooler (`:5432`)
for local runs and for `alembic upgrade head`.

## Structure

- `src/lib`, `src/hooks` — copied verbatim from `clients/web` (generated SDK, auth,
  zustand store, SSE client, react-query hooks). Regenerate the SDK with `pnpm gen:api`.
- `src/components/ui` — shadcn base-nova primitives (add more via `pnpm dlx shadcn add <name>`).
- `src/components/shared` — PageHeader, StatCard, MoneyText (decimal-string display,
  parentheses negatives), EmptyState, StatusChip, QuotaBanner, SectionLabel.
- `src/app` — all visual code, written new. Screen behaviors follow
  `../../STITCH_PROMPTS.md` (the behavior inventory + per-screen specs).

## Invariants

- Money values from the API are decimal **strings** — never parsed to float for math.
- Journal entries are immutable — corrections via reversing entries only.
- The AI never computes figures; tax screens carry the planning-estimate disclaimer.
- 402 responses render an upgrade banner linking to `/settings?upgrade=1`.
