import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { DashboardProvider } from "@/features/dashboard/dashboard-provider";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig, isE2EAuthBypass } from "@/config/env";

export const dynamic = "force-dynamic";

export default async function BusinessDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  // When auth is configured, dashboard requires a session.
  // Local demo without Supabase remains usable for UI development.
  if (hasSupabaseConfig() && !isE2EAuthBypass()) {
    const user = await getSessionUser();
    if (!user) {
      redirect("/login?next=/business/dashboard");
    }
  }

  return <DashboardProvider>{children}</DashboardProvider>;
}
