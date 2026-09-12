"use client";

import { Button } from "@/components/ui/button";
import { useAdmin } from "@/features/admin/admin-provider";
import { EmptyState } from "@/components/states/empty-state";
import {
  QueueControls,
  useOperationalQueue,
} from "@/components/operations/queue-controls";
import { StatusBadge } from "@/components/operations/status-badge";

export function AdminSeoPage() {
  const { workspace, toggleSeoIndex, pendingActions } = useAdmin();
  const queue = useOperationalQueue(workspace.seoPages, {
    searchText: (page) => `${page.title} ${page.path}`,
    filterValue: (page) => (page.indexable ? "indexable" : "noindex"),
    sorters: {
      title: (a, b) => a.title.localeCompare(b.title),
      businesses: (a, b) => b.businessCount - a.businessCount,
      path: (a, b) => a.path.localeCompare(b.path),
    },
    defaultSort: "title",
  });

  return (
    <>
      <QueueControls
        id="seo-pages"
        query={queue.query}
        onQueryChange={queue.setQuery}
        filter={queue.filter}
        onFilterChange={queue.setFilter}
        sort={queue.sort}
        onSortChange={queue.setSort}
        filterOptions={[
          { value: "indexable", label: "Indexable" },
          { value: "noindex", label: "Not indexed" },
        ]}
        sortOptions={[
          { value: "title", label: "Title" },
          { value: "businesses", label: "Most businesses" },
          { value: "path", label: "Path" },
        ]}
        filteredCount={queue.filteredCount}
        totalCount={queue.totalCount}
        resultLabel="SEO page"
        page={queue.page}
        pageCount={queue.pageCount}
        onPageChange={queue.setPage}
        onReset={queue.reset}
        searchPlaceholder="Search title or path"
      />
      {queue.pageItems.length === 0 ? (
        <EmptyState
          compact
          title="No SEO pages found"
          description="Try a different search or indexability filter."
        />
      ) : (
        <ul className="space-y-3">
          {queue.pageItems.map((page) => {
            const action = page.indexable ? "noindex" : "index";
            const pending = pendingActions.has(`seo:${page.id}:${action}`);
            return (
              <li
                key={page.id}
                className="border-border/70 bg-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-4"
              >
                <div>
                  <p className="font-medium">{page.title}</p>
                  <p className="text-muted-foreground text-sm">{page.path}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {page.businessCount} businesses
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={page.indexable ? "indexable" : "noindex"} />
                  <Button
                    type="button"
                    size="sm"
                    variant={page.indexable ? "destructive" : "outline"}
                    disabled={pending}
                    aria-busy={pending}
                    onClick={() => void toggleSeoIndex(page.id).catch(() => undefined)}
                  >
                    {pending
                      ? page.indexable
                        ? "Removing…"
                        : "Indexing…"
                      : page.indexable
                        ? "Remove from index"
                        : "Allow indexing"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
