import { buildPageMetadata } from "@/lib/seo/metadata";
import { LeadsManagerPage } from "@/features/dashboard/leads-manager";

export const metadata = buildPageMetadata({
  title: "Leads · Dashboard",
  description: "Manage business leads",
  path: "/business/dashboard/leads",
  noIndex: true,
});

export default function Page() {
  return <LeadsManagerPage />;
}
