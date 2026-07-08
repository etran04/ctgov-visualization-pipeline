/**
 * OpenAPI JSON Schema helpers derived from canonical Zod contracts.
 */
import { z } from "zod";
import {
  VisualizeRequestSchema,
  VisualizationResponseSchema,
} from "../domain/schemas/index.js";

/** Standard API error envelope returned by route handlers. */
export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

function toOpenApiSchema(schema: z.ZodType) {
  return z.toJSONSchema(schema, { target: "openapi-3.0" });
}

function errorResponse(description: string) {
  return {
    description,
    ...toOpenApiSchema(ErrorResponseSchema),
  };
}

/** Fastify/OpenAPI schema for `POST /visualize`. */
export const visualizeRouteSchema = {
  tags: ["Visualization"],
  summary: "Build a visualization from a natural-language query",
  description:
    "Interprets the query with OpenAI, fetches matching studies from ClinicalTrials.gov, " +
    "and returns chart-ready JSON. V1 comparison queries yield a `bar_chart` (trial counts by " +
    "phase); V2 timeline queries yield a `line_chart` (trial counts by start year); V2b " +
    "distribution queries yield a `histogram` (trial counts by enrollment bin). Optional " +
    "`hints` are advisory context for the LLM and never bypass interpretation.",
  body: toOpenApiSchema(VisualizeRequestSchema),
  response: {
    200: {
      description: "Visualization built successfully",
      ...toOpenApiSchema(VisualizationResponseSchema),
    },
    400: errorResponse("Invalid request body or unsupported intent"),
    404: errorResponse("No matching studies found on ClinicalTrials.gov"),
    422: errorResponse("Invalid parameters or no aggregatable phase data in fetched studies"),
    500: errorResponse("Unexpected server error"),
    502: errorResponse("OpenAI interpretation or upstream ClinicalTrials.gov API failure"),
  },
} as const;
