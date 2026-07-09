export { aggregateByEnrollment, type EnrollmentAggregationResult } from "./aggregateByEnrollment.js";
export { aggregateByNetwork } from "./aggregateByNetwork.js";
export {
  aggregateGroupedByPhase,
  type GroupedPhaseAggregationResult,
  type GroupedPhaseAggregationRow,
  type GroupedPhaseSeriesInput,
} from "./aggregateGroupedByPhase.js";
export { aggregateByPhase, type PhaseAggregationResult } from "./aggregateByPhase.js";
export {
  aggregateByRelationship,
  type RelationshipAggregationResult,
} from "./aggregateByRelationship.js";
export { aggregateByStartYear, type YearAggregationResult } from "./aggregateByStartYear.js";
export type {
  CtgovStudyLike,
  DistributionStudyRecord,
  EnrollmentAggregationBin,
  PhaseAggregationBin,
  PhaseStudyRecord,
  RelationshipPoint,
  RelationshipStudyRecord,
  TimelineStudyRecord,
  YearAggregationBin,
} from "../types/aggregations.js";
