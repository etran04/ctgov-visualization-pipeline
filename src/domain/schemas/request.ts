import { z } from "zod";
import { QueryInterpretationHintsSchema } from "./interpretation.js";

/** `POST /visualize` request body. `hints` are advisory and do not bypass the LLM. */
export const VisualizeRequestSchema = z.object({
  query: z.string().trim().min(1, "query is required"),
  hints: QueryInterpretationHintsSchema.optional(),
});

export type VisualizeRequest = z.infer<typeof VisualizeRequestSchema>;
