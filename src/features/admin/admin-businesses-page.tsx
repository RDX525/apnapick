"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { EmptyState } from "@/components/states/empty-state";
import {
  QueueControls,
  useOperationalQueue,
} from "@/components/operations/queue-controls";
import { StatusBadge } from "@/components/operations/status-badge";
import { AdminShell } from "@/features/admin/admin-shell";
import { useAdmin } from "@/features/admin/admin-provider";
import type { BusinessAdminAction } from "@/domain/admin/types";

const ACTIONS: { action: BusinessAdminAction; label: string }[] = [
  { action: "approve", label: "Approve" },
  { action: "verify", label: "Verify" },
  { action: "reject", label: "Reject" },
  { action: "suspend", label: "Suspend" },
  { action: "merge_duplicate", label: "Merge duplicate" },
  { action: "edit", label: "Accept owner edits" },
];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function AdminBusinessesPage() {
  const { workspace, runBusinessAction, pendingActions } = useAdmin();
  const [mergeTarget, setMergeTarget] = useState<Record<string, string>>({});
  const queue = useOperationalQueue(workspace.businesses, {
    searchText: (business) =>
      [business.name, business.slug, business.suburb, business.city]
        .filter(Boolean)
        .join(" "),
    filterValue: (business) =>
      business.ownerEditPending ? "PENDING_REVIEW" : business.status,
    sorters: {
      name: (a, b) => a.name.localeCompare(b.name),
      completeness: (a, b) => a.completeness - b.completeness,
      reports: (a, b) => b.reportCount - a.reportCount,
    },
    defaultSort: "name",
  });

  return (
    <AdminShell
      activePath="/admin/businesses"
      title="Businesses"
      description="Approve or accept owner edits to publish a listing. Reject, suspend, verify, or merge duplicates."
    >
      <QueueControls
        id="businesses"
        query={queue.query}
        onQueryChange={queue.setQuery}
        filter={queue.filter}
        onFilterChange={queue.setFilter}
        sort={queue.sort}
        onSortChange={queue.setSort}
        filterOptions={[
          { value: "DRAFT", label: "Draft" },
          { value: "PENDING_REVIEW", label: "Pending review" },
          { value: "PUBLISHED", label: "Published" },
          { value: "REJECTED", label: "Rejected" },
          { value: "SUSPENDED", label: "Suspended" },
        ]}
        sortOptions={[
          { value: "name", label: "Name" },
          { value: "completeness", label: "Lowest completeness" },
          { value: "reports", label: "Most reports" },
        ]}
        filteredCount={queue.filteredCount}
        totalCount={queue.totalCount}
        resultLabel="business"
        page={queue.page}
        pageCount={queue.pageCount}
        onPageChange={queue.setPage}
        onReset={queue.reset}
        searchPlaceholder="Search name, slug, or location"
      />
      {queue.pageItems.length === 0 ? (
        <EmptyState
          compact
          title="No businesses found"
          description="Try a different search or status filter."
        />
      ) : (
        <ul className="space-y-3">
          {queue.pageItems.map((b) => (
            <li key={b.id} className="border-border/70 bg-card rounded-2xl border p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{b.name}</p>
                  <p className="text-muted-foreground text-sm">
                    /b/{b.slug} · {[b.suburb, b.city].filter(Boolean).join(", ")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusBadge status={b.status} />
                    {b.ownerEditPending ? (
                      <StatusBadge status="pending_review" label="Owner edits" />
                    ) : null}
                    {b.isClaimed ? <StatusBadge status="claimed" /> : null}
                    {b.verifiedAt ? <StatusBadge status="verified" /> : null}
                    {b.reportCount > 0 ? (
                      <StatusBadge
                        status={b.reportCount > 2 ? "flagged" : "open"}
                        label={`${b.reportCount} reports`}
                      />
                    ) : null}
                    <StatusBadge
                      status={b.completeness === 100 ? "complete" : "draft"}
                      label={`${b.completeness}% complete`}
                    />
                  </div>
                </div>
              </div>

              {workspace.businesses.some((x) => x.id !== b.id) ? (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    id={`merge-target-${b.id}`}
                    aria-label={`Canonical business ID for ${b.name}`}
                    placeholder="Merge into business id"
                    value={mergeTarget[b.id] ?? ""}
                    onChange={(e) =>
                      setMergeTarget((m) => ({ ...m, [b.id]: e.target.value }))
                    }
                    className="min-h-10 sm:max-w-xs"
                  />
                  <p className="text-muted-foreground text-xs">
                    Paste canonical business id before Merge duplicate
                  </p>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {ACTIONS.map(({ action, label }) => {
                  const run = () =>
                    runBusinessAction(
                      b.id,
                      action,
                      action === "merge_duplicate" ? mergeTarget[b.id] : undefined,
                    );
                  const destructive = ["reject", "suspend", "merge_duplicate"].includes(
                    action,
                  );
                  const pending = pendingActions.has(`business:${b.id}:${action}`);
                  const invalidMergeTarget =
                    action === "merge_duplicate" &&
                    (!UUID_PATTERN.test(mergeTarget[b.id] ?? "") ||
                      mergeTarget[b.id] === b.id);

                  return destructive ? (
                    <ConfirmationDialog
                      key={action}
                      disabled={pending || invalidMergeTarget}
                      title={`${label} ${b.name}?`}
                      description={
                        action === "merge_duplicate"
                          ? "This removes the duplicate listing in favor of the canonical business. This action should only be used after verifying both records."
                          : "This changes the listing’s availability and may affect its owner and customers."
                      }
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
                      variant={
                        action === "approve" || action === "verify"
                          ? "default"
                          : "outline"
                      }
                      disabled={pending}
                      aria-busy={pending}
                      onClick={() => void run().catch(() => undefined)}
                    >
                      {pending ? `${label}…` : label}
                    </Button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
