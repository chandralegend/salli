# Salli — Deployment (Pulumi)

Infrastructure is managed by Pulumi (TypeScript) and applied **only from GitHub
Actions** — never locally. State lives in **Pulumi Cloud**.

```
Supabase  → Postgres + Auth + Storage      (region: ap-southeast-1 / Singapore)
Render    → FastAPI backend (Docker)        (region: singapore, plan: free)
Vercel    → salli-web (app) + salli-site    (your Team)
```

`push → main` runs `pulumi up`. A PR touching `infra/**` runs `pulumi preview`.

---

## 1. One-time account setup

You do these once, by hand (they need interactive login):

1. **Pulumi Cloud** — sign up at https://app.pulumi.com (free). Create an access
   token: *Personal → Access Tokens → Create token*.
2. **Supabase** — create an **organization**. Note its **Org ID**
   (*Settings → General → Organization ID*). Create an access token at
   https://supabase.com/dashboard/account/tokens.
3. **Render** — sign up, create a **workspace**. Get your **owner id**:
   `curl -H "Authorization: Bearer $RENDER_API_KEY" https://api.render.com/v1/owners`.
   Create an API key: *Account Settings → API Keys*.
4. **Render ↔ GitHub** — install Render's GitHub app on the `salli` repo
   (*Render Dashboard → New → connect GitHub*) so it can build from the repo.
5. **Vercel ↔ GitHub** — install the Vercel GitHub app on the `salli` repo, and
   grab your **Team ID** (*Team Settings → General*) and an API token
   (*Account Settings → Tokens*, scoped to the team).

> The GitHub-app connections (4 & 5) are what let Render and Vercel build from
> the repo on push. Pulumi wires the projects; the platforms do the builds.

---

## 2. Fill `Pulumi.prod.yaml`

Replace the `REPLACE_WITH_*` placeholders (non-secret, committed):

```yaml
salli:supabaseOrgId:  <supabase org id>
salli:renderOwnerId:  <render owner id, e.g. tea-xxxx>
vercel:team:          <vercel team id>
```

---

## 3. Add GitHub repo secrets

```bash
gh secret set PULUMI_ACCESS_TOKEN     # Pulumi Cloud token
gh secret set SUPABASE_ACCESS_TOKEN   # supabase.com/dashboard/account/tokens
gh secret set VERCEL_API_TOKEN        # vercel token (team-scoped)
gh secret set RENDER_API_KEY          # render api key
gh secret set SUPABASE_DB_PASSWORD    # a strong password you choose (Postgres)
gh secret set ANTHROPIC_API_KEY       # required — the app's LLM key

# Optional integrations (skip any you don't use yet):
gh secret set CRON_SECRET             # e.g. $(openssl rand -base64 32)
gh secret set TAVILY_API_KEY
gh secret set LANGSMITH_API_KEY
gh secret set PADDLE_API_KEY
gh secret set PADDLE_WEBHOOK_SECRET

# Paddle non-secret config → repo *variables* (not secrets):
gh variable set PADDLE_ENVIRONMENT --body sandbox
gh variable set PADDLE_PRICE_PLUS  --body <price_id>
gh variable set PADDLE_PRICE_PRO   --body <price_id>

# Added in PASS 2 (see below) — leave unset for the first run:
# gh secret set SUPABASE_JWT_SECRET
```

---

## 4. First deploy — two passes

The Supabase **JWT secret** can't be read until the project exists, so:

**Pass 1** — with `SUPABASE_JWT_SECRET` *unset*, trigger the workflow
(push to `main`, or *Actions → Deploy infra → Run workflow*). Pulumi creates the
Supabase project, the Render service, and both Vercel projects. The API boots in
its dev-auth fallback (fine temporarily). Everything else — anon key, service
key, DB URL — is wired automatically.

**Pass 2** — copy the project's JWT secret from
*Supabase Dashboard → Settings → API → JWT Secret*, then:

```bash
gh secret set SUPABASE_JWT_SECRET
```

Re-run the workflow. The API now verifies real Supabase tokens.

**Also after Pass 1 (one-time):** create the private storage bucket the API
uploads statements to — *Supabase Dashboard → Storage → New bucket* → name
`statements`, **Public = off**. (The bridged Supabase provider has no bucket
resource, so this is done by hand once.)

---

## 5. Domains (later)

When DNS is ready, set the domains in `Pulumi.prod.yaml` and re-run:

```yaml
salli:appDomain:  app.example.com
salli:siteDomain: example.com
salli:apiDomain:  api.example.com
```

That updates `ALLOWED_ORIGINS` on Render and the `NEXT_PUBLIC_*` URLs on Vercel.
You'll still add the domains + DNS records in the Vercel/Render dashboards (or we
extend the program with `vercel.ProjectDomain` / a Render custom-domain resource).

---

## Notes & caveats

- **Render free tier sleeps** after ~15 min idle (30–60s cold start). Bump
  `salli:renderPlan` to `starter` in `Pulumi.prod.yaml` for always-on ($7/mo).
- **Providers**: Vercel is `@pulumiverse/vercel` (npm). Supabase and Render have
  no npm SDK, so they're the official Terraform providers bridged into Pulumi;
  their generated SDKs are committed under `infra/sdks/` and wired as `file:`
  deps, so CI needs no `pulumi package add`. `pnpm install` runs the SDK
  postinstall (allowed via `infra/pnpm-workspace.yaml`) which installs the
  Terraform-bridge plugin. `index.ts` type-checks against these SDKs.
  Regenerate them with `pulumi package add terraform-provider supabase/supabase`
  and `… render-oss/render`.
- **Render `plan`**: the provider documents `starter`/`standard`/`pro`/… If it
  rejects `free`, the first `pulumi up` will say so — set `salli:renderPlan` to
  `starter` ($7/mo) in `Pulumi.prod.yaml`.
- **Migrations** run at container start via the `Dockerfile.api` CMD
  (`alembic upgrade head && uvicorn …`). Free tier has no pre-deploy hook, so
  this is the right place for them.
- **DB connection** uses the Supabase **session-mode pooler** (`:5432`, IPv4),
  which is prepared-statement-safe for a long-running server + migrations.
- Never run `pulumi up` locally. `pulumi preview` on a PR is the safe way to see
  a diff before merging.
