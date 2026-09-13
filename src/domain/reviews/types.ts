export type ReviewStatus = "PENDING" | "PUBLISHED" | "HIDDEN" | "REJECTED";

export type ReviewReportReason = "spam" | "abuse" | "off_topic" | "fake" | "other";

export type RatingDistribution = {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
};

export type RatingSummary = {
  /** Server-controlled average from published reviews only */
  average: number;
  count: number;
  distribution: RatingDistribution;
};

export type PublicReview = {
  id: string;
  businessId: string;
  userId: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: ReviewStatus;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
  replyBody: string | null;
  repliedAt: string | null;
  isOwn?: boolean;
  /** Present for the author when an admin requested verification */
  verificationRequested?: boolean;
};

export type AbuseRisk = "low" | "medium" | "high";

export type AbuseAssessment = {
  risk: AbuseRisk;
  signals: string[];
  /** Human-readable warning labels for admin queue */
  flags: string[];
  /** When true, review should land in PENDING for moderation */
  holdForModeration: boolean;
};

/** Persisted on `reviews.moderation` — never shown on public listing APIs */
export type ReviewModerationState = {
  risk?: AbuseRisk;
  signals?: string[];
  flags?: string[];
  assessedAt?: string;
  verificationRequested?: boolean;
  verificationRequestedAt?: string | null;
  verificationRequestedBy?: string | null;
  verificationNote?: string | null;
  lastModerationAction?: "approve" | "reject" | "request_verification" | null;
};

export type ReviewModerationAction = "approve" | "reject" | "request_verification";

export type ReviewAuditAction =
  | "review_create"
  | "review_update"
  | "review_delete"
  | "review_report"
  | "review_reply"
  | "review_moderate"
  | "review_abuse_hold"
  | "review_verification_requested";
