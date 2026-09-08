import { LoadingState } from "@/components/states/loading-state";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16">
      <LoadingState label="Loading ApnaPick…" rows={5} />
    </main>
  );
}
