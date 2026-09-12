import { buildPageMetadata } from "@/lib/seo/metadata";
import { AdminContentPage } from "@/features/admin/admin-content-page";

export const metadata = buildPageMetadata({
  title: "Admin · Products",
  description: "Product moderation",
  path: "/admin/products",
  noIndex: true,
});

export default function Page() {
  return <AdminContentPage kind="product" title="Products" />;
}
