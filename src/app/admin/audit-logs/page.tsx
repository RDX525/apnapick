import { buildPageMetadata } from "@/lib/seo/metadata";
import { AdminAuditLogsPage } from "@/features/admin/admin-audit-logs-page";

export const metadata = buildPageMetadata({
  title: "Admin · Audit Logs",
  description: "Audit logs",
  path: "/admin/audit-logs",
  noIndex: true,
});

export default function Page() {
  return <AdminAuditLogsPage />;
}
