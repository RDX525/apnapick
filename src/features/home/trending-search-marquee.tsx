"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { IntentIcon } from "@/components/media/discovery-icon";
import { SearchQueryLink } from "@/components/search/search-query-link";
import { cn } from "@/lib/utils";

export function TrendingSearchMarquee({ queries }: { queries: string[] }) {
  const [paused, setPaused] = useState(false);

  return (
    <div
      className={cn(
        "ap-marquee relative mt-6 min-w-0 -mx-4 md:mx-0 md:mt-9",
        paused && "ap-marquee-paused",
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setPaused(false);
        }
      }}
      onPointerDown={() => setPaused(true)}
      onPointerUp={() => setPaused(false)}
    >
      <div className="ap-marquee-track">
        <MarqueeGroup queries={queries} />
        <MarqueeGroup queries={queries} ariaHidden />
      </div>
    </div>
  );
}

function MarqueeGroup({
  queries,
  ariaHidden = false,
}: {
  queries: string[];
  ariaHidden?: boolean;
}) {
  return (
    <div
      className="flex gap-3 pr-3"
      aria-hidden={ariaHidden || undefined}
      {...(ariaHidden ? { inert: true } : {})}
    >
      {queries.map((query, index) => (
        <SearchQueryLink
          key={`${query}-${index}`}
          query={query}
          tabIndex={ariaHidden ? -1 : 0}
          className="group border-border bg-card flex min-h-[5.25rem] w-[min(82vw,21.5rem)] shrink-0 items-center gap-3 rounded-[1.35rem] border px-4 py-3.5 shadow-[0_18px_48px_-36px_var(--surface-shadow)] md:min-h-[6.5rem] md:w-[22.5rem] md:gap-4 md:px-5"
        >
          <span className="font-display text-sea/45 hidden w-8 text-2xl md:inline">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="from-sea/15 to-sea/5 text-sea grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ring-1 ring-current/10 transition duration-300 ring-inset group-hover:scale-105 group-hover:-rotate-2">
            <IntentIcon query={query} className="size-4" />
          </span>
          <span className="text-foreground min-w-0 flex-1 font-medium">{query}</span>
          <span className="border-border bg-background/60 text-muted-foreground group-hover:bg-sea group-hover:text-primary-foreground grid size-9 shrink-0 place-items-center rounded-full border transition duration-300 group-hover:rotate-6">
            <ArrowUpRight className="size-4" aria-hidden />
          </span>
        </SearchQueryLink>
      ))}
    </div>
  );
}
