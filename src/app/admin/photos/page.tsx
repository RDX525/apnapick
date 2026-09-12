import { buildPageMetadata } from "@/lib/seo/metadata";
import { AdminContentPage } from "@/features/admin/admin-content-page";

export const metadata = buildPageMetadata({
  title: "Admin · Photos",
  description: "Photo moderation",
  path: "/admin/photos",
  noIndex: true,
});

export default function Page() {
  return <AdminContentPage kind="photo" title="Photos" />;
}
