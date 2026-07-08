import type { FastifyInstance } from "fastify";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

export async function registerSwaggerDocs(app: FastifyInstance): Promise<void> {
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: "CTGov Visualization Pipeline API",
        version: "1.0.0",
        description: "API for building visualizations from ClinicalTrials.gov data.",
      },
      tags: [
        {
          name: "Visualization",
          description: "Endpoints for building trial visualizations from natural-language queries.",
        },
      ],
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
  });
}
