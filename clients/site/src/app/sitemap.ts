import type { MetadataRoute } from "next";

// Required for `output: "export"` — these route handlers can't use dynamic data.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const buildDate = new Date();
  const routes = ["", "/privacy", "/terms", "/security", "/cookies"];
  return routes.map((route) => ({
    url: `https://salli.lk${route}`,
    lastModified: buildDate,
    changeFrequency: route === "" ? "weekly" : "yearly",
    priority: route === "" ? 1 : 0.3,
  }));
}
