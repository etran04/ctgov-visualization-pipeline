import { extractInterventions, extractLeadSponsor } from "./extractors.js";
import type { NetworkStudyRecord } from "./types.js";

/** Supported bipartite network topologies. Single source of truth for domain and schemas. */
// NB: Add additional topology literals here (e.g. "drug_condition"); NetworkDimensionSchema updates automatically.
export const NETWORK_DIMENSION_VALUES = ["drug_sponsor"] as const;

export type NetworkDimension = (typeof NETWORK_DIMENSION_VALUES)[number];

export type BipartiteDimensionConfig = {
  leftEntityType: string;
  rightEntityType: string;
  extractLeft: (study: NetworkStudyRecord) => string[] | null;
  extractRight: (study: NetworkStudyRecord) => string | null;
  requiredFields: readonly string[];
};

// NB: Add a matching registry entry per topology (extractors + requiredFields). requiredFields
// drive fetch via getRequiredFieldsForNetworkDimension. Also extend normalizeNetworkStudy,
// interpretation/LLM prompt, and title prefix in assembleVisualizationResponse.
export const NETWORK_DIMENSIONS = {
  drug_sponsor: {
    leftEntityType: "drug",
    rightEntityType: "sponsor",
    extractLeft: extractInterventions,
    extractRight: extractLeadSponsor,
    requiredFields: ["NCTId", "InterventionName", "LeadSponsorName"],
  },
} as const satisfies Record<NetworkDimension, BipartiteDimensionConfig>;

/** CT.gov `fields` values required to normalize studies for a network topology. */
export function getRequiredFieldsForNetworkDimension(
  dimension: NetworkDimension,
): readonly string[] {
  return NETWORK_DIMENSIONS[dimension].requiredFields;
}
