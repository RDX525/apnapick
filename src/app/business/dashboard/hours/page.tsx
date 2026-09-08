import { buildPageMetadata } from "@/lib/seo/metadata";
import { HoursManagerPage } from "@/features/dashboard/hours-manager";

export const metadata = buildPageMetadata({
  title: "Hours · Dashboard",
  description: "Manage business hours",
  path: "/business/dashboard/hours",
  noIndex: true,
});

export default function Page() {
  return <HoursManagerPage />;
}
