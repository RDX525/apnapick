import { buildPageMetadata } from "@/lib/seo/metadata";
import { AdminSubscriptionsPage } from "@/features/admin/admin-subscriptions-page";

export const metadata = buildPageMetadata({
  title: "Admin · Subscriptions",
  description: "Subscriptions",
  path: "/admin/subscriptions",
  noIndex: true,
});

export default function Page() {
  return <AdminSubscriptionsPage />;
}
