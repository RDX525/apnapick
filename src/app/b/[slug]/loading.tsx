import { LoadingState } from "@/components/states/loading-state";
import { Skeleton } from "@/components/ui/skeleton";

export default function BusinessLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8 sm:px-6">
      <Skeleton className="h-64 w-full rounded-[1.75rem] sm:h-80" />
      <Skeleton className="h-10 w-1/2" />
      <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
        <LoadingState rows={6} />
        <LoadingState rows={4} />
      </div>
    </main>
  );
}
