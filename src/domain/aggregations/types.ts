import type { PhaseLabel } from "../mapPhaseValues.js";

/**
 * Minimal CT.gov study record shape used as aggregation input.
 *
 * Fields are optional because each aggregator reads only the subset it needs.
 */
export type CtgovStudyLike = {
  protocolSection?: {
    identificationModule?: {
      nctId?: unknown;
    };
    designModule?: {
      phases?: unknown;
    };
    statusModule?: {
      startDateStruct?: {
        date?: unknown;
      };
    };
  };
};

/**
 * Internal aggregation bin produced by `aggregateByPhase`.
 *
 * `source_nct_ids` is not exposed in the V1 HTTP response; it exists as a
 * hook for future per-bin citation lookup.
 */
export type PhaseAggregationBin = {
  phase: PhaseLabel;
  trial_count: number;
  source_nct_ids: string[];
};

/**
 * Internal aggregation bin produced by `aggregateByStartYear`.
 *
 * `source_nct_ids` is not exposed in the HTTP response; it exists as a
 * hook for future per-bin citation lookup.
 */
export type YearAggregationBin = {
  year: number;
  trial_count: number;
  source_nct_ids: string[];
};
