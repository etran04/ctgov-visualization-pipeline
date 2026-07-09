/** Canonical display order for enrollment bins in charts and aggregation output. */
export const ENROLLMENT_BIN_ORDER = [
  { bin_label: "1–50", bin_start: 1, bin_end: 50 },
  { bin_label: "51–100", bin_start: 51, bin_end: 100 },
  { bin_label: "101–500", bin_start: 101, bin_end: 500 },
  { bin_label: "501–1,000", bin_start: 501, bin_end: 1000 },
  { bin_label: "1,001–5,000", bin_start: 1001, bin_end: 5000 },
  { bin_label: "5,001+", bin_start: 5001, bin_end: null },
] as const;

export type EnrollmentBinDefinition = (typeof ENROLLMENT_BIN_ORDER)[number];

export type EnrollmentBinLabel = EnrollmentBinDefinition["bin_label"];

/**
 * Assign a positive enrollment count to exactly one canonical bin.
 *
 * Returns `null` for non-integer or non-positive counts.
 */
export function mapEnrollmentToBin(count: number): EnrollmentBinLabel | null {
  if (!Number.isInteger(count) || count < 1) {
    return null;
  }

  for (const bin of ENROLLMENT_BIN_ORDER) {
    if (bin.bin_end === null) {
      if (count >= bin.bin_start) {
        return bin.bin_label;
      }
      continue;
    }

    if (count >= bin.bin_start && count <= bin.bin_end) {
      return bin.bin_label;
    }
  }

  return null;
}
