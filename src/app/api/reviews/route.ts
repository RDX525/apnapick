import type { NextRequest } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { isAdminRole } from "@/domain/roles";
import { rateLimit } from "@/lib/security/rate-limit";
import { createReviewSchema } from "@/validations/reviews";
import {
  createReview,
  getBusinessReviewsBundle,
} from "@/services/reviews/review-service";
import { isBusinessOwner } from "@/repositories/reviews/review-repository";

export const dynamic = "force-dynamic";

function clientMeta(request: NextRequest) {
  return {
    ip:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null,
    userAgent: request.headers.get("user-agent"),
  };
}

export async function GET(request: NextRequest) {
  try {
    const businessId = request.nextUrl.searchParams.get("businessId");
    const parsed = z.string().uuid().safeParse(businessId);
    if (!parsed.success) {
      throw new AppError({
        message: "businessId is required",
        code: "VALIDATION_ERROR",
        status: 400,
        expose: true,
      });
    }

    const user = await getSessionUser();
    const [data, owner] = await Promise.all([
      getBusinessReviewsBundle({
        businessId: parsed.data,
        viewerId: user?.id ?? null,
      }),
      user ? isBusinessOwner(parsed.data, user.id) : Promise.resolve(false),
    ]);
    return jsonOk({
      data: {
        ...data,
        signedIn: Boolean(user),
        canReply: owner || Boolean(user?.roles.some(isAdminRole)),
        isOwner: owner,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      throw new AppError({
        message: "Sign in to leave a review",
        code: "UNAUTHORIZED",
        status: 401,
        expose: true,
      });
    }

    const limited = await rateLimit(`review:create:${user.id}`, 5, 60 * 60 * 1000);
    if (!limited.allowed) {
      throw new AppError({
        message: "Too many reviews. Try again later.",
        code: "RATE_LIMITED",
        status: 429,
        expose: true,
      });
    }

    const body = createReviewSchema.safeParse(await request.json());
    if (!body.success) {
      throw new AppError({
        message: "Invalid review",
        code: "VALIDATION_ERROR",
        status: 400,
        expose: true,
        details: body.error.flatten(),
      });
    }

    const meta = clientMeta(request);
    const result = await createReview({
      user,
      businessId: body.data.businessId,
      rating: body.data.rating,
      title: body.data.title,
      body: body.data.body,
      ...meta,
    });

    return jsonOk({ data: result }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
