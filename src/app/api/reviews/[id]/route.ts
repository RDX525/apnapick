import type { NextRequest } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/security/rate-limit";
import { updateReviewSchema } from "@/validations/reviews";
import { deleteReview, updateReview } from "@/services/reviews/review-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function clientMeta(request: NextRequest) {
  return {
    ip:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null,
    userAgent: request.headers.get("user-agent"),
  };
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const user = await getSessionUser();
    if (!user) {
      throw new AppError({
        message: "Sign in to edit your review",
        code: "UNAUTHORIZED",
        status: 401,
        expose: true,
      });
    }

    const limited = await rateLimit(`review:update:${user.id}`, 20, 60 * 60 * 1000);
    if (!limited.allowed) {
      throw new AppError({
        message: "Too many edits. Try again later.",
        code: "RATE_LIMITED",
        status: 429,
        expose: true,
      });
    }

    const body = updateReviewSchema.safeParse(await request.json());
    if (!body.success) {
      throw new AppError({
        message: "Invalid review update",
        code: "VALIDATION_ERROR",
        status: 400,
        expose: true,
        details: body.error.flatten(),
      });
    }

    const meta = clientMeta(request);
    const result = await updateReview({
      user,
      reviewId: id,
      rating: body.data.rating,
      title: body.data.title,
      body: body.data.body,
      ...meta,
    });

    return jsonOk({ data: result });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const user = await getSessionUser();
    if (!user) {
      throw new AppError({
        message: "Sign in to delete your review",
        code: "UNAUTHORIZED",
        status: 401,
        expose: true,
      });
    }

    const limited = await rateLimit(`review:delete:${user.id}`, 10, 60 * 60 * 1000);
    if (!limited.allowed) {
      throw new AppError({
        message: "Too many requests",
        code: "RATE_LIMITED",
        status: 429,
        expose: true,
      });
    }

    const meta = clientMeta(request);
    const result = await deleteReview({
      user,
      reviewId: id,
      ...meta,
    });

    return jsonOk({ data: result });
  } catch (error) {
    return jsonError(error);
  }
}
