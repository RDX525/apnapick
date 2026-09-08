import type { NextRequest } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/db/supabase-server";
import { completenessScore } from "@/services/onboarding/completeness";
import type { OnboardingDraftPayload } from "@/domain/onboarding/types";
import { isFeatureEnabled } from "@/config/feature-flags";

export const dynamic = "force-dynamic";

function assertDatabaseWrite(
  error: { message: string } | null,
  code: string,
  message: string,
) {
  if (!error) return;
  throw new AppError({
    message,
    code,
    status: 500,
    expose: true,
    cause: error,
  });
}

export async function POST(request: NextRequest) {
  try {
    if (!isFeatureEnabled("businessOnboardingEnabled")) {
      throw new AppError({
        message: "Onboarding disabled",
        code: "FEATURE_DISABLED",
        status: 503,
        expose: true,
      });
    }

    const body = (await request.json()) as { draft?: OnboardingDraftPayload };
    const draft = body.draft;
    if (!draft?.name?.trim()) {
      throw new AppError({
        message: "Business name required",
        code: "VALIDATION_ERROR",
        status: 400,
        expose: true,
      });
    }

    const score = completenessScore(draft);
    const user = await getSessionUser();
    const supabase = await createServerSupabaseClient();

    if (!user || !supabase) {
      return jsonOk({
        ok: true,
        status: "PENDING_REVIEW",
        completeness: score,
        persisted: false,
        message:
          "Submission recorded locally. Log in with Supabase to persist for admin review.",
      });
    }

    // Persist draft + mark submission; full business insert is gated by ownership RLS
    const { error: draftError } = await supabase.from("onboarding_drafts").insert({
      user_id: user.id,
      business_id: draft.claimBusinessId ?? null,
      current_step: 8,
      payload: {
        ...draft,
        submittedAt: new Date().toISOString(),
        claimStatus: draft.mode === "claim" ? "UNDER_REVIEW" : draft.claimStatus,
      },
    });
    assertDatabaseWrite(
      draftError,
      "ONBOARDING_SUBMIT_FAILED",
      "Could not submit your listing. Your draft is still safe.",
    );

    if (draft.mode === "claim" && draft.claimBusinessId) {
      const { error: claimError } = await supabase
        .from("business_claims")
        .update({ status: "UNDER_REVIEW" })
        .eq("business_id", draft.claimBusinessId)
        .eq("claimant_id", user.id)
        .in("status", ["PENDING", "UNDER_REVIEW"]);
      assertDatabaseWrite(
        claimError,
        "CLAIM_SUBMIT_FAILED",
        "Could not submit your claim. Your draft is still safe.",
      );
    }

    const { error: auditError } = await supabase.from("audit_logs").insert({
      actor_id: user.id,
      action: "onboarding_submitted",
      entity_type: "onboarding_draft",
      entity_id: user.id,
      metadata: {
        mode: draft.mode,
        completeness: score,
        claimBusinessId: draft.claimBusinessId ?? null,
      },
    });
    assertDatabaseWrite(
      auditError,
      "ONBOARDING_AUDIT_FAILED",
      "Submission could not be recorded. Please try again.",
    );

    return jsonOk({
      ok: true,
      status: "PENDING_REVIEW",
      completeness: score,
      persisted: true,
    });
  } catch (error) {
    return jsonError(error);
  }
}
