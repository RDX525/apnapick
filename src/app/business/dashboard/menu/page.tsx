import { buildPageMetadata } from "@/lib/seo/metadata";
import { MenuManagerPage } from "@/features/dashboard/menu-manager";

export const metadata = buildPageMetadata({
  title: "Menu · Dashboard",
  description: "Manage business menu",
  path: "/business/dashboard/menu",
  noIndex: true,
});

export default function Page() {
  return <MenuManagerPage />;
}
