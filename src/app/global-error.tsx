"use client";

import { ErrorState } from "@/components/states/error-state";
import { ThemeProvider } from "@/components/theme/theme-provider";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <body className="bg-background text-foreground flex min-h-dvh items-center justify-center p-6 font-sans">
        <ThemeProvider>
          <ErrorState
            headingLevel="h1"
            title="ApnaPick failed to load"
            description={
              error.digest
                ? `A critical error occurred. Reference: ${error.digest}`
                : "A critical error occurred. Please try again."
            }
            onRetry={reset}
            className="w-full max-w-lg"
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
