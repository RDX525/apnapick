import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";
import { Button } from "@/components/ui/button";
import { isFeatureEnabled } from "@/config/feature-flags";
import { getSessionUser } from "@/lib/auth/session";

export const metadata = buildPageMetadata({
  title: "List your business",
  description:
    "Claim or create your ApnaPick profile in Kharadi, Wagholi, or Lohegaon",
  path: "/business/onboarding",
  noIndex: true,
});

export default async function OnboardingPage() {
  if (!isFeatureEnabled("businessOnboardingEnabled")) {
    return (
      <main className="mx-auto max-w-lg flex-1 px-4 py-16 text-center">
        <h1 className="font-display text-ink text-3xl">Coming soon</h1>
        <p className="text-muted-foreground mt-2">
          Business onboarding is temporarily disabled.
        </p>
      </main>
    );
  }

  const user = await getSessionUser();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:py-14">
      <div className="ap-glass relative overflow-hidden rounded-[1.75rem] px-6 py-10 sm:px-10">
        <div className="ap-accent-radial pointer-events-none absolute inset-0" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-sea text-xs font-semibold tracking-[0.14em] uppercase">
              Own a local business?
            </p>
            <h1 className="font-display text-ink mt-3 text-4xl sm:text-5xl">
              List your business
            </h1>
            <p className="text-muted-foreground mt-3 max-w-xl text-base leading-relaxed">
              Claim your profile, add the dishes and services people search for, and show
              up in Kharadi, Wagholi, and Lohegaon. Progress is saved to your account
              after you log in.
            </p>
          </div>
          <Button asChild variant="outline" className="relative min-h-11">
            {user ? (
              <Link href="/business/dashboard">Open dashboard</Link>
            ) : (
              <Link href="/login?next=/business/onboarding">Log in to save</Link>
            )}
          </Button>
        </div>
      </div>
      <div className="mt-8">
        <OnboardingWizard userId={user?.id ?? null} />
      </div>
    </main>
  );
}
