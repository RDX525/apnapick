export const SEARCH_RETRIEVE_FLOOR = 80;
export const SEARCH_RETRIEVE_CAP = 500;

/**
 * Ranking happens in-process after retrieve, so SQL offset cannot page.
 * Pull a window large enough for the requested page, then slice.
 */
export function searchRetrieveLimit(page = 1, pageSize = 20) {
  const safePage = Math.max(1, page);
  const safeSize = Math.min(50, Math.max(1, pageSize));
  return Math.min(
    SEARCH_RETRIEVE_CAP,
    Math.max(SEARCH_RETRIEVE_FLOOR, safePage * safeSize),
  );
}
