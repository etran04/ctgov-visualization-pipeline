export type { NetworkStudyRecord } from "../types/ctgovStudyTypes.js";

export type NetworkNode = {
  id: string;
  label: string;
  entity_type: string;
};

/** Edge shape during aggregation; `source_nct_ids` is stripped at HTTP assembly. */
export type NetworkEdge = {
  source: string;
  target: string;
  weight: number;
  source_nct_ids: string[];
};

export type BipartiteGraphResult = {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  skipped_malformed: number;
};

export type NetworkGraphFilters = {
  drug_name?: string | null;
};
