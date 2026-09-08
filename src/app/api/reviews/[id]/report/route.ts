import type { NextRequest } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/security/rate-limit";
import { reportReviewSchema } from "@/validations/reviews";
import { reportReview } from "@/services/reviews/review-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const user = await getSessionUser();
    if (!user) {
      throw new AppError({
        message: "Sign in to report a review",
        code: "UNAUTHORIZED",
        status: 401,
        expose: true,
      });
    }

    const limited = await rateLimit(`review:report:${user.id}`, 10, 60 * 60 * 1000);
    if (!limited.allowed) {
      throw new AppError({
        message: "Too many reports. Try again later.",
        code: "RATE_LIMITED",
        status: 429,
        expose: true,
      });
    }

    const body = reportReviewSchema.safeParse(await request.json());
    if (!body.success) {
      throw new AppError({
        message: "Invalid report",
        code: "VALIDATION_ERROR",
        status: 400,
        expose: true,
        details: body.error.flatten(),
      });
    }

    const result = await reportReview({
      user,
      reviewId: id,
      reason: body.data.reason,
      details: body.data.details,
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
    });

    return jsonOk({ data: result }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
