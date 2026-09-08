"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  Building2,
  ClipboardList,
  CreditCard,
  FileSearch,
  Flag,
  Image,
  LayoutDashboard,
  LineChart,
  Package,
  Search,
  Settings,
  Shield,
  Tags,
  Text,
  Users,
  Wrench,
  Menu,
  type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAdmin } from "@/features/admin/admin-provider";

type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type AdminNavGroup = {
  label: string;
  items: readonly AdminNavItem[];
};

export const ADMIN_NAV_GROUPS: readonly AdminNavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Directory",
    items: [
      { href: "/admin/businesses", label: "Businesses", icon: Building2 },
      { href: "/admin/claims", label: "Claims", icon: Shield },
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/categories", label: "Categories", icon: Tags },
    ],
  },
  {
    label: "Moderation",
    items: [
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/services", label: "Services", icon: Wrench },
      { href: "/admin/photos", label: "Photos", icon: Image },
      { href: "/admin/descriptions", label: "Descriptions", icon: Text },
      { href: "/admin/reviews", label: "Reviews", icon: ClipboardList },
      { href: "/admin/reports", label: "Reports", icon: Flag },
    ],
  },
  {
    label: "Growth & billing",
    items: [
      { href: "/admin/search-analytics", label: "Search Analytics", icon: Search },
      { href: "/admin/seo", label: "SEO", icon: FileSearch },
      { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
      { href: "/admin/payments", label: "Payments", icon: LineChart },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/audit-logs", label: "Audit Logs", icon: ClipboardList },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const ADMIN_NAV = ADMIN_NAV_GROUPS.flatMap((group) => group.items);

export function AdminShell({
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
  const { hydrated, saving, workspace, actionError, clearActionError } = useAdmin();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const activeItem = ADMIN_NAV.find((item) => item.href === activePath) ?? {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
  };
  const ActiveIcon = activeItem.icon;

  return (
    <div className="relative flex-1">
      <div
        className="ap-section-glow pointer-events-none absolute inset-x-0 top-0 h-56"
        aria-hidden
      />
      <main className="relative mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[240px_1fr]">
        <div className="ap-glass overflow-hidden rounded-2xl lg:hidden">
          <div className="flex min-h-16 items-center gap-3 px-4">
            <div className="bg-primary text-primary-foreground grid size-10 place-items-center rounded-xl">
              <ActiveIcon className="size-4" aria-hidden />
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Admin workspace</p>
              <p className="text-foreground font-semibold">{activeItem.label}</p>
            </div>
            <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="border-border bg-card text-foreground ml-auto grid size-11 place-items-center rounded-xl border"
                  aria-label="Open admin navigation"
                >
                  <Menu className="size-5" aria-hidden />
                </button>
              </DialogTrigger>
              <DialogContent className="top-0 right-0 bottom-0 left-auto flex h-dvh w-[min(22rem,90vw)] max-w-none translate-x-0 translate-y-0 flex-col rounded-none p-0">
                <DialogHeader className="border-border border-b p-5 pr-14">
                  <DialogTitle className="font-display text-xl">
                    Admin navigation
                  </DialogTitle>
                  <DialogDescription>
                    Platform operations and moderation
                  </DialogDescription>
                </DialogHeader>
                <nav
                  className="flex-1 space-y-5 overflow-y-auto p-4"
                  aria-label="Admin mobile"
                >
                  {ADMIN_NAV_GROUPS.map((group) => (
                    <div key={group.label}>
                      <p className="text-muted-foreground mb-1 px-3 text-xs font-medium tracking-wider uppercase">
                        {group.label}
                      </p>
                      <ul className="space-y-1">
                        {group.items.map(({ href, label, icon: Icon }) => {
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
                    </div>
                  ))}
                </nav>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <aside className="hidden h-fit lg:sticky lg:top-[var(--ap-header-offset)] lg:block">
          <div className="ap-glass overflow-hidden rounded-2xl">
            <div className="ap-brand-panel border-brand-on/10 border-b px-4 py-5">
              <p className="text-brand-on/65 text-xs tracking-[0.2em] uppercase">
                Operations
              </p>
              <p className="font-display mt-1 text-xl">Admin</p>
              <p className="text-brand-on/75 mt-2 text-xs">
                {
                  workspace.claims.filter(
                    (c) => c.status === "UNDER_REVIEW" || c.status === "PENDING",
                  ).length
                }{" "}
                open claims ·{" "}
                {workspace.reports.filter((r) => r.status === "OPEN").length} open reports
              </p>
            </div>
            <nav
              className="max-h-[72vh] space-y-4 overflow-y-auto p-2"
              aria-label="Admin"
            >
              {ADMIN_NAV_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-muted-foreground mb-1 px-3 text-[10px] font-medium tracking-wider uppercase">
                    {group.label}
                  </p>
                  {group.items.map(({ href, label, icon: Icon }) => {
                    const active = activePath === href;
                    return (
                      <Link
                        key={href}
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                        )}
                      >
                        <Icon className="size-4 opacity-80" aria-hidden />
                        {label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
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
            <p className="text-muted-foreground text-xs" aria-live="polite">
              {saving ? "Recording audit…" : hydrated ? "Server-authorized" : "Loading…"}
            </p>
          </header>
          {actionError ? (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/5 text-destructive flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm"
            >
              <span>{actionError}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={clearActionError}
              >
                Dismiss
              </Button>
            </div>
          ) : null}
          {!hydrated ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-2xl" />
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
