import "server-only";

import { AppError } from "@/lib/errors/app-error";
import { hasServiceRoleKey } from "@/config/env";
import { createAdminClient } from "@/lib/db/supabase-admin";
import type { OnboardingDraftPayload } from "@/domain/onboarding/types";
import {
  friendlyOnboardingSubmitError,
  isMissingRpcError,
} from "@/services/onboarding/submit-payload";
import { decideClaimSubmitAction } from "@/services/onboarding/claim-submit-decision";
import type { createServerSupabaseClient } from "@/lib/db/supabase-server";

type UserClient = NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;
type AdminClient = ReturnType<typeof createAdminClient>;

export type ClaimSubmitResult = {
  claimId: string;
  businessId: string;
  status: string;
  alreadyMember?: boolean;
};

function claimError(raw: string): AppError {
  const mapped = friendlyOnboardingSubmitError(raw);
  return new AppError({
    message:
      mapped ??
      (raw.length > 0 && raw.length < 220
        ? raw
        : "Could not submit your claim. Your draft is still safe."),
    code: "ONBOARDING_SUBMIT_FAILED",
    status: 400,
    expose: true,
    details: raw,
  });
}

function throwClaimError(raw: string): never {
  throw claimError(raw);
}

function asClaimRow(data: unknown): ClaimSubmitResult | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const claimId = typeof row.claimId === "string" ? row.claimId : null;
  if (!claimId) return null;
  return {
    claimId,
    businessId: typeof row.businessId === "string" ? row.businessId : "",
    status: typeof row.status === "string" ? row.status : "PENDING",
  };
}

function evidenceFromPayload(payload: { name?: string } & Record<string, unknown>) {
  return {
    source: "onboarding_wizard",
    note: `Ownership claim for ${payload.name ?? "listing"}`,
    payload,
  };
}

async function ensureProfile(
  admin: AdminClient,
  userId: string,
  displayName: string | null | undefined,
) {
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (data?.id) return;
  const { error } = await admin.from("profiles").insert({
    id: userId,
    display_name: displayName?.trim() || null,
  });
  if (error && !/duplicate key|profiles_pkey/i.test(error.message)) {
    throwClaimError(error.message);
  }
}

async function attachClaimDraft(
  admin: AdminClient,
  input: {
    userId: string;
    businessId: string;
    claimId: string;
    status: string;
    payload: Record<string, unknown>;
  },
) {
  const nextPayload = {
    ...input.payload,
    mode: "claim" as const,
    claimBusinessId: input.businessId,
    claimId: input.claimId,
    claimStatus: input.status as OnboardingDraftPayload["claimStatus"],
  };

  const { data: active } = await admin
    .from("onboarding_drafts")
    .select("id")
    .eq("user_id", input.userId)
    .is("business_id", null)
    .limit(1);

  if (active?.[0]?.id) {
    const { error } = await admin
      .from("onboarding_drafts")
      .update({
        business_id: input.businessId,
        current_step: "8",
        payload: nextPayload,
      })
      .eq("id", active[0].id);
    if (error) throwClaimError(error.message);
    return;
  }

  const { error } = await admin.from("onboarding_drafts").insert({
    user_id: input.userId,
    business_id: input.businessId,
    current_step: "8",
    payload: nextPayload,
  });
  if (error && !/onboarding_drafts_user_active_uidx/i.test(error.message)) {
    throwClaimError(error.message);
  }
}

async function persistClaimWithAdmin(input: {
  userId: string;
  displayName?: string | null;
  businessId: string;
  payload: Record<string, unknown> & { name?: string };
}): Promise<ClaimSubmitResult> {
  const admin = createAdminClient();
  await ensureProfile(admin, input.userId, input.displayName);

  const { data: business, error: businessError } = await admin
    .from("businesses")
    .select("id, status, is_claimed, deleted_at")
    .eq("id", input.businessId)
    .maybeSingle();
  if (businessError) throwClaimError(businessError.message);

  const { data: membershipRows } = await admin
    .from("business_members")
    .select("id, user_id, business_id")
    .eq("business_id", input.businessId)
    .eq("user_id", input.userId)
    .limit(1);
  const membershipRow = Array.isArray(membershipRows)
    ? membershipRows[0]
    : membershipRows;

  const { data: claimRows } = await admin
    .from("business_claims")
    .select("id, status, claimant_id")
    .eq("business_id", input.businessId)
    .eq("claimant_id", input.userId)
    .in("status", ["PENDING", "UNDER_REVIEW"])
    .limit(1);
  const existing = Array.isArray(claimRows) ? claimRows[0] : claimRows;

  const decision = decideClaimSubmitAction({
    userId: input.userId,
    businessId: input.businessId,
    business: business
      ? {
          id: String(business.id),
          status: String(business.status),
          isClaimed: Boolean(business.is_claimed),
          deletedAt: (business.deleted_at as string | null) ?? null,
        }
      : null,
    pendingClaim: existing?.id
      ? {
          id: String(existing.id),
          claimantId: String(existing.claimant_id ?? input.userId),
          status: String(existing.status ?? "PENDING"),
        }
      : null,
    membership:
      membershipRow?.user_id && membershipRow?.business_id
        ? {
            userId: String(membershipRow.user_id),
            businessId: String(membershipRow.business_id),
          }
        : null,
  });

  if (decision.action === "unavailable") {
    throwClaimError("This business is not available to claim");
  }

  if (decision.action === "already-member") {
    return {
      claimId: existing?.id ? String(existing.id) : "",
      businessId: input.businessId,
      status: "VERIFIED",
      alreadyMember: true,
    };
  }

  const evidence = evidenceFromPayload(input.payload);
  let claimId =
    decision.action === "update-pending" ? decision.claimId : undefined;
  let status =
    decision.action === "update-pending" ? decision.status : "PENDING";

  if (claimId) {
    const { error } = await admin
      .from("business_claims")
      .update({
        evidence,
        notes: `Submitted from listing wizard for ${String(input.payload.name ?? "listing")}`,
      })
      .eq("id", claimId);
    if (error) throwClaimError(error.message);
  } else {
    const { data: created, error: createError } = await admin
      .from("business_claims")
      .insert({
        business_id: input.businessId,
        claimant_id: input.userId,
        status: "PENDING",
        evidence,
        notes: `Submitted from listing wizard for ${String(input.payload.name ?? "listing")}`,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("id, status")
      .maybeSingle();

    if (createError) {
      if (/business_claims_active_uidx|duplicate key/i.test(createError.message)) {
        const { data: raced } = await admin
          .from("business_claims")
          .select("id, status")
          .eq("business_id", input.businessId)
          .eq("claimant_id", input.userId)
          .in("status", ["PENDING", "UNDER_REVIEW"])
          .maybeSingle();
        if (!raced?.id) throwClaimError(createError.message);
        claimId = raced.id as string;
        status = String(raced.status ?? "PENDING");
      } else {
        throwClaimError(createError.message);
      }
    } else if (!created?.id) {
      throwClaimError("Could not submit your claim. Your draft is still safe.");
    } else {
      claimId = created.id as string;
      status = String(created.status ?? "PENDING");
      await admin.from("verification_events").insert({
        claim_id: claimId,
        provider: "manual_document",
        event_type: "submitted",
        payload: { message: "Ownership claim submitted for admin review" },
        created_by: input.userId,
      });
      await admin.from("audit_logs").insert({
        actor_id: input.userId,
        action: "claim_submitted",
        entity_type: "business_claim",
        entity_id: claimId,
        new_data: { businessId: input.businessId, status },
      });
    }
  }

  await attachClaimDraft(admin, {
    userId: input.userId,
    businessId: input.businessId,
    claimId: claimId!,
    status,
    payload: input.payload,
  });

  return {
    claimId: claimId!,
    businessId: input.businessId,
    status,
  };
}

export async function persistBusinessClaim(input: {
  userId: string;
  displayName?: string | null;
  businessId: string;
  payload: Record<string, unknown>;
  userClient: UserClient;
}): Promise<ClaimSubmitResult> {
  const { data, error } = await input.userClient.rpc("submit_business_claim", {
    p_business_id: input.businessId,
    p_payload: input.payload,
  });
  if (!error) {
    const row = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
    if (row?.alreadyMember) {
      return {
        claimId: typeof row.claimId === "string" ? row.claimId : "",
        businessId: input.businessId,
        status: "VERIFIED",
        alreadyMember: true,
      };
    }
    return (
      asClaimRow(data) ?? {
        claimId: "",
        businessId: input.businessId,
        status: "PENDING",
      }
    );
  }
  if (/already have access to this business/i.test(error.message)) {
    return {
      claimId: "",
      businessId: input.businessId,
      status: "VERIFIED",
      alreadyMember: true,
    };
  }
  if (isMissingRpcError(error.message)) {
    if (process.env.NODE_ENV === "production") {
      throwClaimError(
        "Claim submission isn’t available on this database yet. Apply the latest migrations.",
      );
    }
    if (hasServiceRoleKey()) {
      return persistClaimWithAdmin(input);
    }
    throwClaimError(
      "Claim submission isn’t available on this database yet. Apply the latest migrations, or set the service role key.",
    );
  }
  throwClaimError(error.message);
}
