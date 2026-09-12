"use client";

import { Button } from "@/components/ui/button";
import { useAdmin } from "@/features/admin/admin-provider";
import { EmptyState } from "@/components/states/empty-state";
import {
  QueueControls,
  useOperationalQueue,
} from "@/components/operations/queue-controls";
import { StatusBadge } from "@/components/operations/status-badge";

export function AdminCategoriesPage() {
  const { workspace, toggleCategory, pendingActions } = useAdmin();
  const queue = useOperationalQueue(workspace.categories, {
    searchText: (category) => `${category.name} ${category.slug}`,
    filterValue: (category) => (category.active ? "active" : "inactive"),
    sorters: {
      name: (a, b) => a.name.localeCompare(b.name),
      slug: (a, b) => a.slug.localeCompare(b.slug),
    },
    defaultSort: "name",
  });

  return (
    <>
      <QueueControls
        id="categories"
        query={queue.query}
        onQueryChange={queue.setQuery}
        filter={queue.filter}
        onFilterChange={queue.setFilter}
        sort={queue.sort}
        onSortChange={queue.setSort}
        filterOptions={[
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ]}
        sortOptions={[
          { value: "name", label: "Name" },
          { value: "slug", label: "Slug" },
        ]}
        filteredCount={queue.filteredCount}
        totalCount={queue.totalCount}
        resultLabel="category"
        page={queue.page}
        pageCount={queue.pageCount}
        onPageChange={queue.setPage}
        onReset={queue.reset}
        searchPlaceholder="Search name or slug"
      />
      {queue.pageItems.length === 0 ? (
        <EmptyState
          compact
          title="No categories found"
          description="Try a different search or status filter."
        />
      ) : (
        <ul className="space-y-3">
          {queue.pageItems.map((cat) => {
            const action = cat.active ? "deactivate" : "activate";
            const pending = pendingActions.has(`category:${cat.id}:${action}`);
            return (
              <li
                key={cat.id}
                className="border-border/70 bg-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-4"
              >
                <div>
                  <p className="font-medium">{cat.name}</p>
                  <p className="text-muted-foreground text-sm">/{cat.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={cat.active ? "active" : "inactive"} />
                  <Button
                    type="button"
                    size="sm"
                    variant={cat.active ? "destructive" : "outline"}
                    disabled={pending}
                    aria-busy={pending}
                    onClick={() => void toggleCategory(cat.id).catch(() => undefined)}
                  >
                    {pending
                      ? `${cat.active ? "Deactivating" : "Activating"}…`
                      : cat.active
                        ? "Deactivate"
                        : "Activate"}
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
