"use client";

import { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/operations/status-badge";
import { useDashboard } from "@/features/dashboard/dashboard-provider";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";
import { PLAN_CATALOG } from "@/config/billing-plans";
import type { PlanCode, PlanFeatures, Subscription } from "@/domain/billing/types";

function formatInr(cents: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

type EntitlementResponse = {
  planCode?: PlanCode;
  features?: PlanFeatures;
  subscription?: Subscription | null;
};

export function SubscriptionPage() {
  const { workspace } = useDashboard();
  const businessId = workspace.profile.businessId;

  const [planCode, setPlanCode] = useState<PlanCode>("free");
  const [features, setFeatures] = useState<PlanFeatures | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    if (!businessId) return;
    const controller = new AbortController();
    void fetch(`/api/billing/subscription?businessId=${businessId}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((json: EntitlementResponse & { error?: string }) => {
        if (json.error) return;
        if (json.planCode) setPlanCode(json.planCode);
        if (json.features) setFeatures(json.features);
        setSubscription(json.subscription ?? null);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
      });
    return () => controller.abort();
  }, [businessId]);

  const codes = Object.keys(PLAN_CATALOG) as PlanCode[];

  return (
    <DashboardShell
      activePath="/business/dashboard/subscription"
      title="Subscription"
      description="Plans power features — never organic search rank. Sponsored placement is separate and labeled."
    >
      <div className="space-y-6">
        <div className="border-border/70 bg-card rounded-2xl border p-5">
          <div className="flex flex-wrap items-center gap-3">
            <CreditCard className="text-sea size-5" aria-hidden />
            <div>
              <p className="font-medium">Current plan</p>
              <p className="text-muted-foreground text-sm">
                {PLAN_CATALOG[planCode].name}
              </p>
            </div>
            {subscription?.status ? <StatusBadge status={subscription.status} /> : null}
            <Badge variant="secondary" className="ml-auto">
              Coming soon
            </Badge>
          </div>
          <p role="status" className="text-muted-foreground mt-3 text-sm">
            Paid plans are coming soon. Checkout is disabled for now — you can keep
            using the Free plan.
          </p>
        </div>

        <ul className="grid gap-4 md:grid-cols-3">
          {codes.map((code) => {
            const plan = PLAN_CATALOG[code];
            const current = code === planCode;
            return (
              <li
                key={code}
                className="border-border/70 bg-card flex flex-col rounded-2xl border p-5"
              >
                <p className="font-display text-ink text-xl">{plan.name}</p>
                <p className="text-muted-foreground mt-1 text-sm">{plan.description}</p>
                <p className="mt-4 text-2xl font-medium">
                  {plan.priceCents === 0 ? "₹0" : formatInr(plan.priceCents)}
                  {plan.priceCents > 0 ? (
                    <span className="text-muted-foreground text-sm font-normal">/mo</span>
                  ) : null}
                </p>
                <ul className="text-muted-foreground mt-4 flex-1 space-y-1 text-sm">
                  {code === "free" ? (
                    <>
                      <li>Basic profile</li>
                      <li>Basic products & services</li>
                      <li>Basic analytics</li>
                    </>
                  ) : (
                    <>
                      <li>Enhanced profile & media</li>
                      <li>Offers, leads, team</li>
                      <li>Advanced analytics</li>
                      {code === "business" ? (
                        <li>Sponsored placement eligibility</li>
                      ) : null}
                    </>
                  )}
                </ul>
                {current ? (
                  <Badge className="mt-4 w-fit" variant="secondary">
                    Current
                  </Badge>
                ) : (
                  <Badge className="mt-4 w-fit" variant="secondary">
                    Coming soon
                  </Badge>
                )}
              </li>
            );
          })}
        </ul>

        {features ? (
          <div className="border-border/70 bg-card text-muted-foreground rounded-2xl border p-5 text-sm">
            <p className="text-foreground font-medium">Entitlements</p>
            <p className="mt-2">
              Photos {features.maxPhotos} · Products {features.maxProducts} · Team{" "}
              {features.maxTeamMembers} · Sponsored eligible{" "}
              {features.sponsoredEligible ? "yes" : "no"}
            </p>
          </div>
        ) : null}
      </div>
    </DashboardShell>
  );
}
