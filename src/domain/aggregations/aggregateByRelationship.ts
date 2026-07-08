import type { RelationshipPoint, RelationshipStudyRecord } from "../types/aggregations.js";
import { NoAggregatableDataError } from "../errors.js";
import { parseEnrollmentCount } from "../utils/parseEnrollmentCount.js";
import { parseStudyStartYear } from "../utils/parseStudyDate.js";

/** Output of per-study relationship aggregation. */
export type RelationshipAggregationResult = {
  /** One point per valid study, sorted deterministically. */
  points: RelationshipPoint[];
  /** Studies skipped due to missing or non-positive enrollment or unparseable start date. */
  skipped_malformed: number;
};

function extractEnrollmentCount(study: RelationshipStudyRecord): number | null {
  const count = study.protocolSection.designModule?.enrollmentInfo?.count;
  return parseEnrollmentCount(count);
}

function extractStartYear(study: RelationshipStudyRecord): number | null {
  const date = study.protocolSection.statusModule?.startDateStruct?.date;
  return parseStudyStartYear(date);
}

function compareRelationshipPoints(a: RelationshipPoint, b: RelationshipPoint): number {
  if (a.year !== b.year) {
    return a.year - b.year;
  }

  if (a.enrollment_count !== b.enrollment_count) {
    return a.enrollment_count - b.enrollment_count;
  }

  return a.nct_id.localeCompare(b.nct_id);
}

/**
 * Build per-study scatterplot points from enrollment and start year.
 *
 * Reads enrollment from `designModule.enrollmentInfo.count` and start year from
 * `statusModule.startDateStruct.date`. Studies missing either dimension are
 * skipped. Unlike binned aggregations, there is no zero-fill — only valid
 * studies appear as points.
 *
 * @throws {NoAggregatableDataError} When input is empty or every study is skipped.
 */
export function aggregateByRelationship(
  studies: RelationshipStudyRecord[],
): RelationshipAggregationResult {
  if (studies.length === 0) {
    throw new NoAggregatableDataError("No studies were provided for aggregation");
  }

  const points: RelationshipPoint[] = [];
  let skippedMalformed = 0;

  for (const study of studies) {
    const enrollmentCount = extractEnrollmentCount(study);
    const year = extractStartYear(study);

    if (enrollmentCount === null || year === null) {
      skippedMalformed += 1;
      continue;
    }

    const nctId = study.protocolSection.identificationModule?.nctId;
    if (typeof nctId !== "string") {
      skippedMalformed += 1;
      continue;
    }

    points.push({
      nct_id: nctId,
      enrollment_count: enrollmentCount,
      year,
    });
  }

  if (points.length === 0) {
    throw new NoAggregatableDataError(
      "No studies contained aggregatable enrollment and start year data",
    );
  }

  points.sort(compareRelationshipPoints);

  return {
    points,
    skipped_malformed: skippedMalformed,
  };
}
