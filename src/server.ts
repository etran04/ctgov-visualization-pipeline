import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import { config } from "./config.js";
import { logger } from "./lib/logger.js";
import { registerSwaggerDocs } from "./lib/swagger.js";

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
    },
  });

  await registerSwaggerDocs(app);

  app.get("/health", async () => {
    return {
      status: "ok",
    };
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
