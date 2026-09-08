import { buildPageMetadata } from "@/lib/seo/metadata";
import { ReviewsManagerPage } from "@/features/dashboard/reviews-manager";

export const metadata = buildPageMetadata({
  title: "Reviews · Dashboard",
  description: "Manage business reviews",
  path: "/business/dashboard/reviews",
  noIndex: true,
});

export default function Page() {
  return <ReviewsManagerPage />;
}
