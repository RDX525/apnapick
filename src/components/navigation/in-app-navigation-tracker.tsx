"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  isRoutePop,
  markInAppPop,
  recordInAppPath,
  seedInAppPath,
} from "@/lib/navigation/in-app-history";

/** Records client-side route changes so Back stays inside ApnaPick. */
export function InAppNavigationTracker() {
  const pathname = usePathname();
  const primed = useRef(false);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    function onPopState() {
      // Dialogs add same-URL history entries so the browser Back button can
      // dismiss them. Those synthetic pops must not corrupt route history.
      if (isRoutePop(pathnameRef.current, window.location.pathname)) {
        markInAppPop();
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    pathnameRef.current = pathname;
    if (!primed.current) {
      primed.current = true;
      seedInAppPath(pathname);
      return;
    }
    recordInAppPath(pathname);
  }, [pathname]);

  return null;
}
