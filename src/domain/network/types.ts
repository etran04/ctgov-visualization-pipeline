/**
 * Validated study with interventions and lead sponsor — output of network fetch.
 *
 * Defined here for the graph engine; consolidated into `ctgovStudyTypes` when
 * normalization lands in commit 2.
 */
export type NetworkStudyRecord = {
  protocolSection: {
    identificationModule: { nctId: string };
    armsInterventionsModule: { interventions: { name: string }[] };
    sponsorCollaboratorsModule: { leadSponsor: { name: string } };
  };
};

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
