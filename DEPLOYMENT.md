# Deployment

Salli is a single repo serving three surfaces on three hosts. The domain layout:

| Surface              | Path           | Domain          | Host                     |
| -------------------- | -------------- | --------------- | ------------------------ |
| Marketing site       | `clients/site` | `salli.lk`      | Vercel (static export)   |
| SaaS web app         | `clients/web`  | `app.salli.lk`  | Vercel (Next.js)         |
| API (FastAPI)        | `src/salli`    | `api.salli.lk`  | Container host / Supabase |

The marketing site is a separate, self-contained Next.js project — it shares **no** code with
`clients/web` (design tokens and the logo are copied in), so each builds
independently from its own root directory.

## Vercel — two projects from one repo

Create **two** Vercel projects, both pointing at this same Git repository. They differ only in
**Root Directory** and the domain assigned to them.

### Project 1 — Marketing site (`salli.lk`)

| Setting             | Value                          |
| ------------------- | ------------------------------ |
| Root Directory      | `clients/site`                 |
| Framework Preset    | Next.js                        |
| Build Command       | `pnpm build` (default)         |
| Output Directory    | (leave default — auto-detected) |
| Install Command     | (default; `pnpm install`)      |
| Domains             | `salli.lk`, `www.salli.lk`     |

Environment variables:

```
NEXT_PUBLIC_APP_URL=https://app.salli.lk
```

`next.config.ts` sets `output: "export"`, so Vercel produces a static site (`out/`). The
"Sign in" / "Get started" links resolve to `${NEXT_PUBLIC_APP_URL}/login` and `/signup`.

### Project 2 — SaaS app (`app.salli.lk`)

| Setting             | Value                          |
| ------------------- | ------------------------------ |
| Root Directory      | `clients/web`                  |
| Framework Preset    | Next.js                        |
| Domains             | `app.salli.lk`                 |

Environment variables (at minimum):

```
NEXT_PUBLIC_API_URL=https://api.salli.lk
```

(plus any Supabase / auth public keys the app already requires).

> **Vercel "Connected Git Repository" note:** because both projects share one repo, set each
> project's **Production Branch** to `main` and optionally add **Ignored Build Step** so a project
> only redeploys when its own subtree changes, e.g. for the site project:
> `git diff --quiet HEAD^ HEAD -- clients/site` — exit 0 (no change) skips the build.

## API

The API is **not** on Vercel — it's a long-lived FastAPI/uvicorn service with Postgres and the
LangGraph checkpointer. Deploy it to a container host (or alongside Supabase) and point
`api.salli.lk` at it. The web app reaches it via `NEXT_PUBLIC_API_URL`; CORS on the API must allow
`https://app.salli.lk`.

## pnpm built-dependencies gate

pnpm 11.8 fails the install if a dependency wants to run a build script and isn't explicitly
allowed/ignored. Both `clients/site` and `clients/web` declare the ignore list in
`pnpm-workspace.yaml`:

```yaml
ignoredBuiltDependencies:
  - sharp
  - unrs-resolver
```

This keeps Vercel and local installs from erroring on `ERR_PNPM_IGNORED_BUILDS`.

## Local development

`docker compose up` runs all surfaces:

| Service | URL                     | Notes                                  |
| ------- | ----------------------- | -------------------------------------- |
| `site`  | http://localhost:3001   | marketing site, `NEXT_PUBLIC_APP_URL=http://localhost:3000` |
| `web`   | http://localhost:3000   | SaaS app, `NEXT_PUBLIC_API_URL=http://localhost:8080`       |
| `api`   | http://localhost:8080   | FastAPI; DB on local Supabase Postgres |
| `db`    | localhost:5432          | dev-fallback Postgres (unused; app DB is Supabase) |

To run the marketing site alone:

```bash
cd clients/site
pnpm install
pnpm dev        # http://localhost:3001
pnpm build      # static export → clients/site/out
```
