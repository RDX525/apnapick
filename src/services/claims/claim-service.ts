import type { ClaimStatus } from "@/domain/business/types";
import { CLAIM_STATUSES } from "@/domain/business/types";

const TRANSITIONS: Record<ClaimStatus, readonly ClaimStatus[]> = {
  PENDING: ["UNDER_REVIEW", "EXPIRED", "REJECTED"],
  UNDER_REVIEW: ["VERIFIED", "REJECTED", "EXPIRED"],
  VERIFIED: [],
  REJECTED: ["PENDING"],
  EXPIRED: ["PENDING"],
};

export function canTransitionClaim(from: ClaimStatus, to: ClaimStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertClaimTransition(from: ClaimStatus, to: ClaimStatus) {
  if (!canTransitionClaim(from, to)) {
    throw new Error(`Invalid claim transition ${from} → ${to}`);
  }
}

export function isClaimStatus(value: string): value is ClaimStatus {
  return (CLAIM_STATUSES as readonly string[]).includes(value);
}

export type ClaimRecord = {
  id: string;
  businessId: string;
  claimantId: string;
  status: ClaimStatus;
  evidence: Record<string, unknown>;
  notes?: string | null;
  createdAt: string;
  expiresAt?: string | null;
};

/**
 * In-memory claim store for unit tests / offline demos.
 * Production uses Supabase `business_claims` via claim-repository.
 */
export class ClaimStateMachine {
  constructor(private claims: ClaimRecord[] = []) {}

  create(input: Omit<ClaimRecord, "status" | "createdAt"> & { status?: ClaimStatus }) {
    const existing = this.claims.find(
      (c) =>
        c.businessId === input.businessId &&
        c.claimantId === input.claimantId &&
        ["PENDING", "UNDER_REVIEW"].includes(c.status),
    );
    if (existing) {
      throw new Error("An active claim already exists for this business");
    }
    const claim: ClaimRecord = {
      ...input,
      status: input.status ?? "PENDING",
      createdAt: new Date().toISOString(),
    };
    this.claims.push(claim);
    return claim;
  }

  transition(claimId: string, to: ClaimStatus, actorId: string) {
    const claim = this.claims.find((c) => c.id === claimId);
    if (!claim) throw new Error("Claim not found");
    assertClaimTransition(claim.status, to);
    claim.status = to;
    claim.evidence = {
      ...claim.evidence,
      lastTransitionBy: actorId,
      lastTransitionAt: new Date().toISOString(),
    };
    return claim;
  }

  list() {
    return [...this.claims];
  }
}
