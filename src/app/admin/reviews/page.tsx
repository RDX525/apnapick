import { buildPageMetadata } from "@/lib/seo/metadata";
import { AdminReviewsPage } from "@/features/admin/admin-reviews-page";

export const metadata = buildPageMetadata({
  title: "Admin · Reviews",
  description: "Review moderation queue",
  path: "/admin/reviews",
  noIndex: true,
});

export default function Page() {
  return <AdminReviewsPage />;
}
