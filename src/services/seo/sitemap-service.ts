import type { MetadataRoute } from "next";
import { getPublicEnv } from "@/config/env";
import {
  listIndexableSeoPagesFromDb,
  listPublishedBusinessSlugsForSitemap,
} from "@/repositories/seo/seo-repository";
import { listIndexableSeoPaths } from "@/services/seo/hub-service";
import { SEO_DENSITY } from "@/config/seo-density";
import { listPublishedBusinesses } from "@/repositories/consumer/business-repository";
import { DEFAULT_AREAS } from "@/config/consumer-content";

export type SitemapBucket = "core" | "hubs" | "businesses";

export const SITEMAP_BUCKETS: SitemapBucket[] = ["core", "hubs", "businesses"];

function abs(base: string, path: string) {
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Dynamic sitemap architecture:
 * - core: home + density-qualified area hubs
 * - hubs: programmatic category/area/facet pages that meet density (or seo_pages registry)
 * - businesses: published profiles only
 *
 * Never emits thin facet URLs.
 */
export async function buildSitemapBucket(
  bucket: SitemapBucket,
): Promise<MetadataRoute.Sitemap> {
  const { NEXT_PUBLIC_APP_URL: base } = getPublicEnv();
  const now = new Date();

  if (bucket === "core") {
    const entries: MetadataRoute.Sitemap = [
      {
        url: abs(base, "/"),
        lastModified: now,
        changeFrequency: "daily",
        priority: 1,
      },
    ];

    const { items } = await listPublishedBusinesses(500);
    for (const area of [{ slug: "pune", name: "Pune" }, ...DEFAULT_AREAS]) {
      const count =
        area.slug === "pune"
          ? items.length
          : items.filter((b) => {
              const suburb = b.suburb?.toLowerCase().replace(/\s+/g, "-");
              return suburb === area.slug;
            }).length;
      if (count < SEO_DENSITY.area) continue;
      entries.push({
        url: abs(base, `/areas/${area.slug}`),
        lastModified: now,
        changeFrequency: "weekly",
        priority: area.slug === "pune" ? 0.75 : 0.7,
      });
    }
    return entries;
  }

  if (bucket === "hubs") {
    const computed = await listIndexableSeoPaths();
    const fromDb = await listIndexableSeoPagesFromDb();
    const paths = new Map<string, { priority: number; lastModified: Date }>();

    for (const row of computed) {
      paths.set(row.path, { priority: row.priority, lastModified: now });
    }
    for (const row of fromDb) {
      const path = row.canonicalPath || row.path;
      if (!paths.has(path)) {
        paths.set(path, {
          priority: 0.8,
          lastModified: row.updatedAt ? new Date(row.updatedAt) : now,
        });
      }
    }

    return [...paths.entries()].map(([path, meta]) => ({
      url: abs(base, path),
      lastModified: meta.lastModified,
      changeFrequency: "daily" as const,
      priority: meta.priority,
    }));
  }

  // businesses
  const businesses = await listPublishedBusinessSlugsForSitemap();
  return businesses.map((b) => ({
    url: abs(base, `/b/${b.slug}`),
    lastModified: b.updatedAt ? new Date(b.updatedAt) : now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
}
