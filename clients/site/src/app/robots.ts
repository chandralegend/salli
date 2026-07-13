import type { MetadataRoute } from "next";

// Required for `output: "export"` — these route handlers can't use dynamic data.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://salli.leafmonkey.org/sitemap.xml",
  };
}
