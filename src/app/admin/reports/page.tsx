import { buildPageMetadata } from "@/lib/seo/metadata";
import { AdminReportsPage } from "@/features/admin/admin-reports-page";

export const metadata = buildPageMetadata({
  title: "Admin · Reports",
  description: "Trust & safety reports",
  path: "/admin/reports",
  noIndex: true,
});

export default function Page() {
  return <AdminReportsPage />;
}
