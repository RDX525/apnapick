import "server-only";

import type {
  PublicReview,
  RatingSummary,
  ReviewModerationState,
  ReviewStatus,
} from "@/domain/reviews/types";
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
  moderation?: ReviewModerationState | null;
  profiles?: { display_name: string | null } | { display_name: string | null }[] | null;
};

function mapReview(
  row: ReviewRow,
  viewerId?: string | null,
  options?: { includeModerationHints?: boolean },
): PublicReview {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const isOwn = viewerId ? row.user_id === viewerId : false;
  const moderation =
    row.moderation && typeof row.moderation === "object" ? row.moderation : null;
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
    isOwn,
    verificationRequested:
      options?.includeModerationHints && isOwn
        ? Boolean(moderation?.verificationRequested)
        : undefined,
  };
}

function asReviewRow(data: unknown): ReviewRow {
  return data as ReviewRow;
}

const REVIEW_PUBLIC_SELECT = `
  id, business_id, user_id, rating, title, body, status,
  reply_body, replied_at, created_at, updated_at, deleted_at,
  profiles!reviews_user_id_fkey ( display_name )
`;

const REVIEW_MODERATION_SELECT = `
  id, business_id, user_id, rating, title, body, status,
  reply_body, replied_at, created_at, updated_at, deleted_at, moderation,
  profiles!reviews_user_id_fkey ( display_name )
`;

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
    .select(REVIEW_PUBLIC_SELECT)
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

  async function load(withProfile: boolean) {
    const select = withProfile
      ? REVIEW_MODERATION_SELECT
      : `id, business_id, user_id, rating, title, body, status,
         reply_body, replied_at, created_at, updated_at, deleted_at, moderation`;
    return supabase
      .from("reviews")
      .select(select)
      .eq("business_id", businessId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
  }

  for (const withProfile of [true, false]) {
    const { data, error } = await load(withProfile);
    if (error) {
      log.error("own_review_failed", {
        message: error.message,
        businessId,
        userId,
        withProfile,
      });
      continue;
    }
    if (data) {
      return mapReview(asReviewRow(data), userId, { includeModerationHints: true });
    }
  }

  return null;
}

export async function getReviewById(
  id: string,
  options?: { includeDeleted?: boolean },
): Promise<PublicReview | null> {
  const supabase = await requireClient();
  let query = supabase
    .from("reviews")
    .select(REVIEW_PUBLIC_SELECT)
    .eq("id", id)
    .limit(1);
  if (!options?.includeDeleted) {
    query = query.is("deleted_at", null);
  }
  const { data, error } = await query.maybeSingle();

  if (error || !data) return null;
  return mapReview(asReviewRow(data));
}

export async function getReviewModerationById(
  id: string,
  options?: { includeDeleted?: boolean },
): Promise<{ review: PublicReview; moderation: ReviewModerationState } | null> {
  const supabase = await requireClient();
  let query = supabase
    .from("reviews")
    .select(REVIEW_MODERATION_SELECT)
    .eq("id", id)
    .limit(1);
  if (!options?.includeDeleted) {
    query = query.is("deleted_at", null);
  }
  const { data, error } = await query.maybeSingle();

  if (error || !data) return null;
  const row = asReviewRow(data);
  return {
    review: mapReview(row, row.user_id, { includeModerationHints: true }),
    moderation: (row.moderation && typeof row.moderation === "object"
      ? row.moderation
      : {}) as ReviewModerationState,
  };
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

/** Recent review text for similar-wording checks (excludes the author). */
export async function listRecentReviewBodiesForBusiness(input: {
  businessId: string;
  excludeUserId: string;
  limit?: number;
}): Promise<string[]> {
  const supabase = await requireClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("title, body")
    .eq("business_id", input.businessId)
    .neq("user_id", input.excludeUserId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 50);

  if (error) {
    log.error("list_compare_bodies_failed", { message: error.message });
    return [];
  }

  return (data ?? [])
    .map((row) => `${row.title ?? ""} ${row.body ?? ""}`.trim())
    .filter((text) => text.length >= 24);
}

/**
 * Distinct other actors who created/held reviews from the same IP recently.
 * Soft signal only — shared NAT can false-positive; combine with other signals.
 */
export async function countRelatedReviewAccountsByIp(input: {
  ip: string;
  excludeUserId: string;
  sinceIso: string;
}): Promise<number> {
  if (!input.ip || input.ip === "127.0.0.1" || input.ip === "::1") return 0;
  const supabase = await requireClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("actor_id")
    .eq("ip", input.ip)
    .in("action", ["review_create", "review_abuse_hold"])
    .neq("actor_id", input.excludeUserId)
    .gte("created_at", input.sinceIso)
    .limit(100);

  if (error) {
    log.error("related_accounts_lookup_failed", { message: error.message });
    return 0;
  }

  return new Set(
    (data ?? [])
      .map((row) => (row.actor_id ? String(row.actor_id) : ""))
      .filter(Boolean),
  ).size;
}

export async function insertReview(input: {
  businessId: string;
  userId: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: ReviewStatus;
  moderation?: ReviewModerationState;
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
      moderation: input.moderation ?? {},
    })
    .select(REVIEW_MODERATION_SELECT)
    .single();

  if (error) {
    if (error.code === "23505") {
      const existing = await getOwnReviewForBusiness(input.businessId, input.userId);
      throw new AppError({
        message: "You already reviewed this business. Edit your existing review instead.",
        code: "DUPLICATE_REVIEW",
        status: 409,
        expose: true,
        details: existing ? { review: existing } : undefined,
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
    .select(REVIEW_MODERATION_SELECT)
    .single();

  if (error || !data) {
    log.error("update_review_failed", {
      message: error?.message ?? "no rows returned",
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      reviewId: id,
    });
    if (error && /profiles|relationship|embed/i.test(error.message)) {
      const retry = await supabase
        .from("reviews")
        .update(patch)
        .eq("id", id)
        .is("deleted_at", null)
        .select(
          `id, business_id, user_id, rating, title, body, status,
           reply_body, replied_at, created_at, updated_at, deleted_at, moderation`,
        )
        .single();
      if (!retry.error && retry.data) {
        return mapReview(asReviewRow(retry.data), viewerId, {
          includeModerationHints: Boolean(viewerId),
        });
      }
    }
    throw new AppError({
      message: "Could not update review",
      code: "REVIEW_UPDATE_FAILED",
      status: 400,
      expose: true,
      cause: error ?? undefined,
    });
  }

  return mapReview(asReviewRow(data), viewerId, {
    includeModerationHints: Boolean(viewerId),
  });
}

/** Permanently removes a review. Authors may post a new review afterward. */
export async function hardDeleteReview(id: string): Promise<void> {
  const supabase = await requireClient();
  const { data, error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    log.error("hard_delete_review_failed", {
      message: error?.message ?? "no rows deleted",
      code: error?.code,
      reviewId: id,
    });
    throw new AppError({
      message: "Could not delete review",
      code: "REVIEW_DELETE_FAILED",
      status: 400,
      expose: true,
      cause: error ?? undefined,
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

export async function insertModerationNotification(input: {
  userId: string;
  title: string;
  body: string;
  linkPath?: string | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = await requireClient();
    await supabase.from("notifications").insert({
      user_id: input.userId,
      notification_type: "MODERATION",
      title: input.title,
      body: input.body,
      link_path: input.linkPath ?? null,
      payload: input.payload ?? {},
    });
  } catch (error) {
    log.error("moderation_notification_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
  }
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

/** Sets the reviewer's public display name (never stores email on the review). */
export async function upsertReviewerDisplayName(input: {
  userId: string;
  displayName: string;
}): Promise<string> {
  const supabase = await requireClient();
  const name = input.displayName.trim();
  if (name.length < 2) {
    throw new AppError({
      message: "Public name must be at least 2 characters",
      code: "VALIDATION_ERROR",
      status: 400,
      expose: true,
    });
  }
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: name })
    .eq("id", input.userId);
  if (error) {
    log.error("display_name_update_failed", { message: error.message });
    throw new AppError({
      message: "Could not save your public name",
      code: "PROFILE_UPDATE_FAILED",
      status: 400,
      expose: true,
    });
  }
  return name;
}
