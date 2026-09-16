"use client";

import { useMemo } from "react";
import { useAdmin } from "@/features/admin/admin-provider";
import { AdminLiveStats } from "@/features/admin/admin-live-stats";
import { EmptyState } from "@/components/states/empty-state";
import {
  QueueControls,
  useOperationalQueue,
} from "@/components/operations/queue-controls";

export function AdminSearchAnalyticsPage() {
  const { workspace } = useAdmin();
  const areaOptions = useMemo(() => {
    const areas = [
      ...new Set(
        workspace.searchAnalytics
          .map((row) => row.area)
          .filter((area): area is string => Boolean(area)),
      ),
    ].sort((a, b) => a.localeCompare(b));
    return [
      { value: "unspecified", label: "No area" },
      ...areas.map((area) => ({ value: area, label: area })),
    ];
  }, [workspace.searchAnalytics]);
  const totalHits = workspace.searchAnalytics.reduce((sum, row) => sum + row.count, 0);
  const latest = workspace.searchAnalytics[0]?.lastSeen;
  const queue = useOperationalQueue(workspace.searchAnalytics, {
    searchText: (row) => `${row.query} ${row.area ?? ""}`,
    filterValue: (row) => row.area ?? "unspecified",
    sorters: {
      count: (a, b) => b.count - a.count,
      recent: (a, b) => Date.parse(b.lastSeen) - Date.parse(a.lastSeen),
      query: (a, b) => a.query.localeCompare(b.query),
    },
    defaultSort: "recent",
  });

  return (
    <>
      <AdminLiveStats
        items={[
          { label: "Queries", value: workspace.searchAnalytics.length },
          { label: "Searches", value: totalHits.toLocaleString("en-IN") },
          {
            label: "Areas",
            value: new Set(
              workspace.searchAnalytics.map((row) => row.area).filter(Boolean),
            ).size,
          },
          {
            label: "Last search",
            value: latest
              ? new Date(latest).toLocaleTimeString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—",
          },
        ]}
      />
      <QueueControls
        id="search-analytics"
        query={queue.query}
        onQueryChange={queue.setQuery}
        filter={queue.filter}
        onFilterChange={queue.setFilter}
        sort={queue.sort}
        onSortChange={queue.setSort}
        filterOptions={areaOptions}
        filterLabel="Area"
        sortOptions={[
          { value: "recent", label: "Most recent" },
          { value: "count", label: "Highest count" },
          { value: "query", label: "Query" },
        ]}
        filteredCount={queue.filteredCount}
        totalCount={queue.totalCount}
        resultLabel="search"
        resultLabelPlural="searches"
        page={queue.page}
        pageCount={queue.pageCount}
        onPageChange={queue.setPage}
        onReset={queue.reset}
        searchPlaceholder="Search query or area"
      />
      {queue.pageItems.length === 0 ? (
        <EmptyState
          compact
          title="No search activity found"
          description="Try a different search, or check back after customers search."
        />
      ) : (
        <>
          <ul className="space-y-3 md:hidden">
            {queue.pageItems.map((row) => (
              <li
                key={`${row.query}-${row.area ?? ""}`}
                className="border-border/70 bg-card rounded-2xl border p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{row.query}</p>
                    <p className="text-muted-foreground text-sm">
                      {row.area ?? "All areas"}
                    </p>
                  </div>
                  <span className="text-ink text-lg font-semibold tabular-nums">
                    {row.count}
                  </span>
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  Last seen{" "}
                  {new Date(row.lastSeen).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })}
                </p>
              </li>
            ))}
          </ul>
          <div className="border-border/70 bg-card hidden overflow-x-auto rounded-2xl border md:block">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-border/60 bg-mist/40 text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">Query</th>
                  <th className="px-4 py-3 font-medium">Area</th>
                  <th className="px-4 py-3 font-medium">Count</th>
                  <th className="px-4 py-3 font-medium">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {queue.pageItems.map((row) => (
                  <tr
                    key={`${row.query}-${row.area ?? ""}`}
                    className="border-border/40 border-b last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">{row.query}</td>
                    <td className="text-muted-foreground px-4 py-3">{row.area ?? "—"}</td>
                    <td className="px-4 py-3">{row.count}</td>
                    <td className="text-muted-foreground px-4 py-3">
                      {new Date(row.lastSeen).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                      })}
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
