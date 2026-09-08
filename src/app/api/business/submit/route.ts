import type { NextRequest } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/db/supabase-server";
import { completenessScore } from "@/services/onboarding/completeness";
import type { OnboardingDraftPayload } from "@/domain/onboarding/types";
import { isFeatureEnabled } from "@/config/feature-flags";
import { hasSupabaseConfig } from "@/config/env";

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

    if (!user && hasSupabaseConfig()) {
      throw new AppError({
        message: "Log in before submitting your business for approval.",
        code: "UNAUTHORIZED",
        status: 401,
        expose: true,
      });
    }

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

    // New listings are materialized transactionally by the database. Claims keep
    // their business-linked draft and follow the ownership verification queue.
    const submittedPayload = {
      ...draft,
      submittedAt: new Date().toISOString(),
      claimStatus: draft.mode === "claim" ? "PENDING" : draft.claimStatus,
    };
    let submittedBusiness: {
      businessId?: string;
      slug?: string;
      status?: string;
    } | null = null;

    if (draft.mode === "claim" && draft.claimBusinessId) {
      const { error: claimError } = await supabase.rpc("submit_business_claim", {
        p_business_id: draft.claimBusinessId,
        p_payload: submittedPayload,
      });
      assertDatabaseWrite(
        claimError,
        "ONBOARDING_SUBMIT_FAILED",
        "Could not submit your claim. Your draft is still safe.",
      );
    } else {
      const { data, error: submissionError } = await supabase.rpc(
        "submit_business_listing",
        {
          p_payload: submittedPayload,
          p_completeness: score,
        },
      );
      assertDatabaseWrite(
        submissionError,
        "ONBOARDING_SUBMIT_FAILED",
        "Could not submit your listing. Your draft is still safe.",
      );
      submittedBusiness = data as typeof submittedBusiness;
    }

    return jsonOk({
      ok: true,
      status: "PENDING_REVIEW",
      completeness: score,
      persisted: true,
      business: submittedBusiness,
    });
  } catch (error) {
    return jsonError(error);
  }
}
