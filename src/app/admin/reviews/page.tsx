import { buildPageMetadata } from "@/lib/seo/metadata";
import { AdminContentPage } from "@/features/admin/admin-content-page";

export const metadata = buildPageMetadata({
  title: "Admin · Reviews",
  description: "Review moderation",
  path: "/admin/reviews",
  noIndex: true,
});

export default function Page() {
  return <AdminContentPage kind="review" title="Reviews" />;
}
