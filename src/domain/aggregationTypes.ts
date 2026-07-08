import type { PhaseLabel } from "./mapPhaseValues.js";

export type PhaseAggregationBin = {
  phase: PhaseLabel;
  trial_count: number;
  source_nct_ids: string[];
};
