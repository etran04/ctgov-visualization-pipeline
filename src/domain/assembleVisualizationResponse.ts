import type { PhaseAggregationBin } from "./aggregationTypes.js";
import type { QueryEntities, VisualizationResponse } from "./schemas.js";
import { VisualizationResponseSchema } from "./schemas.js";

type AssembleVisualizationResponseInput = {
  filters: QueryEntities;
  visualizationType: "bar_chart";
  aggregation: PhaseAggregationBin[];
  fetchedStudies: number;
  skippedMalformed: number;
  studiesWithMultiplePhases: number;
  truncated: boolean;
};

function buildTitle(filters: QueryEntities): string {
  if (filters.drug_name && filters.condition) {
    return `Trial phases for ${filters.drug_name} in ${filters.condition}`;
  }

  if (filters.drug_name) {
    return `Trial phases for ${filters.drug_name}`;
  }

  if (filters.condition) {
    return `Trial phases for ${filters.condition}`;
  }

  if (filters.phase) {
    return `Trial phases for ${filters.phase} studies`;
  }

  return "Trial phases for matching studies";
}

/**
 * Build the final HTTP visualization response from aggregation output.
 *
 * Generates a deterministic chart title (drug-first when both drug and
 * condition are present), strips internal `source_nct_ids` from data points,
 * and validates the payload against `VisualizationResponseSchema`.
 */
export function assembleVisualizationResponse(
  input: AssembleVisualizationResponseInput,
): VisualizationResponse {
  return VisualizationResponseSchema.parse({
    visualization: {
      type: input.visualizationType,
      title: buildTitle(input.filters),
      encoding: {
        x: { field: "phase", type: "nominal" },
        y: { field: "trial_count", type: "quantitative" },
      },
      data: input.aggregation.map((bin) => ({
        phase: bin.phase,
        trial_count: bin.trial_count,
      })),
    },
    meta: {
      filters: input.filters,
      source: "clinicaltrials.gov",
      fetched_studies: input.fetchedStudies,
      skipped_malformed: input.skippedMalformed,
      studies_with_multiple_phases: input.studiesWithMultiplePhases,
      truncated: input.truncated,
    },
  });
}
