import Link from "next/link";
import { PRIMARY_NAV } from "@/config/site-nav";

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
