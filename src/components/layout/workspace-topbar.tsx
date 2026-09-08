"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CircleHelp, ExternalLink, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeMenu } from "@/components/theme/theme-menu";

export function WorkspaceTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const admin = pathname.startsWith("/admin");

  async function signOut() {
    try {
      const { createBrowserSupabaseClient } = await import("@/lib/db/supabase-browser");
      await createBrowserSupabaseClient().auth.signOut();
    } catch {
      // Local/demo mode has no remote session to clear.
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <header className="border-border/70 bg-background/92 sticky top-0 z-50 border-b [padding-top:env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="font-display text-ink text-xl">
          Apna<span className="ap-brand-pick">Pick</span>
        </Link>
        <span className="text-muted-foreground hidden text-xs sm:inline">
          {admin ? "Admin console" : "Business workspace"}
        </span>
        <nav className="ml-auto flex items-center gap-1" aria-label="Workspace utilities">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/help">
              <CircleHelp className="size-4" aria-hidden />
              Help
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon-sm">
            <Link href="/" aria-label="View public site">
              <ExternalLink className="size-4" aria-hidden />
            </Link>
          </Button>
          <ThemeMenu />
          <Button type="button" variant="ghost" size="icon-sm" onClick={signOut}>
            <LogOut className="size-4" aria-hidden />
            <span className="sr-only">Sign out</span>
          </Button>
        </nav>
      </div>
    </header>
  );
}
