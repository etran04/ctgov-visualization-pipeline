import type { Intent } from "./schemas/intents.js";

/** CT.gov `fields` parameter values per visualization intent. */
export const INTENT_FIELD_PROFILES = {
  comparison: ["NCTId", "Phase"],
  trend_over_time: ["NCTId", "StartDate"],
} as const satisfies Record<Intent, readonly string[]>;

/**
 * Return the CT.gov `fields` list for a visualization intent.
 *
 * Centralizes intent-to-field mapping so fetch clients and orchestrators
 * do not hard-code field sets per intent.
 */
export function getFieldsForIntent(intent: Intent): readonly string[] {
  return INTENT_FIELD_PROFILES[intent];
}
