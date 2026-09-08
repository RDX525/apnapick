import { buildPageMetadata } from "@/lib/seo/metadata";
import { CatalogManagerPage } from "@/features/dashboard/catalog-manager";

export const metadata = buildPageMetadata({
  title: "Products · Dashboard",
  description: "Manage business products",
  path: "/business/dashboard/products",
  noIndex: true,
});

export default function Page() {
  return <CatalogManagerPage kind="product" />;
}
