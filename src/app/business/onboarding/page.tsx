import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";
import { Button } from "@/components/ui/button";
import { isFeatureEnabled } from "@/config/feature-flags";

export const metadata = buildPageMetadata({
  title: "List your business",
  description: "Claim or create your ApnaPick business profile",
  path: "/business/onboarding",
  noIndex: true,
});

export default function OnboardingPage() {
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

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sea text-sm font-medium tracking-wide uppercase">
            Business owners
          </p>
          <h1 className="font-display text-ink mt-1 text-4xl">List your business</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            Claim an existing listing or create a new one. Save anytime and pick up where
            you left off.
          </p>
        </div>
        <Button asChild variant="outline" className="min-h-10">
          <Link href="/login?next=/business/onboarding">Log in to sync</Link>
        </Button>
      </div>
      <OnboardingWizard />
    </main>
  );
}
