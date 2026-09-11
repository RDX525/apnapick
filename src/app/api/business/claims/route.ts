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
import { persistBusinessClaim } from "@/services/onboarding/submit-claim";

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
      if (process.env.NODE_ENV === "production") {
        throw new AppError({
          message: "Claim submission is unavailable",
          code: "CLAIM_UNAVAILABLE",
          status: 503,
          expose: true,
        });
      }
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

    const claim = await persistBusinessClaim({
      userId: user.id,
      displayName: user.displayName,
      businessId: parsed.data.businessId,
      payload: {
        mode: "claim",
        claimBusinessId: parsed.data.businessId,
        name: parsed.data.notes?.trim() || "Ownership claim",
        description: "",
        categorySlug: "",
        notes: parsed.data.notes ?? "",
        evidence: parsed.data.evidence ?? {},
      },
      userClient: supabase,
    });

    if (claim.alreadyMember) {
      return jsonOk({
        claim: {
          id: claim.claimId,
          businessId: claim.businessId,
          status: claim.status,
        },
        alreadyMember: true,
        persisted: true,
      });
    }

    const session = await getVerificationProvider("manual_document").start({
      claimId: claim.claimId,
      businessId: parsed.data.businessId,
      userId: user.id,
    });

    return jsonOk({
      claim: {
        id: claim.claimId,
        businessId: claim.businessId,
        status: claim.status,
        verificationSession: session,
      },
      persisted: true,
    });
  } catch (error) {
    return jsonError(error);
  }
}
