import { NoStudiesFoundError } from "../../domain/errors.js";
import type { GroupedComparisonSharedFilters } from "../../domain/resolveComparisonMode.js";
import type { PhaseStudyRecord } from "../../domain/types/ctgovStudyTypes.js";
import type { ValidatedEntities } from "../../domain/validateEntities.js";
import { logger } from "../../lib/logger.js";
import { DEFAULT_CTGOV_FIELDS, fetchStudies } from "./fetchStudies.js";

export type { GroupedComparisonSharedFilters };

export type FetchStudiesForGroupedComparisonInput = {
  targets: string[];
  sharedFilters: GroupedComparisonSharedFilters;
};

export type FetchStudiesForGroupedComparisonOptions = {
  fields?: readonly string[];
};

/** Per-drug fetch outcome for grouped comparison aggregation. */
export type GroupedComparisonSeriesFetchResult = {
  series: string;
  studies: PhaseStudyRecord[];
  pages_fetched: number;
  skipped_malformed: number;
  truncated: boolean;
};

/** Aggregated result of parallel per-drug fetches for grouped comparison. */
export type FetchStudiesForGroupedComparisonResult = {
  seriesResults: GroupedComparisonSeriesFetchResult[];
  fetched_studies: number;
  skipped_malformed: number;
  pages_fetched: number;
  truncated: boolean;
};

async function fetchSeriesStudies(
  target: string,
  sharedFilters: GroupedComparisonSharedFilters,
  fields: readonly string[],
): Promise<GroupedComparisonSeriesFetchResult> {
  const entities: ValidatedEntities = {
    drug_name: target,
    comparison_targets: null,
    condition: sharedFilters.condition,
    phase: sharedFilters.phase,
    sponsor: sharedFilters.sponsor,
    country: sharedFilters.country,
    start_year: sharedFilters.start_year,
    end_year: sharedFilters.end_year,
  };

  try {
    const result = await fetchStudies(entities, {
      intent: "comparison",
      fields,
    });

    return {
      series: target,
      studies: result.studies,
      pages_fetched: result.pages_fetched,
      skipped_malformed: result.skipped_malformed,
      truncated: result.truncated,
    };
  } catch (error) {
    if (error instanceof NoStudiesFoundError) {
      return {
        series: target,
        studies: [],
        pages_fetched: 0,
        skipped_malformed: 0,
        truncated: false,
      };
    }

    throw error;
  }
}

/**
 * Fetch clinical trial studies for a grouped drug comparison.
 *
 * Issues one CT.gov fetch per comparison target in parallel, applying shared
 * `condition` and `phase` filters to every series. Empty series are zero-filled
 * rather than failing the request unless every target returns no studies.
 *
 * @throws {NoStudiesFoundError} When every target returns zero valid studies.
 * @throws {UpstreamApiError} When any CT.gov request fails after retries.
 */
export async function fetchStudiesForGroupedComparison(
  input: FetchStudiesForGroupedComparisonInput,
  options: FetchStudiesForGroupedComparisonOptions = {},
): Promise<FetchStudiesForGroupedComparisonResult> {
  const fields = options.fields ?? DEFAULT_CTGOV_FIELDS;

  const seriesResults = await Promise.all(
    input.targets.map((target) => fetchSeriesStudies(target, input.sharedFilters, fields)),
  );

  const fetched_studies = seriesResults.reduce((sum, result) => sum + result.studies.length, 0);

  if (fetched_studies === 0) {
    throw new NoStudiesFoundError(
      "ClinicalTrials.gov returned no studies for any comparison target",
    );
  }

  const skipped_malformed = seriesResults.reduce(
    (sum, result) => sum + result.skipped_malformed,
    0,
  );
  const pages_fetched = seriesResults.reduce((sum, result) => sum + result.pages_fetched, 0);
  const truncated = seriesResults.some((result) => result.truncated);

  logger.info(
    {
      comparison_targets: input.targets,
      series_count: seriesResults.length,
      fetched_studies,
      skipped_malformed,
      pages_fetched,
      truncated,
    },
    "Fetched studies for grouped comparison from ClinicalTrials.gov",
  );

  return {
    seriesResults,
    fetched_studies,
    skipped_malformed,
    pages_fetched,
    truncated,
  };
}
