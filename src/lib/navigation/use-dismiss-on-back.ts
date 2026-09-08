"use client";

import { useEffect, useRef } from "react";

/**
 * While `active`, the browser/Android back button dismisses this overlay
 * instead of leaving ApnaPick.
 */
export function useDismissOnBack(active: boolean, onDismiss: () => void) {
  const pushed = useRef(false);

  useEffect(() => {
    if (!active) return;

    window.history.pushState({ apnapickOverlay: true }, "");
    pushed.current = true;

    function onPopState() {
      pushed.current = false;
      onDismiss();
    }

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      if (pushed.current) {
        pushed.current = false;
        window.history.back();
      }
    };
  }, [active, onDismiss]);
}
