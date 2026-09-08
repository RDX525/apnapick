import "server-only";

import type { PublicReview, RatingSummary, ReviewStatus } from "@/domain/reviews/types";
import { aggregateRatings, emptyDistribution } from "@/services/reviews/aggregation";
import { createPublicSupabaseClient } from "@/lib/db/supabase-public";
import { createServerSupabaseClient } from "@/lib/db/supabase-server";
import { createLogger } from "@/lib/logging/logger";
import { hasSupabaseConfig } from "@/config/env";
import { AppError } from "@/lib/errors/app-error";

const log = createLogger({ module: "review-repository" });

type ReviewRow = {
  id: string;
  business_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: ReviewStatus;
  reply_body: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  profiles?: { display_name: string | null } | { display_name: string | null }[] | null;
};

function mapReview(row: ReviewRow, viewerId?: string | null): PublicReview {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    businessId: row.business_id,
    userId: row.user_id,
    rating: row.rating,
    title: row.title,
    body: row.body,
    status: row.status,
    authorName: profile?.display_name ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    replyBody: row.reply_body,
    repliedAt: row.replied_at,
    isOwn: viewerId ? row.user_id === viewerId : false,
  };
}

function asReviewRow(data: unknown): ReviewRow {
  return data as ReviewRow;
}

async function requireClient() {
  if (!hasSupabaseConfig()) {
    throw new AppError({
      message: "Reviews require a connected database",
      code: "SUPABASE_REQUIRED",
      status: 503,
      expose: true,
    });
  }
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    throw new AppError({
      message: "Reviews require a connected database",
      code: "SUPABASE_REQUIRED",
      status: 503,
      expose: true,
    });
  }
  return supabase;
}

export async function getBusinessRatingSummary(
  businessId: string,
): Promise<RatingSummary> {
  if (!hasSupabaseConfig()) {
    return { average: 0, count: 0, distribution: emptyDistribution() };
  }
  const supabase = createPublicSupabaseClient();
  if (!supabase) {
    return { average: 0, count: 0, distribution: emptyDistribution() };
  }

  const { data, error } = await supabase
    .from("reviews")
    .select("rating")
    .eq("business_id", businessId)
    .eq("status", "PUBLISHED")
    .is("deleted_at", null);

  if (error) {
    log.error("rating_summary_failed", { message: error.message, businessId });
    return { average: 0, count: 0, distribution: emptyDistribution() };
  }

  return aggregateRatings((data ?? []).map((r) => Number(r.rating)));
}

export async function listPublishedReviews(
  businessId: string,
  viewerId?: string | null,
): Promise<PublicReview[]> {
  if (!hasSupabaseConfig()) return [];
  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("reviews")
    .select(
      `
      id, business_id, user_id, rating, title, body, status,
      reply_body, replied_at, created_at, updated_at, deleted_at,
      profiles!reviews_user_id_fkey ( display_name )
    `,
    )
    .eq("business_id", businessId)
    .eq("status", "PUBLISHED")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    log.error("list_reviews_failed", { message: error.message, businessId });
    return [];
  }

  return (data ?? []).map((row) => mapReview(asReviewRow(row), viewerId));
}

export async function getOwnReviewForBusiness(
  businessId: string,
  userId: string,
): Promise<PublicReview | null> {
  const supabase = await requireClient();
  const { data, error } = await supabase
    .from("reviews")
    .select(
      `
      id, business_id, user_id, rating, title, body, status,
      reply_body, replied_at, created_at, updated_at, deleted_at,
      profiles!reviews_user_id_fkey ( display_name )
    `,
    )
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    log.error("own_review_failed", { message: error.message });
    return null;
  }
  if (!data) return null;
  return mapReview(asReviewRow(data), userId);
}

export async function getReviewById(id: string): Promise<PublicReview | null> {
  const supabase = await requireClient();
  const { data, error } = await supabase
    .from("reviews")
    .select(
      `
      id, business_id, user_id, rating, title, body, status,
      reply_body, replied_at, created_at, updated_at, deleted_at,
      profiles!reviews_user_id_fkey ( display_name )
    `,
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;
  return mapReview(asReviewRow(data));
}

export async function countUserReviewsSince(
  userId: string,
  sinceIso: string,
): Promise<number> {
  const supabase = await requireClient();
  const { count, error } = await supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", sinceIso);

  if (error) return 0;
  return count ?? 0;
}

export async function insertReview(input: {
  businessId: string;
  userId: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: ReviewStatus;
}): Promise<PublicReview> {
  const supabase = await requireClient();
  const { data, error } = await supabase
    .from("reviews")
    .insert({
      business_id: input.businessId,
      user_id: input.userId,
      rating: input.rating,
      title: input.title,
      body: input.body,
      status: input.status,
    })
    .select(
      `
      id, business_id, user_id, rating, title, body, status,
      reply_body, replied_at, created_at, updated_at, deleted_at,
      profiles!reviews_user_id_fkey ( display_name )
    `,
    )
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new AppError({
        message: "You already reviewed this business. Edit your existing review instead.",
        code: "DUPLICATE_REVIEW",
        status: 409,
        expose: true,
      });
    }
    log.error("insert_review_failed", { message: error.message });
    throw new AppError({
      message: "Could not save review",
      code: "REVIEW_SAVE_FAILED",
      status: 500,
      expose: true,
    });
  }

  return mapReview(asReviewRow(data), input.userId);
}

export async function updateReviewRow(
  id: string,
  patch: Record<string, unknown>,
  viewerId?: string,
): Promise<PublicReview> {
  const supabase = await requireClient();
  const { data, error } = await supabase
    .from("reviews")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(
      `
      id, business_id, user_id, rating, title, body, status,
      reply_body, replied_at, created_at, updated_at, deleted_at,
      profiles!reviews_user_id_fkey ( display_name )
    `,
    )
    .single();

  if (error || !data) {
    throw new AppError({
      message: "Could not update review",
      code: "REVIEW_UPDATE_FAILED",
      status: 400,
      expose: true,
    });
  }

  return mapReview(asReviewRow(data), viewerId);
}

export async function softDeleteReview(id: string): Promise<void> {
  const supabase = await requireClient();
  const { error } = await supabase
    .from("reviews")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) {
    throw new AppError({
      message: "Could not delete review",
      code: "REVIEW_DELETE_FAILED",
      status: 400,
      expose: true,
    });
  }
}

export async function insertReviewReport(input: {
  reporterId: string;
  reviewId: string;
  reason: string;
  details: string | null;
}): Promise<string> {
  const supabase = await requireClient();
  const { data, error } = await supabase
    .from("reports")
    .insert({
      reporter_id: input.reporterId,
      target_type: "REVIEW",
      target_id: input.reviewId,
      reason: input.reason,
      details: input.details,
      status: "OPEN",
    })
    .select("id")
    .single();

  if (error) {
    throw new AppError({
      message: "Could not submit report",
      code: "REPORT_FAILED",
      status: 400,
      expose: true,
    });
  }

  return data.id as string;
}

export async function assertBusinessPublished(businessId: string) {
  const supabase = await requireClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("id, status, deleted_at")
    .eq("id", businessId)
    .maybeSingle();

  if (error || !data || data.deleted_at || data.status !== "PUBLISHED") {
    throw new AppError({
      message: "Business not available for reviews",
      code: "BUSINESS_NOT_REVIEWABLE",
      status: 404,
      expose: true,
    });
  }
}

export async function isBusinessOwner(
  businessId: string,
  userId: string,
): Promise<boolean> {
  if (!hasSupabaseConfig()) return false;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return false;
  const { data } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .eq("role", "OWNER")
    .maybeSingle();
  return Boolean(data);
}
