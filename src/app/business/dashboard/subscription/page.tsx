import { Suspense } from "react";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { SubscriptionPage } from "@/features/dashboard/subscription-page";

export const metadata = buildPageMetadata({
  title: "Subscription · Dashboard",
  description: "Manage ApnaPick plan and billing",
  path: "/business/dashboard/subscription",
  noIndex: true,
});

export default function Page() {
  return (
    <Suspense
      fallback={<div className="text-muted-foreground p-6 text-sm">Loading…</div>}
    >
      <SubscriptionPage />
    </Suspense>
  );
}
