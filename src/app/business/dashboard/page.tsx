import { buildPageMetadata } from "@/lib/seo/metadata";
import { DashboardOverview } from "@/features/dashboard/dashboard-overview";

export const metadata = buildPageMetadata({
  title: "Business dashboard",
  description: "Manage your ApnaPick business",
  path: "/business/dashboard",
  noIndex: true,
});

type Props = { searchParams: Promise<{ submitted?: string }> };

export default async function BusinessDashboardPage({ searchParams }: Props) {
  const params = await searchParams;
  return <DashboardOverview submitted={params.submitted === "1"} />;
}
