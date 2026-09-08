import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getOptionalAdminSession } from "@/lib/auth/admin";
import { isFeatureEnabled } from "@/config/feature-flags";
import { AdminProvider } from "@/features/admin/admin-provider";
import { isE2EAuthBypass } from "@/config/env";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const e2eBypass = isE2EAuthBypass();
  if (!isFeatureEnabled("adminConsoleEnabled") && !e2eBypass) {
    return (
      <main className="mx-auto max-w-lg flex-1 px-4 py-20 text-center">
        <h1 className="font-display text-ink text-3xl">Admin disabled</h1>
        <p className="text-muted-foreground mt-2">
          Enable `adminConsoleEnabled` to open the operations console.
        </p>
      </main>
    );
  }

  if (!e2eBypass) {
    const admin = await getOptionalAdminSession();
    if (!admin) {
      redirect("/login?next=/admin");
    }
  }

  return <AdminProvider>{children}</AdminProvider>;
}
