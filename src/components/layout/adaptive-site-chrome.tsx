"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Atmosphere } from "@/components/brand/atmosphere";
import { SiteFooter, SiteHeader } from "@/components/layout/site-chrome";
import { WorkspaceTopbar } from "@/components/layout/workspace-topbar";
import { LocationAccessDialog } from "@/features/geo/location-access-dialog";

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
    <>
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
    </>
  );
}
