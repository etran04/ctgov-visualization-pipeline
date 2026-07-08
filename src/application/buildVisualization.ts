import { aggregateByPhase } from "../domain/aggregateByPhase.js";
import { assembleVisualizationResponse } from "../domain/assembleVisualizationResponse.js";
import { resolveVisualizationType } from "../domain/resolveVisualizationType.js";
import type { QueryInterpretation, VisualizationResponse } from "../domain/schemas.js";
import { validateEntities } from "../domain/validateEntities.js";
import { fetchStudies } from "../externals/ctgov/fetchStudies.js";
import { interpretQuery } from "../externals/openai/interpretQuery.js";
import { logger } from "../lib/logger.js";

export type BuildVisualizationInput = {
  query: string;
  hints?: Partial<QueryInterpretation>;
};

export async function buildVisualization(
  input: BuildVisualizationInput,
): Promise<VisualizationResponse> {
  const interpretation = await interpretQuery(input.query, input.hints);

  const validatedEntities = validateEntities(interpretation.entities);
  logger.info({ validated_entities: validatedEntities }, "Validated entities");

  const fetchResult = await fetchStudies(validatedEntities);

  const aggregation = aggregateByPhase(fetchResult.studies);
  logger.info(
    {
      bins: aggregation.bins,
      skipped_malformed: aggregation.skipped_malformed,
      studies_with_multiple_phases: aggregation.studies_with_multiple_phases,
    },
    "Aggregated studies by phase",
  );

  const visualizationType = resolveVisualizationType(interpretation.intent);
  logger.info({ visualization_type: visualizationType }, "Resolved visualization type");

  const response = assembleVisualizationResponse({
    filters: validatedEntities,
    visualizationType,
    aggregation: aggregation.bins,
    fetchedStudies: fetchResult.studies.length,
    skippedMalformed: fetchResult.skipped_malformed + aggregation.skipped_malformed,
    studiesWithMultiplePhases: aggregation.studies_with_multiple_phases,
    truncated: fetchResult.truncated,
  });

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
