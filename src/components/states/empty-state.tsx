import Link from "next/link";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
  compact?: boolean;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "ap-surface flex flex-col items-center justify-center rounded-3xl px-6 py-14 text-center",
        compact && "rounded-2xl py-8",
        className,
      )}
    >
      <div className="bg-sea/10 ring-sea/15 grid size-14 place-items-center rounded-2xl ring-1">
        <Inbox className="text-sea size-6" aria-hidden />
      </div>
      <h2 className="font-display text-ink mt-5 text-2xl">{title}</h2>
      {description ? (
        <p className="text-muted-foreground mt-2 max-w-md text-sm leading-relaxed">
          {description}
        </p>
      ) : null}
      {actionLabel && actionHref ? (
        <Button asChild className="mt-6 min-h-10">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}
