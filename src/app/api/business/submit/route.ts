import type { NextRequest } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/db/supabase-server";
import { createAdminClient } from "@/lib/db/supabase-admin";
import { completenessScore } from "@/services/onboarding/completeness";
import type { OnboardingDraftPayload } from "@/domain/onboarding/types";
import { isFeatureEnabled } from "@/config/feature-flags";
import { hasServiceRoleKey, hasSupabaseConfig } from "@/config/env";
import {
  friendlyOnboardingSubmitError,
  ownerCategoryRows,
  prepareOnboardingSubmitPayload,
  resolveOnboardingCategorySlug,
} from "@/services/onboarding/submit-payload";
import { persistBusinessClaim } from "@/services/onboarding/submit-claim";
import { requireWritableDatabase } from "@/lib/db/require-writable-db";

export const dynamic = "force-dynamic";

function assertDatabaseWrite(
  error: { message: string } | null,
  code: string,
  message: string,
) {
  if (!error) return;
  throw new AppError({
    message: friendlyOnboardingSubmitError(error.message) ?? message,
    code,
    status: 400,
    expose: true,
    cause: error,
  });
}

async function loadActiveCategorySlugs(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("slug")
    .eq("is_active", true)
    .limit(200);
  if (error) {
    throw new AppError({
      message: "Couldn’t load categories. Try again in a moment.",
      code: "CATEGORY_LOAD_FAILED",
      status: 500,
      expose: true,
      cause: error,
    });
  }
  return (data ?? []).map((row) => String(row.slug));
}

async function ensureOwnerCategoriesExist(existing: string[]): Promise<string[]> {
  const missing = ownerCategoryRows().some((row) => !existing.includes(row.slug));
  if (!missing || !hasServiceRoleKey()) return existing;
  const admin = createAdminClient();
  const { error } = await admin.from("categories").upsert(ownerCategoryRows(), {
    onConflict: "slug",
  });
  if (error) return existing;
  const { data } = await admin
    .from("categories")
    .select("slug")
    .eq("is_active", true)
    .limit(200);
  return (data ?? []).map((row) => String(row.slug));
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

    if (!user) {
      if (hasSupabaseConfig()) {
        throw new AppError({
          message: "Log in before submitting your business for approval.",
          code: "UNAUTHORIZED",
          status: 401,
          expose: true,
        });
      }
      return jsonOk({
        ok: true,
        status: "PENDING_REVIEW",
        completeness: score,
        persisted: false,
        message:
          "Submission recorded locally. Log in with Supabase to persist for admin review.",
      });
    }

    const supabase = requireWritableDatabase(
      await createServerSupabaseClient(),
      "Listing submission",
    );

    const categorySlugs = await ensureOwnerCategoriesExist(
      await loadActiveCategorySlugs(supabase),
    );
    const categorySlug = resolveOnboardingCategorySlug(
      draft.categorySlug,
      categorySlugs,
    );
    if (!categorySlug) {
      throw new AppError({
        message: "Choose a valid category, then submit again.",
        code: "VALIDATION_ERROR",
        status: 400,
        expose: true,
      });
    }

    const submittedPayload = {
      ...prepareOnboardingSubmitPayload(draft, categorySlug),
      submittedAt: new Date().toISOString(),
      claimStatus: draft.mode === "claim" ? "PENDING" : draft.claimStatus,
    };
    let submittedBusiness: {
      businessId?: string;
      slug?: string;
      status?: string;
      claimId?: string;
    } | null = null;

    if (draft.mode === "claim") {
      if (!draft.claimBusinessId) {
        throw new AppError({
          message:
            "Pick a listing on Find business, then tap Claim this business before submitting.",
          code: "VALIDATION_ERROR",
          status: 400,
          expose: true,
        });
      }
      const claim = await persistBusinessClaim({
        userId: user.id,
        displayName: user.displayName,
        businessId: draft.claimBusinessId,
        payload: submittedPayload,
        userClient: supabase,
      });
      submittedBusiness = {
        businessId: claim.businessId,
        status: claim.alreadyMember ? "VERIFIED" : claim.status,
        claimId: claim.claimId,
      };
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
