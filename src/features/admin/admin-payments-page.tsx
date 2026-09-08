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

export function AdminPaymentsPage() {
  const { workspace } = useAdmin();
  const queue = useOperationalQueue(workspace.payments, {
    searchText: (payment) => payment.businessName,
    filterValue: (payment) => payment.status,
    sorters: {
      newest: (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
      oldest: (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
      amount: (a, b) => b.amountCents - a.amountCents,
    },
    defaultSort: "newest",
  });

  return (
    <AdminShell
      activePath="/admin/payments"
      title="Payments"
      description="Payment ledger for billed businesses."
    >
      <QueueControls
        id="payments"
        query={queue.query}
        onQueryChange={queue.setQuery}
        filter={queue.filter}
        onFilterChange={queue.setFilter}
        sort={queue.sort}
        onSortChange={queue.setSort}
        filterOptions={[
          { value: "succeeded", label: "Succeeded" },
          { value: "failed", label: "Failed" },
          { value: "refunded", label: "Refunded" },
        ]}
        sortOptions={[
          { value: "newest", label: "Newest" },
          { value: "oldest", label: "Oldest" },
          { value: "amount", label: "Highest amount" },
        ]}
        filteredCount={queue.filteredCount}
        totalCount={queue.totalCount}
        resultLabel="payment"
        page={queue.page}
        pageCount={queue.pageCount}
        onPageChange={queue.setPage}
        onReset={queue.reset}
        searchPlaceholder="Search business"
      />
      {queue.pageItems.length === 0 ? (
        <EmptyState
          compact
          title="No payments found"
          description={
            workspace.payments.length
              ? "Try a different search or status filter."
              : "Payments will appear here after businesses are billed."
          }
        />
      ) : (
        <>
          <ul className="space-y-3 md:hidden">
            {queue.pageItems.map((p) => (
              <li
                key={p.id}
                className="border-border/70 bg-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-4"
              >
                <div>
                  <p className="font-medium">{p.businessName}</p>
                  <p className="text-muted-foreground text-sm">
                    {formatInr(p.amountCents)} ·{" "}
                    {new Date(p.createdAt).toLocaleString("en-IN")}
                  </p>
                </div>
                <StatusBadge status={p.status} />
              </li>
            ))}
          </ul>
          <div className="border-border/70 bg-card hidden overflow-x-auto rounded-2xl border md:block">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-border/60 bg-mist/40 text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">Business</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Recorded</th>
                </tr>
              </thead>
              <tbody>
                {queue.pageItems.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-border/40 border-b last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">{payment.businessName}</td>
                    <td className="px-4 py-3">{formatInr(payment.amountCents)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={payment.status} />
                    </td>
                    <td className="text-muted-foreground px-4 py-3">
                      {new Date(payment.createdAt).toLocaleString("en-IN")}
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
