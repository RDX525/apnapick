import type { AbuseAssessment, AbuseRisk } from "@/domain/reviews/types";

const SPAM_PHRASES = [
  "buy followers",
  "click here",
  "crypto giveaway",
  "whatsapp me",
  "telegram @",
  "earn money fast",
  "visit my site",
  "dm me for",
  "contact me on",
];

const URL_RE = /https?:\/\/|www\./gi;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
/** Spans that look like phone numbers (10+ digits), not short quantities. */
const PHONE_CANDIDATE_RE = /(?:\+?\d[\d\s().-]{8,}\d)/g;
const MESSAGING_RE = /\b(?:whatsapp|wa\.me|t\.me|telegram|instagram\.com\/|ig\s*@)\b/i;
const REPEATED_CHAR_RE = /(.)\1{6,}/;

function hasPhoneContact(text: string): boolean {
  const candidates = text.match(PHONE_CANDIDATE_RE) ?? [];
  return candidates.some((c) => c.replace(/\D/g, "").length >= 10);
}

/** Signals that always hold a review for human review. */
const HOLD_SIGNALS = new Set([
  "rapid_posting",
  "similar_wording",
  "contains_contact_details",
  "excessive_links",
  "promotional_five_star",
]);

const FLAG_LABELS: Record<string, string> = {
  short_negative_body: "Very short negative review",
  contains_url: "Contains links",
  excessive_links: "Excessive links",
  contains_contact_details: "Contact details / promotional outreach",
  repeated_characters: "Repeated characters (spam-like)",
  excessive_caps: "Excessive capitalization",
  rapid_posting: "Suspicious activity — rapid submissions",
  promotional_five_star: "Promotional five-star pattern",
  similar_wording: "Similar wording detected",
  related_accounts: "Multiple reviews from related accounts",
};

export const SIMILAR_WORDING_THRESHOLD = 0.82;

/**
 * Token dice coefficient for review body similarity.
 * Cheap, deterministic, no external ML dependency.
 */
export function reviewTextSimilarity(a: string, b: string): number {
  const A = tokenizeReviewText(a);
  const B = tokenizeReviewText(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  return (2 * inter) / (A.size + B.size);
}

function tokenizeReviewText(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2),
  );
}

export function humanizeAbuseSignals(signals: string[]): string[] {
  const flags = new Set<string>();
  for (const signal of signals) {
    if (signal.startsWith("spam_phrase:")) {
      flags.add("Promotional / spam language");
      continue;
    }
    const label = FLAG_LABELS[signal];
    if (label) flags.add(label);
    else flags.add("Suspicious activity");
  }
  if (signals.length >= 2 && !flags.has("Suspicious activity")) {
    // Keep a top-level suspicious banner when multiple signals fire
    const critical = signals.some(
      (s) => HOLD_SIGNALS.has(s) || s.startsWith("spam_phrase:"),
    );
    if (critical) flags.add("Suspicious activity");
  }
  return [...flags];
}

function countMatches(text: string, re: RegExp): number {
  const global = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
  return (text.match(global) ?? []).length;
}

/**
 * Abuse detection architecture — signal scoring, not silent censorship.
 * High-risk / critical-signal reviews are held as PENDING for human moderation.
 * Never used to boost or bury reviews based on payment.
 */
export function assessReviewAbuse(input: {
  rating: number;
  title?: string | null;
  body?: string | null;
  recentReviewCount24h?: number;
  /** Other review bodies to compare for copy-paste / coordinated spam */
  compareBodies?: string[];
  /** Distinct other user IDs that posted reviews from the same IP recently */
  relatedAccountCount?: number;
}): AbuseAssessment {
  const signals: string[] = [];
  const text = `${input.title ?? ""} ${input.body ?? ""}`.trim();
  const lower = text.toLowerCase();

  if (text.length > 0 && text.length < 8 && input.rating <= 2) {
    signals.push("short_negative_body");
  }

  const urlCount = countMatches(text, URL_RE);
  if (urlCount >= 1) signals.push("contains_url");
  if (urlCount >= 2) signals.push("excessive_links");

  if (EMAIL_RE.test(text) || hasPhoneContact(text) || MESSAGING_RE.test(text)) {
    signals.push("contains_contact_details");
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

  if ((input.relatedAccountCount ?? 0) >= 1) {
    signals.push("related_accounts");
  }

  if (text.length >= 24 && (input.compareBodies?.length ?? 0) > 0) {
    const similar = input.compareBodies!.some(
      (other) => reviewTextSimilarity(text, other) >= SIMILAR_WORDING_THRESHOLD,
    );
    if (similar) signals.push("similar_wording");
  }

  if (
    input.rating === 5 &&
    signals.some(
      (s) =>
        s.startsWith("spam_phrase") ||
        s === "contains_url" ||
        s === "contains_contact_details",
    )
  ) {
    signals.push("promotional_five_star");
  }

  let risk: AbuseRisk = "low";
  if (
    signals.length >= 3 ||
    signals.some((s) => HOLD_SIGNALS.has(s) || s.startsWith("spam_phrase"))
  ) {
    risk = "high";
  } else if (signals.length >= 1) {
    risk = "medium";
  }

  // related_accounts alone is a soft IP signal (NAT/shared Wi‑Fi); only hold with company
  const holdForModeration =
    risk === "high" ||
    signals.some((s) => HOLD_SIGNALS.has(s) || s.startsWith("spam_phrase")) ||
    (signals.includes("related_accounts") && signals.length >= 2);

  return {
    risk,
    signals,
    flags: humanizeAbuseSignals(signals),
    holdForModeration,
  };
}

export function buildModerationPayload(
  abuse: AbuseAssessment,
  extras?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    risk: abuse.risk,
    signals: abuse.signals,
    flags: abuse.flags,
    assessedAt: new Date().toISOString(),
    ...extras,
  };
}
