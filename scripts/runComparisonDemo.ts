/**
 * End-to-end comparison pipeline demo.
 *
 * Runs each pipeline step for a fixed Pembrolizumab query and prints labeled
 * outputs for manual inspection. Requires OPENAI_API_KEY and network access.
 *
 *   npm run demo:comparison
 */
import "dotenv/config";

// Keep demo output readable; pipeline logs go to stderr only on errors.
process.env.LOG_LEVEL = "error";

const DEMO_QUERY = "Compare trial phases for Pembrolizumab";

function printStep(step: number, label: string, data: unknown): void {
  console.log(`\n--- Step ${step}: ${label} ---`);
  console.log(JSON.stringify(data, null, 2));
}

async function main(): Promise<void> {
  const { interpretQuery } = await import("../src/externals/openai/interpretQuery.js");
  const { validateEntities } = await import("../src/domain/validateEntities.js");
  const { fetchStudies } = await import("../src/externals/ctgov/fetchStudies.js");
  const { aggregateByPhase } = await import("../src/domain/aggregateByPhase.js");
  const { resolveVisualizationType } = await import("../src/domain/resolveVisualizationType.js");
  const { assembleVisualizationResponse } = await import(
    "../src/domain/assembleVisualizationResponse.js"
  );

  console.log(`Comparison pipeline demo`);
  console.log(`Query: "${DEMO_QUERY}"`);

  const interpretation = await interpretQuery(DEMO_QUERY);
  printStep(1, "Interpreted query", interpretation);

  const validatedEntities = validateEntities(interpretation.entities);
  printStep(2, "Validated params", validatedEntities);

  const fetchResult = await fetchStudies(validatedEntities);
  printStep(3, "Fetch summary", {
    pages_fetched: fetchResult.pages_fetched,
    studies_fetched: fetchResult.studies.length,
    skipped_malformed: fetchResult.skipped_malformed,
    truncated: fetchResult.truncated,
  });

  const aggregation = aggregateByPhase(fetchResult.studies);
  printStep(4, "Aggregated data", {
    bins: aggregation.bins.map(({ phase, trial_count }) => ({ phase, trial_count })),
    skipped_malformed: aggregation.skipped_malformed,
    studies_with_multiple_phases: aggregation.studies_with_multiple_phases,
  });

  const visualizationType = resolveVisualizationType(interpretation.intent);
  printStep(5, "Resolved viz type", visualizationType);

  const response = assembleVisualizationResponse({
    filters: validatedEntities,
    visualizationType,
    aggregation: aggregation.bins,
    fetchedStudies: fetchResult.studies.length,
    skippedMalformed: fetchResult.skipped_malformed + aggregation.skipped_malformed,
    studiesWithMultiplePhases: aggregation.studies_with_multiple_phases,
    truncated: fetchResult.truncated,
  });
  printStep(6, "Final response JSON", response);

  console.log("\nDemo complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
