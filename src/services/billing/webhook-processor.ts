import "server-only";

import { createAdminClient } from "@/lib/db/supabase-admin";
import { hasServiceRoleKey } from "@/config/env";
import { createLogger } from "@/lib/logging/logger";
import type { VerifiedWebhookEvent } from "@/integrations/payments/types";
import {
  mapStripeSubscriptionStatus,
  meta,
  num,
  str,
  ts,
} from "@/services/billing/stripe-mappers";

const log = createLogger({ module: "billing.webhook" });

export type WebhookProcessResult = {
  duplicate: boolean;
  processed: boolean;
  eventId: string;
  eventType: string;
};

/**
 * Idempotent Stripe (or stub) webhook processor.
 * Stripe events are the source of truth for subscription state.
 * Never call this from a client “payment success” callback alone.
 */
export async function processBillingWebhookEvent(
  event: VerifiedWebhookEvent,
  provider = "stripe",
): Promise<WebhookProcessResult> {
  if (!hasServiceRoleKey()) {
    log.warn("webhook_skipped_no_service_role", { eventId: event.id });
    return {
      duplicate: false,
      processed: false,
      eventId: event.id,
      eventType: event.type,
    };
  }

  const admin = createAdminClient();

  // Ledger insert first — unique (provider, provider_event_id) enforces idempotency
  const { error: insertError } = await admin.from("subscription_events").insert({
    provider,
    provider_event_id: event.id,
    event_type: event.type,
    payload: {
      dataObject: event.dataObject,
      created: event.created,
      livemode: event.livemode,
    },
  });

  if (insertError) {
    const code = (insertError as { code?: string }).code;
    const msg = insertError.message?.toLowerCase() ?? "";
    if (code === "23505" || msg.includes("duplicate") || msg.includes("unique")) {
      log.info("webhook_duplicate", { eventId: event.id, type: event.type });
      return {
        duplicate: true,
        processed: false,
        eventId: event.id,
        eventType: event.type,
      };
    }
    throw insertError;
  }

  try {
    await applyEvent(admin, event, event.id);
  } catch (err) {
    log.error("webhook_apply_failed", {
      eventId: event.id,
      type: event.type,
      message: err instanceof Error ? err.message : String(err),
    });
    // Event is already ledgered — do not rethrow as 5xx that causes infinite retries
    // for poison payloads; Stripe will retry only on non-2xx. Prefer 2xx after ledger.
    // Re-throw only for unexpected infra so Stripe retries when DB was flaky mid-apply.
    throw err;
  }

  return {
    duplicate: false,
    processed: true,
    eventId: event.id,
    eventType: event.type,
  };
}

type Admin = ReturnType<typeof createAdminClient>;

async function applyEvent(
  admin: Admin,
  event: VerifiedWebhookEvent,
  ledgerEventId: string,
) {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscriptionId = await upsertSubscriptionFromStripe(
        admin,
        event.dataObject,
        event.type,
      );
      const businessId = await resolveBusinessId(admin, event.dataObject);
      if (businessId || subscriptionId) {
        await admin
          .from("subscription_events")
          .update({
            business_id: businessId,
            subscription_id: subscriptionId,
          })
          .eq("provider_event_id", ledgerEventId);
      }
      break;
    }
    case "invoice.paid":
    case "invoice.payment_failed":
    case "invoice.finalized":
      await upsertInvoiceFromStripe(admin, event.dataObject, event.type);
      break;
    case "checkout.session.completed":
      // Do NOT activate subscription here — wait for subscription.* events.
      await linkCheckoutSession(admin, event.dataObject);
      break;
    case "payment_intent.succeeded":
    case "payment_intent.payment_failed":
      await upsertPaymentFromIntent(admin, event.dataObject, event.type);
      break;
    default:
      log.info("webhook_ignored_type", { type: event.type, id: event.id });
  }
}

async function resolveBusinessId(
  admin: Admin,
  obj: Record<string, unknown>,
): Promise<string | null> {
  const m = meta(obj);
  if (m.business_id) return m.business_id;

  const customerId = str(obj.customer);
  if (customerId) {
    const { data } = await admin
      .from("subscriptions")
      .select("business_id")
      .eq("external_customer_id", customerId)
      .limit(1)
      .maybeSingle();
    if (data?.business_id) return data.business_id as string;
  }

  const subId = str(obj.subscription) ?? str(obj.id);
  if (subId && obj.object === "subscription") {
    const { data } = await admin
      .from("subscriptions")
      .select("business_id")
      .eq("external_subscription_id", subId)
      .maybeSingle();
    if (data?.business_id) return data.business_id as string;
  }

  return null;
}

async function resolvePlanId(
  admin: Admin,
  obj: Record<string, unknown>,
): Promise<string | null> {
  const m = meta(obj);
  const planCode = m.plan_code;
  if (planCode) {
    const { data } = await admin
      .from("plans")
      .select("id")
      .eq("code", planCode)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }

  // Prefer price id from subscription items
  const items = obj.items as { data?: Array<{ price?: { id?: string } }> } | undefined;
  const priceId = items?.data?.[0]?.price?.id;
  if (priceId) {
    const { data } = await admin
      .from("plans")
      .select("id")
      .eq("external_price_id", priceId)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }

  const { data: premium } = await admin
    .from("plans")
    .select("id")
    .eq("code", "premium")
    .maybeSingle();
  return (premium?.id as string) ?? null;
}

async function upsertSubscriptionFromStripe(
  admin: Admin,
  obj: Record<string, unknown>,
  eventType: string,
): Promise<string | null> {
  const externalSubId = str(obj.id);
  if (!externalSubId) return null;

  const businessId = await resolveBusinessId(admin, obj);
  const planId = await resolvePlanId(admin, obj);
  if (!businessId || !planId) {
    log.warn("subscription_missing_refs", {
      externalSubId,
      businessId,
      planId,
      eventType,
    });
    return null;
  }

  const status =
    eventType === "customer.subscription.deleted"
      ? "CANCELED"
      : mapStripeSubscriptionStatus(str(obj.status));

  const row = {
    business_id: businessId,
    plan_id: planId,
    status,
    current_period_start: ts(obj.current_period_start),
    current_period_end: ts(obj.current_period_end),
    cancel_at: ts(obj.cancel_at),
    canceled_at: ts(obj.canceled_at),
    external_customer_id: str(obj.customer),
    external_subscription_id: externalSubId,
    metadata: {
      stripe_status: obj.status,
      source: "stripe_webhook",
    },
  };

  const { data: existing } = await admin
    .from("subscriptions")
    .select("id")
    .eq("external_subscription_id", externalSubId)
    .maybeSingle();

  if (existing?.id) {
    await admin.from("subscriptions").update(row).eq("id", existing.id);
    return existing.id as string;
  }

  // One active/trialing/past_due per business — cancel prior actives when activating
  if (status === "ACTIVE" || status === "TRIALING" || status === "PAST_DUE") {
    await admin
      .from("subscriptions")
      .update({ status: "CANCELED", canceled_at: new Date().toISOString() })
      .eq("business_id", businessId)
      .in("status", ["TRIALING", "ACTIVE", "PAST_DUE"]);
  }

  const { data: created } = await admin
    .from("subscriptions")
    .insert(row)
    .select("id")
    .single();

  if (created?.id) {
    log.info("subscription_upserted", {
      subscriptionId: created.id,
      businessId,
      status,
    });
    return created.id as string;
  }
  return null;
}

async function upsertInvoiceFromStripe(
  admin: Admin,
  obj: Record<string, unknown>,
  eventType: string,
) {
  const externalInvoiceId = str(obj.id);
  if (!externalInvoiceId) return;

  const businessId = await resolveBusinessId(admin, obj);
  if (!businessId) {
    log.warn("invoice_missing_business", { externalInvoiceId });
    return;
  }

  const externalSubId = str(obj.subscription);
  let subscriptionId: string | null = null;
  if (externalSubId) {
    const { data } = await admin
      .from("subscriptions")
      .select("id")
      .eq("external_subscription_id", externalSubId)
      .maybeSingle();
    subscriptionId = (data?.id as string) ?? null;
  }

  const stripeStatus = str(obj.status) ?? "open";
  let status = stripeStatus;
  if (eventType === "invoice.paid") status = "paid";
  if (eventType === "invoice.payment_failed") status = "open";

  const amount = num(obj.amount_paid) ?? num(obj.amount_due) ?? num(obj.total) ?? 0;

  const invoiceRow = {
    business_id: businessId,
    subscription_id: subscriptionId,
    amount_cents: amount,
    currency: (str(obj.currency) ?? "inr").toUpperCase().slice(0, 3),
    status,
    provider: "stripe",
    external_invoice_id: externalInvoiceId,
    hosted_invoice_url: str(obj.hosted_invoice_url),
    invoice_pdf_url: str(obj.invoice_pdf),
    period_start: ts(
      (obj.lines as { data?: Array<{ period?: { start?: number } }> })?.data?.[0]?.period
        ?.start,
    ),
    period_end: ts(
      (obj.lines as { data?: Array<{ period?: { end?: number } }> })?.data?.[0]?.period
        ?.end,
    ),
    paid_at: eventType === "invoice.paid" ? new Date().toISOString() : null,
    metadata: { stripe_status: stripeStatus, event_type: eventType },
  };

  const { data: existing } = await admin
    .from("invoices")
    .select("id")
    .eq("provider", "stripe")
    .eq("external_invoice_id", externalInvoiceId)
    .maybeSingle();

  let invoiceId = existing?.id as string | undefined;
  if (invoiceId) {
    await admin.from("invoices").update(invoiceRow).eq("id", invoiceId);
  } else {
    const { data: created } = await admin
      .from("invoices")
      .insert(invoiceRow)
      .select("id")
      .single();
    invoiceId = created?.id as string | undefined;
  }

  // Mirror payment row on paid / failed
  if (eventType === "invoice.paid" || eventType === "invoice.payment_failed") {
    const paymentIntent = str(obj.payment_intent);
    const paymentStatus = eventType === "invoice.paid" ? "SUCCEEDED" : "FAILED";
    const paymentRow = {
      business_id: businessId,
      subscription_id: subscriptionId,
      amount_cents: amount,
      currency: invoiceRow.currency,
      status: paymentStatus,
      provider: "stripe",
      external_payment_id: paymentIntent ?? `invoice:${externalInvoiceId}`,
      paid_at: paymentStatus === "SUCCEEDED" ? new Date().toISOString() : null,
      metadata: { invoice_id: externalInvoiceId },
    };

    const externalPaymentId = paymentRow.external_payment_id;
    const { data: payExisting } = await admin
      .from("payments")
      .select("id")
      .eq("provider", "stripe")
      .eq("external_payment_id", externalPaymentId)
      .maybeSingle();

    if (payExisting?.id) {
      await admin.from("payments").update(paymentRow).eq("id", payExisting.id);
      if (invoiceId) {
        await admin
          .from("invoices")
          .update({ payment_id: payExisting.id })
          .eq("id", invoiceId);
      }
    } else {
      const { data: payCreated } = await admin
        .from("payments")
        .insert(paymentRow)
        .select("id")
        .single();
      if (payCreated?.id && invoiceId) {
        await admin
          .from("invoices")
          .update({ payment_id: payCreated.id })
          .eq("id", invoiceId);
      }
    }
  }
}

async function linkCheckoutSession(admin: Admin, obj: Record<string, unknown>) {
  // Record customer linkage only — subscription.* remains source of truth for ACTIVE
  const businessId = meta(obj).business_id ?? str(obj.client_reference_id);
  const customerId = str(obj.customer);
  const subscriptionId = str(obj.subscription);
  if (!businessId || !customerId) return;

  if (subscriptionId) {
    const { data: existing } = await admin
      .from("subscriptions")
      .select("id")
      .eq("external_subscription_id", subscriptionId)
      .maybeSingle();
    if (existing?.id) {
      await admin
        .from("subscriptions")
        .update({ external_customer_id: customerId })
        .eq("id", existing.id);
      return;
    }
  }

  log.info("checkout_completed_awaiting_subscription", {
    businessId,
    customerId,
    subscriptionId,
  });
}

async function upsertPaymentFromIntent(
  admin: Admin,
  obj: Record<string, unknown>,
  eventType: string,
) {
  const externalPaymentId = str(obj.id);
  if (!externalPaymentId) return;
  const businessId = await resolveBusinessId(admin, obj);
  if (!businessId) return;

  const status = eventType === "payment_intent.succeeded" ? "SUCCEEDED" : "FAILED";
  const amount = num(obj.amount) ?? 0;

  const row = {
    business_id: businessId,
    amount_cents: amount,
    currency: (str(obj.currency) ?? "inr").toUpperCase().slice(0, 3),
    status,
    provider: "stripe",
    external_payment_id: externalPaymentId,
    paid_at: status === "SUCCEEDED" ? new Date().toISOString() : null,
    metadata: { event_type: eventType },
  };

  const { data: existing } = await admin
    .from("payments")
    .select("id")
    .eq("provider", "stripe")
    .eq("external_payment_id", externalPaymentId)
    .maybeSingle();

  if (existing?.id) {
    await admin.from("payments").update(row).eq("id", existing.id);
  } else {
    await admin.from("payments").insert(row);
  }
}
