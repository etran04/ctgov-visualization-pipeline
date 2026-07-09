import type {
  EnrollmentAggregationBin,
  GroupedPhaseAggregationRow,
  PhaseAggregationBin,
  RelationshipPoint,
  YearAggregationBin,
} from "./aggregations/index.js";
import { buildCitations } from "./citations/index.js";
import type { BipartiteGraphResult } from "./network/types.js";
import type { QueryEntities, VisualizationResponse } from "./schemas/index.js";
import { VisualizationResponseSchema } from "./schemas/index.js";
import type { NetworkDimension } from "./network/dimensions.js";
import type { VisualizationType } from "./intents/visualizationType.js";

type BaseAssembleInput = {
  filters: QueryEntities;
  fetchedStudies: number;
  skippedMalformed: number;
  studiesWithMultiplePhases: number;
  truncated: boolean;
  studyExcerptIndex: Map<string, string>;
};

type BarChartAssembleInput = BaseAssembleInput & {
  visualizationType: "bar_chart";
  aggregation: PhaseAggregationBin[];
};

type GroupedBarChartAssembleInput = BaseAssembleInput & {
  visualizationType: "grouped_bar_chart";
  comparisonTargets: string[];
  aggregation: GroupedPhaseAggregationRow[];
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

type NetworkGraphAssembleInput = BaseAssembleInput & {
  visualizationType: "network_graph";
  networkDimension: NetworkDimension;
  aggregation: BipartiteGraphResult;
};

export type AssembleVisualizationResponseInput =
  | BarChartAssembleInput
  | GroupedBarChartAssembleInput
  | LineChartAssembleInput
  | HistogramAssembleInput
  | ScatterplotAssembleInput
  | NetworkGraphAssembleInput;

const TITLE_PREFIX_BY_VIZ_TYPE = {
  bar_chart: "Trial phases for",
  grouped_bar_chart: "Trial phases:",
  line_chart: "Trials started per year for",
  histogram: "Enrollment distribution for",
  scatterplot: "Enrollment vs start year for",
  network_graph: "Drug–sponsor network for",
} as const satisfies Record<VisualizationType, string>;

const NETWORK_TITLE_PREFIX_BY_DIMENSION = {
  drug_sponsor: "Drug–sponsor network for",
} as const satisfies Record<NetworkDimension, string>;

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

function buildGroupedComparisonFilters(filters: QueryEntities): QueryEntities {
  return {
    drug_name: null,
    comparison_targets: null,
    condition: filters.condition,
    phase: filters.phase,
    sponsor: filters.sponsor,
    country: filters.country,
    start_year: filters.start_year,
    end_year: filters.end_year,
  };
}

function buildGroupedComparisonTitle(
  comparisonTargets: string[],
  filters: QueryEntities,
): string {
  const seriesLabel = comparisonTargets.join(" vs ");
  const conditionSuffix = filters.condition ? ` in ${filters.condition}` : "";
  return `${TITLE_PREFIX_BY_VIZ_TYPE.grouped_bar_chart} ${seriesLabel}${conditionSuffix}`;
}

function buildNetworkTitle(
  filters: QueryEntities,
  networkDimension: NetworkDimension,
): string {
  return `${NETWORK_TITLE_PREFIX_BY_DIMENSION[networkDimension]} ${buildFilterSubject(filters)}`;
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

function withCitations<T extends Record<string, unknown>>(
  datum: T,
  nctIds: string[],
  index: Map<string, string>,
): T | (T & { citations: ReturnType<typeof buildCitations> }) {
  const citations = buildCitations(nctIds, index);
  if (citations.length === 0) {
    return datum;
  }

  return { ...datum, citations };
}

/**
 * Build a grouped bar chart visualization response from grouped phase aggregation output.
 *
 * Strips internal `source_nct_ids` from data points and validates against
 * `VisualizationResponseSchema`.
 */
export function assembleGroupedBarChartResponse(
  input: GroupedBarChartAssembleInput,
): VisualizationResponse {
  const filters = buildGroupedComparisonFilters(input.filters);

  return VisualizationResponseSchema.parse({
    visualization: {
      type: "grouped_bar_chart",
      title: buildGroupedComparisonTitle(input.comparisonTargets, input.filters),
      encoding: {
        x: { field: "phase", type: "nominal" },
        y: { field: "trial_count", type: "quantitative" },
        color: { field: "series", type: "nominal" },
      },
      data: input.aggregation.map((row) =>
        withCitations(
          {
            phase: row.phase,
            series: row.series,
            trial_count: row.trial_count,
          },
          row.source_nct_ids,
          input.studyExcerptIndex,
        ),
      ),
    },
    meta: {
      ...buildMeta({ ...input, filters }),
      comparison_targets: input.comparisonTargets,
      comparison_dimension: "phase",
    },
  });
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
      data: input.aggregation.map((bin) =>
        withCitations(
          {
            phase: bin.phase,
            trial_count: bin.trial_count,
          },
          bin.source_nct_ids,
          input.studyExcerptIndex,
        ),
      ),
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
      data: input.aggregation.map((bin) =>
        withCitations(
          {
            year: bin.year,
            trial_count: bin.trial_count,
          },
          bin.source_nct_ids,
          input.studyExcerptIndex,
        ),
      ),
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
      data: input.aggregation.map((bin) =>
        withCitations(
          {
            bin_label: bin.bin_label,
            bin_start: bin.bin_start,
            bin_end: bin.bin_end,
            trial_count: bin.trial_count,
          },
          bin.source_nct_ids,
          input.studyExcerptIndex,
        ),
      ),
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
      data: input.aggregation.map((point) =>
        withCitations(
          {
            nct_id: point.nct_id,
            enrollment_count: point.enrollment_count,
            year: point.year,
          },
          [point.nct_id],
          input.studyExcerptIndex,
        ),
      ),
    },
    meta: buildMeta(input),
  });
}

/**
 * Build a network graph visualization response from bipartite graph aggregation output.
 *
 * Strips internal `source_nct_ids` from edges and validates against
 * `VisualizationResponseSchema`.
 */
export function assembleNetworkGraphResponse(
  input: NetworkGraphAssembleInput,
): VisualizationResponse {
  return VisualizationResponseSchema.parse({
    visualization: {
      type: "network_graph",
      title: buildNetworkTitle(input.filters, input.networkDimension),
      encoding: {
        nodes: {
          id: { field: "id", type: "nominal" },
          label: { field: "label", type: "nominal" },
          entity_type: { field: "entity_type", type: "nominal" },
        },
        edges: {
          source: { field: "source", type: "nominal" },
          target: { field: "target", type: "nominal" },
          weight: { field: "weight", type: "quantitative" },
        },
      },
      data: {
        nodes: input.aggregation.nodes,
        edges: input.aggregation.edges.map(({ source, target, weight, source_nct_ids }) =>
          withCitations({ source, target, weight }, source_nct_ids, input.studyExcerptIndex),
        ),
      },
    },
    meta: {
      ...buildMeta(input),
      network_dimension: input.networkDimension,
    },
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
    case "grouped_bar_chart":
      return assembleGroupedBarChartResponse(input);
    case "line_chart":
      return assembleLineChartResponse(input);
    case "histogram":
      return assembleHistogramResponse(input);
    case "scatterplot":
      return assembleScatterplotResponse(input);
    case "network_graph":
      return assembleNetworkGraphResponse(input);
    default: {
      const _exhaustive: never = input;
      throw new Error(
        `Unsupported visualization type: ${String((_exhaustive as { visualizationType: VisualizationType }).visualizationType)}`,
      );
    }
  }
}
