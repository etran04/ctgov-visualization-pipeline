/**
 * Build a ClinicalTrials.gov `filter.advanced` expression for study start date years.
 *
 * Uses `AREA[StartDate]RANGE[start,end]` with `MIN` / `MAX` when one bound is open.
 */
export function buildStartDateRangeFilter(
  startYear: number | null,
  endYear: number | null,
): string | null {
  if (startYear === null && endYear === null) {
    return null;
  }

  const rangeStart = startYear !== null ? `${startYear}-01-01` : "MIN";
  const rangeEnd = endYear !== null ? `${endYear}-12-31` : "MAX";

  return `AREA[StartDate]RANGE[${rangeStart},${rangeEnd}]`;
}
