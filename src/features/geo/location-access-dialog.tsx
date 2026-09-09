"use client";

import { useCallback, useEffect, useState } from "react";
import { useDismissOnBack } from "@/lib/navigation/use-dismiss-on-back";
import { LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  dismissLocationAccess,
  getLocationAccessState,
  keepCurrentLocationSelection,
  requestDeviceLocation,
  subscribeLocationAccess,
  type LocationAccessReason,
} from "@/lib/geo/location-access";

const COPY: Record<
  LocationAccessReason,
  { title: string; description: string; action: string }
> = {
  prompt: {
    title: "Allow location access",
    description:
      "ApnaPick uses your current location to show nearby businesses. Precise coordinates stay in this browser session only.",
    action: "Allow location",
  },
  denied: {
    title: "Location is blocked",
    description:
      "Enable location for this site in your browser settings, then tap Try again. The menu stays on Current location until you pick Kharadi, Wagholi, or Lohegaon.",
    action: "Try again",
  },
  unavailable: {
    title: "Couldn't read your location",
    description:
      "Check that location is turned on, then try again. Until then the menu stays on Current location — or pick a neighbourhood.",
    action: "Try again",
  },
  unsupported: {
    title: "Location isn't available",
    description:
      "This browser can't share your location. The menu stays on Current location, or pick Kharadi, Wagholi, or Lohegaon.",
    action: "Try again",
  },
};

export function LocationAccessDialog() {
  const [state, setState] = useState(getLocationAccessState);
  const [pending, setPending] = useState(false);

  useEffect(() => subscribeLocationAccess(() => setState(getLocationAccessState())), []);

  async function onAllow() {
    setPending(true);
    try {
      await requestDeviceLocation();
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    if (!state.open || typeof navigator === "undefined") return;
    if (!navigator.permissions?.query) return;
    let cancelled = false;
    let status: PermissionStatus | null = null;
    void navigator.permissions
      .query({ name: "geolocation" })
      .then((next) => {
        if (cancelled) return;
        status = next;
        status.onchange = () => {
          if (status?.state === "granted") void onAllow();
        };
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (status) status.onchange = null;
    };
  }, [state.open]);

  const keepCurrentLocation = useCallback(() => {
    keepCurrentLocationSelection();
    dismissLocationAccess();
  }, []);

  useDismissOnBack(state.open, keepCurrentLocation);

  const copy = COPY[state.reason];

  return (
    <Dialog
      open={state.open}
      onOpenChange={(open) => {
        if (pending || open) return;
        if (!getLocationAccessState().open) return;
        keepCurrentLocation();
      }}
    >
      <DialogContent showCloseButton={!pending} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LocateFixed className="text-sea size-4" aria-hidden />
            {copy.title}
          </DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={keepCurrentLocation}
          >
            Not now
          </Button>
          {state.reason === "unsupported" ? null : (
            <Button type="button" disabled={pending} onClick={() => void onAllow()}>
              {pending ? "Waiting for permission…" : copy.action}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
