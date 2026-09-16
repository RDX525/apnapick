"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/states/empty-state";
import { StatusBadge } from "@/components/operations/status-badge";
import { useDashboard } from "@/features/dashboard/dashboard-provider";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

export function LeadsManagerPage() {
  const { workspace, update } = useDashboard();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function markRead(leadId: string) {
    setPendingId(leadId);
    update((w) => ({
      ...w,
      leads: w.leads.map((l) =>
        l.id === leadId ? { ...l, status: "READ" as const } : l,
      ),
    }));
    try {
      const response = await fetch(`/api/business/leads/${leadId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "READ" }),
      });
      if (!response.ok) {
        update((w) => ({
          ...w,
          leads: w.leads.map((l) =>
            l.id === leadId ? { ...l, status: "NEW" as const } : l,
          ),
        }));
      }
    } catch {
      update((w) => ({
        ...w,
        leads: w.leads.map((l) =>
          l.id === leadId ? { ...l, status: "NEW" as const } : l,
        ),
      }));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <DashboardShell
      activePath="/business/dashboard/leads"
      title="Leads"
      description="Enquiries, calls, and direction intents from ApnaPick."
    >
      <ul className="space-y-3">
        {workspace.leads.length === 0 ? (
          <li>
            <EmptyState
              compact
              title="No leads yet"
              description="Customer enquiries, calls, and direction requests will appear here."
            />
          </li>
        ) : null}
        {workspace.leads.map((lead) => (
          <li
            key={lead.id}
            className="border-border/70 bg-card flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium capitalize">{lead.type}</p>
                <StatusBadge status={lead.status} />
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                {lead.name ? `${lead.name} · ` : ""}
                {lead.message}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {new Date(lead.createdAt).toLocaleString("en-IN")}
              </p>
            </div>
            {lead.status === "NEW" ? (
              <Button
                type="button"
                variant="outline"
                disabled={pendingId === lead.id}
                onClick={() => void markRead(lead.id)}
              >
                Mark read
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </DashboardShell>
  );
}
