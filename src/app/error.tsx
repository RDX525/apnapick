"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/states/error-state";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app_error]", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 items-center px-4 py-16">
      <ErrorState
        headingLevel="h1"
        title="We hit a snag"
        description={
          error.digest
            ? `Something went wrong while loading this page. Reference: ${error.digest}`
            : "Something went wrong while loading this page."
        }
        onRetry={reset}
        className="w-full"
      />
    </main>
  );
}
