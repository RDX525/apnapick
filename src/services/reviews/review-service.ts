import "server-only";

import type { SessionUser } from "@/lib/auth/session";
import { isAdminRole } from "@/domain/roles";
import { AppError } from "@/lib/errors/app-error";
import { stripControlChars, truncateString } from "@/lib/security/sanitize";
import { assessReviewAbuse } from "@/services/reviews/abuse";
import { writeTrustAudit } from "@/services/reviews/audit";
import { sortReviewsForDisplay } from "@/services/reviews/aggregation";
import type { PublicReview, RatingSummary, ReviewStatus } from "@/domain/reviews/types";
import {
  assertBusinessPublished,
  countUserReviewsSince,
  getBusinessRatingSummary,
  getOwnReviewForBusiness,
  getReviewById,
  insertReview,
  insertReviewReport,
  isBusinessOwner,
  listPublishedReviews,
  softDeleteReview,
  updateReviewRow,
} from "@/repositories/reviews/review-repository";

function cleanText(value: string | null | undefined, max: number) {
  if (value == null) return null;
  const cleaned = truncateString(stripControlChars(value).trim(), max);
  return cleaned.length > 0 ? cleaned : null;
}

function requireUser(user: SessionUser | null): SessionUser {
  if (!user) {
    throw new AppError({
      message: "Sign in to continue",
      code: "UNAUTHORIZED",
      status: 401,
      expose: true,
    });
  }
  return user;
}

export async function getBusinessReviewsBundle(input: {
  businessId: string;
  viewerId?: string | null;
}): Promise<{
  summary: RatingSummary;
  reviews: PublicReview[];
  ownReview: PublicReview | null;
}> {
  const [summary, reviews, ownReview] = await Promise.all([
    getBusinessRatingSummary(input.businessId),
    listPublishedReviews(input.businessId, input.viewerId),
    input.viewerId
      ? getOwnReviewForBusiness(input.businessId, input.viewerId)
      : Promise.resolve(null),
  ]);

  return {
    summary,
    reviews: sortReviewsForDisplay(reviews),
    ownReview,
  };
}

export async function createReview(input: {
  user: SessionUser | null;
  businessId: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const user = requireUser(input.user);
  await assertBusinessPublished(input.businessId);

  const existing = await getOwnReviewForBusiness(input.businessId, user.id);
  if (existing) {
    throw new AppError({
      message: "You already reviewed this business. Edit your existing review instead.",
      code: "DUPLICATE_REVIEW",
      status: 409,
      expose: true,
    });
  }

  const title = cleanText(input.title, 120);
  const body = cleanText(input.body, 4000);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recentCount = await countUserReviewsSince(user.id, since);
  const abuse = assessReviewAbuse({
    rating: input.rating,
    title,
    body,
    recentReviewCount24h: recentCount,
  });

  const status: ReviewStatus = abuse.holdForModeration ? "PENDING" : "PUBLISHED";

  const review = await insertReview({
    businessId: input.businessId,
    userId: user.id,
    rating: input.rating,
    title,
    body,
    status,
  });

  await writeTrustAudit({
    actor: user,
    action: abuse.holdForModeration ? "review_abuse_hold" : "review_create",
    entityType: "review",
    entityId: review.id,
    newData: {
      businessId: input.businessId,
      rating: input.rating,
      status,
      abuse,
    },
    ip: input.ip,
    userAgent: input.userAgent,
  });

  const summary = await getBusinessRatingSummary(input.businessId);
  return { review, summary, abuse };
}

export async function updateReview(input: {
  user: SessionUser | null;
  reviewId: string;
  rating?: number;
  title?: string | null;
  body?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const user = requireUser(input.user);
  const existing = await getReviewById(input.reviewId);
  if (!existing) {
    throw new AppError({
      message: "Review not found",
      code: "NOT_FOUND",
      status: 404,
      expose: true,
    });
  }
  if (existing.userId !== user.id && !user.roles.some(isAdminRole)) {
    throw new AppError({
      message: "Forbidden",
      code: "FORBIDDEN",
      status: 403,
      expose: true,
    });
  }

  const rating = input.rating ?? existing.rating;
  const title = input.title === undefined ? existing.title : cleanText(input.title, 120);
  const body = input.body === undefined ? existing.body : cleanText(input.body, 4000);

  const abuse = assessReviewAbuse({ rating, title, body });
  const status: ReviewStatus = abuse.holdForModeration
    ? "PENDING"
    : existing.status === "HIDDEN" || existing.status === "REJECTED"
      ? existing.status
      : "PUBLISHED";

  const review = await updateReviewRow(
    input.reviewId,
    { rating, title, body, status },
    user.id,
  );

  await writeTrustAudit({
    actor: user,
    action: "review_update",
    entityType: "review",
    entityId: review.id,
    oldData: { rating: existing.rating, status: existing.status },
    newData: { rating, status, abuse },
    ip: input.ip,
    userAgent: input.userAgent,
  });

  const summary = await getBusinessRatingSummary(existing.businessId);
  return { review, summary };
}

export async function deleteReview(input: {
  user: SessionUser | null;
  reviewId: string;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const user = requireUser(input.user);
  const existing = await getReviewById(input.reviewId);
  if (!existing) {
    throw new AppError({
      message: "Review not found",
      code: "NOT_FOUND",
      status: 404,
      expose: true,
    });
  }
  if (existing.userId !== user.id && !user.roles.some(isAdminRole)) {
    throw new AppError({
      message: "Forbidden",
      code: "FORBIDDEN",
      status: 403,
      expose: true,
    });
  }

  await softDeleteReview(input.reviewId);
  await writeTrustAudit({
    actor: user,
    action: "review_delete",
    entityType: "review",
    entityId: input.reviewId,
    oldData: { businessId: existing.businessId, rating: existing.rating },
    ip: input.ip,
    userAgent: input.userAgent,
  });

  const summary = await getBusinessRatingSummary(existing.businessId);
  return { summary };
}

export async function replyToReview(input: {
  user: SessionUser | null;
  reviewId: string;
  replyBody: string;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const user = requireUser(input.user);
  const existing = await getReviewById(input.reviewId);
  if (!existing) {
    throw new AppError({
      message: "Review not found",
      code: "NOT_FOUND",
      status: 404,
      expose: true,
    });
  }

  const owner =
    user.roles.some(isAdminRole) || (await isBusinessOwner(existing.businessId, user.id));
  if (!owner) {
    throw new AppError({
      message: "Only the business owner can reply",
      code: "FORBIDDEN",
      status: 403,
      expose: true,
    });
  }

  const replyBody = cleanText(input.replyBody, 2000);
  if (!replyBody) {
    throw new AppError({
      message: "Reply cannot be empty",
      code: "VALIDATION_ERROR",
      status: 400,
      expose: true,
    });
  }

  const review = await updateReviewRow(
    input.reviewId,
    {
      reply_body: replyBody,
      replied_at: new Date().toISOString(),
      replied_by: user.id,
    },
    user.id,
  );

  await writeTrustAudit({
    actor: user,
    action: "review_reply",
    entityType: "review",
    entityId: input.reviewId,
    newData: { replyBody },
    ip: input.ip,
    userAgent: input.userAgent,
  });

  return { review };
}

export async function reportReview(input: {
  user: SessionUser | null;
  reviewId: string;
  reason: string;
  details?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const user = requireUser(input.user);
  const existing = await getReviewById(input.reviewId);
  if (!existing) {
    throw new AppError({
      message: "Review not found",
      code: "NOT_FOUND",
      status: 404,
      expose: true,
    });
  }
  if (existing.userId === user.id) {
    throw new AppError({
      message: "You cannot report your own review",
      code: "VALIDATION_ERROR",
      status: 400,
      expose: true,
    });
  }

  const reportId = await insertReviewReport({
    reporterId: user.id,
    reviewId: input.reviewId,
    reason: input.reason,
    details: cleanText(input.details, 1000),
  });

  await writeTrustAudit({
    actor: user,
    action: "review_report",
    entityType: "report",
    entityId: reportId,
    newData: {
      reviewId: input.reviewId,
      reason: input.reason,
    },
    ip: input.ip,
    userAgent: input.userAgent,
  });

  return { reportId };
}

export async function moderateReview(input: {
  user: SessionUser | null;
  reviewId: string;
  status: ReviewStatus;
  note?: string;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const user = requireUser(input.user);
  if (!user.roles.some(isAdminRole)) {
    throw new AppError({
      message: "Admin access required",
      code: "FORBIDDEN",
      status: 403,
      expose: true,
    });
  }

  const existing = await getReviewById(input.reviewId);
  if (!existing) {
    throw new AppError({
      message: "Review not found",
      code: "NOT_FOUND",
      status: 404,
      expose: true,
    });
  }

  const review = await updateReviewRow(input.reviewId, { status: input.status }, user.id);

  await writeTrustAudit({
    actor: user,
    action: "review_moderate",
    entityType: "review",
    entityId: input.reviewId,
    oldData: { status: existing.status },
    newData: { status: input.status, note: input.note ?? null },
    ip: input.ip,
    userAgent: input.userAgent,
  });

  const summary = await getBusinessRatingSummary(existing.businessId);
  return { review, summary };
}
