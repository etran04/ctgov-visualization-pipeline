import type { PhaseLabel } from "./mapPhaseValues.js";

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
