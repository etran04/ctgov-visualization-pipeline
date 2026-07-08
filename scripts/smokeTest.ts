/**
 * HTTP smoke tests for the visualization API.
 *
 * Default (in-process): uses Fastify inject — no running server required.
 *   npm run smoke
 *
 * Against a running dev server:
 *   npm run dev   # in another terminal
 *   npm run smoke:running
 *
 * Full pipeline (OpenAI + CT.gov):
 *   npm run smoke:live
 *   npm run smoke:live:running
 */
import "dotenv/config";
import type { FastifyInstance } from "fastify";
import { config } from "../src/config.js";
import { VisualizationResponseSchema } from "../src/domain/schemas/index.js";
import { buildServer } from "../src/server.js";

type HttpClient = {
  get(path: string): Promise<{ statusCode: number; body: unknown }>;
  post(path: string, payload: unknown): Promise<{ statusCode: number; body: unknown }>;
};

type SmokeCase = {
  name: string;
  run: (client: HttpClient) => Promise<void>;
  liveOnly?: boolean;
};

function parseArgs(argv: string[]) {
  const live = argv.includes("--live");
  const running = argv.includes("--running");
  const urlIndex = argv.indexOf("--url");
  const baseUrl =
    urlIndex >= 0 ? argv[urlIndex + 1] : `http://127.0.0.1:${config.PORT}`;

  if (urlIndex >= 0 && !argv[urlIndex + 1]) {
    throw new Error("--url requires a value, e.g. --url http://127.0.0.1:3001");
  }

  return { live, running, baseUrl };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getErrorCode(body: unknown): string | undefined {
  if (!isRecord(body) || !isRecord(body.error)) {
    return undefined;
  }

  return typeof body.error.code === "string" ? body.error.code : undefined;
}

async function createInjectClient(): Promise<HttpClient> {
  const app: FastifyInstance = await buildServer({ logger: false });

  return {
    async get(path) {
      const response = await app.inject({ method: "GET", url: path });
      return {
        statusCode: response.statusCode,
        body: response.json() as unknown,
      };
    },
    async post(path, payload) {
      const response = await app.inject({
        method: "POST",
        url: path,
        payload: payload as Record<string, unknown>,
      });

      return {
        statusCode: response.statusCode,
        body: response.json() as unknown,
      };
    },
  };
}

function createFetchClient(baseUrl: string): HttpClient {
  const root = baseUrl.replace(/\/$/, "");

  async function request(method: string, path: string, payload?: unknown) {
    const response = await fetch(`${root}${path}`, {
      method,
      headers: payload === undefined ? undefined : { "Content-Type": "application/json" },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });

    const text = await response.text();
    let body: unknown = text;

    if (text.length > 0) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }

    return { statusCode: response.status, body };
  }

  return {
    get: (path) => request("GET", path),
    post: (path, payload) => request("POST", path, payload),
  };
}

const smokeCases: SmokeCase[] = [
  {
    name: "GET /health returns 200",
    async run(client) {
      const response = await client.get("/health");
      assert(response.statusCode === 200, `expected 200, got ${response.statusCode}`);
      assert(
        isRecord(response.body) && response.body.status === "ok",
        `unexpected body: ${JSON.stringify(response.body)}`,
      );
    },
  },
  {
    name: "POST /visualize rejects missing query with 400",
    async run(client) {
      const response = await client.post("/visualize", {});
      assert(response.statusCode === 400, `expected 400, got ${response.statusCode}`);
      assert(
        getErrorCode(response.body) === "INVALID_REQUEST",
        `expected INVALID_REQUEST, got ${JSON.stringify(response.body)}`,
      );
    },
  },
  {
    name: "POST /visualize rejects blank query with 400",
    async run(client) {
      const response = await client.post("/visualize", { query: "   " });
      assert(response.statusCode === 400, `expected 400, got ${response.statusCode}`);
      assert(
        getErrorCode(response.body) === "INVALID_REQUEST",
        `expected INVALID_REQUEST, got ${JSON.stringify(response.body)}`,
      );
    },
  },
  {
    name: "POST /visualize returns bar chart for Pembrolizumab query",
    liveOnly: true,
    async run(client) {
      const response = await client.post("/visualize", {
        query: "Compare trial phases for Pembrolizumab",
      });

      assert(response.statusCode === 200, `expected 200, got ${response.statusCode}: ${JSON.stringify(response.body)}`);

      const parsed = VisualizationResponseSchema.safeParse(response.body);
      assert(parsed.success, `response failed schema validation: ${parsed.error?.message}`);

      assert(parsed.data.visualization.type === "bar_chart", "expected bar_chart visualization");
      assert(
        parsed.data.visualization.title.includes("Pembrolizumab"),
        `unexpected title: ${parsed.data.visualization.title}`,
      );
      assert(parsed.data.visualization.data.length === 6, "expected six phase bins");
      assert(parsed.data.meta.fetched_studies > 0, "expected fetched_studies > 0");
      assert(parsed.data.meta.source === "clinicaltrials.gov", "unexpected meta.source");
    },
  },
];

async function main(): Promise<void> {
  const { live, running, baseUrl } = parseArgs(process.argv.slice(2));
  const client = running ? createFetchClient(baseUrl) : await createInjectClient();
  const mode = running ? `running server (${baseUrl})` : "in-process";
  const cases = smokeCases.filter((testCase) => !testCase.liveOnly || live);

  console.log(`Smoke test mode: ${mode}${live ? " + live pipeline" : ""}`);
  console.log("");

  const failures: string[] = [];

  for (const testCase of cases) {
    process.stdout.write(`  ${testCase.name} ... `);

    try {
      await testCase.run(client);
      console.log("ok");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log("FAIL");
      failures.push(`${testCase.name}: ${message}`);
    }
  }

  console.log("");

  if (failures.length > 0) {
    console.error(`${failures.length} smoke test(s) failed:`);
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    process.exit(1);
  }

  console.log(`All ${cases.length} smoke test(s) passed.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
