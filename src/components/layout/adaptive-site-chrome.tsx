"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Atmosphere } from "@/components/brand/atmosphere";
import { SiteHeader } from "@/components/layout/site-chrome";
import { SiteFooter } from "@/components/layout/site-footer";
import { WorkspaceTopbar } from "@/components/layout/workspace-topbar";
import { InAppNavigationTracker } from "@/components/navigation/in-app-navigation-tracker";
import { LocationAccessDialog } from "@/features/geo/location-access-dialog";
import { DiscoveryAreaProvider } from "@/lib/geo/use-discovery-area";

const focusedPrefixes = [
  "/admin",
  "/business",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
];

export function AdaptiveSiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const focused = focusedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const workspace =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/business" ||
    pathname.startsWith("/business/");

  return (
    <DiscoveryAreaProvider enableLocate={!focused}>
      <InAppNavigationTracker />
      {!focused ? (
        <>
          <Atmosphere />
          <SiteHeader />
          <LocationAccessDialog />
        </>
      ) : null}
      {workspace ? <WorkspaceTopbar /> : null}
      <div
        id="main-content"
        tabIndex={-1}
        className="relative z-10 flex min-h-0 flex-1 flex-col outline-none"
      >
        {children}
      </div>
      {!focused ? <SiteFooter /> : null}
    </DiscoveryAreaProvider>
  );
}
