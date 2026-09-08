"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { hasInAppHistory } from "@/lib/navigation/in-app-history";
import { cn } from "@/lib/utils";

export function BackLink({
  href,
  label = "Back",
  className,
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    // history.length includes Google/Chrome behind this tab, so Back would
    // leave the site. Only pop when we navigated inside ApnaPick this session.
    if (!hasInAppHistory()) return;
    event.preventDefault();
    router.back();
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(
        "text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-2 text-sm transition-colors",
        className,
      )}
    >
      <ArrowLeft className="size-4" aria-hidden />
      {label}
    </Link>
  );
}
