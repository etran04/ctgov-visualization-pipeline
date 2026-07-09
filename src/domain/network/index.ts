export { buildBipartiteGraph } from "./buildBipartiteGraph.js";
export { NETWORK_DIMENSIONS, NETWORK_DIMENSION_VALUES, type BipartiteDimensionConfig, type NetworkDimension } from "./dimensions.js";
export { extractInterventions, extractLeadSponsor } from "./extractors.js";
export {
  buildNodeId,
  normalizeEntityLabel,
  normalizeInterventionLabel,
  slugifyEntityLabel,
} from "./normalizeEntityLabel.js";
export type {
  BipartiteGraphResult,
  NetworkEdge,
  NetworkGraphFilters,
  NetworkNode,
  NetworkStudyRecord,
} from "./types.js";
