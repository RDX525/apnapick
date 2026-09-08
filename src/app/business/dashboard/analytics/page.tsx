import { buildPageMetadata } from "@/lib/seo/metadata";
import { AnalyticsPage } from "@/features/dashboard/analytics-page";

export const metadata = buildPageMetadata({
  title: "Analytics · Dashboard",
  description: "Manage business analytics",
  path: "/business/dashboard/analytics",
  noIndex: true,
});

export default function Page() {
  return <AnalyticsPage />;
}
