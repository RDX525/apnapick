import { buildPageMetadata } from "@/lib/seo/metadata";
import { AdminCategoriesPage } from "@/features/admin/admin-categories-page";

export const metadata = buildPageMetadata({
  title: "Admin · Categories",
  description: "Category management",
  path: "/admin/categories",
  noIndex: true,
});

export default function Page() {
  return <AdminCategoriesPage />;
}
