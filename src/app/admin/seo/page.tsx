import { buildPageMetadata } from "@/lib/seo/metadata";
import { AdminSeoPage } from "@/features/admin/admin-seo-page";

export const metadata = buildPageMetadata({
  title: "Admin · SEO",
  description: "SEO controls",
  path: "/admin/seo",
  noIndex: true,
});

export default function Page() {
  return <AdminSeoPage />;
}
