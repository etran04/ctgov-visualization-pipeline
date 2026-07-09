import type { PhaseAggregationBin, PhaseStudyRecord } from "../types/aggregations.js";
import { NoAggregatableDataError } from "../errors.js";
import { PHASE_BIN_ORDER, type PhaseLabel } from "../mappings/phases.js";
import { aggregateByPhase, type PhaseAggregationResult } from "./aggregateByPhase.js";

/** One drug series and its fetched studies for grouped phase aggregation. */
export type GroupedPhaseSeriesInput = {
  series: string;
  studies: PhaseStudyRecord[];
};

/** Internal long-format row produced by `aggregateGroupedByPhase`. */
export type GroupedPhaseAggregationRow = {
  phase: PhaseLabel;
  series: string;
  trial_count: number;
  source_nct_ids: string[];
};

/** Output of deterministic grouped phase-bin aggregation. */
export type GroupedPhaseAggregationResult = {
  /** Long-format rows in `PHASE_BIN_ORDER` × input series order. */
  rows: GroupedPhaseAggregationRow[];
  /** Studies skipped due to missing or unmappable phase data, summed across series. */
  skipped_malformed: number;
  /** Studies counted in more than one phase bin, summed across series. */
  studies_with_multiple_phases: number;
};

function zeroFilledBins(): PhaseAggregationBin[] {
  return PHASE_BIN_ORDER.map((phase) => ({
    phase,
    trial_count: 0,
    source_nct_ids: [],
  }));
}

function aggregateSeriesOrZeroFill(studies: PhaseStudyRecord[]): PhaseAggregationResult {
  if (studies.length === 0) {
    return {
      bins: zeroFilledBins(),
      skipped_malformed: 0,
      studies_with_multiple_phases: 0,
    };
  }

  try {
    return aggregateByPhase(studies);
  } catch (error) {
    if (error instanceof NoAggregatableDataError) {
      return {
        bins: zeroFilledBins(),
        skipped_malformed: studies.length,
        studies_with_multiple_phases: 0,
      };
    }

    throw error;
  }
}

/**
 * Count trials per phase bin for multiple comparison series.
 *
 * Reuses `aggregateByPhase` per series, then flattens to long format with
 * every `(phase, series)` pair present. Empty or all-malformed series are
 * zero-filled so partial fetch results still produce a complete chart.
 *
 * @throws {NoAggregatableDataError} When no series are provided or every
 *   series lacks aggregatable phase data.
 */
export function aggregateGroupedByPhase(
  seriesInputs: GroupedPhaseSeriesInput[],
): GroupedPhaseAggregationResult {
  if (seriesInputs.length === 0) {
    throw new NoAggregatableDataError("No series were provided for grouped aggregation");
  }

  const seriesResults = seriesInputs.map(({ series, studies }) => ({
    series,
    result: aggregateSeriesOrZeroFill(studies),
  }));

  const hasAnyAggregatableData = seriesResults.some((entry) =>
    entry.result.bins.some((bin) => bin.trial_count > 0),
  );

  if (!hasAnyAggregatableData) {
    throw new NoAggregatableDataError(
      "No studies contained aggregatable phase data across all series",
    );
  }

  const rows: GroupedPhaseAggregationRow[] = [];
  for (const phase of PHASE_BIN_ORDER) {
    for (const { series, result } of seriesResults) {
      const bin = result.bins.find((candidate) => candidate.phase === phase);
      rows.push({
        phase,
        series,
        trial_count: bin?.trial_count ?? 0,
        source_nct_ids: bin?.source_nct_ids ?? [],
      });
    }
  }

  return {
    rows,
    skipped_malformed: seriesResults.reduce(
      (sum, entry) => sum + entry.result.skipped_malformed,
      0,
    ),
    studies_with_multiple_phases: seriesResults.reduce(
      (sum, entry) => sum + entry.result.studies_with_multiple_phases,
      0,
    ),
  };
}
