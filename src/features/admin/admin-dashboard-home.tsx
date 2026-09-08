"use client";

import Link from "next/link";
import { AdminShell } from "@/features/admin/admin-shell";
import { useAdmin } from "@/features/admin/admin-provider";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/states/empty-state";
import { StatusBadge } from "@/components/operations/status-badge";

export function AdminDashboardHome() {
  const { workspace } = useAdmin();
  const openClaims = workspace.claims.filter((c) =>
    ["PENDING", "UNDER_REVIEW"].includes(c.status),
  ).length;
  const pendingBiz = workspace.businesses.filter((b) =>
    ["PENDING_REVIEW", "DRAFT"].includes(b.status),
  ).length;
  const openReports = workspace.reports.filter((r) => r.status === "OPEN").length;
  const flagged = workspace.content.filter((c) => c.status === "flagged").length;

  const cards = [
    ["Open claims", openClaims, "/admin/claims"],
    ["Businesses to review", pendingBiz, "/admin/businesses"],
    ["Open reports", openReports, "/admin/reports"],
    ["Flagged content", flagged, "/admin/products"],
  ] as const;

  return (
    <AdminShell
      activePath="/admin"
      title="Dashboard"
      description="Moderate claims, listings, users, and trust & safety queues."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value, href]) => (
          <Link
            key={label}
            href={href}
            className="border-border/70 bg-card hover:border-sea/40 rounded-2xl border p-5 transition"
          >
            <p className="text-muted-foreground text-sm">{label}</p>
            <p className="font-display text-ink mt-2 text-3xl">{value}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="border-border/70 bg-card rounded-2xl border p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-medium">Claims queue</h2>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/claims">Open</Link>
            </Button>
          </div>
          <ul className="mt-4 space-y-3">
            {workspace.claims.length === 0 ? (
              <li>
                <EmptyState
                  compact
                  title="Claims queue is clear"
                  description="New ownership claims will appear here."
                />
              </li>
            ) : null}
            {workspace.claims.slice(0, 4).map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {c.businessName}
                  <span className="text-muted-foreground"> · {c.claimantName}</span>
                </span>
                <StatusBadge status={c.status} />
              </li>
            ))}
          </ul>
        </section>

        <section className="border-border/70 bg-card rounded-2xl border p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-medium">Recent audit</h2>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/audit-logs">All logs</Link>
            </Button>
          </div>
          <ul className="mt-4 space-y-3">
            {workspace.auditLogs.length === 0 ? (
              <li>
                <EmptyState
                  compact
                  title="No audit activity"
                  description="Admin actions will appear here."
                />
              </li>
            ) : null}
            {workspace.auditLogs.slice(0, 5).map((log) => (
              <li key={log.id} className="text-sm">
                <span className="font-medium">{log.action}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {log.actorEmail ?? "system"} ·{" "}
                  {new Date(log.createdAt).toLocaleString("en-IN")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}
