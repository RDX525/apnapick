import type { MetadataRoute } from "next";
import {
  SITEMAP_BUCKETS,
  buildSitemapBucket,
  type SitemapBucket,
} from "@/services/seo/sitemap-service";

// Sitemap inventory comes from live Supabase data; do not make deployments
// depend on database/network availability during static generation.
export const dynamic = "force-dynamic";

/**
 * Split sitemaps: /sitemap/core.xml, /sitemap/hubs.xml, /sitemap/businesses.xml
 * (Next.js generateSitemaps → /sitemap/[id].xml)
 */
export async function generateSitemaps() {
  return SITEMAP_BUCKETS.map((id) => ({ id }));
}

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const id = (await props.id) as SitemapBucket;
  if (!SITEMAP_BUCKETS.includes(id)) return [];
  return buildSitemapBucket(id);
}
