"use client";

import { useAdmin } from "@/features/admin/admin-provider";

function formatSyncedAt(at: number | null) {
  if (!at) return "Waiting for first snapshot";
  return `Live · ${new Date(at).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}`;
}

export function AdminLiveStats({
  items,
}: {
  items: readonly { label: string; value: string | number }[];
}) {
  const { lastSyncedAt } = useAdmin();

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs" aria-live="polite">
        {formatSyncedAt(lastSyncedAt)}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="border-border/70 bg-card rounded-2xl border px-4 py-3"
          >
            <p className="text-muted-foreground text-xs">{item.label}</p>
            <p className="font-display text-ink mt-1 text-2xl tabular-nums">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
