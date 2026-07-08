import { z } from "zod";
import { PHASE_BIN_ORDER } from "./mapPhaseValues.js";

export const SUPPORTED_INTENTS = [
  "comparison",
  // TODO: trend_over_time, distribution, relationship, etc
] as const;

export type Intent = (typeof SUPPORTED_INTENTS)[number];

export const IntentSchema = z
  .enum(SUPPORTED_INTENTS)
  .describe("The visualization intent inferred from the user query.");

export const EntityPhaseSchema = z
  .enum([...PHASE_BIN_ORDER.slice(0, 4), "Early Phase 1", "Not Applicable"] as const)
  .nullable()
  .describe("The requested trial phase if the query asks for one specific phase.");

export const QueryEntitiesSchema = z.object({
  drug_name: z
    .string()
    .nullable()
    .describe("The intervention or drug name referenced by the user query."),
  condition: z
    .string()
    .nullable()
    .describe("The disease, condition, or indication referenced by the user query."),
  phase: EntityPhaseSchema,
});

export const QueryInterpretationSchema = z.object({
  intent: IntentSchema,
  entities: QueryEntitiesSchema,
  comparison_dimension: z
    .literal("phase")
    .describe("Which comparison dimension should be used in downstream aggregation."),
  suggested_viz_type: z
    .literal("bar_chart")
    .describe("Suggested visualization type for the interpreted comparison request."),
});

export type QueryInterpretation = z.infer<typeof QueryInterpretationSchema>;
export type QueryEntities = z.infer<typeof QueryEntitiesSchema>;

export const VisualizeRequestSchema = z.object({
  query: z.string().trim().min(1, "query is required"),
  hints: QueryInterpretationSchema.partial().optional(),
});

export type VisualizeRequest = z.infer<typeof VisualizeRequestSchema>;

const CitationSchema = z.object({
  nct_id: z.string(),
  excerpt: z.string(),
});

const VisualizationDataPointSchema = z.object({
  phase: z.string(),
  trial_count: z.number().int().nonnegative(),
  citations: z.array(CitationSchema).nullable().optional(),
});

export const VisualizationResponseSchema = z.object({
  visualization: z.object({
    type: z.literal("bar_chart"),
    title: z.string().min(1),
    encoding: z.object({
      x: z.object({
        field: z.literal("phase"),
        type: z.literal("nominal"),
      }),
      y: z.object({
        field: z.literal("trial_count"),
        type: z.literal("quantitative"),
      }),
    }),
    data: z.array(VisualizationDataPointSchema),
  }),
  meta: z.object({
    filters: QueryEntitiesSchema,
    source: z.literal("clinicaltrials.gov"),
    fetched_studies: z.number().int().nonnegative(),
    skipped_malformed: z.number().int().nonnegative(),
    studies_with_multiple_phases: z.number().int().nonnegative(),
    truncated: z.boolean(),
  }),
});

export type VisualizationResponse = z.infer<typeof VisualizationResponseSchema>;
