import { buildPageMetadata } from "@/lib/seo/metadata";
import { AdminSearchAnalyticsPage } from "@/features/admin/admin-search-analytics-page";

export const metadata = buildPageMetadata({
  title: "Admin · Search Analytics",
  description: "Search analytics",
  path: "/admin/search-analytics",
  noIndex: true,
});

export default function Page() {
  return <AdminSearchAnalyticsPage />;
}
