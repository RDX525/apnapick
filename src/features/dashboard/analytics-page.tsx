"use client";

import { useDashboard } from "@/features/dashboard/dashboard-provider";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

export function AnalyticsPage() {
  const { workspace } = useDashboard();
  const m = workspace.metrics;
  const rows = [
    ["Profile views", m.profileViews],
    ["Search appearances", m.searchAppearances],
    ["Result clicks", m.clicks],
    ["Calls", m.calls],
    ["Website visits", m.websiteVisits],
    ["Directions", m.directions],
    ["Enquiries", m.enquiries],
    ["Saves", m.saves],
    ["Reviews", m.reviews],
  ] as const;

  const max = Math.max(...rows.map(([, v]) => v), 1);

  return (
    <DashboardShell
      activePath="/business/dashboard/analytics"
      title="Analytics"
      description={`${m.periodLabel} performance for ${workspace.profile.name}.`}
    >
      <div className="border-border/70 bg-card rounded-2xl border p-6">
        <p className="text-muted-foreground text-sm">
          Live metrics load from `business_metrics_daily` when Supabase is connected. Demo
          figures shown for local development.
        </p>
        <ul className="mt-6 space-y-4">
          {rows.map(([label, value]) => (
            <li key={label}>
              <div className="mb-1.5 flex justify-between text-sm">
                <span>{label}</span>
                <span className="font-medium">{value.toLocaleString("en-IN")}</span>
              </div>
              <div className="bg-secondary h-2 overflow-hidden rounded-full">
                <div
                  className="bg-sea h-full rounded-full"
                  style={{ width: `${Math.round((value / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </DashboardShell>
  );
}
