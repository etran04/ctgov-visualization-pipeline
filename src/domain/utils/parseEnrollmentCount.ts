/**
 * Extract a positive integer enrollment count from CT.gov `enrollmentInfo.count`.
 *
 * Returns `null` for missing, non-numeric, non-integer, zero, or negative values.
 */
export function parseEnrollmentCount(count: unknown): number | null {
  if (typeof count !== "number" || !Number.isFinite(count)) {
    return null;
  }

  if (!Number.isInteger(count) || count <= 0) {
    return null;
  }

  return count;
}
