"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { EmptyState } from "@/components/states/empty-state";
import {
  QueueControls,
  useOperationalQueue,
} from "@/components/operations/queue-controls";
import { StatusBadge } from "@/components/operations/status-badge";
import { AdminShell } from "@/features/admin/admin-shell";
import { useAdmin } from "@/features/admin/admin-provider";
import type { AdminContentItem } from "@/domain/admin/types";

export function AdminContentPage({
  kind,
  title,
  path,
}: {
  kind: "product" | "service" | "photo" | "description" | "review";
  title: string;
  path: string;
}) {
  const { workspace, moderateContent, pendingActions } = useAdmin();
  const items = workspace.content.filter((c) => c.kind === kind);
  const [error, setError] = useState<string | null>(null);
  const queue = useOperationalQueue(items, {
    searchText: (item) => [item.title, item.businessName, item.body].join(" "),
    filterValue: (item) => item.status,
    sorters: {
      title: (a, b) => a.title.localeCompare(b.title),
      business: (a, b) => a.businessName.localeCompare(b.businessName),
      status: (a, b) => a.status.localeCompare(b.status),
    },
    defaultSort: "title",
  });

  async function changeStatus(
    item: AdminContentItem,
    status: "visible" | "hidden" | "flagged",
  ) {
    setError(null);
    try {
      if (kind === "review" && status !== "flagged") {
        const res = await fetch(`/api/reviews/${item.id}/moderate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: status === "visible" ? "PUBLISHED" : "HIDDEN",
          }),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(json.error ?? "Moderation failed");
        }
      }
      await moderateContent(item.id, status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Moderation failed");
      throw err;
    }
  }

  return (
    <AdminShell
      activePath={path}
      title={title}
      description="Content moderation — hide or flag items. Actions are audited server-side."
    >
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <QueueControls
        id={`content-${kind}`}
        query={queue.query}
        onQueryChange={queue.setQuery}
        filter={queue.filter}
        onFilterChange={queue.setFilter}
        sort={queue.sort}
        onSortChange={queue.setSort}
        filterOptions={[
          { value: "visible", label: "Visible" },
          { value: "hidden", label: "Hidden" },
          { value: "flagged", label: "Flagged" },
        ]}
        sortOptions={[
          { value: "title", label: "Title" },
          { value: "business", label: "Business" },
          { value: "status", label: "Status" },
        ]}
        filteredCount={queue.filteredCount}
        totalCount={queue.totalCount}
        resultLabel={kind}
        page={queue.page}
        pageCount={queue.pageCount}
        onPageChange={queue.setPage}
        onReset={queue.reset}
        searchPlaceholder={`Search ${title.toLowerCase()} or businesses`}
      />
      {queue.pageItems.length === 0 ? (
        <EmptyState
          compact
          title={`No ${title.toLowerCase()} found`}
          description={
            items.length
              ? "Try a different search or status filter."
              : `There are no ${title.toLowerCase()} in the moderation queue.`
          }
        />
      ) : (
        <ul className="space-y-3">
          {queue.pageItems.map((item) => {
            const approving = pendingActions.has(`content:${item.id}:visible`);
            return (
              <li
                key={item.id}
                className="border-border/70 bg-card rounded-2xl border p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{item.title}</p>
                  <StatusBadge status="business" label={item.businessName} />
                  <StatusBadge status={item.status} />
                </div>
                {item.body ? (
                  <p className="text-muted-foreground mt-2 text-sm">{item.body}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={approving}
                    aria-busy={approving}
                    onClick={() =>
                      void changeStatus(item, "visible").catch(() => undefined)
                    }
                  >
                    {approving ? "Approving…" : "Approve"}
                  </Button>
                  {(["hidden", "flagged"] as const).map((status) => (
                    <ConfirmationDialog
                      key={status}
                      disabled={pendingActions.has(`content:${item.id}:${status}`)}
                      title={`${status === "hidden" ? "Hide" : "Flag"} this ${kind}?`}
                      description={
                        status === "hidden"
                          ? "This content will no longer be visible to customers."
                          : "This content will be marked for further moderation review."
                      }
                      confirmLabel={status === "hidden" ? "Hide content" : "Flag content"}
                      onConfirm={() => changeStatus(item, status)}
                      trigger={
                        <Button type="button" size="sm" variant="destructive">
                          {pendingActions.has(`content:${item.id}:${status}`)
                            ? `${status === "hidden" ? "Hiding" : "Flagging"}…`
                            : status === "hidden"
                              ? "Hide"
                              : "Flag"}
                        </Button>
                      }
                    />
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AdminShell>
  );
}
