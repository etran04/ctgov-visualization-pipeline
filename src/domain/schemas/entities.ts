import { z } from "zod";
import { PHASE_BIN_ORDER } from "../mapPhaseValues.js";

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

export type QueryEntities = z.infer<typeof QueryEntitiesSchema>;
