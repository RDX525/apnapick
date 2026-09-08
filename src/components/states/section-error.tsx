"use client";

import { ErrorState } from "@/components/states/error-state";

export function SectionError({
  error,
  reset,
  title = "This section could not load",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <ErrorState
        title={title}
        description={
          error.digest
            ? `Please try again. Reference: ${error.digest}`
            : "Please try again. Your existing data has not been changed."
        }
        onRetry={reset}
      />
    </div>
  );
}
