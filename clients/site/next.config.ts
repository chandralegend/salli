import type { NextConfig } from "next";

// Static single-page marketing site → exported to plain HTML/CSS for the root
// domain (salli.lk). The app lives separately at app.salli.lk.
// Deployed on Vercel (project: salli-site) — auto-deploy on push to main.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
