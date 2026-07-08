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
 *
 * Live cases print a compact validation summary (no internal source_nct_ids).
 * Pipeline logs are suppressed; pass --verbose to see full pipeline output.
 */
import "dotenv/config";

// Keep smoke output readable; pipeline info logs include internal source_nct_ids.
if (!process.argv.includes("--verbose")) {
  process.env.LOG_LEVEL = "error";
}

import type { FastifyInstance } from "fastify";
import type { VisualizationResponse } from "../src/domain/schemas/index.js";

type HttpClient = {
  get(path: string): Promise<{ statusCode: number; body: unknown }>;
  post(path: string, payload: unknown): Promise<{ statusCode: number; body: unknown }>;
};

type SmokeCase = {
  name: string;
  run: (client: HttpClient) => Promise<VisualizationResponse | void>;
  liveOnly?: boolean;
  /** Runs without HTTP; uses fixture data instead of live OpenAI / CT.gov. */
  mocked?: boolean;
};

function parseArgs(argv: string[], defaultPort: number) {
  const live = argv.includes("--live");
  const running = argv.includes("--running");
  const verbose = argv.includes("--verbose");
  const urlIndex = argv.indexOf("--url");
  const baseUrl =
    urlIndex >= 0 ? argv[urlIndex + 1] : `http://127.0.0.1:${defaultPort}`;

  if (urlIndex >= 0 && !argv[urlIndex + 1]) {
    throw new Error("--url requires a value, e.g. --url http://127.0.0.1:3001");
  }

  return { live, running, verbose, baseUrl };
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

/** Human-readable snapshot of a live visualization response for manual validation. */
function printLiveValidationSummary(response: VisualizationResponse): void {
  const { visualization: viz, meta } = response;

  console.log("");
  console.log(`      type:  ${viz.type}`);
  console.log(`      title: ${viz.title}`);

  if (viz.type === "bar_chart") {
    for (const point of viz.data) {
      console.log(`      ${point.phase.padEnd(16)} ${point.trial_count}`);
    }
  } else if (viz.type === "line_chart") {
    const years = viz.data.map((point) => point.year);
    const zeroFilled = viz.data.filter((point) => point.trial_count === 0).length;
    console.log(
      `      years: ${years[0]}–${years[years.length - 1]} (${viz.data.length} bins, ${zeroFilled} zero-filled)`,
    );

    const recent = viz.data.slice(-8);
    for (const point of recent) {
      console.log(`      ${String(point.year).padEnd(6)} ${point.trial_count}`);
    }
    if (viz.data.length > recent.length) {
      console.log(`      … ${viz.data.length - recent.length} earlier year(s) omitted`);
    }
  } else if (viz.type === "histogram") {
    const zeroFilled = viz.data.filter((point) => point.trial_count === 0).length;
    console.log(`      bins: ${viz.data.length} (${zeroFilled} zero-filled)`);
    for (const point of viz.data) {
      console.log(`      ${point.bin_label.padEnd(16)} ${point.trial_count}`);
    }
  }

  console.log(
    `      meta:  fetched=${meta.fetched_studies}, skipped=${meta.skipped_malformed}, ` +
      `multi_phase=${meta.studies_with_multiple_phases}, truncated=${meta.truncated}`,
  );
}

async function createInjectClient(
  buildServer: (options?: { logger?: boolean }) => Promise<FastifyInstance>,
): Promise<HttpClient> {
  const app = await buildServer({ logger: false });

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

function createSmokeCases(deps: {
  aggregateByEnrollment: typeof import("../src/domain/aggregations/index.js").aggregateByEnrollment;
  aggregateByStartYear: typeof import("../src/domain/aggregations/index.js").aggregateByStartYear;
  assembleVisualizationResponse: typeof import("../src/domain/assembleVisualizationResponse.js").assembleVisualizationResponse;
  VisualizationResponseSchema: typeof import("../src/domain/schemas/index.js").VisualizationResponseSchema;
  validEnrollmentMidStudy: typeof import("../tests/fixtures/ctgovStudies.js").validEnrollmentMidStudy;
  validEnrollmentSmallStudy: typeof import("../tests/fixtures/ctgovStudies.js").validEnrollmentSmallStudy;
  validStudyGapYearStartDate: typeof import("../tests/fixtures/ctgovStudies.js").validStudyGapYearStartDate;
  validStudyIsoStartDate: typeof import("../tests/fixtures/ctgovStudies.js").validStudyIsoStartDate;
}): SmokeCase[] {
  const {
    aggregateByEnrollment,
    aggregateByStartYear,
    assembleVisualizationResponse,
    VisualizationResponseSchema,
    validEnrollmentMidStudy,
    validEnrollmentSmallStudy,
    validStudyGapYearStartDate,
    validStudyIsoStartDate,
  } = deps;

  return [
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

        assert(
          response.statusCode === 200,
          `expected 200, got ${response.statusCode}: ${JSON.stringify(response.body)}`,
        );

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

        return parsed.data;
      },
    },
    {
      name: "POST /visualize returns line chart for Pembrolizumab timeline query",
      liveOnly: true,
      async run(client) {
        const response = await client.post("/visualize", {
          query: "How have Pembrolizumab trials changed over time?",
        });

        assert(
          response.statusCode === 200,
          `expected 200, got ${response.statusCode}: ${JSON.stringify(response.body)}`,
        );

        const parsed = VisualizationResponseSchema.safeParse(response.body);
        assert(parsed.success, `response failed schema validation: ${parsed.error?.message}`);

        assert(parsed.data.visualization.type === "line_chart", "expected line_chart visualization");
        assert(
          parsed.data.visualization.title.includes("Pembrolizumab"),
          `unexpected title: ${parsed.data.visualization.title}`,
        );
        assert(parsed.data.visualization.data.length > 0, "expected at least one year bin");
        assert(
          parsed.data.visualization.data.every(
            (point) => Number.isInteger(point.year) && point.trial_count >= 0,
          ),
          "expected year bins with non-negative trial counts",
        );
        assert(parsed.data.meta.fetched_studies > 0, "expected fetched_studies > 0");
        assert(parsed.data.meta.source === "clinicaltrials.gov", "unexpected meta.source");

        return parsed.data;
      },
    },
    {
      name: "POST /visualize returns histogram for Pembrolizumab distribution query",
      liveOnly: true,
      async run(client) {
        const response = await client.post("/visualize", {
          query: "What is the enrollment distribution for Pembrolizumab trials?",
        });

        assert(
          response.statusCode === 200,
          `expected 200, got ${response.statusCode}: ${JSON.stringify(response.body)}`,
        );

        const parsed = VisualizationResponseSchema.safeParse(response.body);
        assert(parsed.success, `response failed schema validation: ${parsed.error?.message}`);

        assert(parsed.data.visualization.type === "histogram", "expected histogram visualization");
        assert(
          parsed.data.visualization.title.includes("Pembrolizumab"),
          `unexpected title: ${parsed.data.visualization.title}`,
        );
        assert(parsed.data.visualization.data.length === 6, "expected six enrollment bins");
        assert(
          parsed.data.visualization.data.every(
            (point) =>
              typeof point.bin_label === "string" &&
              Number.isInteger(point.bin_start) &&
              (point.bin_end === null || Number.isInteger(point.bin_end)) &&
              point.trial_count >= 0,
          ),
          "expected enrollment bins with non-negative trial counts",
        );
        assert(parsed.data.meta.fetched_studies > 0, "expected fetched_studies > 0");
        assert(parsed.data.meta.source === "clinicaltrials.gov", "unexpected meta.source");

        return parsed.data;
      },
    },
    {
      name: "[MOCK] Timeline pipeline returns line chart with zero-filled gap years",
      mocked: true,
      async run() {
        const aggregation = aggregateByStartYear([
          validStudyIsoStartDate,
          validStudyGapYearStartDate,
        ]);

        const response = assembleVisualizationResponse({
          filters: {
            drug_name: "Pembrolizumab",
            condition: null,
            phase: null,
          },
          visualizationType: "line_chart",
          aggregation: aggregation.bins,
          fetchedStudies: 2,
          skippedMalformed: 0,
          studiesWithMultiplePhases: 0,
          truncated: false,
        });

        const parsed = VisualizationResponseSchema.safeParse(response);
        assert(parsed.success, `response failed schema validation: ${parsed.error?.message}`);

        assert(parsed.data.visualization.type === "line_chart", "expected line_chart visualization");
        assert(
          parsed.data.visualization.title === "Trials started per year for Pembrolizumab",
          `unexpected title: ${parsed.data.visualization.title}`,
        );
        assert(
          parsed.data.visualization.data.some(
            (point) => point.year === 2021 && point.trial_count === 0,
          ),
          "expected zero-filled gap year 2021",
        );
        assert(
          parsed.data.visualization.data.some(
            (point) => point.year === 2022 && point.trial_count === 0,
          ),
          "expected zero-filled gap year 2022",
        );
      },
    },
    {
      name: "[MOCK] Distribution pipeline returns histogram with zero-filled enrollment bins",
      mocked: true,
      async run() {
        const aggregation = aggregateByEnrollment([
          validEnrollmentSmallStudy,
          validEnrollmentMidStudy,
        ]);

        const response = assembleVisualizationResponse({
          filters: {
            drug_name: "Pembrolizumab",
            condition: null,
            phase: null,
          },
          visualizationType: "histogram",
          aggregation: aggregation.bins,
          fetchedStudies: 2,
          skippedMalformed: 0,
          studiesWithMultiplePhases: 0,
          truncated: false,
        });

        const parsed = VisualizationResponseSchema.safeParse(response);
        assert(parsed.success, `response failed schema validation: ${parsed.error?.message}`);

        assert(parsed.data.visualization.type === "histogram", "expected histogram visualization");
        assert(
          parsed.data.visualization.title === "Enrollment distribution for Pembrolizumab",
          `unexpected title: ${parsed.data.visualization.title}`,
        );
        assert(parsed.data.visualization.data.length === 6, "expected six enrollment bins");
        assert(
          parsed.data.visualization.data.some(
            (point) => point.bin_label === "1–50" && point.trial_count === 1,
          ),
          "expected one trial in 1–50 bin",
        );
        assert(
          parsed.data.visualization.data.some(
            (point) => point.bin_label === "51–100" && point.trial_count === 1,
          ),
          "expected one trial in 51–100 bin",
        );
        assert(
          parsed.data.visualization.data.some(
            (point) => point.bin_label === "101–500" && point.trial_count === 0,
          ),
          "expected zero-filled 101–500 bin",
        );
        for (const point of parsed.data.visualization.data) {
          assert(!("source_nct_ids" in point), "expected source_nct_ids stripped from data");
        }
      },
    },
  ];
}

async function main(): Promise<void> {
  const { config } = await import("../src/config.js");
  const { aggregateByEnrollment, aggregateByStartYear } = await import(
    "../src/domain/aggregations/index.js"
  );
  const { assembleVisualizationResponse } = await import(
    "../src/domain/assembleVisualizationResponse.js"
  );
  const { VisualizationResponseSchema } = await import("../src/domain/schemas/index.js");
  const { buildServer } = await import("../src/server.js");
  const {
    validEnrollmentMidStudy,
    validEnrollmentSmallStudy,
    validStudyGapYearStartDate,
    validStudyIsoStartDate,
  } = await import("../tests/fixtures/ctgovStudies.js");

  const { live, running, verbose, baseUrl } = parseArgs(process.argv.slice(2), config.PORT);
  const client = running
    ? createFetchClient(baseUrl)
    : await createInjectClient(buildServer);
  const smokeCases = createSmokeCases({
    aggregateByEnrollment,
    aggregateByStartYear,
    assembleVisualizationResponse,
    VisualizationResponseSchema,
    validEnrollmentMidStudy,
    validEnrollmentSmallStudy,
    validStudyGapYearStartDate,
    validStudyIsoStartDate,
  });
  const mode = running ? `running server (${baseUrl})` : "in-process";
  const cases = smokeCases.filter((testCase) => !testCase.liveOnly || live);

  console.log(`Smoke test mode: ${mode}${live ? " + live pipeline" : ""}${verbose ? " + verbose logs" : ""}`);
  console.log("");

  const failures: string[] = [];

  for (const testCase of cases) {
    process.stdout.write(`  ${testCase.name} ... `);

    try {
      const summary = await testCase.run(client);
      console.log("ok");
      if (testCase.liveOnly && summary !== undefined) {
        printLiveValidationSummary(summary);
      }
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
