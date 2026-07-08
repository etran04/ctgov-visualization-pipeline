import type { CtgovStudyLike, YearAggregationBin } from "./types.js";
import { NoAggregatableDataError } from "../errors.js";
import { parseStudyStartYear } from "../parseStudyDate.js";

/** Output of deterministic start-year aggregation. */
export type YearAggregationResult = {
  /** Year bins from min to max (inclusive), zero-filled where count is 0. */
  bins: YearAggregationBin[];
  /** Studies skipped due to missing or unparseable start dates. */
  skipped_malformed: number;
};

function extractStartYear(study: CtgovStudyLike): number | null {
  const date = study.protocolSection?.statusModule?.startDateStruct?.date;
  return parseStudyStartYear(date);
}

/**
 * Count trials per start year from CT.gov study records.
 *
 * Reads start dates from `statusModule.startDateStruct.date` only. Each study
 * contributes to exactly one year bin. Gap years between the minimum and
 * maximum observed years are zero-filled so line charts do not interpolate
 * across missing data. `source_nct_ids` is kept internal for future citation
 * work and is stripped at HTTP assembly.
 *
 * @throws {NoAggregatableDataError} When input is empty or every study is skipped.
 */
export function aggregateByStartYear(studies: CtgovStudyLike[]): YearAggregationResult {
  if (studies.length === 0) {
    throw new NoAggregatableDataError("No studies were provided for aggregation");
  }

  const counts = new Map<number, number>();
  const sourceNctIds = new Map<number, string[]>();

  let skippedMalformed = 0;
  let aggregatableStudies = 0;

  for (const study of studies) {
    const year = extractStartYear(study);
    if (year === null) {
      skippedMalformed += 1;
      continue;
    }

    aggregatableStudies += 1;
    counts.set(year, (counts.get(year) ?? 0) + 1);

    const nctId = study.protocolSection?.identificationModule?.nctId;
    const sourceId = typeof nctId === "string" ? nctId : null;
    if (sourceId !== null) {
      const existing = sourceNctIds.get(year) ?? [];
      existing.push(sourceId);
      sourceNctIds.set(year, existing);
    }
  }

  if (aggregatableStudies === 0) {
    throw new NoAggregatableDataError("No studies contained aggregatable start year data");
  }

  const years = [...counts.keys()];
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);

  const bins: YearAggregationBin[] = [];
  for (let year = minYear; year <= maxYear; year += 1) {
    bins.push({
      year,
      trial_count: counts.get(year) ?? 0,
      source_nct_ids: sourceNctIds.get(year) ?? [],
    });
  }

  return {
    bins,
    skipped_malformed: skippedMalformed,
  };
}
