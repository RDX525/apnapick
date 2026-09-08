"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { EmptyState } from "@/components/states/empty-state";
import {
  QueueControls,
  useOperationalQueue,
} from "@/components/operations/queue-controls";
import { StatusBadge } from "@/components/operations/status-badge";
import { Label } from "@/components/ui/label";
import { AdminShell } from "@/features/admin/admin-shell";
import { useAdmin } from "@/features/admin/admin-provider";
import type { ClaimAdminAction } from "@/domain/admin/types";

const ACTIONS: {
  action: ClaimAdminAction;
  label: string;
  variant?: "outline" | "default";
}[] = [
  { action: "approve", label: "Approve" },
  { action: "verify", label: "Verify" },
  { action: "request_more_info", label: "Request more info", variant: "outline" },
  { action: "reject", label: "Reject", variant: "outline" },
  { action: "suspend", label: "Suspend", variant: "outline" },
];

export function AdminClaimsPage() {
  const { workspace, runClaimAction, pendingActions } = useAdmin();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(
    workspace.claims[0]?.id ?? null,
  );
  const queue = useOperationalQueue(workspace.claims, {
    searchText: (claim) =>
      [claim.businessName, claim.claimantName, claim.claimantEmail].join(" "),
    filterValue: (claim) => claim.status,
    sorters: {
      newest: (a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt),
      oldest: (a, b) => Date.parse(a.submittedAt) - Date.parse(b.submittedAt),
      business: (a, b) => a.businessName.localeCompare(b.businessName),
    },
    defaultSort: "newest",
  });

  return (
    <AdminShell
      activePath="/admin/claims"
      title="Claims"
      description="Review ownership claims with evidence, history, and verification actions."
    >
      <QueueControls
        id="claims"
        query={queue.query}
        onQueryChange={queue.setQuery}
        filter={queue.filter}
        onFilterChange={queue.setFilter}
        sort={queue.sort}
        onSortChange={queue.setSort}
        filterOptions={[
          { value: "PENDING", label: "Pending" },
          { value: "UNDER_REVIEW", label: "Under review" },
          { value: "VERIFIED", label: "Verified" },
          { value: "REJECTED", label: "Rejected" },
          { value: "EXPIRED", label: "Expired" },
        ]}
        sortOptions={[
          { value: "newest", label: "Newest" },
          { value: "oldest", label: "Oldest" },
          { value: "business", label: "Business name" },
        ]}
        filteredCount={queue.filteredCount}
        totalCount={queue.totalCount}
        resultLabel="claim"
        page={queue.page}
        pageCount={queue.pageCount}
        onPageChange={queue.setPage}
        onReset={queue.reset}
        searchPlaceholder="Search business or claimant"
      />
      {queue.pageItems.length === 0 ? (
        <EmptyState
          compact
          title="No claims found"
          description="Try a different search or status filter."
        />
      ) : (
        <ul className="space-y-4">
          {queue.pageItems.map((claim) => {
            const open = expanded === claim.id;
            return (
              <li
                key={claim.id}
                className="border-border/70 bg-card overflow-hidden rounded-2xl border"
              >
                <button
                  type="button"
                  className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left"
                  onClick={() => setExpanded(open ? null : claim.id)}
                  aria-expanded={open}
                  aria-controls={`claim-details-${claim.id}`}
                >
                  <div>
                    <p className="font-medium">{claim.businessName}</p>
                    <p className="text-muted-foreground text-sm">
                      Claimant: {claim.claimantName} · {claim.claimantEmail}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Submitted {new Date(claim.submittedAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <StatusBadge status={claim.status} />
                </button>

                {open ? (
                  <div
                    id={`claim-details-${claim.id}`}
                    className="border-border/60 space-y-4 border-t px-5 py-4"
                  >
                    <div>
                      <p className="text-sm font-medium">Evidence</p>
                      <ul className="mt-2 space-y-2">
                        {claim.evidence.map((e, i) => (
                          <li
                            key={`${e.type}-${i}`}
                            className="bg-mist/60 rounded-xl px-3 py-2 text-sm"
                          >
                            <span className="font-medium capitalize">{e.type}</span>
                            <span className="text-muted-foreground"> — {e.note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="text-sm font-medium">History</p>
                      <ol className="text-muted-foreground mt-2 space-y-1.5 text-sm">
                        {claim.history.map((h, i) => (
                          <li key={`${h.at}-${i}`}>
                            {new Date(h.at).toLocaleString("en-IN")} · {h.action} · {h.by}
                            {h.note ? ` — ${h.note}` : ""}
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div>
                      <Label htmlFor={`claim-note-${claim.id}`} className="mb-2">
                        Moderator note
                      </Label>
                      <Textarea
                        id={`claim-note-${claim.id}`}
                        value={notes[claim.id] ?? ""}
                        onChange={(e) =>
                          setNotes((n) => ({ ...n, [claim.id]: e.target.value }))
                        }
                        rows={2}
                        placeholder="Optional note for the audit trail"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {ACTIONS.map(({ action, label, variant }) => {
                        const run = () =>
                          runClaimAction(claim.id, action, notes[claim.id]);
                        const pending = pendingActions.has(`claim:${claim.id}:${action}`);
                        return action === "reject" || action === "suspend" ? (
                          <ConfirmationDialog
                            key={action}
                            disabled={pending}
                            title={`${label} this claim?`}
                            description="The claimant will lose access to the approval path until an administrator reviews the claim again."
                            confirmLabel={label}
                            onConfirm={run}
                            trigger={
                              <Button type="button" size="sm" variant="destructive">
                                {pending ? `${label}…` : label}
                              </Button>
                            }
                          />
                        ) : (
                          <Button
                            key={action}
                            type="button"
                            size="sm"
                            variant={variant ?? "default"}
                            disabled={pending}
                            aria-busy={pending}
                            onClick={() => void run().catch(() => undefined)}
                          >
                            {pending ? `${label}…` : label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </AdminShell>
  );
}
