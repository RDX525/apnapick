"use client";

import { AdminShell } from "@/features/admin/admin-shell";
import { useAdmin } from "@/features/admin/admin-provider";
import { EmptyState } from "@/components/states/empty-state";
import {
  QueueControls,
  useOperationalQueue,
} from "@/components/operations/queue-controls";
import { StatusBadge } from "@/components/operations/status-badge";

function formatInr(cents: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function AdminSubscriptionsPage() {
  const { workspace } = useAdmin();
  const queue = useOperationalQueue(workspace.subscriptions, {
    searchText: (subscription) =>
      [subscription.businessName, subscription.plan].join(" "),
    filterValue: (subscription) => subscription.status,
    sorters: {
      business: (a, b) => a.businessName.localeCompare(b.businessName),
      renewal: (a, b) =>
        Date.parse(a.renewsAt ?? "9999-12-31") - Date.parse(b.renewsAt ?? "9999-12-31"),
      amount: (a, b) => b.amountCents - a.amountCents,
    },
    defaultSort: "business",
  });

  return (
    <AdminShell
      activePath="/admin/subscriptions"
      title="Subscriptions"
      description="Business plan status. Paid placement never affects organic rank."
    >
      <QueueControls
        id="subscriptions"
        query={queue.query}
        onQueryChange={queue.setQuery}
        filter={queue.filter}
        onFilterChange={queue.setFilter}
        sort={queue.sort}
        onSortChange={queue.setSort}
        filterOptions={[
          { value: "active", label: "Active" },
          { value: "past_due", label: "Past due" },
          { value: "canceled", label: "Canceled" },
        ]}
        sortOptions={[
          { value: "business", label: "Business" },
          { value: "renewal", label: "Renewal date" },
          { value: "amount", label: "Highest amount" },
        ]}
        filteredCount={queue.filteredCount}
        totalCount={queue.totalCount}
        resultLabel="subscription"
        page={queue.page}
        pageCount={queue.pageCount}
        onPageChange={queue.setPage}
        onReset={queue.reset}
        searchPlaceholder="Search business or plan"
      />
      {queue.pageItems.length === 0 ? (
        <EmptyState
          compact
          title="No subscriptions found"
          description={
            workspace.subscriptions.length
              ? "Try a different search or status filter."
              : "Business subscriptions will appear here after checkout."
          }
        />
      ) : (
        <>
          <ul className="space-y-3 md:hidden">
            {queue.pageItems.map((sub) => (
              <li
                key={sub.id}
                className="border-border/70 bg-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-4"
              >
                <div>
                  <p className="font-medium">{sub.businessName}</p>
                  <p className="text-muted-foreground text-sm">
                    {sub.plan} · {formatInr(sub.amountCents)}
                  </p>
                  {sub.renewsAt ? (
                    <p className="text-muted-foreground mt-1 text-xs">
                      Renews {new Date(sub.renewsAt).toLocaleDateString("en-IN")}
                    </p>
                  ) : null}
                </div>
                <StatusBadge status={sub.status} />
              </li>
            ))}
          </ul>
          <div className="border-border/70 bg-card hidden overflow-x-auto rounded-2xl border md:block">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-border/60 bg-mist/40 text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">Business</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Renews</th>
                </tr>
              </thead>
              <tbody>
                {queue.pageItems.map((subscription) => (
                  <tr
                    key={subscription.id}
                    className="border-border/40 border-b last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">{subscription.businessName}</td>
                    <td className="px-4 py-3">
                      {subscription.plan} · {formatInr(subscription.amountCents)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={subscription.status} />
                    </td>
                    <td className="text-muted-foreground px-4 py-3">
                      {subscription.renewsAt
                        ? new Date(subscription.renewsAt).toLocaleDateString("en-IN")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminShell>
  );
}
