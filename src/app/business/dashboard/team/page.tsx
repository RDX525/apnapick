import { buildPageMetadata } from "@/lib/seo/metadata";
import { TeamManagerPage } from "@/features/dashboard/team-manager";

export const metadata = buildPageMetadata({
  title: "Team · Dashboard",
  description: "Manage business team",
  path: "/business/dashboard/team",
  noIndex: true,
});

export default function Page() {
  return <TeamManagerPage />;
}
