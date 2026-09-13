"use client";

import { useState } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { EmptyState } from "@/components/states/empty-state";
import {
  QueueControls,
  useOperationalQueue,
} from "@/components/operations/queue-controls";
import { StatusBadge } from "@/components/operations/status-badge";
import { useAdmin } from "@/features/admin/admin-provider";
import type { AdminContentItem } from "@/domain/admin/types";
import type { ReviewModerationAction } from "@/domain/reviews/types";

function formatWhen(iso?: string) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function AdminReviewsPage() {
  const { workspace, moderateReview, pendingActions } = useAdmin();
  const items = workspace.content.filter((c) => c.kind === "review");
  const [error, setError] = useState<string | null>(null);
  const queue = useOperationalQueue(items, {
    searchText: (item) =>
      [item.title, item.businessName, item.body, item.authorName, ...(item.moderationFlags ?? [])]
        .filter(Boolean)
        .join(" "),
    filterValue: (item) => {
      if (item.verificationRequested) return "verification";
      return item.status;
    },
    sorters: {
      newest: (a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
      business: (a, b) => a.businessName.localeCompare(b.businessName),
      risk: (a, b) => {
        const rank = { high: 3, medium: 2, low: 1 } as const;
        return (rank[b.moderationRisk ?? "low"] ?? 0) - (rank[a.moderationRisk ?? "low"] ?? 0);
      },
      status: (a, b) => a.status.localeCompare(b.status),
    },
    defaultSort: "newest",
    defaultFilter: "flagged",
  });

  async function runAction(item: AdminContentItem, action: ReviewModerationAction) {
    setError(null);
    try {
      await moderateReview(item.id, action);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Moderation failed");
      throw err;
    }
  }

  return (
    <>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <QueueControls
        id="content-review"
        query={queue.query}
        onQueryChange={queue.setQuery}
        filter={queue.filter}
        onFilterChange={queue.setFilter}
        sort={queue.sort}
        onSortChange={queue.setSort}
        filterOptions={[
          { value: "flagged", label: "Pending moderation" },
          { value: "verification", label: "Verification requested" },
          { value: "visible", label: "Published" },
          { value: "hidden", label: "Hidden / rejected" },
        ]}
        sortOptions={[
          { value: "newest", label: "Newest" },
          { value: "risk", label: "Risk" },
          { value: "business", label: "Business" },
          { value: "status", label: "Status" },
        ]}
        filteredCount={queue.filteredCount}
        totalCount={queue.totalCount}
        resultLabel="review"
        page={queue.page}
        pageCount={queue.pageCount}
        onPageChange={queue.setPage}
        onReset={queue.reset}
        searchPlaceholder="Search reviews, businesses, or flags"
      />
      {queue.pageItems.length === 0 ? (
        <EmptyState
          compact
          title="No reviews found"
          description={
            items.length
              ? "Try a different search or status filter."
              : "There are no reviews in the moderation queue."
          }
        />
      ) : (
        <ul className="space-y-3">
          {queue.pageItems.map((item) => {
            const approving = pendingActions.has(`review:${item.id}:approve`);
            const rejecting = pendingActions.has(`review:${item.id}:reject`);
            const verifying = pendingActions.has(
              `review:${item.id}:request_verification`,
            );
            const busy = approving || rejecting || verifying;
            const when = formatWhen(item.createdAt);
            const flags =
              item.moderationFlags && item.moderationFlags.length > 0
                ? item.moderationFlags
                : item.status === "flagged"
                  ? ["Suspicious activity"]
                  : [];

            return (
              <li
                key={item.id}
                className="border-border/70 bg-card rounded-2xl border p-4"
              >
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">
                        {item.rating ? `${"★".repeat(item.rating)} ` : null}
                        {item.title}
                      </p>
                      <StatusBadge status="business" label={item.businessName} />
                      <StatusBadge status={item.status} />
                      {item.verificationRequested ? (
                        <StatusBadge status="pending_review" label="Verification" />
                      ) : null}
                      {item.moderationRisk === "high" ? (
                        <StatusBadge status="flagged" label="High risk" />
                      ) : null}
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Review #{item.id.slice(0, 8)}
                      {item.authorName ? ` · ${item.authorName}` : null}
                      {when ? ` · ${when}` : null}
                    </p>
                    {item.body ? (
                      <p className="text-muted-foreground mt-2 text-sm whitespace-pre-wrap">
                        {item.body}
                      </p>
                    ) : null}
                    {flags.length > 0 ? (
                      <ul className="mt-3 space-y-1.5" aria-label="Moderation flags">
                        {flags.map((flag) => (
                          <li
                            key={flag}
                            className="text-amber-800 dark:text-amber-200 flex items-start gap-2 text-sm"
                          >
                            <AlertTriangle
                              className="mt-0.5 size-4 shrink-0"
                              aria-hidden
                            />
                            <span>{flag}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  {item.status === "flagged" ? (
                    <ShieldAlert
                      className="text-amber-600 dark:text-amber-400 size-5 shrink-0"
                      aria-hidden
                    />
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    aria-busy={approving}
                    onClick={() => void runAction(item, "approve").catch(() => undefined)}
                  >
                    {approving ? "Approving…" : "Approve"}
                  </Button>
                  <ConfirmationDialog
                    disabled={busy}
                    title="Reject this review?"
                    description="The review will be rejected and removed from public listings. This is audited."
                    confirmLabel="Reject review"
                    onConfirm={() => runAction(item, "reject")}
                    trigger={
                      <Button type="button" size="sm" variant="destructive">
                        {rejecting ? "Rejecting…" : "Reject"}
                      </Button>
                    }
                  />
                  <ConfirmationDialog
                    disabled={busy || item.verificationRequested}
                    title="Request verification?"
                    description="The review stays pending. The author is notified to verify or clarify their review."
                    confirmLabel="Request verification"
                    onConfirm={() => runAction(item, "request_verification")}
                    trigger={
                      <Button type="button" size="sm" variant="secondary">
                        {verifying
                          ? "Requesting…"
                          : item.verificationRequested
                            ? "Verification requested"
                            : "Request verification"}
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
