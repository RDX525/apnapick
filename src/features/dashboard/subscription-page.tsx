"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  note?: string;
};

export function SubscriptionPage() {
  const { workspace } = useDashboard();
  const businessId = workspace.profile.businessId;
  const searchParams = useSearchParams();
  const awaitingWebhook = useMemo(() => {
    const checkout = searchParams.get("checkout");
    return checkout === "return" || searchParams.get("await_webhook") === "1";
  }, [searchParams]);

  const [planCode, setPlanCode] = useState<PlanCode>("free");
  const [features, setFeatures] = useState<PlanFeatures | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
        /* catalog fallback below */
      });
    return () => controller.abort();
  }, [businessId]);

  async function startCheckout(code: "premium" | "business") {
    setBusy(code);
    setMessage(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, planCode: code }),
      });
      const json = (await res.json()) as {
        checkoutUrl?: string;
        error?: string;
      };
      if (!res.ok || !json.checkoutUrl) {
        setMessage(json.error ?? "Checkout failed");
        return;
      }
      window.location.assign(json.checkoutUrl);
    } catch {
      setMessage("Checkout failed");
    } finally {
      setBusy(null);
    }
  }

  async function openPortal() {
    setBusy("portal");
    setMessage(null);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      const json = (await res.json()) as { portalUrl?: string; error?: string };
      if (!res.ok || !json.portalUrl) {
        setMessage(json.error ?? "Billing portal unavailable");
        return;
      }
      window.location.assign(json.portalUrl);
    } catch {
      setMessage("Billing portal unavailable");
    } finally {
      setBusy(null);
    }
  }

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
              Secure billing status
            </Badge>
          </div>
          {awaitingWebhook ? (
            <p
              role="status"
              className="ap-status-warning mt-3 rounded-xl border px-3 py-2 text-sm"
            >
              Payment received. We’re securely confirming your plan; this usually takes
              only a few seconds.
            </p>
          ) : null}
          {message ? (
            <p role="status" className="text-muted-foreground mt-3 text-sm">
              {message}
            </p>
          ) : null}
          {subscription?.externalCustomerId ? (
            <Button
              type="button"
              variant="outline"
              className="mt-4 min-h-10"
              disabled={busy === "portal"}
              onClick={() => void openPortal()}
            >
              Manage billing
            </Button>
          ) : null}
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
                ) : code === "free" ? (
                  <p className="text-muted-foreground mt-4 text-xs">
                    Downgrades apply when the paid period ends (via Stripe).
                  </p>
                ) : (
                  <Button
                    type="button"
                    className="mt-4 min-h-10"
                    disabled={Boolean(busy)}
                    onClick={() => void startCheckout(code)}
                  >
                    {busy === code ? "Redirecting…" : `Upgrade to ${plan.name}`}
                  </Button>
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
