import type { ComponentProps } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>["variant"]>;

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  approved: "Approved",
  canceled: "Canceled",
  dismissed: "Dismissed",
  draft: "Draft",
  failed: "Failed",
  flagged: "Flagged",
  hidden: "Hidden",
  in_review: "In review",
  inactive: "Inactive",
  invited: "Invited",
  new: "New",
  noindex: "Not indexed",
  open: "Open",
  past_due: "Past due",
  pending: "Pending",
  pending_review: "Pending review",
  published: "Published",
  read: "Read",
  refunded: "Refunded",
  rejected: "Rejected",
  resolved: "Resolved",
  succeeded: "Succeeded",
  suspended: "Suspended",
  under_review: "Under review",
  unclaimed: "Unclaimed",
  verified: "Verified",
  visible: "Visible",
};

const DESTRUCTIVE = new Set(["failed", "flagged", "past_due", "rejected", "suspended"]);
const POSITIVE = new Set([
  "active",
  "approved",
  "indexable",
  "published",
  "resolved",
  "succeeded",
  "verified",
  "visible",
]);
const ATTENTION = new Set([
  "draft",
  "in_review",
  "new",
  "open",
  "pending",
  "pending_review",
  "under_review",
]);

function normalizeStatus(status: string) {
  return status
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function getStatusPresentation(status: string): {
  label: string;
  variant: BadgeVariant;
  className?: string;
} {
  const normalized = normalizeStatus(status);
  const label =
    STATUS_LABELS[normalized] ??
    normalized
      .split("_")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  if (DESTRUCTIVE.has(normalized)) {
    return { label, variant: "destructive" };
  }
  if (POSITIVE.has(normalized)) {
    return {
      label,
      variant: "secondary",
      className: "bg-sea/10 text-sea border-sea/20",
    };
  }
  if (ATTENTION.has(normalized)) {
    return {
      label,
      variant: "outline",
      className: "border-accent/40 bg-accent/10 text-foreground",
    };
  }
  return { label, variant: "outline" };
}

export function StatusBadge({
  status,
  label,
  className,
  ...props
}: Omit<ComponentProps<typeof Badge>, "variant"> & {
  status: string;
  label?: string;
}) {
  const presentation = getStatusPresentation(status);

  return (
    <Badge
      variant={presentation.variant}
      className={cn(presentation.className, className)}
      {...props}
    >
      {label ?? presentation.label}
    </Badge>
  );
}
