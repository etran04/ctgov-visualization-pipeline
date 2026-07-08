import { UnsupportedIntentError } from "./errors.js";
import type { Intent } from "./schemas.js";

/**
 * Map an interpreted intent to a concrete visualization type.
 *
 * V1 supports only `comparison` → `bar_chart`.
 *
 * @throws {UnsupportedIntentError} For intents not yet implemented.
 */
export function resolveVisualizationType(intent: Intent): "bar_chart" {
  switch (intent) {
    // NB: Building V1 first, so only supporting comparison for now.
    case "comparison":
      return "bar_chart";
    default:
      // TODO: add viz mappings for trend_over_time, distribution, relationship, etc.
      throw new UnsupportedIntentError(`Unsupported intent: ${String(intent)}`);
  }
}
