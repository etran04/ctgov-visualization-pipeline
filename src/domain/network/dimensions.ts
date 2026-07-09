import { extractInterventions, extractLeadSponsor } from "./extractors.js";
import type { NetworkStudyRecord } from "./types.js";

export type NetworkDimension = "drug_sponsor";

export type BipartiteDimensionConfig = {
  leftEntityType: string;
  rightEntityType: string;
  extractLeft: (study: NetworkStudyRecord) => string[] | null;
  extractRight: (study: NetworkStudyRecord) => string | null;
  requiredFields: readonly string[];
};

export const NETWORK_DIMENSIONS: Record<NetworkDimension, BipartiteDimensionConfig> = {
  drug_sponsor: {
    leftEntityType: "drug",
    rightEntityType: "sponsor",
    extractLeft: extractInterventions,
    extractRight: extractLeadSponsor,
    requiredFields: ["NCTId", "InterventionName", "LeadSponsorName"],
  },
};
