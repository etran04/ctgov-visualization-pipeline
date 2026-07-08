import type {
  DistributionStudyRecord,
  PhaseStudyRecord,
  TimelineStudyRecord,
} from "./ctgovStudyTypes.js";
import type { EnrollmentBinLabel } from "../utils/enrollmentBins.js";
import type { PhaseLabel } from "../utils/mapPhaseValues.js";

/**
 * Permissive study shape for tests and defensive aggregator fallbacks.
 *
 * Production paths should pass intent-specific strict records from fetch.
 */
export type CtgovStudyLike = {
  protocolSection?: {
    identificationModule?: {
      nctId?: string;
    };
    designModule?: {
      phases?: string[] | unknown;
    };
    statusModule?: {
      startDateStruct?: {
        date?: string;
      };
    };
  };
};

export type { DistributionStudyRecord, PhaseStudyRecord, TimelineStudyRecord };

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

/**
 * Internal aggregation bin produced by `aggregateByEnrollment`.
 *
 * `source_nct_ids` is not exposed in the HTTP response; it exists as a
 * hook for future per-bin citation lookup.
 */
export type EnrollmentAggregationBin = {
  bin_label: EnrollmentBinLabel;
  bin_start: number;
  bin_end: number | null;
  trial_count: number;
  source_nct_ids: string[];
};
