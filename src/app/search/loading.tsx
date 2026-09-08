import { LoadingState } from "@/components/states/loading-state";
import { Skeleton } from "@/components/ui/skeleton";

export default function SearchLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8 sm:px-6">
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-8 w-1/2" />
      <div className="grid gap-6 lg:grid-cols-[240px_1fr_300px]">
        <LoadingState rows={4} className="hidden lg:block" />
        <div className="space-y-4">
          <LoadingState rows={3} />
          <LoadingState rows={3} />
        </div>
        <Skeleton className="hidden aspect-[4/5] rounded-2xl lg:block" />
      </div>
    </main>
  );
}
