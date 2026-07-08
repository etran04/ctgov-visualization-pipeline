export { aggregateByEnrollment, type EnrollmentAggregationResult } from "./aggregateByEnrollment.js";
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
