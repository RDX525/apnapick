import { buildPageMetadata } from "@/lib/seo/metadata";
import { SettingsPage } from "@/features/dashboard/settings-page";

export const metadata = buildPageMetadata({
  title: "Settings · Dashboard",
  description: "Manage business settings",
  path: "/business/dashboard/settings",
  noIndex: true,
});

export default function Page() {
  return <SettingsPage />;
}
