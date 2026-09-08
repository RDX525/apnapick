import { LoadingState } from "@/components/states/loading-state";

export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <LoadingState label="Loading business workspace" rows={5} />
    </div>
  );
}
