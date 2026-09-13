import { Suspense } from "react";
import { redirect } from "next/navigation";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { SignupForm } from "@/features/auth/signup-form";
import { AuthShell } from "@/features/auth/auth-shell";
import { isReviewerAuthIntent } from "@/features/auth/auth-intent";
import { resolveOwnerHome } from "@/features/auth/auth-redirect";
import { hasSupabaseConfig, isE2EAuthBypass } from "@/config/env";
import { getSessionUser } from "@/lib/auth/session";
import { userHasBusinessMembership } from "@/lib/auth/owner-listing";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Sign up",
  description: "Create an ApnaPick account",
  path: "/signup",
  noIndex: true,
});

type Props = {
  searchParams: Promise<{ next?: string; intent?: string }>;
};

export default async function SignupPage({ searchParams }: Props) {
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
      title={reviewer ? "Create an account" : "Create your owner account"}
      description={
        reviewer
          ? "Create a free ApnaPick account to post your review. Your email stays private on the listing."
          : "First create an account. Next you’ll list the business. After that, you manage it from the dashboard."
      }
      journeyStep={reviewer ? undefined : "account"}
    >
      <Suspense
        fallback={<div className="bg-mist mt-8 h-72 animate-pulse rounded-2xl" />}
      >
        <SignupForm
          configured={hasSupabaseConfig()}
          mode={reviewer ? "reviewer" : "owner"}
        />
      </Suspense>
    </AuthShell>
  );
}
