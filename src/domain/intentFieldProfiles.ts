import type { Intent } from "./schemas/intents.js";
import { UnsupportedIntentError } from "./errors.js";

/** CT.gov `fields` parameter values per visualization intent. */
export const INTENT_FIELD_PROFILES = {
  comparison: ["NCTId", "Phase"],
  trend_over_time: ["NCTId", "StartDate"],
} as const satisfies Record<Exclude<Intent, "distribution">, readonly string[]>;

/**
 * Return the CT.gov `fields` list for a visualization intent.
 *
 * Centralizes intent-to-field mapping so fetch clients and orchestrators
 * do not hard-code field sets per intent.
 */
export function getFieldsForIntent(intent: Intent): readonly string[] {
  switch (intent) {
    case "comparison":
      return INTENT_FIELD_PROFILES.comparison;
    case "trend_over_time":
      return INTENT_FIELD_PROFILES.trend_over_time;
    case "distribution":
      throw new UnsupportedIntentError("Distribution intent is not yet implemented");
  }
}
