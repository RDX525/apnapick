import { buildPageMetadata } from "@/lib/seo/metadata";
import { OffersManagerPage } from "@/features/dashboard/offers-manager";

export const metadata = buildPageMetadata({
  title: "Offers · Dashboard",
  description: "Manage business offers",
  path: "/business/dashboard/offers",
  noIndex: true,
});

export default function Page() {
  return <OffersManagerPage />;
}
