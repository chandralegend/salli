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
};

export default nextConfig;
