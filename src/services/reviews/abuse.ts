import type { AbuseAssessment } from "@/domain/reviews/types";

const SPAM_PHRASES = [
  "buy followers",
  "click here",
  "crypto giveaway",
  "whatsapp me",
  "telegram @",
  "earn money fast",
  "visit my site",
];

const URL_RE = /https?:\/\/|www\./i;
const REPEATED_CHAR_RE = /(.)\1{6,}/;

/**
 * Abuse detection architecture — signal scoring, not silent censorship.
 * High-risk reviews are held as PENDING for human moderation.
 * Never used to boost or bury reviews based on payment.
 */
export function assessReviewAbuse(input: {
  rating: number;
  title?: string | null;
  body?: string | null;
  recentReviewCount24h?: number;
}): AbuseAssessment {
  const signals: string[] = [];
  const text = `${input.title ?? ""} ${input.body ?? ""}`.trim();
  const lower = text.toLowerCase();

  if (!text && input.rating) {
    // Rating-only is allowed; no abuse signal
  }

  if (text.length > 0 && text.length < 8 && input.rating <= 2) {
    signals.push("short_negative_body");
  }

  if (URL_RE.test(text)) {
    signals.push("contains_url");
  }

  for (const phrase of SPAM_PHRASES) {
    if (lower.includes(phrase)) {
      signals.push(`spam_phrase:${phrase}`);
    }
  }

  if (REPEATED_CHAR_RE.test(text)) {
    signals.push("repeated_characters");
  }

  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length >= 20) {
    const upper = letters.replace(/[^A-Z]/g, "").length;
    if (upper / letters.length > 0.7) {
      signals.push("excessive_caps");
    }
  }

  if ((input.recentReviewCount24h ?? 0) >= 5) {
    signals.push("rapid_posting");
  }

  // Extreme rating with promotional body
  if (
    input.rating === 5 &&
    signals.some((s) => s.startsWith("spam_phrase") || s === "contains_url")
  ) {
    signals.push("promotional_five_star");
  }

  let risk: AbuseAssessment["risk"] = "low";
  if (signals.length >= 3 || signals.includes("rapid_posting")) {
    risk = "high";
  } else if (signals.length >= 1) {
    risk = "medium";
  }

  return {
    risk,
    signals,
    holdForModeration: risk === "high",
  };
}
