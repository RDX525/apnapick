import "server-only";

import type { SessionUser } from "@/lib/auth/session";
import { isAdminRole } from "@/domain/roles";
import { AppError } from "@/lib/errors/app-error";
import { stripControlChars, truncateString } from "@/lib/security/sanitize";
import {
  assessReviewAbuse,
  buildModerationPayload,
} from "@/services/reviews/abuse";
import { writeTrustAudit } from "@/services/reviews/audit";
import { sortReviewsForDisplay } from "@/services/reviews/aggregation";
import type {
  PublicReview,
  RatingSummary,
  ReviewModerationAction,
  ReviewModerationState,
  ReviewStatus,
} from "@/domain/reviews/types";
import {
  assertBusinessPublished,
  countRelatedReviewAccountsByIp,
  countUserReviewsSince,
  getBusinessRatingSummary,
  getOwnReviewForBusiness,
  getReviewById,
  getReviewModerationById,
  hardDeleteReview,
  insertModerationNotification,
  insertReview,
  insertReviewReport,
  isBusinessOwner,
  listPublishedReviews,
  listRecentReviewBodiesForBusiness,
  updateReviewRow,
  upsertReviewerDisplayName,
} from "@/repositories/reviews/review-repository";

function cleanText(value: string | null | undefined, max: number) {
  if (value == null) return null;
  const cleaned = truncateString(stripControlChars(value).trim(), max);
  return cleaned.length > 0 ? cleaned : null;
}

async function ensurePublicDisplayName(input: {
  user: SessionUser;
  displayName?: string | null;
}): Promise<string> {
  const provided = cleanText(input.displayName, 80);
  const current = cleanText(input.user.displayName, 80);
  if (provided) {
    return upsertReviewerDisplayName({
      userId: input.user.id,
      displayName: provided,
    });
  }
  if (current) return current;
  throw new AppError({
    message: "Add a public name so others know who wrote the review. Your email stays private.",
    code: "DISPLAY_NAME_REQUIRED",
    status: 400,
    expose: true,
  });
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

function statusFromAction(action: ReviewModerationAction): ReviewStatus {
  switch (action) {
    case "approve":
      return "PUBLISHED";
    case "reject":
      return "REJECTED";
    case "request_verification":
      return "PENDING";
  }
}

async function collectAbuseContext(input: {
  userId: string;
  businessId: string;
  ip?: string | null;
}) {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [recentCount, compareBodies, relatedAccountCount] = await Promise.all([
    countUserReviewsSince(input.userId, dayAgo),
    listRecentReviewBodiesForBusiness({
      businessId: input.businessId,
      excludeUserId: input.userId,
    }),
    input.ip
      ? countRelatedReviewAccountsByIp({
          ip: input.ip,
          excludeUserId: input.userId,
          sinceIso: weekAgo,
        })
      : Promise.resolve(0),
  ]);

  return { recentCount, compareBodies, relatedAccountCount };
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
    // Authors should see their own pending/held review in the list, not only the composer.
    reviews: sortReviewsForDisplay(
      ownReview &&
        ownReview.status !== "PUBLISHED" &&
        !reviews.some((r) => r.id === ownReview.id)
        ? [ownReview, ...reviews]
        : reviews,
    ),
    ownReview,
  };
}

export async function createReview(input: {
  user: SessionUser | null;
  businessId: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  displayName?: string | null;
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
      details: { review: existing },
    });
  }

  const publicName = await ensurePublicDisplayName({
    user,
    displayName: input.displayName,
  });

  const title = cleanText(input.title, 120);
  const body = cleanText(input.body, 4000);
  const ctx = await collectAbuseContext({
    userId: user.id,
    businessId: input.businessId,
    ip: input.ip,
  });

  const abuse = assessReviewAbuse({
    rating: input.rating,
    title,
    body,
    recentReviewCount24h: ctx.recentCount,
    compareBodies: ctx.compareBodies,
    relatedAccountCount: ctx.relatedAccountCount,
  });

  const status: ReviewStatus = abuse.holdForModeration ? "PENDING" : "PUBLISHED";
  const moderation = buildModerationPayload(abuse) as ReviewModerationState;

  const review = await insertReview({
    businessId: input.businessId,
    userId: user.id,
    rating: input.rating,
    title,
    body,
    status,
    moderation,
  });
  review.authorName = publicName;

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
  displayName?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const user = requireUser(input.user);
  const existingBundle = await getReviewModerationById(input.reviewId);
  if (!existingBundle) {
    throw new AppError({
      message: "Review not found",
      code: "NOT_FOUND",
      status: 404,
      expose: true,
    });
  }
  const existing = existingBundle.review;
  if (existing.userId !== user.id && !user.roles.some(isAdminRole)) {
    throw new AppError({
      message: "Forbidden",
      code: "FORBIDDEN",
      status: 403,
      expose: true,
    });
  }

  const publicName = await ensurePublicDisplayName({
    user,
    displayName: input.displayName,
  });

  const rating = input.rating ?? existing.rating;
  const title = input.title === undefined ? existing.title : cleanText(input.title, 120);
  const body = input.body === undefined ? existing.body : cleanText(input.body, 4000);

  const ctx = await collectAbuseContext({
    userId: existing.userId,
    businessId: existing.businessId,
    ip: input.ip,
  });

  const abuse = assessReviewAbuse({
    rating,
    title,
    body,
    compareBodies: ctx.compareBodies,
    relatedAccountCount: ctx.relatedAccountCount,
  });

  const status: ReviewStatus = abuse.holdForModeration
    ? "PENDING"
    : existing.status === "HIDDEN" || existing.status === "REJECTED"
      ? existing.status
      : "PUBLISHED";

  const previous = existingBundle.moderation;
  const moderation = {
    ...buildModerationPayload(abuse),
    // Preserve an open verification request until an admin clears it
    verificationRequested: previous.verificationRequested ?? false,
    verificationRequestedAt: previous.verificationRequestedAt ?? null,
    verificationRequestedBy: previous.verificationRequestedBy ?? null,
    verificationNote: previous.verificationNote ?? null,
    lastModerationAction: previous.lastModerationAction ?? null,
  } as ReviewModerationState;

  if (status === "PUBLISHED") {
    moderation.verificationRequested = false;
    moderation.verificationRequestedAt = null;
    moderation.verificationRequestedBy = null;
    moderation.verificationNote = null;
  }

  const review = await updateReviewRow(
    input.reviewId,
    {
      rating,
      title,
      body,
      status,
      moderation,
    },
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
  review.authorName = publicName;
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

  await hardDeleteReview(input.reviewId);
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
  action?: ReviewModerationAction;
  status?: ReviewStatus;
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

  const existingBundle = await getReviewModerationById(input.reviewId);
  if (!existingBundle) {
    throw new AppError({
      message: "Review not found",
      code: "NOT_FOUND",
      status: 404,
      expose: true,
    });
  }
  const existing = existingBundle.review;
  const previous = existingBundle.moderation;

  const action = input.action;
  const status: ReviewStatus = action
    ? statusFromAction(action)
    : (input.status as ReviewStatus);

  if (!status) {
    throw new AppError({
      message: "Invalid moderation action",
      code: "VALIDATION_ERROR",
      status: 400,
      expose: true,
    });
  }

  const note = cleanText(input.note, 500);
  const now = new Date().toISOString();
  const moderation: ReviewModerationState = {
    ...previous,
    lastModerationAction: action ?? previous.lastModerationAction ?? null,
  };

  if (action === "request_verification") {
    moderation.verificationRequested = true;
    moderation.verificationRequestedAt = now;
    moderation.verificationRequestedBy = user.id;
    moderation.verificationNote = note;
  } else if (action === "approve" || status === "PUBLISHED") {
    moderation.verificationRequested = false;
    moderation.verificationRequestedAt = null;
    moderation.verificationRequestedBy = null;
    moderation.verificationNote = null;
    moderation.lastModerationAction = action ?? "approve";
  } else if (action === "reject" || status === "REJECTED" || status === "HIDDEN") {
    moderation.verificationRequested = false;
    moderation.lastModerationAction = action ?? "reject";
  }

  const review = await updateReviewRow(
    input.reviewId,
    { status, moderation },
    user.id,
  );

  if (action === "request_verification") {
    let linkPath: string | null = null;
    try {
      const { createServerSupabaseClient } = await import("@/lib/db/supabase-server");
      const supabase = await createServerSupabaseClient();
      if (supabase) {
        const { data } = await supabase
          .from("businesses")
          .select("slug")
          .eq("id", existing.businessId)
          .maybeSingle();
        if (data?.slug) linkPath = `/b/${String(data.slug)}`;
      }
    } catch {
      linkPath = null;
    }

    await insertModerationNotification({
      userId: existing.userId,
      title: "Verification requested for your review",
      body:
        note ??
        "An ApnaPick moderator asked you to verify this review. Edit your review with clearer details, or contact support if you believe this was a mistake.",
      linkPath,
      payload: {
        reviewId: existing.id,
        businessId: existing.businessId,
        action: "request_verification",
      },
    });
  }

  await writeTrustAudit({
    actor: user,
    action:
      action === "request_verification"
        ? "review_verification_requested"
        : "review_moderate",
    entityType: "review",
    entityId: input.reviewId,
    oldData: { status: existing.status },
    newData: {
      status,
      action: action ?? null,
      note: note ?? null,
      moderation,
    },
    ip: input.ip,
    userAgent: input.userAgent,
  });

  const summary = await getBusinessRatingSummary(existing.businessId);
  return { review, summary, action: action ?? null };
}
