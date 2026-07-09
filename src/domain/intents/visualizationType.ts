import { UnsupportedIntentError } from "../errors.js";
import type { Intent } from "../schemas/index.js";

export type VisualizationType =
  | "bar_chart"
  | "line_chart"
  | "histogram"
  | "scatterplot"
  | "network_graph";

/**
 * Map an interpreted intent to a concrete visualization type.
 *
 * @throws {UnsupportedIntentError} For intents not yet implemented.
 */
export function resolveVisualizationType(intent: Intent): VisualizationType {
  switch (intent) {
    case "comparison":
      return "bar_chart";
    case "trend_over_time":
      return "line_chart";
    case "distribution":
      return "histogram";
    case "relationship":
      return "scatterplot";
    case "network":
      return "network_graph";
    default:
      throw new UnsupportedIntentError(`Unsupported intent: ${String(intent)}`);
  }
}
