"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type MouseEvent } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeMenu } from "@/components/theme/theme-menu";
import { AreaSelect } from "@/features/geo/area-select";
import { useDiscoveryArea } from "@/lib/geo/use-discovery-area";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { PRIMARY_NAV, navLinkIsActive } from "@/config/site-nav";

export function SiteHeader({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { area, setArea, locating } = useDiscoveryArea();

  function handleNavigation() {
    setOpen(false);
  }

  function handleHomeClick(event: MouseEvent<HTMLAnchorElement>) {
    handleNavigation();

    if (
      pathname === "/" &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="sticky top-0 z-50 px-3 [padding-top:var(--ap-chrome-top)] sm:px-4">
        <header
          className={cn(
            "ap-glass ap-sticky-chrome mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 rounded-2xl px-3 sm:h-16 sm:gap-3 sm:px-5",
            className,
          )}
        >
          <Link
            href="/"
            scroll
            onClick={handleHomeClick}
            className="group focus-visible:ring-ring flex min-h-11 shrink-0 items-center rounded-sm outline-none focus-visible:ring-2"
          >
            <span className="font-display text-ink text-2xl tracking-tight">
              Apna<span className="ap-brand-pick">Pick</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            {PRIMARY_NAV.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                scroll
                onClick={handleNavigation}
                aria-current={navLinkIsActive(pathname, link.href) ? "page" : undefined}
                className={
                  navLinkIsActive(pathname, link.href)
                    ? "bg-secondary text-foreground inline-flex min-h-11 items-center rounded-full px-3 text-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground inline-flex min-h-11 items-center rounded-full px-3 text-sm transition-colors"
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <div className="hidden sm:block">
              <AreaSelect
                id="apnapick-header-location"
                value={area}
                onChange={setArea}
                locating={locating}
                variant="chip"
              />
            </div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden min-h-11 sm:inline-flex"
            >
              <Link href="/login" scroll onClick={handleNavigation}>
                Log in
              </Link>
            </Button>
            <div className="hidden lg:block">
              <ThemeMenu />
            </div>
            <Button asChild size="sm" className="ap-cta-glow min-h-11 px-3">
              <Link href="/business/onboarding" scroll onClick={handleNavigation}>
                <span className="hidden min-[380px]:inline">List your business</span>
                <span className="min-[380px]:hidden">List</span>
              </Link>
            </Button>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 min-w-11 px-2 lg:hidden"
                aria-expanded={open}
              >
                {open ? (
                  <X className="size-4" aria-hidden />
                ) : (
                  <Menu className="size-4" aria-hidden />
                )}
                <span className="sr-only">Menu</span>
              </Button>
            </DialogTrigger>
          </div>
        </header>
      </div>
      <DialogContent className="top-[var(--ap-chrome-top)] max-h-[min(36rem,calc(100dvh-5rem))] translate-y-0 overflow-y-auto lg:hidden">
        <DialogHeader>
          <DialogTitle>Explore ApnaPick</DialogTitle>
          <DialogDescription>
            Discover local businesses or manage your listing.
          </DialogDescription>
        </DialogHeader>
        <nav aria-label="Mobile">
          <ul className="space-y-1">
            {PRIMARY_NAV.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  scroll
                  className="text-foreground hover:bg-secondary flex min-h-11 items-center rounded-xl px-3 text-sm"
                  onClick={handleNavigation}
                  aria-current={navLinkIsActive(pathname, link.href) ? "page" : undefined}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="px-3 py-2 sm:hidden">
              <p className="text-muted-foreground mb-2 text-xs font-medium">Location</p>
              <AreaSelect
                id="apnapick-menu-location"
                value={area}
                onChange={setArea}
                locating={locating}
                variant="chip"
                className="w-full min-w-0"
              />
            </li>
            <li>
              <Link
                href="/login"
                scroll
                className="text-foreground hover:bg-secondary flex min-h-11 items-center rounded-xl px-3 text-sm sm:hidden"
                onClick={handleNavigation}
              >
                Log in
              </Link>
            </li>
            <li className="text-foreground flex min-h-11 items-center justify-between rounded-xl px-3 text-sm lg:hidden">
              <span>Color theme</span>
              <ThemeMenu />
            </li>
          </ul>
        </nav>
      </DialogContent>
    </Dialog>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-border/70 bg-background/80 relative z-10 mt-auto border-t">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-5">
        <div className="sm:col-span-2 lg:col-span-2">
          <p className="font-display text-ink text-2xl">
            Apna<span className="ap-brand-pick">Pick</span>
          </p>
          <p className="text-muted-foreground mt-3 max-w-sm text-sm leading-relaxed">
            Intent-first local discovery for Pune. Search what you need — we match
            businesses that actually offer it.
          </p>
        </div>
        <div>
          <p className="text-foreground text-sm font-medium">Explore</p>
          <ul className="text-muted-foreground mt-3 space-y-1 text-sm">
            {PRIMARY_NAV.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  scroll
                  className="hover:text-foreground inline-flex min-h-11 items-center transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-foreground text-sm font-medium">Business</p>
          <ul className="text-muted-foreground mt-3 space-y-1 text-sm">
            <li>
              <Link
                href="/business/onboarding"
                className="hover:text-foreground inline-flex min-h-11 items-center transition-colors"
              >
                List your business
              </Link>
            </li>
            <li>
              <Link
                href="/business/dashboard"
                className="hover:text-foreground inline-flex min-h-11 items-center transition-colors"
              >
                Dashboard
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-foreground text-sm font-medium">Trust & support</p>
          <ul className="text-muted-foreground mt-3 space-y-1 text-sm">
            <li>
              <Link
                href="/help"
                className="hover:text-foreground inline-flex min-h-11 items-center transition-colors"
              >
                Help center
              </Link>
            </li>
            <li>
              <Link
                href="/verification"
                className="hover:text-foreground inline-flex min-h-11 items-center transition-colors"
              >
                Verification
              </Link>
            </li>
            <li>
              <Link
                href="/ranking"
                className="hover:text-foreground inline-flex min-h-11 items-center transition-colors"
              >
                How ranking works
              </Link>
            </li>
            <li>
              <a
                href="mailto:support@apnapick.com"
                className="hover:text-foreground inline-flex min-h-11 items-center transition-colors"
              >
                Contact
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-border/60 text-muted-foreground border-t px-4 py-4 text-xs">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <span>© 2026 ApnaPick · Pune</span>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/privacy"
              className="hover:text-foreground inline-flex min-h-11 items-center"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="hover:text-foreground inline-flex min-h-11 items-center"
            >
              Terms
            </Link>
            <Link
              href="/accessibility"
              className="hover:text-foreground inline-flex min-h-11 items-center"
            >
              Accessibility
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
