import "server-only";

import { createAdminClient } from "@/lib/db/supabase-admin";
import { hasServiceRoleKey } from "@/config/env";
import { createLogger } from "@/lib/logging/logger";
import { AppError } from "@/lib/errors/app-error";
import type { VerifiedWebhookEvent } from "@/integrations/payments/types";
import {
  mapRazorpaySubscriptionStatus,
  meta,
  num,
  str,
  ts,
} from "@/services/billing/billing-mappers";

const log = createLogger({ module: "billing.webhook" });

export type WebhookProcessResult = {
  duplicate: boolean;
  processed: boolean;
  eventId: string;
  eventType: string;
};

type Admin = ReturnType<typeof createAdminClient>;
type ApplyStatus = "pending" | "applied" | "failed" | "ignored";

function isUniqueViolation(error: { code?: string; message?: string }) {
  const code = error.code;
  const msg = error.message?.toLowerCase() ?? "";
  return code === "23505" || msg.includes("duplicate") || msg.includes("unique");
}

/**
 * Idempotent Razorpay (or stub) webhook processor.
 * Provider events are the source of truth for subscription state.
 * Never call this from a client “payment success” callback alone.
 *
 * Ledger uses apply_status so a unique event id is not treated as success
 * until the state change actually landed.
 */
export async function processBillingWebhookEvent(
  event: VerifiedWebhookEvent,
  provider = "razorpay",
): Promise<WebhookProcessResult> {
  if (!hasServiceRoleKey()) {
    log.error("webhook_rejected_no_service_role", { eventId: event.id });
    throw new AppError({
      message: "Billing webhook cannot apply without a service role key",
      code: "BILLING_NOT_CONFIGURED",
      status: 503,
      expose: false,
    });
  }

  const admin = createAdminClient();
  const { error: insertError } = await admin.from("subscription_events").insert({
    provider,
    provider_event_id: event.id,
    event_type: event.type,
    apply_status: "pending",
    attempts: 1,
    payload: {
      dataObject: event.dataObject,
      created: event.created,
      livemode: event.livemode,
    },
  });

  const wasDuplicate = Boolean(insertError);

  if (insertError) {
    if (!isUniqueViolation(insertError)) {
      throw insertError;
    }

    const { data: existing, error: lookupError } = await admin
      .from("subscription_events")
      .select("apply_status, attempts")
      .eq("provider", provider)
      .eq("provider_event_id", event.id)
      .maybeSingle();

    if (lookupError) throw lookupError;

    const existingStatus = (existing?.apply_status as ApplyStatus | undefined) ?? "applied";
    if (existingStatus === "applied" || existingStatus === "ignored") {
      log.info("webhook_duplicate", {
        eventId: event.id,
        type: event.type,
        applyStatus: existingStatus,
      });
      return {
        duplicate: true,
        processed: existingStatus === "applied" || existingStatus === "ignored",
        eventId: event.id,
        eventType: event.type,
      };
    }

    await admin
      .from("subscription_events")
      .update({
        attempts: Number(existing?.attempts ?? 0) + 1,
        apply_status: "pending",
        apply_error: null,
      })
      .eq("provider", provider)
      .eq("provider_event_id", event.id);
  }

  try {
    const ignored = await applyEvent(admin, event, event.id);
    await markLedger(admin, provider, event.id, ignored ? "ignored" : "applied");
    return {
      duplicate: wasDuplicate,
      processed: true,
      eventId: event.id,
      eventType: event.type,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error("webhook_apply_failed", {
      eventId: event.id,
      type: event.type,
      message,
    });
    await markLedger(admin, provider, event.id, "failed", message);
    throw err;
  }
}

async function markLedger(
  admin: Admin,
  provider: string,
  eventId: string,
  applyStatus: ApplyStatus,
  applyError?: string,
) {
  const patch: Record<string, unknown> = {
    apply_status: applyStatus,
    apply_error: applyError ?? null,
  };
  if (applyStatus === "applied" || applyStatus === "ignored") {
    patch.applied_at = new Date().toISOString();
  }
  const { error } = await admin
    .from("subscription_events")
    .update(patch)
    .eq("provider", provider)
    .eq("provider_event_id", eventId);
  if (error) {
    log.error("webhook_ledger_update_failed", {
      eventId,
      applyStatus,
      message: error.message,
    });
  }
}

async function applyEvent(
  admin: Admin,
  event: VerifiedWebhookEvent,
  ledgerEventId: string,
): Promise<boolean> {
  switch (event.type) {
    case "subscription.authenticated":
    case "subscription.activated":
    case "subscription.pending":
    case "subscription.halted":
    case "subscription.paused":
    case "subscription.resumed":
    case "subscription.updated":
    case "subscription.charged":
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const source = subscriptionSource(event.dataObject);
      const subscriptionId = await upsertSubscriptionFromProvider(admin, source, event.type);
      if (event.type === "subscription.charged") {
        await upsertInvoiceFromProvider(admin, event.dataObject, "invoice.paid");
        await upsertPaymentFromProvider(admin, event.dataObject, "payment.captured");
      }
      const businessId = await resolveBusinessId(admin, source);
      if (businessId || subscriptionId) {
        await admin
          .from("subscription_events")
          .update({
            business_id: businessId,
            subscription_id: subscriptionId,
          })
          .eq("provider_event_id", ledgerEventId);
      }
      return false;
    }
    case "subscription.cancelled":
    case "subscription.completed":
    case "customer.subscription.deleted": {
      const source = subscriptionSource(event.dataObject);
      await upsertSubscriptionFromProvider(admin, source, event.type);
      return false;
    }
    case "invoice.paid":
    case "invoice.expired":
    case "invoice.payment_failed":
    case "invoice.finalized":
      await upsertInvoiceFromProvider(admin, event.dataObject, event.type);
      return false;
    case "payment.captured":
    case "payment.failed":
    case "payment_intent.succeeded":
    case "payment_intent.payment_failed":
      await upsertPaymentFromProvider(admin, event.dataObject, event.type);
      return false;
    default:
      log.info("webhook_ignored_type", { type: event.type, id: event.id });
      return true;
  }
}

function subscriptionSource(obj: Record<string, unknown>): Record<string, unknown> {
  const nested = obj.subscription;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }
  return obj;
}

function paymentSource(obj: Record<string, unknown>): Record<string, unknown> {
  const nested = obj.payment;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }
  const id = str(obj.id);
  if (str(obj.entity) === "payment" || id?.startsWith("pay_")) return obj;
  return {};
}

function invoiceSource(obj: Record<string, unknown>): Record<string, unknown> {
  const nested = obj.invoice;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }
  const id = str(obj.id);
  if (str(obj.entity) === "invoice" || id?.startsWith("inv_")) return obj;
  return {};
}

async function resolveBusinessId(
  admin: Admin,
  obj: Record<string, unknown>,
): Promise<string | null> {
  const m = meta(obj);
  if (m.business_id) return m.business_id;

  const customerId = str(obj.customer) ?? str(obj.customer_id);
  if (customerId) {
    const { data } = await admin
      .from("subscriptions")
      .select("business_id")
      .eq("external_customer_id", customerId)
      .limit(1)
      .maybeSingle();
    if (data?.business_id) return data.business_id as string;
  }

  const subId = str(obj.subscription_id) ?? str(obj.id);
  if (subId) {
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

  const planId = str(obj.plan_id);
  if (planId) {
    const { data } = await admin
      .from("plans")
      .select("id")
      .eq("external_price_id", planId)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }

  return null;
}

async function upsertSubscriptionFromProvider(
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
    throw new AppError({
      message: "Subscription webhook is missing business or plan references",
      code: "BILLING_SUBSCRIPTION_REFS_MISSING",
      status: 500,
      expose: false,
    });
  }

  const status =
    eventType === "subscription.cancelled" ||
    eventType === "subscription.completed" ||
    eventType === "customer.subscription.deleted"
      ? "CANCELED"
      : eventType === "subscription.charged"
        ? "ACTIVE"
        : mapRazorpaySubscriptionStatus(str(obj.status));

  const row = {
    business_id: businessId,
    plan_id: planId,
    status,
    current_period_start: ts(obj.current_period_start ?? obj.current_start),
    current_period_end: ts(obj.current_period_end ?? obj.current_end),
    cancel_at: ts(obj.cancel_at),
    canceled_at: ts(obj.canceled_at ?? obj.ended_at),
    external_customer_id: str(obj.customer) ?? str(obj.customer_id),
    external_subscription_id: externalSubId,
    metadata: {
      razorpay_status: obj.status,
      source: "razorpay_webhook",
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

  if (status === "ACTIVE" || status === "TRIALING" || status === "PAST_DUE") {
    await admin
      .from("subscriptions")
      .update({ status: "CANCELED", canceled_at: new Date().toISOString() })
      .eq("business_id", businessId)
      .in("status", ["TRIALING", "ACTIVE", "PAST_DUE"]);
  }

  const { data: created, error } = await admin
    .from("subscriptions")
    .insert(row)
    .select("id")
    .single();

  if (error) throw error;
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

async function upsertInvoiceFromProvider(
  admin: Admin,
  obj: Record<string, unknown>,
  eventType: string,
) {
  const invoice = invoiceSource(obj);
  const externalInvoiceId = str(invoice.id);
  if (!externalInvoiceId) return;

  const businessId = await resolveBusinessId(admin, { ...obj, ...invoice });
  if (!businessId) {
    log.warn("invoice_missing_business", { externalInvoiceId });
    return;
  }

  const externalSubId = str(invoice.subscription_id) ?? str(obj.id);
  let subscriptionId: string | null = null;
  if (externalSubId) {
    const { data } = await admin
      .from("subscriptions")
      .select("id")
      .eq("external_subscription_id", externalSubId)
      .maybeSingle();
    subscriptionId = (data?.id as string) ?? null;
  }

  const providerStatus = str(invoice.status) ?? "open";
  let status = providerStatus;
  if (eventType === "invoice.paid" || eventType === "subscription.charged") status = "paid";
  if (eventType === "invoice.payment_failed" || eventType === "invoice.expired") {
    status = "open";
  }

  const amount =
    num(invoice.amount_paid) ?? num(invoice.amount) ?? num(invoice.amount_due) ?? 0;

  const invoiceRow = {
    business_id: businessId,
    subscription_id: subscriptionId,
    amount_cents: amount,
    currency: (str(invoice.currency) ?? "inr").toUpperCase().slice(0, 3),
    status,
    provider: "razorpay",
    external_invoice_id: externalInvoiceId,
    hosted_invoice_url: str(invoice.short_url) ?? str(invoice.hosted_invoice_url),
    invoice_pdf_url: str(invoice.invoice_pdf_url) ?? str(invoice.invoice_pdf),
    period_start: ts(invoice.period_start ?? invoice.billing_start),
    period_end: ts(invoice.period_end ?? invoice.billing_end),
    paid_at:
      eventType === "invoice.paid" || eventType === "subscription.charged"
        ? new Date().toISOString()
        : null,
    metadata: { razorpay_status: providerStatus, event_type: eventType },
  };

  const { data: existing } = await admin
    .from("invoices")
    .select("id")
    .eq("provider", "razorpay")
    .eq("external_invoice_id", externalInvoiceId)
    .maybeSingle();

  if (existing?.id) {
    await admin.from("invoices").update(invoiceRow).eq("id", existing.id);
  } else {
    const { error } = await admin.from("invoices").insert(invoiceRow);
    if (error && !isUniqueViolation(error)) throw error;
  }
}

async function upsertPaymentFromProvider(
  admin: Admin,
  obj: Record<string, unknown>,
  eventType: string,
) {
  const payment = paymentSource(obj);
  const externalPaymentId = str(payment.id);
  if (!externalPaymentId) return;
  const businessId = await resolveBusinessId(admin, { ...obj, ...payment });
  if (!businessId) return;

  const succeeded =
    eventType === "payment.captured" || eventType === "payment_intent.succeeded";
  const status = succeeded ? "SUCCEEDED" : "FAILED";
  const amount = num(payment.amount) ?? 0;

  const row = {
    business_id: businessId,
    amount_cents: amount,
    currency: (str(payment.currency) ?? "inr").toUpperCase().slice(0, 3),
    status,
    provider: "razorpay",
    external_payment_id: externalPaymentId,
    paid_at: succeeded ? new Date().toISOString() : null,
    metadata: { event_type: eventType },
  };

  const { data: existing } = await admin
    .from("payments")
    .select("id")
    .eq("provider", "razorpay")
    .eq("external_payment_id", externalPaymentId)
    .maybeSingle();

  if (existing?.id) {
    await admin.from("payments").update(row).eq("id", existing.id);
  } else {
    const { error } = await admin.from("payments").insert(row);
    if (error && !isUniqueViolation(error)) throw error;
  }
}
