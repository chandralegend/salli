import type { NextConfig } from "next";

// Static single-page marketing site → exported to plain HTML/CSS, served at
// salli.leafmonkey.org. The app lives separately at app.salli.leafmonkey.org.
// Deployed on Vercel (project: salli-site). Auto-deploys on push to main.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
