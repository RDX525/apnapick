import type { DuplicateCandidate } from "@/domain/onboarding/types";

export type DuplicateCheckInput = {
  name: string;
  phone?: string | null;
  website?: string | null;
  addressLine1?: string | null;
  suburb?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export type ExistingBusinessForDup = {
  id: string;
  name: string;
  slug: string;
  phone?: string | null;
  website?: string | null;
  addressLine1?: string | null;
  suburb?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
};

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(url: string): string {
  return url
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "")
    .trim();
}

function tokenSet(s: string): Set<string> {
  return new Set(
    normalizeName(s)
      .split(" ")
      .filter((t) => t.length > 1),
  );
}

/** Dice coefficient on token sets — cheap fuzzy name similarity. */
export function nameSimilarity(a: string, b: string): number {
  const A = tokenSet(a);
  const B = tokenSet(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  return (2 * inter) / (A.size + B.size);
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/**
 * Find potential duplicates. Warns only — never auto-merges.
 */
export function findDuplicateCandidates(
  input: DuplicateCheckInput,
  catalog: ExistingBusinessForDup[],
  options?: { maxResults?: number; minScore?: number },
): DuplicateCandidate[] {
  const minScore = options?.minScore ?? 0.45;
  const maxResults = options?.maxResults ?? 5;
  const inputPhone = input.phone ? normalizePhone(input.phone) : "";
  const inputWeb = input.website ? normalizeUrl(input.website) : "";
  const inputName = normalizeName(input.name);

  const out: DuplicateCandidate[] = [];

  for (const b of catalog) {
    const reasons: string[] = [];
    let score = 0;

    const sim = nameSimilarity(input.name, b.name);
    if (sim >= 0.55) {
      score += sim * 0.45;
      reasons.push(`Similar name (${Math.round(sim * 100)}%)`);
    } else if (normalizeName(b.name) === inputName && inputName) {
      score += 0.5;
      reasons.push("Exact name match");
    }

    if (inputPhone && b.phone && normalizePhone(b.phone) === inputPhone) {
      score += 0.35;
      reasons.push("Same phone number");
    }

    if (inputWeb && b.website && normalizeUrl(b.website) === inputWeb) {
      score += 0.25;
      reasons.push("Same website");
    }

    const addrA = `${input.addressLine1 ?? ""} ${input.suburb ?? ""}`.toLowerCase();
    const addrB = `${b.addressLine1 ?? ""} ${b.suburb ?? ""}`.toLowerCase();
    if (
      addrA.trim().length > 6 &&
      addrB.includes(input.addressLine1?.toLowerCase().slice(0, 12) ?? "___")
    ) {
      score += 0.2;
      reasons.push("Similar address");
    }

    let distanceM: number | null = null;
    if (input.lat != null && input.lng != null && b.lat != null && b.lng != null) {
      distanceM = haversineM(input.lat, input.lng, b.lat, b.lng);
      if (distanceM <= 80 && sim >= 0.35) {
        score += 0.25;
        reasons.push("Very close geographically");
      } else if (distanceM <= 250 && sim >= 0.5) {
        score += 0.15;
        reasons.push("Nearby with similar name");
      }
    }

    if (score >= minScore && reasons.length > 0) {
      out.push({
        businessId: b.id,
        name: b.name,
        slug: b.slug,
        phone: b.phone,
        suburb: b.suburb,
        city: b.city,
        website: b.website,
        distanceM,
        score: Math.min(1, score),
        reasons,
      });
    }
  }

  return out.sort((a, b) => b.score - a.score).slice(0, maxResults);
}
