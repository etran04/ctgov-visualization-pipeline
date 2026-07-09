import type { z } from "zod";
import type { CitationSchema } from "../schemas/shared.js";

export const MAX_CITATIONS_PER_DATUM = 10;

type Citation = z.infer<typeof CitationSchema>;

/**
 * Resolve NCT IDs to citation objects using a study excerpt index.
 * IDs are deduped, sorted lexicographically, and capped at `max`.
 * IDs missing from the index are skipped.
 */
export function buildCitations(
  nctIds: string[],
  index: Map<string, string>,
  max = MAX_CITATIONS_PER_DATUM,
): Citation[] {
  const uniqueSortedIds = [...new Set(nctIds)].sort((a, b) => a.localeCompare(b));
  const citations: Citation[] = [];

  for (const nctId of uniqueSortedIds) {
    if (citations.length >= max) {
      break;
    }

    const excerpt = index.get(nctId);
    if (excerpt === undefined) {
      continue;
    }

    citations.push({ nct_id: nctId, excerpt });
  }

  return citations;
}
