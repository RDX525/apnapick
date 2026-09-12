import { buildPageMetadata } from "@/lib/seo/metadata";
import { AdminContentPage } from "@/features/admin/admin-content-page";

export const metadata = buildPageMetadata({
  title: "Admin · Descriptions",
  description: "Description moderation",
  path: "/admin/descriptions",
  noIndex: true,
});

export default function Page() {
  return <AdminContentPage kind="description" title="Descriptions" />;
}
