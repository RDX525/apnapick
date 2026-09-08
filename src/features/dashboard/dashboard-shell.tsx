"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  BarChart3,
  Clock,
  ImageIcon,
  Inbox,
  LayoutDashboard,
  Settings,
  ShoppingBag,
  Star,
  Tag,
  UtensilsCrossed,
  Users,
  Wrench,
  CreditCard,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/operations/status-badge";
import { cn } from "@/lib/utils";
import { useDashboard } from "@/features/dashboard/dashboard-provider";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

const NAV: NavItem[] = [
  { href: "/business/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/business/dashboard/profile", label: "Profile", icon: ShoppingBag },
  { href: "/business/dashboard/photos", label: "Photos", icon: ImageIcon },
  { href: "/business/dashboard/hours", label: "Hours", icon: Clock },
  { href: "/business/dashboard/products", label: "Products", icon: Tag },
  { href: "/business/dashboard/services", label: "Services", icon: Wrench },
  { href: "/business/dashboard/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/business/dashboard/offers", label: "Offers", icon: Tag },
  { href: "/business/dashboard/reviews", label: "Reviews", icon: Star },
  { href: "/business/dashboard/leads", label: "Leads", icon: Inbox },
  { href: "/business/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/business/dashboard/team", label: "Team", icon: Users },
  {
    href: "/business/dashboard/subscription",
    label: "Subscription",
    icon: CreditCard,
  },
  { href: "/business/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardShell({
  children,
  activePath,
  title,
  description,
}: {
  children: ReactNode;
  activePath: string;
  title: string;
  description?: string;
}) {
  const { workspace, hydrated, saveStatus, saveError, retrySave } = useDashboard();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const activeItem = NAV.find((item) => item.href === activePath) ?? NAV[0]!;
  const ActiveIcon = activeItem.icon;

  return (
    <div className="relative flex-1 overflow-x-clip">
      <div
        className="ap-section-glow pointer-events-none absolute inset-x-0 top-0 h-64"
        aria-hidden
      />
      <main className="relative mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[240px_1fr] lg:py-10">
        <div className="ap-glass overflow-hidden rounded-2xl lg:hidden">
          <div className="flex min-h-16 items-center gap-3 px-4">
            <div className="bg-primary text-primary-foreground grid size-10 place-items-center rounded-xl">
              <ActiveIcon className="size-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground truncate text-xs">
                {workspace.profile.name}
              </p>
              <p className="text-foreground font-semibold">{activeItem.label}</p>
            </div>
            <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="border-border bg-card text-foreground ml-auto grid size-11 place-items-center rounded-xl border"
                  aria-label="Open business dashboard navigation"
                >
                  <Menu className="size-5" aria-hidden />
                </button>
              </DialogTrigger>
              <DialogContent className="top-0 right-0 bottom-0 left-auto flex h-dvh w-[min(22rem,90vw)] max-w-none translate-x-0 translate-y-0 flex-col rounded-none p-0">
                <DialogHeader className="border-border border-b p-5 pr-14">
                  <DialogTitle className="font-display truncate text-xl">
                    {workspace.profile.name}
                  </DialogTitle>
                  <DialogDescription>Business dashboard navigation</DialogDescription>
                </DialogHeader>
                <nav
                  className="flex-1 overflow-y-auto p-4"
                  aria-label="Business dashboard mobile"
                >
                  <ul className="space-y-1">
                    {NAV.map(({ href, label, icon: Icon }) => {
                      const active = activePath === href;
                      return (
                        <li key={href}>
                          <Link
                            href={href}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm",
                              active
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                            )}
                            onClick={() => setMobileNavOpen(false)}
                          >
                            <Icon className="size-4 shrink-0" aria-hidden />
                            {label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <aside className="hidden h-fit lg:sticky lg:top-[var(--ap-header-offset)] lg:block">
          <div className="ap-glass overflow-hidden rounded-2xl">
            <div className="ap-brand-panel border-brand-on/10 border-b px-4 py-5">
              <p className="text-brand-on/70 text-xs tracking-[0.18em] uppercase">
                Business
              </p>
              <p className="font-display mt-1 truncate text-xl">
                {workspace.profile.name}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <StatusBadge
                  status={workspace.profile.verificationStatus}
                  className="border-brand-on/20 bg-brand-on/15 text-brand-on hover:bg-brand-on/15"
                />
                <span className="text-brand-on/80 text-xs">
                  {workspace.profile.completeness}% complete
                </span>
              </div>
              <Progress
                value={workspace.profile.completeness}
                aria-label="Business profile completeness"
                className="bg-brand-on/20 mt-3 h-1.5"
              />
            </div>
            <nav
              className="max-h-[70vh] space-y-0.5 overflow-y-auto p-2"
              aria-label="Business dashboard"
            >
              {NAV.map(({ href, label, icon: Icon }) => {
                const active = activePath === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm transition",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                    {label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-border/60 border-t p-3">
              <Link
                href="/business/onboarding"
                className="text-sea hover:bg-secondary block rounded-xl px-3 py-2 text-sm"
              >
                Continue onboarding →
              </Link>
              {workspace.profile.slug ? (
                <Link
                  href={`/b/${workspace.profile.slug}`}
                  className="text-muted-foreground hover:bg-secondary hover:text-foreground mt-1 block rounded-xl px-3 py-2 text-sm"
                >
                  View public profile
                </Link>
              ) : null}
            </div>
          </div>
        </aside>

        <section className="min-w-0 space-y-6">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-ink text-3xl sm:text-4xl">{title}</h1>
              {description ? (
                <p className="text-muted-foreground mt-1 text-sm">{description}</p>
              ) : null}
            </div>
            <div className="text-right" aria-live="polite">
              <p
                className={cn(
                  "text-xs",
                  saveStatus === "error" ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {!hydrated || saveStatus === "loading"
                  ? "Loading…"
                  : saveStatus === "idle"
                    ? "Changes waiting to save…"
                    : saveStatus === "saving"
                      ? "Saving…"
                      : saveStatus === "saved"
                        ? "All changes saved"
                        : saveStatus === "offline"
                          ? "Offline · saved on this device"
                          : "Changes not saved to server"}
              </p>
              {(saveStatus === "error" || saveStatus === "offline") && saveError ? (
                <div className="mt-1 flex items-center justify-end gap-2">
                  <span className="text-muted-foreground max-w-xs text-xs">
                    {saveError}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={retrySave}
                  >
                    Retry
                  </Button>
                </div>
              ) : null}
            </div>
          </header>
          {!hydrated ? (
            <div className="space-y-4">
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
          ) : (
            children
          )}
        </section>
      </main>
    </div>
  );
}
