/**
 * Builds the PostgREST or() filter for a free-text challenge search.
 *
 * Shared by the /challenges page and the GET /api/bug-challenges handler so
 * the first page and the infinitely-scrolled pages can never disagree about
 * what matches — they have to run the identical filter or the list would
 * quietly change shape as you scroll.
 *
 * or() takes a comma-separated filter list, so a query containing a comma or
 * parenthesis could otherwise alter the filter expression itself. Stripping
 * those characters is enough; they carry no search meaning here.
 */
export function buildSearchFilter(q) {
  const safe = q.replace(/[,()]/g, " ");
  return `title.ilike.%${safe}%,problem_description.ilike.%${safe}%,symptom_description.ilike.%${safe}%`;
}

/** Rows fetched per page by the challenge grid, first page included. */
export const PAGE_SIZE = 24;
