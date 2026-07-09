import { UnsupportedIntentError } from "../errors.js";
import type { ComparisonMode } from "../resolveComparisonMode.js";
import type { Intent } from "../schemas/index.js";

export type VisualizationType =
  | "bar_chart"
  | "grouped_bar_chart"
  | "line_chart"
  | "histogram"
  | "scatterplot"
  | "network_graph";

export type ResolveVisualizationTypeOptions = {
  comparisonMode?: ComparisonMode;
};

/**
 * Map an interpreted intent to a concrete visualization type.
 *
 * Comparison intent routes to `grouped_bar_chart` when `comparisonMode.kind`
 * is `grouped`; otherwise it returns `bar_chart`.
 *
 * @throws {UnsupportedIntentError} For intents not yet implemented.
 */
export function resolveVisualizationType(
  intent: Intent,
  options: ResolveVisualizationTypeOptions = {},
): VisualizationType {
  switch (intent) {
    case "comparison":
      return options.comparisonMode?.kind === "grouped" ? "grouped_bar_chart" : "bar_chart";
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
