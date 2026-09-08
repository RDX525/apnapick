import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Verified indicator — only when businesses.verified_at is set.
 * Never show for claimed-only or paid placement.
 */
export function VerifiedBadge({
  verified,
  className,
}: {
  verified: boolean;
  className?: string;
}) {
  if (!verified) return null;
  return (
    <span
      className={cn(
        "bg-sea/12 text-sea inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        className,
      )}
    >
      <BadgeCheck className="size-3.5" aria-hidden />
      Verified
    </span>
  );
}

export function ClaimedBadge({
  claimed,
  verified,
  className,
}: {
  claimed: boolean;
  verified: boolean;
  className?: string;
}) {
  if (!claimed || verified) return null;
  return (
    <span
      className={cn(
        "border-border/80 text-muted-foreground inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        className,
      )}
    >
      Claimed
    </span>
  );
}
