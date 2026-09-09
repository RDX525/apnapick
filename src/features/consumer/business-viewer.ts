"use client";

import { hasBrowserAuthCookie } from "@/lib/auth/browser-session";
import type { PublicReview, RatingSummary } from "@/domain/reviews/types";

export type BusinessViewerPayload = {
  summary: RatingSummary;
  reviews: PublicReview[];
  ownReview: PublicReview | null;
  signedIn: boolean;
  canReply: boolean;
  isOwner: boolean;
};

const inflight = new Map<string, Promise<BusinessViewerPayload | null>>();

export function loadBusinessViewer(businessId: string) {
  const existing = inflight.get(businessId);
  if (existing) return existing;

  const request = (async () => {
    if (!hasBrowserAuthCookie()) return null;
    const res = await fetch(`/api/reviews?businessId=${businessId}`);
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: BusinessViewerPayload };
    return json.data ?? null;
  })();

  inflight.set(businessId, request);
  return request;
}
