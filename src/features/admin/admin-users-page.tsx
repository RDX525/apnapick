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

export function AdminUsersPage() {
  const { workspace, runUserAction, pendingActions } = useAdmin();
  const queue = useOperationalQueue(workspace.users, {
    searchText: (user) => [user.displayName, user.email, ...user.roles].join(" "),
    filterValue: (user) => user.status,
    sorters: {
      name: (a, b) => a.displayName.localeCompare(b.displayName),
      newest: (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
      oldest: (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
    },
    defaultSort: "name",
  });

  return (
    <>
      <QueueControls
        id="users"
        query={queue.query}
        onQueryChange={queue.setQuery}
        filter={queue.filter}
        onFilterChange={queue.setFilter}
        sort={queue.sort}
        onSortChange={queue.setSort}
        filterOptions={[
          { value: "active", label: "Active" },
          { value: "suspended", label: "Suspended" },
        ]}
        sortOptions={[
          { value: "name", label: "Name" },
          { value: "newest", label: "Newest" },
          { value: "oldest", label: "Oldest" },
        ]}
        filteredCount={queue.filteredCount}
        totalCount={queue.totalCount}
        resultLabel="user"
        page={queue.page}
        pageCount={queue.pageCount}
        onPageChange={queue.setPage}
        onReset={queue.reset}
        searchPlaceholder="Search name, email, or role"
      />
      {queue.pageItems.length === 0 ? (
        <EmptyState
          compact
          title="No users found"
          description="Try a different search or status filter."
        />
      ) : (
        <ul className="space-y-3">
          {queue.pageItems.map((user) => {
            const suspending = pendingActions.has(`user:${user.id}:suspend`);
            const restoring = pendingActions.has(`user:${user.id}:restore`);
            return (
              <li
                key={user.id}
                className="border-border/70 bg-card flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{user.displayName}</p>
                  <p className="text-muted-foreground text-sm">{user.email}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {user.roles.map((r) => (
                      <StatusBadge key={r} status={r} />
                    ))}
                    <StatusBadge status={user.status} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {user.status === "active" ? (
                    <ConfirmationDialog
                      disabled={suspending}
                      title={`Suspend ${user.displayName}?`}
                      description="This immediately removes the user’s access until an administrator restores the account."
                      confirmLabel="Suspend user"
                      onConfirm={() => runUserAction(user.id, "suspend")}
                      trigger={
                        <Button type="button" size="sm" variant="destructive">
                          {suspending ? "Suspending…" : "Suspend"}
                        </Button>
                      }
                    />
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      disabled={restoring}
                      aria-busy={restoring}
                      onClick={() =>
                        void runUserAction(user.id, "restore").catch(() => undefined)
                      }
                    >
                      {restoring ? "Restoring…" : "Restore"}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
