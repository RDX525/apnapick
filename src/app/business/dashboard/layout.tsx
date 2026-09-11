import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { DashboardProvider } from "@/features/dashboard/dashboard-provider";
import { getSessionUser } from "@/lib/auth/session";
import { userHasBusinessMembership } from "@/lib/auth/owner-listing";
import { hasSupabaseConfig, isE2EAuthBypass } from "@/config/env";

export const dynamic = "force-dynamic";

export default async function BusinessDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (hasSupabaseConfig() && !isE2EAuthBypass()) {
    const user = await getSessionUser();
    if (!user) {
      redirect("/login?next=/business/dashboard");
    }
    const hasListing = await userHasBusinessMembership(user.id);
    if (!hasListing) {
      redirect("/business/onboarding");
    }
  }

  return <DashboardProvider>{children}</DashboardProvider>;
}
