"use client";

import Link from "next/link";
import {
  Eye,
  MousePointerClick,
  Phone,
  Search,
  Globe,
  Navigation,
  MessageCircle,
  Heart,
  Star,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/operations/status-badge";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";
import { useDashboard } from "@/features/dashboard/dashboard-provider";
import { cn } from "@/lib/utils";

const METRIC_CARDS = [
  { key: "profileViews", label: "Profile views", icon: Eye },
  { key: "searchAppearances", label: "Search appearances", icon: Search },
  { key: "clicks", label: "Clicks", icon: MousePointerClick },
  { key: "calls", label: "Calls", icon: Phone },
  { key: "websiteVisits", label: "Website visits", icon: Globe },
  { key: "directions", label: "Directions", icon: Navigation },
  { key: "enquiries", label: "Enquiries", icon: MessageCircle },
  { key: "saves", label: "Saves", icon: Heart },
  { key: "reviews", label: "Reviews", icon: Star },
] as const;

export function DashboardOverview({ submitted }: { submitted?: boolean }) {
  const { workspace, insights } = useDashboard();
  const m = workspace.metrics;
  const locationLabel = [workspace.profile.suburb, workspace.profile.city]
    .filter(Boolean)
    .join(", ");

  return (
    <DashboardShell
      activePath="/business/dashboard"
      title="Dashboard"
      description={
        locationLabel ? `${m.periodLabel} · ${locationLabel}` : m.periodLabel
      }
    >
      {submitted ? (
        <div
          role="status"
          className="border-sea/30 bg-sea/10 rounded-xl border px-4 py-3 text-sm"
        >
          Submitted for approval. We’ll notify you when review completes.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="ap-surface rounded-2xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-muted-foreground text-sm">Profile completeness</p>
              <p className="text-ink mt-1 text-4xl font-semibold tracking-tight tabular-nums">
                {workspace.profile.completeness}%
              </p>
            </div>
            <StatusBadge status={workspace.profile.verificationStatus} />
          </div>
          <Progress
            value={workspace.profile.completeness}
            aria-label="Business profile completeness"
            className="mt-4 h-2"
          />
          <p className="text-muted-foreground mt-3 text-sm">
            Listing status:{" "}
            <StatusBadge
              status={workspace.profile.status}
              className="ml-1 align-middle"
            />
          </p>
          <Button asChild className="mt-5 min-h-10">
            <Link href="/business/onboarding">Improve profile</Link>
          </Button>
        </div>

        <div className="ap-media-gradient-soft border-border/70 rounded-2xl border p-6">
          <p className="text-sm font-medium">This month at a glance</p>
          <p className="text-ink mt-3 text-3xl font-semibold tracking-tight tabular-nums">
            {m.searchAppearances.toLocaleString("en-IN")}
          </p>
          <p className="text-muted-foreground text-sm">search appearances</p>
          <p className="text-muted-foreground mt-4 text-sm">
            {m.clicks} clicks · {m.calls} calls · {m.directions} directions
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {METRIC_CARDS.map(({ key, label, icon: Icon }) => (
          <div key={key} className="ap-surface rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-muted-foreground text-sm">{label}</p>
              <Icon className="text-sea size-4" aria-hidden />
            </div>
            <p className="text-ink mt-2 text-2xl font-semibold tracking-tight tabular-nums">
              {m[key].toLocaleString("en-IN")}
            </p>
          </div>
        ))}
      </div>

      <section aria-labelledby="insights-heading" className="space-y-3">
        <h2 id="insights-heading" className="font-display text-ink text-2xl">
          Insights
        </h2>
        <ul className="space-y-3">
          {insights.map((insight) => (
            <li
              key={insight.id}
              className={cn(
                "rounded-2xl border p-5",
                insight.tone === "action" && "ap-status-warning",
                insight.tone === "info" && "ap-status-info",
                insight.tone === "success" && "ap-status-success",
              )}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-foreground font-medium">{insight.title}</p>
                  <p className="text-muted-foreground mt-1 text-sm">{insight.body}</p>
                </div>
                {insight.href && insight.cta ? (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="min-h-9 shrink-0"
                  >
                    <Link href={insight.href}>
                      {insight.cta}
                      <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </DashboardShell>
  );
}
