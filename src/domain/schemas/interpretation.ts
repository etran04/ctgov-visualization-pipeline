import { z } from "zod";
import { QueryEntitiesSchema } from "./entities.js";
import { IntentSchema } from "./intents.js";
import { NetworkDimensionSchema } from "./networkDimension.js";

const ComparisonInterpretationSchema = z.object({
  intent: z.literal("comparison"),
  entities: QueryEntitiesSchema,
  comparison_dimension: z
    .literal("phase")
    .describe("Which comparison dimension should be used in downstream aggregation."),
  suggested_viz_type: z
    .literal("bar_chart")
    .describe("Suggested visualization type for the interpreted comparison request."),
});

const TrendOverTimeInterpretationSchema = z.object({
  intent: z.literal("trend_over_time"),
  entities: QueryEntitiesSchema,
  time_dimension: z
    .literal("start_year")
    .describe("Which time dimension should be used in downstream aggregation."),
  suggested_viz_type: z
    .literal("line_chart")
    .describe("Suggested visualization type for the interpreted timeline request."),
});

const DistributionInterpretationSchema = z.object({
  intent: z.literal("distribution"),
  entities: QueryEntitiesSchema,
  distribution_dimension: z
    .literal("enrollment_count")
    .describe("Which distribution dimension should be used in downstream aggregation."),
  suggested_viz_type: z
    .literal("histogram")
    .describe("Suggested visualization type for the interpreted distribution request."),
});

const RelationshipInterpretationSchema = z.object({
  intent: z.literal("relationship"),
  entities: QueryEntitiesSchema,
  relationship_dimension: z
    .literal("enrollment_vs_start_year")
    .describe("Which relationship dimension should be used in downstream aggregation."),
  suggested_viz_type: z
    .literal("scatterplot")
    .describe("Suggested visualization type for the interpreted relationship request."),
});

const NetworkInterpretationSchema = z.object({
  intent: z.literal("network"),
  entities: QueryEntitiesSchema,
  network_dimension: z
    .literal("drug_sponsor")
    .describe("Which bipartite network topology should be used in downstream aggregation."),
  suggested_viz_type: z
    .literal("network_graph")
    .describe("Suggested visualization type for the interpreted network request."),
});

/** Structured output from query interpretation (Stage 1). */
export const QueryInterpretationSchema = z.discriminatedUnion("intent", [
  ComparisonInterpretationSchema,
  TrendOverTimeInterpretationSchema,
  DistributionInterpretationSchema,
  RelationshipInterpretationSchema,
  NetworkInterpretationSchema,
]);

/**
 * Flat object schema for OpenAI structured output.
 *
 * OpenAI requires a root `type: object` schema; discriminated unions are
 * validated separately via `parseQueryInterpretation`.
 */
export const QueryInterpretationOpenAiSchema = z.object({
  intent: IntentSchema,
  entities: QueryEntitiesSchema,
  comparison_dimension: z
    .literal("phase")
    .nullable()
    .describe("Set to phase for comparison intent; null otherwise."),
  time_dimension: z
    .literal("start_year")
    .nullable()
    .describe("Set to start_year for trend_over_time intent; null otherwise."),
  distribution_dimension: z
    .literal("enrollment_count")
    .nullable()
    .describe("Set to enrollment_count for distribution intent; null otherwise."),
  relationship_dimension: z
    .literal("enrollment_vs_start_year")
    .nullable()
    .describe("Set to enrollment_vs_start_year for relationship intent; null otherwise."),
  network_dimension: NetworkDimensionSchema.nullable().describe(
    "Set to drug_sponsor for network intent; null otherwise.",
  ),
  suggested_viz_type: z
    .enum(["bar_chart", "line_chart", "histogram", "scatterplot", "network_graph"])
    .describe(
      "bar_chart for comparison; line_chart for trend_over_time; histogram for distribution; scatterplot for relationship; network_graph for network.",
    ),
});

export type QueryInterpretationOpenAi = z.infer<typeof QueryInterpretationOpenAiSchema>;

export const QueryInterpretationHintsSchema = z.union([
  ComparisonInterpretationSchema.partial(),
  TrendOverTimeInterpretationSchema.partial(),
  DistributionInterpretationSchema.partial(),
  RelationshipInterpretationSchema.partial(),
  NetworkInterpretationSchema.partial(),
]);

export type QueryInterpretation = z.infer<typeof QueryInterpretationSchema>;
export type QueryInterpretationHints = z.infer<typeof QueryInterpretationHintsSchema>;

/** Normalize OpenAI flat output into the canonical discriminated interpretation. */
export function parseQueryInterpretation(raw: QueryInterpretationOpenAi): QueryInterpretation {
  switch (raw.intent) {
    case "comparison":
      return ComparisonInterpretationSchema.parse({
        intent: raw.intent,
        entities: raw.entities,
        comparison_dimension: raw.comparison_dimension,
        suggested_viz_type: raw.suggested_viz_type,
      });
    case "trend_over_time":
      return TrendOverTimeInterpretationSchema.parse({
        intent: raw.intent,
        entities: raw.entities,
        time_dimension: raw.time_dimension,
        suggested_viz_type: raw.suggested_viz_type,
      });
    case "distribution":
      return DistributionInterpretationSchema.parse({
        intent: raw.intent,
        entities: raw.entities,
        distribution_dimension: raw.distribution_dimension,
        suggested_viz_type: raw.suggested_viz_type,
      });
    case "relationship":
      return RelationshipInterpretationSchema.parse({
        intent: raw.intent,
        entities: raw.entities,
        relationship_dimension: raw.relationship_dimension,
        suggested_viz_type: raw.suggested_viz_type,
      });
    case "network":
      return NetworkInterpretationSchema.parse({
        intent: raw.intent,
        entities: raw.entities,
        network_dimension: raw.network_dimension,
        suggested_viz_type: raw.suggested_viz_type,
      });
  }
}
