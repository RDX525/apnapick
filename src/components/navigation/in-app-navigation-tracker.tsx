"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  markInAppPop,
  recordInAppPath,
  seedInAppPath,
} from "@/lib/navigation/in-app-history";

/** Records client-side route changes so Back stays inside ApnaPick. */
export function InAppNavigationTracker() {
  const pathname = usePathname();
  const primed = useRef(false);

  useEffect(() => {
    function onPopState() {
      markInAppPop();
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!primed.current) {
      primed.current = true;
      seedInAppPath(pathname);
      return;
    }
    recordInAppPath(pathname);
  }, [pathname]);

  return null;
}
