import type { DistributionStudyRecord, EnrollmentAggregationBin } from "../types/aggregations.js";
import { NoAggregatableDataError } from "../errors.js";
import { ENROLLMENT_BIN_ORDER, mapEnrollmentToBin } from "../mappings/enrollmentBins.js";
import { parseEnrollmentCount } from "../utils/parseEnrollmentCount.js";

/** Output of deterministic enrollment-bin aggregation. */
export type EnrollmentAggregationResult = {
  /** All enrollment bins in stable order, zero-filled where count is 0. */
  bins: EnrollmentAggregationBin[];
  /** Studies skipped due to missing or non-positive enrollment data. */
  skipped_malformed: number;
};

function extractEnrollmentCount(study: DistributionStudyRecord): number | null {
  const count = study.protocolSection.designModule?.enrollmentInfo?.count;
  return parseEnrollmentCount(count);
}

/**
 * Count trials per enrollment bin from CT.gov study records.
 *
 * Reads enrollment from `designModule.enrollmentInfo.count` only. Each study
 * contributes to exactly one bin. All canonical bins are always returned with
 * zero-fill. `source_nct_ids` is kept internal for future citation work and is
 * stripped at HTTP assembly.
 *
 * @throws {NoAggregatableDataError} When input is empty or every study is skipped.
 */
export function aggregateByEnrollment(
  studies: DistributionStudyRecord[],
): EnrollmentAggregationResult {
  if (studies.length === 0) {
    throw new NoAggregatableDataError("No studies were provided for aggregation");
  }

  const counts = new Map<string, number>(
    ENROLLMENT_BIN_ORDER.map((bin) => [bin.bin_label, 0] satisfies [string, number]),
  );
  const sourceNctIds = new Map<string, string[]>(
    ENROLLMENT_BIN_ORDER.map((bin) => [bin.bin_label, []] satisfies [string, string[]]),
  );

  let skippedMalformed = 0;
  let aggregatableStudies = 0;

  for (const study of studies) {
    const enrollmentCount = extractEnrollmentCount(study);
    if (enrollmentCount === null) {
      skippedMalformed += 1;
      continue;
    }

    const binLabel = mapEnrollmentToBin(enrollmentCount);
    if (binLabel === null) {
      skippedMalformed += 1;
      continue;
    }

    aggregatableStudies += 1;
    counts.set(binLabel, (counts.get(binLabel) ?? 0) + 1);

    const nctId = study.protocolSection.identificationModule?.nctId;
    if (typeof nctId === "string") {
      sourceNctIds.get(binLabel)?.push(nctId);
    }
  }

  if (aggregatableStudies === 0) {
    throw new NoAggregatableDataError("No studies contained aggregatable enrollment data");
  }

  return {
    bins: ENROLLMENT_BIN_ORDER.map((bin) => ({
      bin_label: bin.bin_label,
      bin_start: bin.bin_start,
      bin_end: bin.bin_end,
      trial_count: counts.get(bin.bin_label) ?? 0,
      source_nct_ids: sourceNctIds.get(bin.bin_label) ?? [],
    })),
    skipped_malformed: skippedMalformed,
  };
}
