"use client";

import { Palette } from "lucide-react";
import { ThemeControl } from "@/components/theme/theme-control";
import { Badge } from "@/components/ui/badge";
import { AdminShell } from "@/features/admin/admin-shell";
import { DEFAULT_FEATURE_FLAGS } from "@/config/feature-flags";

export function AdminSettingsPage() {
  return (
    <AdminShell
      activePath="/admin/settings"
      title="Settings"
      description="Platform flags and admin policy. Authorization is always server-side."
    >
      <section className="ap-glass rounded-2xl p-5" aria-labelledby="admin-theme-heading">
        <div className="flex items-start gap-3">
          <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Palette className="size-5" aria-hidden />
          </span>
          <div>
            <h2 id="admin-theme-heading" className="font-medium">
              Theme
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Choose your appearance or follow your device setting.
            </p>
          </div>
        </div>
        <div className="mt-5 max-w-md">
          <ThemeControl />
        </div>
      </section>

      <section className="border-border/70 bg-card rounded-2xl border p-5">
        <h2 className="font-medium">Feature flags</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Defaults baked into the server config. Override with FEATURE_FLAGS_JSON.
        </p>
        <ul className="mt-4 space-y-2">
          {Object.entries(DEFAULT_FEATURE_FLAGS).map(([key, value]) => (
            <li
              key={key}
              className="bg-mist/50 flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm"
            >
              <span className="font-mono text-xs sm:text-sm">{key}</span>
              <Badge variant={value ? "secondary" : "outline"}>
                {value ? "on" : "off"}
              </Badge>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-border/70 bg-card rounded-2xl border p-5">
        <h2 className="font-medium">Security policy</h2>
        <ul className="text-muted-foreground mt-3 list-disc space-y-2 pl-5 text-sm">
          <li>Client role checks never authorize mutations.</li>
          <li>
            Every admin action posts to /api/admin/actions and writes an audit record.
          </li>
          <li>
            Layout and API both call requireAdminSession / getOptionalAdminSession on the
            server.
          </li>
          <li>Organic ranking is never influenced by paid placement.</li>
        </ul>
      </section>
    </AdminShell>
  );
}
