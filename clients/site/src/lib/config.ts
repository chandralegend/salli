// The Next.js web app (dashboard, ledger, tax engine) is served separately
// from this marketing site. See next.config.ts for the split-deploy notes.
// Set NEXT_PUBLIC_APP_URL in .env.local to point at a locally running app
// (clients/web runs on :3003). Inlined at build time, so the production
// export falls back to the deployed app when the var is unset.
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://app.salli.leafmonkey.org";
export const APP_LOGIN_URL = `${APP_URL}/login`;

// This site's own canonical origin — the one that goes into sitemap.xml,
// robots.txt, metadataBase and JSON-LD. Absolute and no trailing slash, because
// crawlers need fully-qualified URLs. Override with NEXT_PUBLIC_SITE_URL to
// point a preview deploy at itself; unset falls back to production.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://salli.leafmonkey.org"
).replace(/\/$/, "");
