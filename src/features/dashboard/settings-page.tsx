"use client";

import Link from "next/link";
import { Palette } from "lucide-react";
import { ThemeControl } from "@/components/theme/theme-control";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/features/dashboard/dashboard-provider";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";
import {
  createEmptyWorkspace,
  saveWorkspaceToStorage,
} from "@/services/dashboard/workspace";

export function SettingsPage() {
  const { workspace, replace } = useDashboard();

  return (
    <DashboardShell
      activePath="/business/dashboard/settings"
      title="Settings"
      description="Account and listing controls."
    >
      <div className="space-y-4">
        <section className="ap-glass rounded-2xl p-5" aria-labelledby="theme-heading">
          <div className="flex items-start gap-3">
            <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
              <Palette className="size-5" aria-hidden />
            </span>
            <div>
              <h2 id="theme-heading" className="font-medium">
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

        <div className="border-border/70 bg-card rounded-2xl border p-5">
          <p className="font-medium">Public listing</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Slug: /b/{workspace.profile.slug}
          </p>
          <Button asChild variant="outline" className="mt-4 min-h-10">
            <Link href={`/b/${workspace.profile.slug}`}>Open public profile</Link>
          </Button>
        </div>

        <div className="border-border/70 bg-card rounded-2xl border p-5">
          <p className="font-medium">Reset local workspace</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Clears dashboard edits stored in this browser. Does not delete production
            listings.
          </p>
          <Button
            type="button"
            variant="destructive"
            className="mt-4 min-h-10"
            onClick={() => {
              const empty = createEmptyWorkspace();
              saveWorkspaceToStorage(empty);
              replace(empty);
            }}
          >
            Reset local data
          </Button>
        </div>

        <div className="border-border/70 bg-mist/50 text-muted-foreground rounded-2xl border p-5 text-sm">
          Authorization: only owners and assigned staff can mutate this business. Team
          invites and removals are audited server-side.
        </div>
      </div>
    </DashboardShell>
  );
}
