import { buildPageMetadata } from "@/lib/seo/metadata";
import { AdminPaymentsPage } from "@/features/admin/admin-payments-page";

export const metadata = buildPageMetadata({
  title: "Admin · Payments",
  description: "Payments",
  path: "/admin/payments",
  noIndex: true,
});

export default function Page() {
  return <AdminPaymentsPage />;
}
