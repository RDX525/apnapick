export type ClaimSubmitDecision =
  | { action: "update-pending"; claimId: string; status: string }
  | { action: "already-member" }
  | { action: "insert" }
  | { action: "unavailable"; reason: "missing" | "claimed" };

export function decideClaimSubmitAction(input: {
  userId: string;
  businessId: string;
  business: {
    id: string;
    status: string;
    isClaimed: boolean;
    deletedAt: string | null;
  } | null;
  pendingClaim: { id: string; claimantId: string; status: string } | null;
  membership: { userId: string; businessId: string } | null;
}): ClaimSubmitDecision {
  const pending =
    input.pendingClaim &&
    input.pendingClaim.claimantId === input.userId
      ? input.pendingClaim
      : null;
  if (pending) {
    return {
      action: "update-pending",
      claimId: pending.id,
      status: pending.status,
    };
  }

  const member =
    input.membership &&
    input.membership.userId === input.userId &&
    input.membership.businessId === input.businessId
      ? input.membership
      : null;
  if (member) {
    return { action: "already-member" };
  }

  if (
    !input.business ||
    input.business.id !== input.businessId ||
    input.business.deletedAt ||
    input.business.status !== "PUBLISHED"
  ) {
    return { action: "unavailable", reason: "missing" };
  }

  if (input.business.isClaimed) {
    return { action: "unavailable", reason: "claimed" };
  }

  return { action: "insert" };
}
