export { buildBipartiteGraph } from "./buildBipartiteGraph.js";
export { NETWORK_DIMENSIONS, type BipartiteDimensionConfig, type NetworkDimension } from "./dimensions.js";
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
