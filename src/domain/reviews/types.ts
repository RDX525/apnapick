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
};

export type AbuseRisk = "low" | "medium" | "high";

export type AbuseAssessment = {
  risk: AbuseRisk;
  signals: string[];
  /** When true, review should land in PENDING for moderation */
  holdForModeration: boolean;
};

export type ReviewAuditAction =
  | "review_create"
  | "review_update"
  | "review_delete"
  | "review_report"
  | "review_reply"
  | "review_moderate"
  | "review_abuse_hold";
