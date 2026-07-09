import type {
  EnrollmentAggregationBin,
  PhaseAggregationBin,
  RelationshipPoint,
  YearAggregationBin,
} from "./aggregations/index.js";
import type { QueryEntities, VisualizationResponse } from "./schemas/index.js";
import { VisualizationResponseSchema } from "./schemas/index.js";
import type { VisualizationType } from "./intents/visualizationType.js";

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

type HistogramAssembleInput = BaseAssembleInput & {
  visualizationType: "histogram";
  aggregation: EnrollmentAggregationBin[];
};

type ScatterplotAssembleInput = BaseAssembleInput & {
  visualizationType: "scatterplot";
  aggregation: RelationshipPoint[];
};

export type AssembleVisualizationResponseInput =
  | BarChartAssembleInput
  | LineChartAssembleInput
  | HistogramAssembleInput
  | ScatterplotAssembleInput;

const TITLE_PREFIX_BY_VIZ_TYPE = {
  bar_chart: "Trial phases for",
  line_chart: "Trials started per year for",
  histogram: "Enrollment distribution for",
  scatterplot: "Enrollment vs start year for",
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
 * Build a histogram visualization response from enrollment aggregation output.
 *
 * Strips internal `source_nct_ids` from data points and validates against
 * `VisualizationResponseSchema`.
 */
export function assembleHistogramResponse(
  input: HistogramAssembleInput,
): VisualizationResponse {
  return VisualizationResponseSchema.parse({
    visualization: {
      type: "histogram",
      title: buildTitle(input.filters, "histogram"),
      encoding: {
        x: { field: "bin_label", type: "ordinal" },
        y: { field: "trial_count", type: "quantitative" },
      },
      data: input.aggregation.map((bin) => ({
        bin_label: bin.bin_label,
        bin_start: bin.bin_start,
        bin_end: bin.bin_end,
        trial_count: bin.trial_count,
      })),
    },
    meta: buildMeta(input),
  });
}

/**
 * Build a scatterplot visualization response from relationship aggregation output.
 *
 * Preserves `nct_id` on each data point for tooltips and CT.gov links.
 * Validates against `VisualizationResponseSchema`.
 */
export function assembleScatterplotResponse(
  input: ScatterplotAssembleInput,
): VisualizationResponse {
  return VisualizationResponseSchema.parse({
    visualization: {
      type: "scatterplot",
      title: buildTitle(input.filters, "scatterplot"),
      encoding: {
        x: { field: "enrollment_count", type: "quantitative" },
        y: { field: "year", type: "temporal" },
      },
      data: input.aggregation.map((point) => ({
        nct_id: point.nct_id,
        enrollment_count: point.enrollment_count,
        year: point.year,
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
    case "histogram":
      return assembleHistogramResponse(input);
    case "scatterplot":
      return assembleScatterplotResponse(input);
    default: {
      const _exhaustive: never = input;
      throw new Error(
        `Unsupported visualization type: ${String((_exhaustive as { visualizationType: VisualizationType }).visualizationType)}`,
      );
    }
  }
}
