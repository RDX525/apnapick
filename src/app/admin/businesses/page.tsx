import { buildPageMetadata } from "@/lib/seo/metadata";
import { AdminBusinessesPage } from "@/features/admin/admin-businesses-page";

export const metadata = buildPageMetadata({
  title: "Admin · Businesses",
  description: "Business moderation",
  path: "/admin/businesses",
  noIndex: true,
});

export default function Page() {
  return <AdminBusinessesPage />;
}
