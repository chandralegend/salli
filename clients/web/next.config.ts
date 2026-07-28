import type { NextConfig } from "next";

// Deployed on Vercel (project: salli-web). Auto-deploys on push to main.
const nextConfig: NextConfig = {
  output: "standalone",
  // Vercel injects VERCEL_GIT_COMMIT_SHA at build time, but it is server-only.
  // Re-exporting it under a NEXT_PUBLIC_ name stamps every bug report with the
  // exact build, which is what makes a minified production stack trace
  // resolvable against that deploy's sourcemaps. "dev" marks a local build
  // unambiguously.
  env: {
    NEXT_PUBLIC_COMMIT_SHA: (process.env.VERCEL_GIT_COMMIT_SHA ?? "dev").slice(0, 12),
  },
  // Paddle refuses localhost as a default payment link, so sandbox checkout is
  // tested through an ngrok tunnel. Next blocks dev requests from origins other
  // than localhost unless they are listed here. Hosts only, no scheme — set
  // DEV_TUNNEL_HOSTS in .env.local (comma-separated for more than one).
  allowedDevOrigins: (process.env.DEV_TUNNEL_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
    .filter(Boolean),
  // Over the tunnel the page is https while the API is plain http on :8000, and
  // the browser blocks that as mixed content. Proxying /api through Next keeps
  // every request same-origin. Dev only — in production NEXT_PUBLIC_API_URL
  // points at the deployed API and nothing should reach localhost.
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    const target = (process.env.API_PROXY_TARGET ?? "http://localhost:8000").replace(/\/$/, "");
    return [{ source: "/api/:path*", destination: `${target}/:path*` }];
  },
};

export default nextConfig;
