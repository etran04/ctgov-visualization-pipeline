import { z } from "zod";
import { QueryEntitiesSchema } from "./entities.js";

export const VisualizationMetaSchema = z.object({
  filters: QueryEntitiesSchema,
  source: z.literal("clinicaltrials.gov"),
  fetched_studies: z.number().int().nonnegative(),
  skipped_malformed: z.number().int().nonnegative(),
  studies_with_multiple_phases: z.number().int().nonnegative(),
  truncated: z.boolean(),
});
