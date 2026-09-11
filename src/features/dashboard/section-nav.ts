const BUSINESS_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function hasPersistedListing(businessId: string | null | undefined) {
  return Boolean(businessId && BUSINESS_ID_RE.test(businessId));
}

/**
 * Next should not get stuck on a local-only draft. Block only when an
 * existing listing actually failed to save.
 */
export function shouldAdvanceAfterSave(input: {
  dirty: boolean;
  saveSucceeded: boolean;
  hasListing: boolean;
}) {
  if (!input.dirty) return true;
  if (input.saveSucceeded) return true;
  return !input.hasListing;
}
