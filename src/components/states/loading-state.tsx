import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type LoadingStateProps = {
  label?: string;
  className?: string;
  rows?: number;
};

export function LoadingState({
  label = "Loading…",
  className,
  rows = 3,
}: LoadingStateProps) {
  return (
    <div
      className={cn("ap-surface space-y-5 rounded-2xl p-5", className)}
      aria-busy="true"
      aria-live="polite"
    >
      <p className="sr-only">{label}</p>
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 shrink-0 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-2/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      </div>
      <div className="border-border space-y-3 border-t pt-4">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
  );
}
