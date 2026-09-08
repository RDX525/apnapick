import { buildPageMetadata } from "@/lib/seo/metadata";
import { AdminClaimsPage } from "@/features/admin/admin-claims-page";

export const metadata = buildPageMetadata({
  title: "Admin · Claims",
  description: "Claim management",
  path: "/admin/claims",
  noIndex: true,
});

export default function Page() {
  return <AdminClaimsPage />;
}
