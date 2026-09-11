import { Suspense } from "react";
import { redirect } from "next/navigation";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { SignupForm } from "@/features/auth/signup-form";
import { AuthShell } from "@/features/auth/auth-shell";
import { resolveOwnerHome } from "@/features/auth/auth-redirect";
import { hasSupabaseConfig, isE2EAuthBypass } from "@/config/env";
import { getSessionUser } from "@/lib/auth/session";
import { userHasBusinessMembership } from "@/lib/auth/owner-listing";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Sign up",
  description: "Create an ApnaPick account and list your business",
  path: "/signup",
  noIndex: true,
});

type Props = { searchParams: Promise<{ next?: string }> };

export default async function SignupPage({ searchParams }: Props) {
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
      title="Create your owner account"
      description="First create an account. Next you’ll list the business. After that, you manage it from the dashboard."
      journeyStep="account"
    >
      <Suspense
        fallback={<div className="bg-mist mt-8 h-72 animate-pulse rounded-2xl" />}
      >
        <SignupForm configured={hasSupabaseConfig()} />
      </Suspense>
    </AuthShell>
  );
}
