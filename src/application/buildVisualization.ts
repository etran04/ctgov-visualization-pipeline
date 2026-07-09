/**
 * Application-layer orchestrator for the visualization pipeline.
 *
 * Wires externals (OpenAI interpretation, CT.gov fetch) with deterministic
 * domain steps (validation, aggregation, viz resolution, response assembly).
 * Each step logs structured output; domain errors propagate to the HTTP layer.
 */
import {
  aggregateByEnrollment,
  aggregateByNetwork,
  aggregateByPhase,
  aggregateGroupedByPhase,
  aggregateByRelationship,
  aggregateByStartYear,
  type DistributionStudyRecord,
  type PhaseStudyRecord,
  type RelationshipStudyRecord,
  type TimelineStudyRecord,
} from "../domain/aggregations/index.js";
import { assembleVisualizationResponse } from "../domain/assembleVisualizationResponse.js";
import { buildStudyExcerptIndex } from "../domain/citations/index.js";
import { getFieldsForIntent } from "../domain/intents/fieldProfiles.js";
import { resolveVisualizationType } from "../domain/intents/visualizationType.js";
import { resolveComparisonMode } from "../domain/resolveComparisonMode.js";
import type { QueryEntities, QueryInterpretation, VisualizationResponse } from "../domain/schemas/index.js";
import type { NetworkStudyRecord } from "../domain/types/ctgovStudyTypes.js";
import { validateEntities } from "../domain/validateEntities.js";
import { fetchStudies } from "../externals/ctgov/fetchStudies.js";
import { fetchStudiesForGroupedComparison } from "../externals/ctgov/fetchStudiesForGroupedComparison.js";
import { interpretQuery } from "../externals/openai/interpretQuery.js";
import { logger } from "../lib/logger.js";

/** Input to the visualization pipeline. */
export type BuildVisualizationInput = {
  /** Natural-language query from the user. */
  query: string;
  /** Advisory context passed to the LLM; never bypasses interpretation. */
  hints?: Partial<QueryInterpretation>;
};

type AssemblyContext = {
  filters: QueryEntities;
  fetchedStudies: number;
  fetchSkippedMalformed: number;
  truncated: boolean;
  studyExcerptIndex: Map<string, string>;
};

type AggregationMeta = {
  aggregationSkippedMalformed: number;
  studiesWithMultiplePhases: number;
};

/** Shared assembly fields derived from fetch + aggregation meta. */
function baseAssembleInput(ctx: AssemblyContext & AggregationMeta) {
  return {
    filters: ctx.filters,
    fetchedStudies: ctx.fetchedStudies,
    skippedMalformed: ctx.fetchSkippedMalformed + ctx.aggregationSkippedMalformed,
    studiesWithMultiplePhases: ctx.studiesWithMultiplePhases,
    truncated: ctx.truncated,
    studyExcerptIndex: ctx.studyExcerptIndex,
  };
}

async function buildComparisonVisualization(
  validatedEntities: QueryEntities,
): Promise<VisualizationResponse> {
  const comparisonMode = resolveComparisonMode(validatedEntities);
  const visualizationType = resolveVisualizationType("comparison", { comparisonMode });
  logger.info({ visualization_type: visualizationType }, "Resolved visualization type");

  if (comparisonMode.kind === "grouped") {
    const fetchResult = await fetchStudiesForGroupedComparison(
      {
        targets: comparisonMode.targets,
        sharedFilters: comparisonMode.sharedFilters,
      },
      { fields: getFieldsForIntent("comparison") },
    );

    const aggregation = aggregateGroupedByPhase(
      fetchResult.seriesResults.map((seriesResult) => ({
        series: seriesResult.series,
        studies: seriesResult.studies,
      })),
    );
    logger.info(
      {
        rows: aggregation.rows.length,
        skipped_malformed: aggregation.skipped_malformed,
        studies_with_multiple_phases: aggregation.studies_with_multiple_phases,
      },
      "Aggregated grouped studies by phase",
    );

    const assemblyCtx: AssemblyContext = {
      filters: validatedEntities,
      fetchedStudies: fetchResult.fetched_studies,
      fetchSkippedMalformed: fetchResult.skipped_malformed,
      truncated: fetchResult.truncated,
      studyExcerptIndex: buildStudyExcerptIndex(
        fetchResult.seriesResults.flatMap((seriesResult) => seriesResult.studies),
      ),
    };

    return assembleVisualizationResponse({
      ...baseAssembleInput({
        ...assemblyCtx,
        aggregationSkippedMalformed: aggregation.skipped_malformed,
        studiesWithMultiplePhases: aggregation.studies_with_multiple_phases,
      }),
      visualizationType: "grouped_bar_chart",
      comparisonTargets: comparisonMode.targets,
      aggregation: aggregation.rows,
    });
  }

  const fetchResult = await fetchStudies(comparisonMode.entities, {
    intent: "comparison",
    fields: getFieldsForIntent("comparison"),
  });

  const aggregation = aggregateByPhase(fetchResult.studies as PhaseStudyRecord[]);
  logger.info(
    {
      bins: aggregation.bins,
      skipped_malformed: aggregation.skipped_malformed,
      studies_with_multiple_phases: aggregation.studies_with_multiple_phases,
    },
    "Aggregated studies by phase",
  );

  const assemblyCtx: AssemblyContext = {
    filters: comparisonMode.entities,
    fetchedStudies: fetchResult.studies.length,
    fetchSkippedMalformed: fetchResult.skipped_malformed,
    truncated: fetchResult.truncated,
    studyExcerptIndex: buildStudyExcerptIndex(fetchResult.studies),
  };

  return assembleVisualizationResponse({
    ...baseAssembleInput({
      ...assemblyCtx,
      aggregationSkippedMalformed: aggregation.skipped_malformed,
      studiesWithMultiplePhases: aggregation.studies_with_multiple_phases,
    }),
    visualizationType: "bar_chart",
    aggregation: aggregation.bins,
  });
}

type NonComparisonInterpretation = Exclude<QueryInterpretation, { intent: "comparison" }>;

async function buildIntentVisualization(
  validatedEntities: QueryEntities,
  interpretation: NonComparisonInterpretation,
): Promise<VisualizationResponse> {
  const { intent } = interpretation;
  const fetchResult = await fetchStudies(validatedEntities, {
    intent,
    fields:
      intent === "network"
        ? getFieldsForIntent(intent, interpretation.network_dimension)
        : getFieldsForIntent(intent),
  });

  const visualizationType = resolveVisualizationType(intent);
  logger.info({ visualization_type: visualizationType }, "Resolved visualization type");

  const assemblyCtx: AssemblyContext = {
    filters: validatedEntities,
    fetchedStudies: fetchResult.studies.length,
    fetchSkippedMalformed: fetchResult.skipped_malformed,
    truncated: fetchResult.truncated,
    studyExcerptIndex: buildStudyExcerptIndex(fetchResult.studies),
  };

  switch (intent) {
    case "trend_over_time": {
      const aggregation = aggregateByStartYear(fetchResult.studies as TimelineStudyRecord[]);
      logger.info(
        {
          bins: aggregation.bins,
          skipped_malformed: aggregation.skipped_malformed,
        },
        "Aggregated studies by start year",
      );

      return assembleVisualizationResponse({
        ...baseAssembleInput({
          ...assemblyCtx,
          aggregationSkippedMalformed: aggregation.skipped_malformed,
          studiesWithMultiplePhases: 0,
        }),
        visualizationType: "line_chart",
        aggregation: aggregation.bins,
      });
    }
    case "distribution": {
      const aggregation = aggregateByEnrollment(
        fetchResult.studies as DistributionStudyRecord[],
      );
      logger.info(
        {
          bins: aggregation.bins,
          skipped_malformed: aggregation.skipped_malformed,
        },
        "Aggregated studies by enrollment",
      );

      return assembleVisualizationResponse({
        ...baseAssembleInput({
          ...assemblyCtx,
          aggregationSkippedMalformed: aggregation.skipped_malformed,
          studiesWithMultiplePhases: 0,
        }),
        visualizationType: "histogram",
        aggregation: aggregation.bins,
      });
    }
    case "relationship": {
      const aggregation = aggregateByRelationship(
        fetchResult.studies as RelationshipStudyRecord[],
      );
      logger.info(
        {
          points: aggregation.points.length,
          skipped_malformed: aggregation.skipped_malformed,
        },
        "Aggregated studies by enrollment vs start year",
      );

      return assembleVisualizationResponse({
        ...baseAssembleInput({
          ...assemblyCtx,
          aggregationSkippedMalformed: aggregation.skipped_malformed,
          studiesWithMultiplePhases: 0,
        }),
        visualizationType: "scatterplot",
        aggregation: aggregation.points,
      });
    }
    case "network": {
      const dimension = interpretation.network_dimension;
      const aggregation = aggregateByNetwork(
        fetchResult.studies as NetworkStudyRecord[],
        dimension,
        validatedEntities,
      );
      logger.info(
        {
          nodes: aggregation.nodes.length,
          edges: aggregation.edges.length,
          skipped_malformed: aggregation.skipped_malformed,
        },
        "Aggregated studies into network graph",
      );

      return assembleVisualizationResponse({
        ...baseAssembleInput({
          ...assemblyCtx,
          aggregationSkippedMalformed: aggregation.skipped_malformed,
          studiesWithMultiplePhases: 0,
        }),
        visualizationType: "network_graph",
        networkDimension: dimension,
        aggregation,
      });
    }
    default: {
      const _exhaustive: never = intent;
      throw new Error(`Unsupported intent: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Run the full visualization pipeline for a natural-language query.
 *
 * @returns A schema-valid visualization response ready for HTTP serialization.
 * @throws {InvalidParametersError} When no usable entity filters remain after validation.
 * @throws {NoStudiesFoundError} When CT.gov returns zero studies.
 * @throws {NoAggregatableDataError} When fetched studies contain no aggregatable data.
 * @throws {UpstreamApiError} When CT.gov requests fail after retries.
 * @throws {InterpretationError} When OpenAI interpretation fails after retries.
 */
export async function buildVisualization(
  input: BuildVisualizationInput,
): Promise<VisualizationResponse> {
  const interpretation = await interpretQuery(input.query, input.hints);

  const validatedEntities = validateEntities(interpretation.entities);
  logger.info({ validated_entities: validatedEntities }, "Validated entities");

  let response: VisualizationResponse;
  if (interpretation.intent === "comparison") {
    response = await buildComparisonVisualization(validatedEntities);
  } else {
    response = await buildIntentVisualization(validatedEntities, interpretation);
  }

  logger.info(
    {
      visualization_type: response.visualization.type,
      title: response.visualization.title,
      fetched_studies: response.meta.fetched_studies,
      truncated: response.meta.truncated,
    },
    "Assembled visualization response",
  );

  return response;
}
