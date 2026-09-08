import { buildPageMetadata } from "@/lib/seo/metadata";
import { CatalogManagerPage } from "@/features/dashboard/catalog-manager";

export const metadata = buildPageMetadata({
  title: "Services · Dashboard",
  description: "Manage business services",
  path: "/business/dashboard/services",
  noIndex: true,
});

export default function Page() {
  return <CatalogManagerPage kind="service" />;
}
