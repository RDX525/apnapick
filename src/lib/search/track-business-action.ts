import type { SearchActionType } from "@/domain/search/types";

export type TrackBusinessActionInput = {
  businessId: string;
  action: SearchActionType;
  searchEventId?: string | null;
  queryNormalized?: string | null;
  areaSlug?: string | null;
};

/** Fire-and-forget engagement ping for CTAs (call, directions, website, view, click). */
export function trackBusinessAction(input: TrackBusinessActionInput): void {
  if (!input.businessId) return;
  void fetch("/api/search/action", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      businessId: input.businessId,
      action: input.action,
      searchEventId: input.searchEventId ?? null,
      queryNormalized: input.queryNormalized ?? null,
      areaSlug: input.areaSlug ?? null,
    }),
    keepalive: true,
  }).catch(() => {
    /* engagement must never block navigation */
  });
}
