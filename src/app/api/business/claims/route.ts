import type { NextRequest } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/db/supabase-server";
import { claimCreateSchema } from "@/validations/onboarding";
import { getVerificationProvider } from "@/integrations/verification/provider";
import { hasPermission } from "@/lib/auth/permissions";
import { isFeatureEnabled } from "@/config/feature-flags";
import { rateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

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

    const user = await getSessionUser();
    if (!user) {
      throw new AppError({
        message: "Login required to claim a business",
        code: "UNAUTHORIZED",
        status: 401,
        expose: true,
      });
    }

    const limited = await rateLimit(`claims:${user.id}`, 10, 60 * 60 * 1000);
    if (!limited.allowed) {
      throw new AppError({
        message: "Too many claim attempts. Try again later.",
        code: "RATE_LIMITED",
        status: 429,
        expose: true,
      });
    }
    if (!hasPermission(user.roles, "business:claim")) {
      throw new AppError({
        message: "Missing claim permission",
        code: "FORBIDDEN",
        status: 403,
        expose: true,
      });
    }

    const parsed = claimCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new AppError({
        message: "Invalid claim payload",
        code: "VALIDATION_ERROR",
        status: 400,
        expose: true,
        details: parsed.error.flatten(),
      });
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      // Offline: return synthetic claim for UI continuity
      const claimId = crypto.randomUUID();
      const session = await getVerificationProvider("manual_document").start({
        claimId,
        businessId: parsed.data.businessId,
        userId: user.id,
      });
      return jsonOk({
        claim: {
          id: claimId,
          businessId: parsed.data.businessId,
          status: "PENDING",
          verificationSession: session,
        },
        persisted: false,
      });
    }

    const { data, error } = await supabase
      .from("business_claims")
      .insert({
        business_id: parsed.data.businessId,
        claimant_id: user.id,
        status: "PENDING",
        evidence: parsed.data.evidence ?? {},
        notes: parsed.data.notes ?? null,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("id, status, business_id")
      .maybeSingle();

    if (error) {
      throw new AppError({
        message: error.message,
        code: "CLAIM_CREATE_FAILED",
        status: 400,
        expose: true,
      });
    }

    const claimId = data!.id as string;
    const session = await getVerificationProvider("manual_document").start({
      claimId,
      businessId: parsed.data.businessId,
      userId: user.id,
    });

    await supabase.from("verification_events").insert({
      claim_id: claimId,
      provider: session.provider,
      event_type: "started",
      external_session_id: session.sessionId,
      payload: { message: session.message },
      created_by: user.id,
    });

    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      action: "claim_created",
      entity_type: "business_claim",
      entity_id: claimId,
      metadata: { businessId: parsed.data.businessId },
    });

    return jsonOk({
      claim: {
        id: claimId,
        businessId: parsed.data.businessId,
        status: data!.status,
        verificationSession: session,
      },
      persisted: true,
    });
  } catch (error) {
    return jsonError(error);
  }
}
