import type {
  PhaseAggregationBin,
  YearAggregationBin,
} from "./aggregations/index.js";
import type { QueryEntities, VisualizationResponse } from "./schemas/index.js";
import { VisualizationResponseSchema } from "./schemas/index.js";
import type { VisualizationType } from "./resolveVisualizationType.js";

type BaseAssembleInput = {
  filters: QueryEntities;
  fetchedStudies: number;
  skippedMalformed: number;
  studiesWithMultiplePhases: number;
  truncated: boolean;
};

type BarChartAssembleInput = BaseAssembleInput & {
  visualizationType: "bar_chart";
  aggregation: PhaseAggregationBin[];
};

type LineChartAssembleInput = BaseAssembleInput & {
  visualizationType: "line_chart";
  aggregation: YearAggregationBin[];
};

export type AssembleVisualizationResponseInput =
  | BarChartAssembleInput
  | LineChartAssembleInput;

const TITLE_PREFIX_BY_VIZ_TYPE = {
  bar_chart: "Trial phases for",
  line_chart: "Trials started per year for",
} as const satisfies Record<VisualizationType, string>;

function buildFilterSubject(filters: QueryEntities): string {
  if (filters.drug_name && filters.condition) {
    return `${filters.drug_name} in ${filters.condition}`;
  }

  if (filters.drug_name) {
    return filters.drug_name;
  }

  if (filters.condition) {
    return filters.condition;
  }

  if (filters.phase) {
    return `${filters.phase} studies`;
  }

  return "matching studies";
}

function buildTitle(
  filters: QueryEntities,
  visualizationType: VisualizationType,
): string {
  return `${TITLE_PREFIX_BY_VIZ_TYPE[visualizationType]} ${buildFilterSubject(filters)}`;
}

function buildMeta(input: BaseAssembleInput) {
  return {
    filters: input.filters,
    source: "clinicaltrials.gov" as const,
    fetched_studies: input.fetchedStudies,
    skipped_malformed: input.skippedMalformed,
    studies_with_multiple_phases: input.studiesWithMultiplePhases,
    truncated: input.truncated,
  };
}

/**
 * Build a bar chart visualization response from phase aggregation output.
 *
 * Strips internal `source_nct_ids` from data points and validates against
 * `VisualizationResponseSchema`.
 */
export function assembleBarChartResponse(
  input: BarChartAssembleInput,
): VisualizationResponse {
  return VisualizationResponseSchema.parse({
    visualization: {
      type: "bar_chart",
      title: buildTitle(input.filters, "bar_chart"),
      encoding: {
        x: { field: "phase", type: "nominal" },
        y: { field: "trial_count", type: "quantitative" },
      },
      data: input.aggregation.map((bin) => ({
        phase: bin.phase,
        trial_count: bin.trial_count,
      })),
    },
    meta: buildMeta(input),
  });
}

/**
 * Build a line chart visualization response from start-year aggregation output.
 *
 * Strips internal `source_nct_ids` from data points and validates against
 * `VisualizationResponseSchema`.
 */
export function assembleLineChartResponse(
  input: LineChartAssembleInput,
): VisualizationResponse {
  return VisualizationResponseSchema.parse({
    visualization: {
      type: "line_chart",
      title: buildTitle(input.filters, "line_chart"),
      encoding: {
        x: { field: "year", type: "temporal" },
        y: { field: "trial_count", type: "quantitative" },
      },
      data: input.aggregation.map((bin) => ({
        year: bin.year,
        trial_count: bin.trial_count,
      })),
    },
    meta: buildMeta(input),
  });
}

/**
 * Build the final HTTP visualization response from aggregation output.
 *
 * Dispatches to the intent-specific assembler based on `visualizationType`.
 */
export function assembleVisualizationResponse(
  input: AssembleVisualizationResponseInput,
): VisualizationResponse {
  switch (input.visualizationType) {
    case "bar_chart":
      return assembleBarChartResponse(input);
    case "line_chart":
      return assembleLineChartResponse(input);
    default: {
      const _exhaustive: never = input;
      throw new Error(
        `Unsupported visualization type: ${String((_exhaustive as { visualizationType: VisualizationType }).visualizationType)}`,
      );
    }
  }
}
