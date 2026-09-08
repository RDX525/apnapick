import type { MetadataRoute } from "next";
import { getPublicEnv } from "@/config/env";

/**
 * Crawl policy:
 * - Allow public discovery surfaces
 * - Disallow private dashboards, admin, onboarding, auth, APIs
 * - Search is noindex via metadata; also disallowed here to reduce crawl waste
 * - Sitemap index via generateSitemaps buckets
 */
export default function robots(): MetadataRoute.Robots {
  const { NEXT_PUBLIC_APP_URL: base } = getPublicEnv();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/business/dashboard",
          "/business/dashboard/",
          "/business/onboarding",
          "/business/onboarding/",
          "/api/",
          "/login",
          "/signup",
          "/search",
          "/search?",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
