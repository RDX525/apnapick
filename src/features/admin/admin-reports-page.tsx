"use client";

import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { EmptyState } from "@/components/states/empty-state";
import {
  QueueControls,
  useOperationalQueue,
} from "@/components/operations/queue-controls";
import { StatusBadge } from "@/components/operations/status-badge";
import { useAdmin } from "@/features/admin/admin-provider";

const REASON_LABELS: Record<string, string> = {
  incorrect_information: "Incorrect information",
  duplicate: "Duplicate",
  closed_business: "Closed business",
  spam: "Spam",
  abuse: "Abuse",
};

export function AdminReportsPage() {
  const { workspace, resolveReport, pendingActions } = useAdmin();
  const queue = useOperationalQueue(workspace.reports, {
    searchText: (report) =>
      [
        report.targetLabel,
        report.details,
        report.reporterEmail,
        REASON_LABELS[report.reason],
      ]
        .filter(Boolean)
        .join(" "),
    filterValue: (report) => report.status,
    sorters: {
      newest: (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
      oldest: (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
      target: (a, b) => a.targetLabel.localeCompare(b.targetLabel),
    },
    defaultSort: "newest",
  });

  return (
    <>
      <QueueControls
        id="reports"
        query={queue.query}
        onQueryChange={queue.setQuery}
        filter={queue.filter}
        onFilterChange={queue.setFilter}
        sort={queue.sort}
        onSortChange={queue.setSort}
        filterOptions={[
          { value: "OPEN", label: "Open" },
          { value: "IN_REVIEW", label: "In review" },
          { value: "RESOLVED", label: "Resolved" },
          { value: "DISMISSED", label: "Dismissed" },
        ]}
        sortOptions={[
          { value: "newest", label: "Newest" },
          { value: "oldest", label: "Oldest" },
          { value: "target", label: "Target" },
        ]}
        filteredCount={queue.filteredCount}
        totalCount={queue.totalCount}
        resultLabel="report"
        page={queue.page}
        pageCount={queue.pageCount}
        onPageChange={queue.setPage}
        onReset={queue.reset}
        searchPlaceholder="Search targets, details, or reporter"
      />
      {queue.pageItems.length === 0 ? (
        <EmptyState
          compact
          title="No reports found"
          description="Try a different search or status filter."
        />
      ) : (
        <ul className="space-y-3">
          {queue.pageItems.map((report) => {
            const reviewing = pendingActions.has(`report:${report.id}:IN_REVIEW`);
            const resolving = pendingActions.has(`report:${report.id}:RESOLVED`);
            const dismissing = pendingActions.has(`report:${report.id}:DISMISSED`);
            return (
              <li
                key={report.id}
                className="border-border/70 bg-card rounded-2xl border p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    status={report.reason}
                    label={REASON_LABELS[report.reason] ?? report.reason}
                  />
                  <StatusBadge status={report.status} />
                  <StatusBadge status={report.targetType} />
                </div>
                <p className="mt-3 font-medium">{report.targetLabel}</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {report.details ?? "No details"}
                </p>
                <p className="text-muted-foreground mt-2 text-xs">
                  Reporter: {report.reporterEmail ?? "anonymous"} ·{" "}
                  {new Date(report.createdAt).toLocaleString("en-IN")}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={reviewing}
                    aria-busy={reviewing}
                    onClick={() =>
                      void resolveReport(report.id, "IN_REVIEW").catch(() => undefined)
                    }
                  >
                    {reviewing ? "Starting…" : "Review"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={resolving}
                    aria-busy={resolving}
                    onClick={() =>
                      void resolveReport(report.id, "RESOLVED").catch(() => undefined)
                    }
                  >
                    {resolving ? "Resolving…" : "Resolve"}
                  </Button>
                  <ConfirmationDialog
                    disabled={dismissing}
                    title="Dismiss this report?"
                    description="The report will be closed without action. Confirm that the reported content does not require moderation."
                    confirmLabel="Dismiss report"
                    onConfirm={() => resolveReport(report.id, "DISMISSED")}
                    trigger={
                      <Button type="button" size="sm" variant="destructive">
                        {dismissing ? "Dismissing…" : "Dismiss"}
                      </Button>
                    }
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
