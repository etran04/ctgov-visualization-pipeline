/**
 * HTTP route for `POST /visualize`.
 *
 * Validates the request body, delegates to `buildVisualization`, and maps
 * domain errors to HTTP responses. Pipeline debug details stay in logs only.
 */
import type { FastifyInstance } from "fastify";
import type { ZodError } from "zod";
import { buildVisualization } from "../application/buildVisualization.js";
import { HTTP_STATUS, isDomainError } from "../domain/errors.js";
import { VisualizeRequestSchema } from "../domain/schemas/index.js";
import { visualizeRouteSchema } from "../lib/openapiSchemas.js";

/** Join Zod validation issues into a single client-facing message. */
function formatZodError(error: ZodError): string {
  return error.issues.map((issue) => issue.message).join("; ");
}

/**
 * Register `POST /visualize` on a Fastify instance.
 *
 * Request body: `{ query: string; hints?: Partial<QueryInterpretation> }`
 * (`hints` are advisory context for the LLM and never bypass interpretation).
 *
 * Success (`200`): `VisualizationResponse` JSON.
 * Errors: `{ error: { code: string; message: string } }` with status:
 *
 * | Condition              | HTTP | Code                    |
 * |------------------------|------|-------------------------|
 * | Invalid request body   | 400  | INVALID_REQUEST         |
 * | Unsupported intent     | 400  | UNSUPPORTED_INTENT      |
 * | No studies found       | 404  | NO_STUDIES_FOUND        |
 * | Invalid parameters     | 422  | INVALID_PARAMETERS      |
 * | No aggregatable data   | 422  | NO_AGGREGATABLE_DATA    |
 * | Upstream API failure   | 502  | UPSTREAM_API_FAILURE    |
 * | Interpretation failure | 502  | INTERPRETATION_FAILURE  |
 * | Unexpected error       | 500  | INTERNAL_SERVER_ERROR   |
 *
 * @param app - Fastify instance to attach the route to.
 */
export async function registerVisualizeRoute(app: FastifyInstance): Promise<void> {
  app.post(
    "/visualize",
    {
      schema: visualizeRouteSchema,
    },
    async (request, reply) => {
      const parsed = VisualizeRequestSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          error: {
            code: "INVALID_REQUEST",
            message: formatZodError(parsed.error),
          },
        });
      }

      try {
        const response = await buildVisualization(parsed.data);
        return reply.status(200).send(response);
      } catch (error) {
        if (isDomainError(error)) {
          return reply
            .status(error.statusCode as 400 | 404 | 422 | 500 | 502)
            .send({
            error: {
              code: error.code,
              message: error.message,
            },
          });
        }

        request.log.error({ err: error }, "Unexpected error during visualization");
        return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "An unexpected error occurred",
          },
        });
      }
    },
  );
}
