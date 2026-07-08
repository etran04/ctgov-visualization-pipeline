/**
 * Schemas and inferred types for the visualization pipeline.
 *
 * Shared across layers:
 * - `QueryInterpretationSchema` — LLM structured output (OpenAI + domain validation)
 * - `VisualizeRequestSchema` — `POST /visualize` request body
 * - `VisualizationResponseSchema` — successful HTTP response contract
 */
export {
  EntityPhaseSchema,
  QueryEntitiesSchema,
  type QueryEntities,
} from "./entities.js";
export { IntentSchema, SUPPORTED_INTENTS, type Intent } from "./intents.js";
export {
  parseQueryInterpretation,
  QueryInterpretationHintsSchema,
  QueryInterpretationOpenAiSchema,
  QueryInterpretationSchema,
  type QueryInterpretation,
  type QueryInterpretationHints,
  type QueryInterpretationOpenAi,
} from "./interpretation.js";
export { VisualizeRequestSchema, type VisualizeRequest } from "./request.js";
export {
  VisualizationResponseSchema,
  type VisualizationResponse,
} from "./visualizationResponse.js";
