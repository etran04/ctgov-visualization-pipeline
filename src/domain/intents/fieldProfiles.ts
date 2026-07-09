import {
  getRequiredFieldsForNetworkDimension,
  type NetworkDimension,
} from "../network/dimensions.js";
import type { Intent } from "../schemas/intents.js";

/** Included on every fetch for citation excerpts and traceability. */
export const BRIEF_TITLE_FIELD = "BriefTitle" as const;

/** CT.gov `fields` parameter values per visualization intent. */
export const INTENT_FIELD_PROFILES = {
  comparison: ["NCTId", BRIEF_TITLE_FIELD, "Phase"],
  trend_over_time: ["NCTId", BRIEF_TITLE_FIELD, "StartDate"],
  distribution: ["NCTId", BRIEF_TITLE_FIELD, "EnrollmentCount"],
  relationship: ["NCTId", BRIEF_TITLE_FIELD, "EnrollmentCount", "StartDate"],
  network: getRequiredFieldsForNetworkDimension("drug_sponsor"),
} as const satisfies Record<Intent, readonly string[]>;

/**
 * Return the CT.gov `fields` list for a visualization intent.
 *
 * Centralizes intent-to-field mapping so fetch clients and orchestrators
 * do not hard-code field sets per intent. Network fetches resolve fields from
 * the dimension registry via `networkDimension`.
 */
export function getFieldsForIntent(intent: Intent): readonly string[];
export function getFieldsForIntent(
  intent: "network",
  networkDimension: NetworkDimension,
): readonly string[];
export function getFieldsForIntent(
  intent: Intent,
  networkDimension?: NetworkDimension,
): readonly string[] {
  switch (intent) {
    case "comparison":
      return INTENT_FIELD_PROFILES.comparison;
    case "trend_over_time":
      return INTENT_FIELD_PROFILES.trend_over_time;
    case "distribution":
      return INTENT_FIELD_PROFILES.distribution;
    case "relationship":
      return INTENT_FIELD_PROFILES.relationship;
    case "network":
      return getRequiredFieldsForNetworkDimension(networkDimension ?? "drug_sponsor");
  }
}

export { getRequiredFieldsForNetworkDimension };
