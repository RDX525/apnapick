import type { NextRequest } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/security/rate-limit";
import { replyReviewSchema } from "@/validations/reviews";
import { replyToReview } from "@/services/reviews/review-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const user = await getSessionUser();
    if (!user) {
      throw new AppError({
        message: "Sign in to reply",
        code: "UNAUTHORIZED",
        status: 401,
        expose: true,
      });
    }

    const limited = await rateLimit(`review:reply:${user.id}`, 30, 60 * 60 * 1000);
    if (!limited.allowed) {
      throw new AppError({
        message: "Too many replies. Try again later.",
        code: "RATE_LIMITED",
        status: 429,
        expose: true,
      });
    }

    const body = replyReviewSchema.safeParse(await request.json());
    if (!body.success) {
      throw new AppError({
        message: "Invalid reply",
        code: "VALIDATION_ERROR",
        status: 400,
        expose: true,
        details: body.error.flatten(),
      });
    }

    const result = await replyToReview({
      user,
      reviewId: id,
      replyBody: body.data.replyBody,
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
    });

    return jsonOk({ data: result });
  } catch (error) {
    return jsonError(error);
  }
}
