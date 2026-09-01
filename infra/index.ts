/**
 * Salli infrastructure — Supabase · Render · Vercel
 * ==================================================
 * Applied ONLY from GitHub Actions (see .github/workflows/deploy.yml).
 * State lives in Pulumi Cloud.
 *
 * Secrets come from the CI environment (GitHub Actions → repo secrets), NOT from
 * `pulumi config set`, so nothing sensitive is ever committed or set locally.
 * Non-secret settings live in Pulumi.prod.yaml.
 *
 * FIRST DEPLOY is two-pass because Supabase's JWT secret can't be read until the
 * project exists:
 *   Pass 1 — leave SUPABASE_JWT_SECRET unset. Pulumi creates the project; the API
 *            comes up in its dev-auth fallback.
 *   Pass 2 — copy the project's JWT secret (Dashboard → Settings → API → JWT
 *            Secret) into the SUPABASE_JWT_SECRET GitHub secret and re-run.
 * The anon/service-role keys ARE fetched automatically via getApikeys.
 *
 * The Supabase + Render providers are the official Terraform providers, bridged
 * into Pulumi. Their generated SDKs live in sdks/ (committed) and are wired as
 * file: dependencies in package.json.
 */

import * as pulumi from "@pulumi/pulumi";
import * as supabase from "@pulumi/supabase";
import * as render from "@pulumi/render";
import * as vercel from "@pulumiverse/vercel";

// ─────────────────────────────────────────────────────────────────────────────
// Config (non-secret, from Pulumi.prod.yaml)
// ─────────────────────────────────────────────────────────────────────────────
const cfg = new pulumi.Config("salli");
const stack = pulumi.getStack();

const githubRepo = cfg.require("githubRepo"); // "chandralegend/salli"
const branch = cfg.get("branch") ?? "main";

const supabaseOrgId = cfg.require("supabaseOrgId"); // organization slug
const supabaseRegion = cfg.get("supabaseRegion") ?? "ap-southeast-1";
// Session-mode pooler host (IPv4). Override if Supabase assigns a different
// pooler cluster (check Dashboard → Settings → Database → Connection pooling).
const poolerHost =
  cfg.get("supabasePoolerHost") ?? `aws-0-${supabaseRegion}.pooler.supabase.com`;

const renderOwnerId = cfg.require("renderOwnerId");
const renderRegion = cfg.get("renderRegion") ?? "singapore";
const renderPlan = cfg.get("renderPlan") ?? "starter";

// Custom domains — blank until DNS is wired. When set they take precedence over
// the default *.vercel.app / *.onrender.com hostnames.
const appDomain = cfg.get("appDomain") ?? "";
const siteDomain = cfg.get("siteDomain") ?? "";
const apiDomain = cfg.get("apiDomain") ?? "";

const apiName = stack === "prod" ? "salli-api" : `salli-api-${stack}`;
const webName = stack === "prod" ? "salli-web" : `salli-web-${stack}`;
const siteName = stack === "prod" ? "salli-site" : `salli-site-${stack}`;

// ─────────────────────────────────────────────────────────────────────────────
// Secrets (from CI env → GitHub secrets)
// ─────────────────────────────────────────────────────────────────────────────
function reqEnv(name: string): pulumi.Output<string> {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing required env var ${name}. Set it as a GitHub Actions repo secret ` +
        `and map it in .github/workflows/deploy.yml.`,
    );
  }
  return pulumi.secret(v);
}
function optEnv(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

const supabaseDbPassword = reqEnv("SUPABASE_DB_PASSWORD");
const anthropicApiKey = reqEnv("ANTHROPIC_API_KEY");

// Pass-2 secret — empty on the first run (API uses dev-auth fallback until set).
const supabaseJwtSecret = optEnv("SUPABASE_JWT_SECRET");

// Optional integrations — forwarded only when present.
const cronSecret = optEnv("CRON_SECRET");
const tavilyApiKey = optEnv("TAVILY_API_KEY");
const langsmithApiKey = optEnv("LANGSMITH_API_KEY");
const paddleApiKey = optEnv("PADDLE_API_KEY");
const paddleWebhookSecret = optEnv("PADDLE_WEBHOOK_SECRET");
const paddleEnvironment = optEnv("PADDLE_ENVIRONMENT", "sandbox");
const paddlePricePro = optEnv("PADDLE_PRICE_PRO");
// Annual prices are separate Paddle price IDs, not a modifier on the monthly one —
// the adapter keys its price map on "<plan>:<cycle>", so a missing yearly ID makes
// every annual checkout/plan-change 503 rather than falling back to monthly.
const paddlePriceProYearly = optEnv("PADDLE_PRICE_PRO_YEARLY");
// Credit top-ups are one-time Paddle transactions, not subscription add-ons —
// _change_body sends `items` as the complete list, so an add-on item would be
// deleted by the next plan change.
const paddlePriceCredits10k = optEnv("PADDLE_PRICE_CREDITS_10K");
const paddlePriceCredits25k = optEnv("PADDLE_PRICE_CREDITS_25K");
const paddlePriceCredits60k = optEnv("PADDLE_PRICE_CREDITS_60K");

// RevenueCat — the iOS half of buying credits. Paddle's external checkout is
// US-only, so Sri Lankan users must go through StoreKit. The product ids are
// public (they ship in the app bundle); only the webhook signing secret is a
// credential. Without that secret the webhook route stays disabled outright
// rather than accepting unsigned deliveries.
const revenuecatWebhookSecret = optEnv("REVENUECAT_WEBHOOK_SECRET");
const revenuecatProductCredits10k = optEnv("REVENUECAT_PRODUCT_CREDITS_10K");
const revenuecatProductCredits25k = optEnv("REVENUECAT_PRODUCT_CREDITS_25K");
const revenuecatProductCredits60k = optEnv("REVENUECAT_PRODUCT_CREDITS_60K");

// ─────────────────────────────────────────────────────────────────────────────
// Providers (auth via env: SUPABASE_ACCESS_TOKEN, VERCEL_API_TOKEN, RENDER_API_KEY)
// ─────────────────────────────────────────────────────────────────────────────
const sbProvider = new supabase.Provider("supabase", {
  accessToken: reqEnv("SUPABASE_ACCESS_TOKEN"),
});
const vercelProvider = new vercel.Provider("vercel", {
  apiToken: reqEnv("VERCEL_API_TOKEN"),
  team: new pulumi.Config("vercel").get("team"),
});
const renderProvider = new render.Provider("render", {
  apiKey: reqEnv("RENDER_API_KEY"),
  ownerId: renderOwnerId,
});

// ─────────────────────────────────────────────────────────────────────────────
// Supabase — project (+ legacy JWT keys the backend verifies against)
// ─────────────────────────────────────────────────────────────────────────────
const project = new supabase.Project(
  "salli",
  {
    name: `salli-${stack}`,
    organizationId: supabaseOrgId,
    databasePassword: supabaseDbPassword,
    region: supabaseRegion,
    // NOTE: legacy anon/service-role JWT keys are enabled by default; explicitly
    // setting `legacyApiKeysEnabled: true` errors ("already enabled"), so we omit it.
  },
  { provider: sbProvider },
);

const projectRef = project.id;
const supabaseUrl = pulumi.interpolate`https://${projectRef}.supabase.co`;

// anon + service-role keys (data source keyed on the project ref)
const apiKeys = supabase.getApikeysOutput(
  { projectRef },
  { provider: sbProvider },
);
const supabaseAnonKey = pulumi.secret(apiKeys.anonKey);
const supabaseServiceKey = pulumi.secret(apiKeys.serviceRoleKey);

// Session-mode pooler URL — IPv4 + prepared-statement-safe, right for a
// long-running server and for running Alembic migrations at container start.
const databaseUrl = pulumi.secret(
  pulumi.interpolate`postgresql+asyncpg://postgres.${projectRef}:${supabaseDbPassword}@${poolerHost}:5432/postgres`,
);

// ─────────────────────────────────────────────────────────────────────────────
// Public URLs (used to cross-wire CORS + client env)
// ─────────────────────────────────────────────────────────────────────────────
// Vercel assigns `<name>-<account-slug>.vercel.app`, which we can't derive from
// the name alone — so allow an explicit full-URL override in config. Falls back
// to a custom domain, then the (best-guess) default host.
const appUrl = cfg.get("appUrl") || (appDomain ? `https://${appDomain}` : `https://${webName}.vercel.app`);
const siteUrl = cfg.get("siteUrl") || (siteDomain ? `https://${siteDomain}` : `https://${siteName}.vercel.app`);
const apiUrl = cfg.get("apiUrl") || (apiDomain ? `https://${apiDomain}` : `https://${apiName}.onrender.com`);

// config.py parses ALLOWED_ORIGINS as a JSON list. Include the vercel.app
// defaults and any custom domains so it works before and after DNS.
const allowedOrigins = JSON.stringify([
  ...new Set([appUrl, siteUrl, `https://${webName}.vercel.app`, `https://${siteName}.vercel.app`]),
]);

// Supabase Auth URL config — without this, OAuth logins redirect to the default
// http://localhost:3000. site_url is where auth redirects land; uri_allow_list
// whitelists the redirect targets (wildcards allowed).
new supabase.Settings(
  "salli-auth",
  {
    projectRef: project.id,
    auth: JSON.stringify({
      site_url: appUrl,
      uri_allow_list: [
        appUrl,
        `${appUrl}/**`,
        "http://localhost:3000/**",
        "http://localhost:3002/**",
      ].join(","),
    }),
  },
  { provider: sbProvider, dependsOn: [project] },
);

// ─────────────────────────────────────────────────────────────────────────────
// Render — FastAPI backend (Docker; migrations run via the Dockerfile CMD)
// ─────────────────────────────────────────────────────────────────────────────
const apiEnv: Record<string, pulumi.Input<string>> = {
  ENVIRONMENT: "production",
  LOG_LEVEL: "INFO",
  BASE_CURRENCY: "LKR",
  DATABASE_URL: databaseUrl,
  ANTHROPIC_API_KEY: anthropicApiKey,
  SUPABASE_URL: supabaseUrl,
  SUPABASE_ANON_KEY: supabaseAnonKey,
  SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey,
  ALLOWED_ORIGINS: allowedOrigins,
  ADVISOR_API_BASE_URL: apiUrl,
  // MCP: mcp_public_base_url is this API's own public URL (the MCP resource
  // and OAuth issuer), app_base_url is where the consent screen lives.
  MCP_PUBLIC_BASE_URL: apiUrl,
  APP_BASE_URL: appUrl,
  PADDLE_ENVIRONMENT: paddleEnvironment,
};
if (supabaseJwtSecret) apiEnv.SUPABASE_JWT_SECRET = pulumi.secret(supabaseJwtSecret);
if (cronSecret) apiEnv.CRON_SECRET = pulumi.secret(cronSecret);
if (tavilyApiKey) apiEnv.TAVILY_API_KEY = pulumi.secret(tavilyApiKey);
if (langsmithApiKey) apiEnv.LANGSMITH_API_KEY = pulumi.secret(langsmithApiKey);
if (paddleApiKey) apiEnv.PADDLE_API_KEY = pulumi.secret(paddleApiKey);
if (paddleWebhookSecret) apiEnv.PADDLE_WEBHOOK_SECRET = pulumi.secret(paddleWebhookSecret);
if (paddlePricePro) apiEnv.PADDLE_PRICE_PRO = paddlePricePro;
if (paddlePriceProYearly) apiEnv.PADDLE_PRICE_PRO_YEARLY = paddlePriceProYearly;
if (paddlePriceCredits10k) apiEnv.PADDLE_PRICE_CREDITS_10K = paddlePriceCredits10k;
if (paddlePriceCredits25k) apiEnv.PADDLE_PRICE_CREDITS_25K = paddlePriceCredits25k;
if (paddlePriceCredits60k) apiEnv.PADDLE_PRICE_CREDITS_60K = paddlePriceCredits60k;
if (revenuecatWebhookSecret)
  apiEnv.REVENUECAT_WEBHOOK_SECRET = pulumi.secret(revenuecatWebhookSecret);
if (revenuecatProductCredits10k)
  apiEnv.REVENUECAT_PRODUCT_CREDITS_10K = revenuecatProductCredits10k;
if (revenuecatProductCredits25k)
  apiEnv.REVENUECAT_PRODUCT_CREDITS_25K = revenuecatProductCredits25k;
if (revenuecatProductCredits60k)
  apiEnv.REVENUECAT_PRODUCT_CREDITS_60K = revenuecatProductCredits60k;

const apiEnvVars = pulumi
  .output(apiEnv)
  .apply((e) => Object.fromEntries(Object.entries(e).map(([k, v]) => [k, { value: v }])));

const api = new render.WebService(
  apiName,
  {
    name: apiName,
    plan: renderPlan, // "starter" recommended; "free" sleeps (see DEPLOY.md)
    region: renderRegion,
    runtimeSource: {
      docker: {
        repoUrl: `https://github.com/${githubRepo}`,
        branch,
        dockerfilePath: "./Dockerfile.api",
        context: ".",
        autoDeploy: true,
      },
    },
    healthCheckPath: "/healthz",
    envVars: apiEnvVars,
  },
  {
    provider: renderProvider,
    dependsOn: [project],
    // Free-tier services can't be updated via this provider — any update sends a
    // `maintenance_mode` field the API rejects ("only for non-free tier"). So we
    // ignore the mutable bits and manage them out-of-band (Render API/dashboard)
    // while on free. On a paid plan, drop this to let Pulumi manage env directly.
    ignoreChanges: ["envVars", "maintenanceMode"],
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Vercel — web app + marketing site (build on git push; monorepo-aware)
// ─────────────────────────────────────────────────────────────────────────────
function vercelEnv(
  name: string,
  projectId: pulumi.Input<string>,
  key: string,
  value: pulumi.Input<string>,
  sensitive = false,
) {
  return new vercel.ProjectEnvironmentVariable(
    name,
    { projectId, key, value, targets: ["production", "preview", "development"], sensitive },
    { provider: vercelProvider },
  );
}

// Marketing site (clients/site → salli.leafmonkey.org)
const site = new vercel.Project(
  siteName,
  {
    name: siteName,
    framework: "nextjs",
    rootDirectory: "clients/site",
    gitRepository: { type: "github", repo: githubRepo, productionBranch: branch },
  },
  { provider: vercelProvider },
);
vercelEnv("site-app-url", site.id, "NEXT_PUBLIC_APP_URL", appUrl);

// SaaS web app (clients/web → salli-web.vercel.app)
const web = new vercel.Project(
  webName,
  {
    name: webName,
    framework: "nextjs",
    rootDirectory: "clients/web",
    gitRepository: { type: "github", repo: githubRepo, productionBranch: branch },
  },
  { provider: vercelProvider },
);
vercelEnv("web-api-url", web.id, "NEXT_PUBLIC_API_URL", apiUrl);
vercelEnv("web-app-url", web.id, "NEXT_PUBLIC_APP_URL", appUrl);
vercelEnv("web-site-url", web.id, "NEXT_PUBLIC_SITE_URL", siteUrl);
vercelEnv("web-supabase-url", web.id, "NEXT_PUBLIC_SUPABASE_URL", supabaseUrl);
// The anon key is a public client key (ships in the browser bundle), and Vercel
// forbids a `sensitive` var from targeting `development`, so keep it non-sensitive.
vercelEnv("web-supabase-anon", web.id, "NEXT_PUBLIC_SUPABASE_ANON_KEY", supabaseAnonKey);

// ─────────────────────────────────────────────────────────────────────────────
// Outputs
// ─────────────────────────────────────────────────────────────────────────────
export const supabaseProjectRef = projectRef;
// Exported so the advisor-cron setup workflow can build a psql connection
// without hardcoding a host that would drift from `supabaseRegion`.
export const supabasePoolerHostOut = poolerHost;
export const supabaseApiUrl = supabaseUrl;
export const renderApiUrl = apiUrl;
export const renderServiceId = api.id;
export const vercelWebProjectId = web.id;
export const vercelSiteProjectId = site.id;
export const appUrlOut = appUrl;
export const siteUrlOut = siteUrl;
