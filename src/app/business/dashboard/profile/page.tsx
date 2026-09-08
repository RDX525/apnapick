import { buildPageMetadata } from "@/lib/seo/metadata";
import { ProfileManagerPage } from "@/features/dashboard/profile-manager";

export const metadata = buildPageMetadata({
  title: "Profile · Dashboard",
  description: "Manage business profile",
  path: "/business/dashboard/profile",
  noIndex: true,
});

export default function Page() {
  return <ProfileManagerPage />;
}
