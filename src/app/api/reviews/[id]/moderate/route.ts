import type { NextRequest } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { requireAdminSession } from "@/lib/auth/admin";
import { rateLimit } from "@/lib/security/rate-limit";
import { moderateReviewSchema } from "@/validations/reviews";
import { moderateReview } from "@/services/reviews/review-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const actor = await requireAdminSession("admin:moderate");

    const limited = await rateLimit(`review:moderate:${actor.id}`, 60, 60 * 60 * 1000);
    if (!limited.allowed) {
      throw new AppError({
        message: "Too many moderation actions",
        code: "RATE_LIMITED",
        status: 429,
        expose: true,
      });
    }

    const body = moderateReviewSchema.safeParse(await request.json());
    if (!body.success) {
      throw new AppError({
        message: "Invalid moderation action",
        code: "VALIDATION_ERROR",
        status: 400,
        expose: true,
        details: body.error.flatten(),
      });
    }

    const result = await moderateReview({
      user: actor,
      reviewId: id,
      status: body.data.status,
      note: body.data.note,
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
    });

    return jsonOk({ data: result });
  } catch (error) {
    return jsonError(error);
  }
}
