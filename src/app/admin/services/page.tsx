import { buildPageMetadata } from "@/lib/seo/metadata";
import { AdminContentPage } from "@/features/admin/admin-content-page";

export const metadata = buildPageMetadata({
  title: "Admin · Services",
  description: "Service moderation",
  path: "/admin/services",
  noIndex: true,
});

export default function Page() {
  return <AdminContentPage kind="service" title="Services" />;
}
