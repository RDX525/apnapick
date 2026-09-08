import { buildPageMetadata } from "@/lib/seo/metadata";
import { AdminUsersPage } from "@/features/admin/admin-users-page";

export const metadata = buildPageMetadata({
  title: "Admin · Users",
  description: "User management",
  path: "/admin/users",
  noIndex: true,
});

export default function Page() {
  return <AdminUsersPage />;
}
