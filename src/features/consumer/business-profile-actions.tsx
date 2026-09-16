"use client";

import { useEffect } from "react";
import { ExternalLink, Globe, Navigation, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackBusinessAction } from "@/lib/search/track-business-action";
import {
  mapsSearchDirectionsUrl,
  telHref,
} from "@/lib/contact/phone";

type Props = {
  businessId: string;
  businessName: string;
  phone?: string | null;
  website?: string | null;
  suburb?: string | null;
  city?: string | null;
  /** Sticky mobile bar variant */
  mobileBar?: boolean;
};

const profileViewsRecorded = new Set<string>();

/** Fires once per profile visit for dashboard profile-views. */
export function BusinessProfileViewBeacon({
  businessId,
}: {
  businessId: string;
}) {
  useEffect(() => {
    // Deduplicate: React Strict Mode remounts effects twice in development,
    // and soft navigations can remount the page shell without a real revisit.
    if (profileViewsRecorded.has(businessId)) return;
    profileViewsRecorded.add(businessId);

    const key = `apnapick.profile-view.${businessId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* private mode / blocked storage */
    }
    trackBusinessAction({ businessId, action: "view" });
  }, [businessId]);
  return null;
}

export function BusinessProfileActions({
  businessId,
  businessName,
  phone,
  website,
  suburb,
  city,
  mobileBar = false,
}: Props) {
  const destination = [businessName, suburb, city ?? "Pune"]
    .filter(Boolean)
    .join(", ");
  const directionsUrl = mapsSearchDirectionsUrl(destination);
  const callHref = phone ? telHref(phone) : null;

  if (mobileBar) {
    return (
      <div className="bg-background/94 border-border fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t p-3 [padding-right:max(0.75rem,env(safe-area-inset-right))] [padding-bottom:calc(0.75rem+env(safe-area-inset-bottom))] [padding-left:max(0.75rem,env(safe-area-inset-left))] backdrop-blur lg:hidden">
        {callHref ? (
          <Button asChild className="min-h-11 flex-1">
            <a
              href={callHref}
              onClick={() =>
                trackBusinessAction({ businessId, action: "call" })
              }
            >
              <Phone className="size-4" aria-hidden />
              Call
            </a>
          </Button>
        ) : null}
        <Button
          asChild
          variant={callHref ? "outline" : "default"}
          className="min-h-11 flex-1"
        >
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              trackBusinessAction({ businessId, action: "directions" })
            }
          >
            <Navigation className="size-4" aria-hidden />
            Directions
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {callHref ? (
        <Button asChild className="min-h-10">
          <a
            href={callHref}
            onClick={() => trackBusinessAction({ businessId, action: "call" })}
          >
            <Phone className="size-4" aria-hidden />
            Call
          </a>
        </Button>
      ) : null}
      <Button asChild variant="outline" className="min-h-10">
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            trackBusinessAction({ businessId, action: "directions" })
          }
        >
          <Navigation className="size-4" aria-hidden />
          Directions
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </Button>
      {website ? (
        <Button asChild variant="outline" className="min-h-10">
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              trackBusinessAction({ businessId, action: "website" })
            }
          >
            <Globe className="size-4" aria-hidden />
            Website
            <ExternalLink className="size-3.5 opacity-60" aria-hidden />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </Button>
      ) : null}
    </div>
  );
}
