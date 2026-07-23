import type { NextConfig } from "next";

// Static single-page marketing site → exported to plain HTML/CSS, served at
// salli.leafmonkey.org. The app lives separately at app.salli.leafmonkey.org.
// Deployed on Vercel (project: salli-site). Auto-deploys on push to main.
//
// `output: "export"` only applies to the actual production build (see the
// NEXT_OUTPUT_EXPORT=1 in package.json's `build` script) — `next dev` doesn't
// set it. Next 16 validates every route against `output: "export"`'s
// constraints in BOTH dev and build, and the Keystatic admin UI's writable,
// dynamic catch-all routes (/keystatic, /api/keystatic/*) can't satisfy that
// (no generateStaticParams/dynamicParams combo works for a writable route).
// So: dev runs as a normal dynamic server, where those routes just work; the
// production build instead moves them out of the tree entirely before
// building (scripts/strip-keystatic-admin.mjs) — they're dev-only by design.
const nextConfig: NextConfig = {
  ...(process.env.NEXT_OUTPUT_EXPORT === "1" ? { output: "export" as const } : {}),
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
