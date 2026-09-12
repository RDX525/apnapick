"use client";

import { useAdmin } from "@/features/admin/admin-provider";
import { EmptyState } from "@/components/states/empty-state";
import {
  QueueControls,
  useOperationalQueue,
} from "@/components/operations/queue-controls";

export function AdminAuditLogsPage() {
  const { workspace } = useAdmin();
  const queue = useOperationalQueue(workspace.auditLogs, {
    searchText: (log) =>
      [log.action, log.entityType, log.entityId, log.actorEmail]
        .filter(Boolean)
        .join(" "),
    sorters: {
      newest: (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
      oldest: (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
      action: (a, b) => a.action.localeCompare(b.action),
    },
    defaultSort: "newest",
  });

  return (
    <>
      <QueueControls
        id="audit-logs"
        query={queue.query}
        onQueryChange={queue.setQuery}
        filter={queue.filter}
        onFilterChange={queue.setFilter}
        sort={queue.sort}
        onSortChange={queue.setSort}
        sortOptions={[
          { value: "newest", label: "Newest" },
          { value: "oldest", label: "Oldest" },
          { value: "action", label: "Action" },
        ]}
        filteredCount={queue.filteredCount}
        totalCount={queue.totalCount}
        resultLabel="log entry"
        page={queue.page}
        pageCount={queue.pageCount}
        onPageChange={queue.setPage}
        onReset={queue.reset}
        searchPlaceholder="Search actions, entities, or actors"
      />
      {queue.pageItems.length === 0 ? (
        <EmptyState
          compact
          title="No audit logs found"
          description="Try a different search, or check back after an admin action."
        />
      ) : (
        <>
          <ol className="space-y-2 md:hidden">
            {queue.pageItems.map((log) => (
              <li
                key={log.id}
                className="border-border/70 bg-card rounded-2xl border px-5 py-3 text-sm"
              >
                <p className="font-medium">{log.action}</p>
                <p className="text-muted-foreground mt-1">
                  {log.entityType}
                  {log.entityId ? ` · ${log.entityId}` : ""} ·{" "}
                  {log.actorEmail ?? "unknown"} ·{" "}
                  {new Date(log.createdAt).toLocaleString("en-IN")}
                </p>
              </li>
            ))}
          </ol>
          <div className="border-border/70 bg-card hidden overflow-x-auto rounded-2xl border md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-border/60 bg-mist/40 text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Entity</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {queue.pageItems.map((log) => (
                  <tr key={log.id} className="border-border/40 border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{log.action}</td>
                    <td className="text-muted-foreground px-4 py-3">
                      {log.entityType}
                      {log.entityId ? ` · ${log.entityId}` : ""}
                    </td>
                    <td className="text-muted-foreground px-4 py-3">
                      {log.actorEmail ?? "unknown"}
                    </td>
                    <td className="text-muted-foreground px-4 py-3">
                      {new Date(log.createdAt).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
