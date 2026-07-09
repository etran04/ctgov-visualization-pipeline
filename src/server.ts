import { fileURLToPath } from "node:url";
import path from "node:path";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyError } from "fastify";
import { config } from "./config.js";
import { HTTP_STATUS } from "./domain/errors.js";
import { logger } from "./lib/logger.js";
import { registerSwaggerDocs } from "./lib/swagger.js";
import { registerVisualizeRoute } from "./routes/visualize.js";

export async function buildServer(options?: { logger?: boolean }) {
  const app = Fastify({
    logger:
      options?.logger === false
        ? false
        : {
            level: config.LOG_LEVEL,
          },
  });

  await registerSwaggerDocs(app);

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error.validation) {
      return reply.status(HTTP_STATUS.BAD_REQUEST).send({
        error: {
          code: "INVALID_REQUEST",
          message: error.message,
        },
      });
    }

    request.log.error({ err: error }, "Unhandled request error");
    return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
      },
    });
  });

  await registerVisualizeRoute(app);

  app.get("/health", async () => {
    return {
      status: "ok",
    };
  });

  const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
  await app.register(fastifyStatic, {
    root: publicDir,
    prefix: "/",
  });

  return app;
}

export async function startServer(): Promise<void> {
  const app = await buildServer();
  await app.listen({
    host: "0.0.0.0",
    port: config.PORT,
  });
}

const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  startServer().catch((error) => {
    logger.error({ error }, "Failed to start server");
    process.exit(1);
  });
}
