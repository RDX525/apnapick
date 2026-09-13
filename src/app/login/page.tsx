import { Suspense } from "react";
import { redirect } from "next/navigation";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { LoginForm } from "@/features/auth/login-form";
import { AuthShell } from "@/features/auth/auth-shell";
import { isReviewerAuthIntent } from "@/features/auth/auth-intent";
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

type Props = {
  searchParams: Promise<{ next?: string; intent?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const reviewer = isReviewerAuthIntent({
    next: params.next,
    intent: params.intent,
  });

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
      variant={reviewer ? "reviewer" : "owner"}
      eyebrow={reviewer ? "Leave a review" : "Business owners"}
      title={reviewer ? "Sign in to continue" : "Welcome back"}
      description={
        reviewer
          ? "Use your ApnaPick account to rate this place. You’ll return to the listing — not the business owner flow."
          : "Log in to list a new business or open the dashboard for one you already submitted."
      }
      journeyStep={reviewer ? undefined : "account"}
    >
      <Suspense
        fallback={<div className="bg-mist mt-8 h-64 animate-pulse rounded-2xl" />}
      >
        <LoginForm configured={hasSupabaseConfig()} mode={reviewer ? "reviewer" : "owner"} />
      </Suspense>
    </AuthShell>
  );
}
