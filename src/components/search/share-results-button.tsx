"use client";

import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildWhatsAppResultsMessage,
  whatsappShareHref,
} from "@/lib/search/share-results";
import type { RankedSearchResult } from "@/domain/search/types";

type Props = {
  query: string;
  item: string | null;
  place: string;
  results: RankedSearchResult[];
  searchEventId?: string | null;
};

export function ShareResultsButton({
  query,
  item,
  place,
  results,
  searchEventId,
}: Props) {
  if (results.length === 0) return null;

  function share() {
    const url = window.location.href;
    const text = buildWhatsAppResultsMessage({
      query,
      item,
      place,
      url,
      results: results.map((result) => ({
        name: result.name,
        priceCents: result.matchedItemPriceCents,
        avgRating: result.avgRating,
      })),
    });
    const first = results[0];
    if (first) {
      void fetch("/api/search/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          businessId: first.businessId,
          action: "share",
          searchEventId,
          queryNormalized: query,
        }),
      }).catch(() => {
        /* share still works */
      });
    }
    window.open(whatsappShareHref(text), "_blank", "noopener,noreferrer");
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="min-h-11 shrink-0"
      onClick={share}
    >
      <Share2 className="size-4" aria-hidden />
      Share results
    </Button>
  );
}
