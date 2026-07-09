import { buildBipartiteGraph } from "../network/buildBipartiteGraph.js";
import type { NetworkDimension } from "../network/dimensions.js";
import type { BipartiteGraphResult, NetworkGraphFilters, NetworkStudyRecord } from "../network/types.js";

/**
 * Aggregate normalized network studies into a bipartite graph for the given dimension.
 */
export function aggregateByNetwork(
  studies: NetworkStudyRecord[],
  dimension: NetworkDimension,
  filters?: NetworkGraphFilters,
): BipartiteGraphResult {
  return buildBipartiteGraph(studies, dimension, filters);
}
