import { buildPageMetadata } from "@/lib/seo/metadata";
import { AdminDashboardHome } from "@/features/admin/admin-dashboard-home";

export const metadata = buildPageMetadata({
  title: "Admin",
  description: "ApnaPick operations console",
  path: "/admin",
  noIndex: true,
});

export default function AdminPage() {
  return <AdminDashboardHome />;
}
