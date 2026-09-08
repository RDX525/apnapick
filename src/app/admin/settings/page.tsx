import { buildPageMetadata } from "@/lib/seo/metadata";
import { AdminSettingsPage } from "@/features/admin/admin-settings-page";

export const metadata = buildPageMetadata({
  title: "Admin · Settings",
  description: "Admin settings",
  path: "/admin/settings",
  noIndex: true,
});

export default function Page() {
  return <AdminSettingsPage />;
}
