"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
  headingLevel?: "h1" | "h2";
};

export function ErrorState({
  title = "Something went wrong",
  description = "Please try again. If the problem continues, contact support.",
  onRetry,
  className,
  headingLevel = "h2",
}: ErrorStateProps) {
  const Heading = headingLevel;
  return (
    <div
      role="alert"
      className={cn(
        "ap-surface flex flex-col items-center justify-center rounded-3xl px-6 py-14 text-center",
        className,
      )}
    >
      <div className="bg-destructive/10 ring-destructive/15 grid size-14 place-items-center rounded-2xl ring-1">
        <AlertTriangle className="text-destructive size-6" aria-hidden />
      </div>
      <Heading className="font-display text-ink mt-5 text-2xl">{title}</Heading>
      <p className="text-muted-foreground mt-2 max-w-md text-sm leading-relaxed">
        {description}
      </p>
      {onRetry ? (
        <Button type="button" className="mt-6 min-h-10" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
