import { Suspense } from "react";
import { redirect } from "next/navigation";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { LoginForm } from "@/features/auth/login-form";
import { AuthShell } from "@/features/auth/auth-shell";
import { resolveOwnerHome } from "@/features/auth/auth-redirect";
import { hasSupabaseConfig, isE2EAuthBypass } from "@/config/env";
import { getSessionUser } from "@/lib/auth/session";
import { userHasBusinessMembership } from "@/lib/auth/owner-listing";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Log in",
  description: "Log in to ApnaPick",
  path: "/login",
  noIndex: true,
});

type Props = { searchParams: Promise<{ next?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  if (hasSupabaseConfig() && !isE2EAuthBypass()) {
    const user = await getSessionUser();
    if (user) {
      redirect(
        resolveOwnerHome({
          requestedNext: params.next ?? null,
          roles: user.roles,
          hasListing: await userHasBusinessMembership(user.id),
        }),
      );
    }
  }

  return (
    <AuthShell
      eyebrow="Business owners"
      title="Welcome back"
      description="Log in to list a new business or open the dashboard for one you already submitted."
      journeyStep="account"
    >
      <Suspense
        fallback={<div className="bg-mist mt-8 h-64 animate-pulse rounded-2xl" />}
      >
        <LoginForm configured={hasSupabaseConfig()} />
      </Suspense>
    </AuthShell>
  );
}
