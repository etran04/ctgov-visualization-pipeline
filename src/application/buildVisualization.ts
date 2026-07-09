/**
 * Application-layer orchestrator for the visualization pipeline.
 *
 * Wires externals (OpenAI interpretation, CT.gov fetch) with deterministic
 * domain steps (validation, aggregation, viz resolution, response assembly).
 * Each step logs structured output; domain errors propagate to the HTTP layer.
 */
import {
  aggregateByEnrollment,
  aggregateByPhase,
  aggregateByRelationship,
  aggregateByStartYear,
  type DistributionStudyRecord,
  type PhaseStudyRecord,
  type RelationshipStudyRecord,
  type TimelineStudyRecord,
} from "../domain/aggregations/index.js";
import { assembleVisualizationResponse } from "../domain/assembleVisualizationResponse.js";
import { getFieldsForIntent } from "../domain/intents/fieldProfiles.js";
import { resolveVisualizationType } from "../domain/intents/visualizationType.js";
import type { QueryInterpretation, VisualizationResponse } from "../domain/schemas/index.js";
import { validateEntities } from "../domain/validateEntities.js";
import { fetchStudies } from "../externals/ctgov/fetchStudies.js";
import { interpretQuery } from "../externals/openai/interpretQuery.js";
import { logger } from "../lib/logger.js";

/** Input to the visualization pipeline. */
export type BuildVisualizationInput = {
  /** Natural-language query from the user. */
  query: string;
  /** Advisory context passed to the LLM; never bypasses interpretation. */
  hints?: Partial<QueryInterpretation>;
};

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

  const intent = interpretation.intent;
  const fetchResult = await fetchStudies(validatedEntities, {
    intent,
    fields: getFieldsForIntent(intent),
  });

  const visualizationType = resolveVisualizationType(intent);
  logger.info({ visualization_type: visualizationType }, "Resolved visualization type");

  let response: VisualizationResponse;

  switch (intent) {
    case "comparison": {
      const aggregation = aggregateByPhase(fetchResult.studies as PhaseStudyRecord[]);
      logger.info(
        {
          bins: aggregation.bins,
          skipped_malformed: aggregation.skipped_malformed,
          studies_with_multiple_phases: aggregation.studies_with_multiple_phases,
        },
        "Aggregated studies by phase",
      );

      response = assembleVisualizationResponse({
        filters: validatedEntities,
        visualizationType: "bar_chart",
        aggregation: aggregation.bins,
        fetchedStudies: fetchResult.studies.length,
        skippedMalformed: fetchResult.skipped_malformed + aggregation.skipped_malformed,
        studiesWithMultiplePhases: aggregation.studies_with_multiple_phases,
        truncated: fetchResult.truncated,
      });
      break;
    }
    case "trend_over_time": {
      const aggregation = aggregateByStartYear(fetchResult.studies as TimelineStudyRecord[]);
      logger.info(
        {
          bins: aggregation.bins,
          skipped_malformed: aggregation.skipped_malformed,
        },
        "Aggregated studies by start year",
      );

      response = assembleVisualizationResponse({
        filters: validatedEntities,
        visualizationType: "line_chart",
        aggregation: aggregation.bins,
        fetchedStudies: fetchResult.studies.length,
        skippedMalformed: fetchResult.skipped_malformed + aggregation.skipped_malformed,
        studiesWithMultiplePhases: 0,
        truncated: fetchResult.truncated,
      });
      break;
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

      response = assembleVisualizationResponse({
        filters: validatedEntities,
        visualizationType: "histogram",
        aggregation: aggregation.bins,
        fetchedStudies: fetchResult.studies.length,
        skippedMalformed: fetchResult.skipped_malformed + aggregation.skipped_malformed,
        studiesWithMultiplePhases: 0,
        truncated: fetchResult.truncated,
      });
      break;
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

      response = assembleVisualizationResponse({
        filters: validatedEntities,
        visualizationType: "scatterplot",
        aggregation: aggregation.points,
        fetchedStudies: fetchResult.studies.length,
        skippedMalformed: fetchResult.skipped_malformed + aggregation.skipped_malformed,
        studiesWithMultiplePhases: 0,
        truncated: fetchResult.truncated,
      });
      break;
    }
    case "network": {
      throw new Error("Network visualization pipeline is not yet implemented");
    }
    default: {
      const _exhaustive: never = intent;
      throw new Error(`Unsupported intent: ${String(_exhaustive)}`);
    }
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
