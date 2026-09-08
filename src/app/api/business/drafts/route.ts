import type { NextRequest } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/db/supabase-server";
import { createEmptyDraft } from "@/domain/onboarding/types";
import { isFeatureEnabled } from "@/config/feature-flags";
import { saveActiveOnboardingDraft } from "@/services/onboarding/active-draft";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!isFeatureEnabled("businessOnboardingEnabled")) {
      throw new AppError({
        message: "Onboarding disabled",
        code: "FEATURE_DISABLED",
        status: 503,
        expose: true,
      });
    }

    const user = await getSessionUser();
    if (!user) {
      return jsonOk({ draft: null, source: "anonymous" });
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return jsonOk({ draft: null, source: "local" });
    }

    const { data } = await supabase
      .from("onboarding_drafts")
      .select("current_step, payload, updated_at")
      .eq("user_id", user.id)
      .is("business_id", null)
      .maybeSingle();

    return jsonOk({
      draft: data?.payload ?? null,
      stepIndex: data?.current_step ?? 0,
      updatedAt: data?.updated_at ?? null,
      source: "supabase",
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!isFeatureEnabled("businessOnboardingEnabled")) {
      throw new AppError({
        message: "Onboarding disabled",
        code: "FEATURE_DISABLED",
        status: 503,
        expose: true,
      });
    }

    const user = await getSessionUser();
    if (!user) {
      // Anonymous clients rely on localStorage; acknowledge without error
      return jsonOk({ ok: true, persisted: false });
    }

    const body = (await request.json()) as {
      draft?: unknown;
      stepIndex?: number;
    };
    const draft = body.draft ?? createEmptyDraft();
    const stepIndex = Math.max(0, Math.min(8, Number(body.stepIndex ?? 0)));

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return jsonOk({ ok: true, persisted: false });
    }

    const error = await saveActiveOnboardingDraft(supabase, {
      userId: user.id,
      currentStep: stepIndex,
      payload: draft,
    });
    if (error) {
      throw new AppError({
        message: "Couldn’t sync your draft. Please try again.",
        code: "DRAFT_SAVE_FAILED",
        status: 500,
        expose: true,
        cause: error,
      });
    }

    return jsonOk({ ok: true, persisted: true });
  } catch (error) {
    return jsonError(error);
  }
}
