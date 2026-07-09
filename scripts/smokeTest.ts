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
 * LLM intent routing only (OpenAI + CT.gov, network vs relationship disambiguation):
 *   npm run smoke:live:llm
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
  /** Live OpenAI routing check (network vs relationship, etc.). */
  llmRouting?: boolean;
  /** Runs without HTTP; uses fixture data instead of live OpenAI / CT.gov. */
  mocked?: boolean;
};

type VisualizationType = VisualizationResponse["visualization"]["type"];

function parseArgs(argv: string[], defaultPort: number) {
  const llmRouting = argv.includes("--llm-routing");
  const live = argv.includes("--live") || llmRouting;
  const running = argv.includes("--running");
  const verbose = argv.includes("--verbose");
  const urlIndex = argv.indexOf("--url");
  const baseUrl =
    urlIndex >= 0 ? argv[urlIndex + 1] : `http://127.0.0.1:${defaultPort}`;

  if (urlIndex >= 0 && !argv[urlIndex + 1]) {
    throw new Error("--url requires a value, e.g. --url http://127.0.0.1:3001");
  }

  return { live, llmRouting, running, verbose, baseUrl };
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

type Citation = { nct_id: string; excerpt: string };

function hasCitations(item: Record<string, unknown>): item is { citations: Citation[] } {
  return (
    Array.isArray(item.citations) &&
    item.citations.length > 0 &&
    item.citations.every(
      (citation) =>
        typeof citation === "object" &&
        citation !== null &&
        typeof citation.nct_id === "string" &&
        typeof citation.excerpt === "string",
    )
  );
}

function assertNoSourceNctIds(visualization: VisualizationResponse["visualization"]): void {
  if (visualization.type === "network_graph") {
    for (const edge of visualization.data.edges) {
      assert(!("source_nct_ids" in edge), "expected source_nct_ids stripped from edges");
    }
    return;
  }

  if (visualization.type === "scatterplot") {
    return;
  }

  for (const point of visualization.data) {
    assert(!("source_nct_ids" in point), "expected source_nct_ids stripped from data");
  }
}

/** Live responses should surface citations on at least one populated datum when CT.gov returns titles. */
function assertCitationsOnNonemptyDatums(visualization: VisualizationResponse["visualization"]): void {
  switch (visualization.type) {
    case "bar_chart":
    case "grouped_bar_chart":
    case "line_chart":
    case "histogram": {
      const nonempty = visualization.data.filter((point) => point.trial_count > 0);
      if (nonempty.length === 0) {
        return;
      }

      assert(
        nonempty.some((point) => hasCitations(point as Record<string, unknown>)),
        "expected citations on at least one datum with trial_count > 0",
      );

      for (const point of nonempty) {
        if ("citations" in point && point.citations != null) {
          assert(point.citations.length <= 10, "expected at most 10 citations per datum");
        }
      }
      break;
    }
    case "scatterplot": {
      if (visualization.data.length === 0) {
        return;
      }

      assert(
        visualization.data.some((point) => hasCitations(point as Record<string, unknown>)),
        "expected citations on at least one scatterplot point when brief titles are available",
      );
      break;
    }
    case "network_graph": {
      const nonempty = visualization.data.edges.filter((edge) => edge.weight > 0);
      if (nonempty.length === 0) {
        return;
      }

      assert(
        nonempty.some((edge) => hasCitations(edge as Record<string, unknown>)),
        "expected citations on at least one edge with weight > 0",
      );

      for (const edge of nonempty) {
        if ("citations" in edge && edge.citations != null) {
          assert(edge.citations.length <= 10, "expected at most 10 citations per edge");
        }
      }
      break;
    }
  }
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
  } else if (viz.type === "grouped_bar_chart") {
    const seriesNames = [...new Set(viz.data.map((point) => point.series))];
    console.log(`      series: ${seriesNames.join(", ")}`);
    for (const series of seriesNames) {
      const nonzero = viz.data.filter((point) => point.series === series && point.trial_count > 0);
      for (const point of nonzero.slice(0, 4)) {
        console.log(`      ${series.padEnd(16)} ${point.phase.padEnd(16)} ${point.trial_count}`);
      }
      if (nonzero.length > 4) {
        console.log(`      … ${nonzero.length - 4} more nonzero bin(s) for ${series}`);
      }
    }
    if (meta.comparison_targets !== undefined && meta.comparison_targets !== null) {
      console.log(`      comparison_targets: ${meta.comparison_targets.join(", ")}`);
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
  } else if (viz.type === "scatterplot") {
    const years = viz.data.map((point) => point.year);
    const minYear = years.length > 0 ? Math.min(...years) : "—";
    const maxYear = years.length > 0 ? Math.max(...years) : "—";
    console.log(`      points: ${viz.data.length} (years ${minYear}–${maxYear})`);
    const preview = viz.data.slice(0, 8);
    for (const point of preview) {
      console.log(
        `      ${point.nct_id.padEnd(14)} enroll=${String(point.enrollment_count).padStart(5)} year=${point.year}`,
      );
    }
    if (viz.data.length > preview.length) {
      console.log(`      … ${viz.data.length - preview.length} more point(s) omitted`);
    }
  } else if (viz.type === "network_graph") {
    console.log(
      `      nodes: ${viz.data.nodes.length}, edges: ${viz.data.edges.length}` +
        (meta.network_dimension !== undefined && meta.network_dimension !== null
          ? `, dimension=${meta.network_dimension}`
          : ""),
    );
    const nodePreview = viz.data.nodes.slice(0, 6);
    for (const node of nodePreview) {
      console.log(`      ${node.id.padEnd(36)} ${node.label}`);
    }
    if (viz.data.nodes.length > nodePreview.length) {
      console.log(`      … ${viz.data.nodes.length - nodePreview.length} more node(s) omitted`);
    }
    const edgePreview = viz.data.edges.slice(0, 6);
    for (const edge of edgePreview) {
      console.log(`      ${edge.source} → ${edge.target} (weight=${edge.weight})`);
    }
    if (viz.data.edges.length > edgePreview.length) {
      console.log(`      … ${viz.data.edges.length - edgePreview.length} more edge(s) omitted`);
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
  aggregateGroupedByPhase: typeof import("../src/domain/aggregations/index.js").aggregateGroupedByPhase;
  aggregateByNetwork: typeof import("../src/domain/aggregations/index.js").aggregateByNetwork;
  aggregateByRelationship: typeof import("../src/domain/aggregations/index.js").aggregateByRelationship;
  aggregateByStartYear: typeof import("../src/domain/aggregations/index.js").aggregateByStartYear;
  assembleVisualizationResponse: typeof import("../src/domain/assembleVisualizationResponse.js").assembleVisualizationResponse;
  buildStudyExcerptIndex: typeof import("../src/domain/citations/index.js").buildStudyExcerptIndex;
  VisualizationResponseSchema: typeof import("../src/domain/schemas/index.js").VisualizationResponseSchema;
  validEnrollmentMidStudy: typeof import("../tests/fixtures/ctgovStudies.js").validEnrollmentMidStudy;
  validEnrollmentSmallStudy: typeof import("../tests/fixtures/ctgovStudies.js").validEnrollmentSmallStudy;
  validMultiPhaseStudy: typeof import("../tests/fixtures/ctgovStudies.js").validMultiPhaseStudy;
  validNetworkSamePairSecondStudy: typeof import("../tests/fixtures/ctgovStudies.js").validNetworkSamePairSecondStudy;
  validNetworkSingleInterventionStudy: typeof import("../tests/fixtures/ctgovStudies.js").validNetworkSingleInterventionStudy;
  validRelationshipStudy: typeof import("../tests/fixtures/ctgovStudies.js").validRelationshipStudy;
  validRelationshipStudySecondYear: typeof import("../tests/fixtures/ctgovStudies.js").validRelationshipStudySecondYear;
  validSinglePhaseStudy: typeof import("../tests/fixtures/ctgovStudies.js").validSinglePhaseStudy;
  validStudyGapYearStartDate: typeof import("../tests/fixtures/ctgovStudies.js").validStudyGapYearStartDate;
  validStudyIsoStartDate: typeof import("../tests/fixtures/ctgovStudies.js").validStudyIsoStartDate;
}): SmokeCase[] {
  const {
    aggregateByEnrollment,
    aggregateGroupedByPhase,
    aggregateByNetwork,
    aggregateByRelationship,
    aggregateByStartYear,
    assembleVisualizationResponse,
    buildStudyExcerptIndex,
    VisualizationResponseSchema,
    validEnrollmentMidStudy,
    validEnrollmentSmallStudy,
    validMultiPhaseStudy,
    validNetworkSamePairSecondStudy,
    validNetworkSingleInterventionStudy,
    validRelationshipStudy,
    validRelationshipStudySecondYear,
    validSinglePhaseStudy,
    validStudyGapYearStartDate,
    validStudyIsoStartDate,
  } = deps;

  async function assertLiveLlmRouting(
    client: HttpClient,
    query: string,
    expectedType: VisualizationType,
    assertMeta?: (meta: VisualizationResponse["meta"]) => void,
  ): Promise<VisualizationResponse> {
    const response = await client.post("/visualize", { query });

    assert(
      response.statusCode === 200,
      `expected 200, got ${response.statusCode}: ${JSON.stringify(response.body)}`,
    );

    const parsed = VisualizationResponseSchema.safeParse(response.body);
    assert(parsed.success, `response failed schema validation: ${parsed.error?.message}`);

    assert(
      parsed.data.visualization.type === expectedType,
      `expected ${expectedType} for query "${query}", got ${parsed.data.visualization.type}`,
    );
    assertMeta?.(parsed.data.meta);
    assertNoSourceNctIds(parsed.data.visualization);
    assertCitationsOnNonemptyDatums(parsed.data.visualization);

    return parsed.data;
  }

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
      name: "[LIVE] POST /visualize returns bar chart for Pembrolizumab query",
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
        assertNoSourceNctIds(parsed.data.visualization);
        assertCitationsOnNonemptyDatums(parsed.data.visualization);

        return parsed.data;
      },
    },
    {
      name: "[LIVE] POST /visualize returns grouped bar chart for Metformin vs Pembrolizumab query",
      liveOnly: true,
      async run(client) {
        const response = await client.post("/visualize", {
          query: "Compare phases for Metformin vs Pembrolizumab",
        });

        assert(
          response.statusCode === 200,
          `expected 200, got ${response.statusCode}: ${JSON.stringify(response.body)}`,
        );

        const parsed = VisualizationResponseSchema.safeParse(response.body);
        assert(parsed.success, `response failed schema validation: ${parsed.error?.message}`);

        assert(
          parsed.data.visualization.type === "grouped_bar_chart",
          "expected grouped_bar_chart visualization",
        );
        assert(
          parsed.data.visualization.title.includes("Metformin") &&
            parsed.data.visualization.title.includes("Pembrolizumab"),
          `unexpected title: ${parsed.data.visualization.title}`,
        );
        assert(
          parsed.data.meta.comparison_targets !== undefined &&
            parsed.data.meta.comparison_targets !== null &&
            parsed.data.meta.comparison_targets.length >= 2,
          "expected comparison_targets in meta",
        );
        assert(parsed.data.meta.comparison_dimension === "phase", "expected phase comparison_dimension");
        assert(parsed.data.visualization.data.length >= 12, "expected phase bins × series rows");
        assert(parsed.data.meta.fetched_studies > 0, "expected fetched_studies > 0");
        assert(parsed.data.meta.source === "clinicaltrials.gov", "unexpected meta.source");
        assertNoSourceNctIds(parsed.data.visualization);
        assertCitationsOnNonemptyDatums(parsed.data.visualization);

        return parsed.data;
      },
    },
    {
      name: "[LIVE] POST /visualize returns line chart for Pembrolizumab timeline query",
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
        assertNoSourceNctIds(parsed.data.visualization);
        assertCitationsOnNonemptyDatums(parsed.data.visualization);

        return parsed.data;
      },
    },
    {
      name: "[LIVE] POST /visualize returns histogram for Pembrolizumab distribution query",
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
        assertNoSourceNctIds(parsed.data.visualization);
        assertCitationsOnNonemptyDatums(parsed.data.visualization);

        return parsed.data;
      },
    },
    {
      name: "[LIVE] POST /visualize returns scatterplot for Pembrolizumab relationship query",
      liveOnly: true,
      llmRouting: true,
      async run(client) {
        const response = await client.post("/visualize", {
          query:
            "What is the relationship between enrollment and start year for Pembrolizumab trials?",
        });

        assert(
          response.statusCode === 200,
          `expected 200, got ${response.statusCode}: ${JSON.stringify(response.body)}`,
        );

        const parsed = VisualizationResponseSchema.safeParse(response.body);
        assert(parsed.success, `response failed schema validation: ${parsed.error?.message}`);

        assert(parsed.data.visualization.type === "scatterplot", "expected scatterplot visualization");
        assert(
          parsed.data.visualization.title.includes("Pembrolizumab"),
          `unexpected title: ${parsed.data.visualization.title}`,
        );
        assert(parsed.data.visualization.data.length > 0, "expected at least one scatterplot point");
        assert(
          parsed.data.visualization.data.every(
            (point) =>
              typeof point.nct_id === "string" &&
              Number.isInteger(point.enrollment_count) &&
              point.enrollment_count > 0 &&
              Number.isInteger(point.year),
          ),
          "expected per-study points with nct_id, positive enrollment, and year",
        );
        assert(parsed.data.meta.fetched_studies > 0, "expected fetched_studies > 0");
        assert(parsed.data.meta.source === "clinicaltrials.gov", "unexpected meta.source");
        assertNoSourceNctIds(parsed.data.visualization);
        assertCitationsOnNonemptyDatums(parsed.data.visualization);

        return parsed.data;
      },
    },
    {
      name: "[LIVE] POST /visualize returns network graph for Pembrolizumab sponsor query",
      liveOnly: true,
      llmRouting: true,
      async run(client) {
        const response = await client.post("/visualize", {
          query: "Which sponsors are running Pembrolizumab trials?",
        });

        assert(
          response.statusCode === 200,
          `expected 200, got ${response.statusCode}: ${JSON.stringify(response.body)}`,
        );

        const parsed = VisualizationResponseSchema.safeParse(response.body);
        assert(parsed.success, `response failed schema validation: ${parsed.error?.message}`);

        assert(parsed.data.visualization.type === "network_graph", "expected network_graph visualization");
        assert(
          parsed.data.visualization.title.includes("Pembrolizumab"),
          `unexpected title: ${parsed.data.visualization.title}`,
        );
        assert(parsed.data.meta.network_dimension === "drug_sponsor", "expected drug_sponsor dimension");
        assert(parsed.data.visualization.data.nodes.length > 0, "expected at least one node");
        assert(parsed.data.visualization.data.edges.length > 0, "expected at least one edge");
        assert(
          parsed.data.visualization.data.nodes.every(
            (node) =>
              typeof node.id === "string" &&
              typeof node.label === "string" &&
              typeof node.entity_type === "string",
          ),
          "expected nodes with id, label, and entity_type",
        );
        assert(
          parsed.data.visualization.data.edges.every(
            (edge) =>
              typeof edge.source === "string" &&
              typeof edge.target === "string" &&
              Number.isInteger(edge.weight) &&
              edge.weight >= 1 &&
              !("source_nct_ids" in edge),
          ),
          "expected edges with source, target, positive weight, and no source_nct_ids",
        );
        assert(
          parsed.data.visualization.data.nodes.some((node) => node.entity_type === "drug"),
          "expected at least one drug node",
        );
        assert(
          parsed.data.visualization.data.nodes.some((node) => node.entity_type === "sponsor"),
          "expected at least one sponsor node",
        );
        assert(parsed.data.meta.fetched_studies > 0, "expected fetched_studies > 0");
        assert(parsed.data.meta.source === "clinicaltrials.gov", "unexpected meta.source");
        assertNoSourceNctIds(parsed.data.visualization);
        assertCitationsOnNonemptyDatums(parsed.data.visualization);

        return parsed.data;
      },
    },
    {
      name: "[LIVE LLM] routes who-is-sponsoring phrasing to network_graph",
      liveOnly: true,
      llmRouting: true,
      async run(client) {
        return assertLiveLlmRouting(
          client,
          "Who is sponsoring Pembrolizumab trials?",
          "network_graph",
          (meta) => {
            assert(meta.network_dimension === "drug_sponsor", "expected drug_sponsor dimension");
          },
        );
      },
    },
    {
      name: "[LIVE LLM] routes network-of-sponsors phrasing to network_graph",
      liveOnly: true,
      llmRouting: true,
      async run(client) {
        return assertLiveLlmRouting(
          client,
          "Network of sponsors studying Pembrolizumab",
          "network_graph",
          (meta) => {
            assert(meta.network_dimension === "drug_sponsor", "expected drug_sponsor dimension");
          },
        );
      },
    },
    {
      name: "[LIVE LLM] routes enrollment-vs-year phrasing to scatterplot",
      liveOnly: true,
      llmRouting: true,
      async run(client) {
        return assertLiveLlmRouting(
          client,
          "Enrollment vs start year for Pembrolizumab trials",
          "scatterplot",
          (meta) => {
            assert(
              meta.network_dimension === undefined || meta.network_dimension === null,
              "expected no network_dimension on scatterplot response",
            );
          },
        );
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
            drug_name: "Pembrolizumab", comparison_targets: null,
            condition: null,
            phase: null,
          sponsor: null,
          country: null,
          start_year: null,
          end_year: null,
          },
          visualizationType: "line_chart",
          aggregation: aggregation.bins,
          fetchedStudies: 2,
          skippedMalformed: 0,
          studiesWithMultiplePhases: 0,
          truncated: false,
          studyExcerptIndex: new Map(),
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
        const studiesWithTitles = [
          {
            ...validEnrollmentSmallStudy,
            protocolSection: {
              ...validEnrollmentSmallStudy.protocolSection,
              identificationModule: {
                ...validEnrollmentSmallStudy.protocolSection.identificationModule,
                briefTitle: "Low-enrollment Pembrolizumab study",
              },
            },
          },
          {
            ...validEnrollmentMidStudy,
            protocolSection: {
              ...validEnrollmentMidStudy.protocolSection,
              identificationModule: {
                ...validEnrollmentMidStudy.protocolSection.identificationModule,
                briefTitle: "Mid-enrollment Pembrolizumab study",
              },
            },
          },
        ];

        const aggregation = aggregateByEnrollment(studiesWithTitles);
        const studyExcerptIndex = buildStudyExcerptIndex(studiesWithTitles);

        const response = assembleVisualizationResponse({
          filters: {
            drug_name: "Pembrolizumab", comparison_targets: null,
            condition: null,
            phase: null,
          sponsor: null,
          country: null,
          start_year: null,
          end_year: null,
          },
          visualizationType: "histogram",
          aggregation: aggregation.bins,
          fetchedStudies: 2,
          skippedMalformed: 0,
          studiesWithMultiplePhases: 0,
          truncated: false,
          studyExcerptIndex,
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

        const bin50 = parsed.data.visualization.data.find((point) => point.bin_label === "1–50");
        const bin100 = parsed.data.visualization.data.find((point) => point.bin_label === "51–100");
        assert(
          bin50?.citations?.[0]?.nct_id === "NCT00000201" &&
            bin50.citations[0]?.excerpt === "Low-enrollment Pembrolizumab study",
          "expected citations on 1–50 enrollment bin",
        );
        assert(
          bin100?.citations?.[0]?.nct_id === "NCT00000202" &&
            bin100.citations[0]?.excerpt === "Mid-enrollment Pembrolizumab study",
          "expected citations on 51–100 enrollment bin",
        );
        assertCitationsOnNonemptyDatums(parsed.data.visualization);
      },
    },
    {
      name: "[MOCK] Relationship pipeline returns scatterplot with per-study points",
      mocked: true,
      async run() {
        const aggregation = aggregateByRelationship([
          validRelationshipStudy,
          validRelationshipStudySecondYear,
        ]);

        const response = assembleVisualizationResponse({
          filters: {
            drug_name: "Pembrolizumab", comparison_targets: null,
            condition: null,
            phase: null,
          sponsor: null,
          country: null,
          start_year: null,
          end_year: null,
          },
          visualizationType: "scatterplot",
          aggregation: aggregation.points,
          fetchedStudies: 2,
          skippedMalformed: 0,
          studiesWithMultiplePhases: 0,
          truncated: false,
          studyExcerptIndex: new Map(),
        });

        const parsed = VisualizationResponseSchema.safeParse(response);
        assert(parsed.success, `response failed schema validation: ${parsed.error?.message}`);

        assert(parsed.data.visualization.type === "scatterplot", "expected scatterplot visualization");
        assert(
          parsed.data.visualization.title === "Enrollment vs start year for Pembrolizumab",
          `unexpected title: ${parsed.data.visualization.title}`,
        );
        assert(parsed.data.visualization.data.length === 2, "expected two scatterplot points");
        assert(
          parsed.data.visualization.data.every(
            (point) =>
              typeof point.nct_id === "string" &&
              Number.isInteger(point.enrollment_count) &&
              Number.isInteger(point.year),
          ),
          "expected per-study points with nct_id, enrollment, and year",
        );
        assert(
          parsed.data.visualization.data.some(
            (point) => point.nct_id === "NCT00000301" && point.enrollment_count === 120 && point.year === 2020,
          ),
          "expected first relationship study as scatterplot point",
        );
        assert(
          parsed.data.visualization.data.some(
            (point) => point.nct_id === "NCT00000302" && point.enrollment_count === 75 && point.year === 2021,
          ),
          "expected second relationship study as scatterplot point",
        );
      },
    },
    {
      name: "[MOCK] Network pipeline returns network_graph with drug-sponsor edges",
      mocked: true,
      async run() {
        const aggregation = aggregateByNetwork(
          [validNetworkSingleInterventionStudy, validNetworkSamePairSecondStudy],
          "drug_sponsor",
          { drug_name: "Pembrolizumab" },
        );

        const response = assembleVisualizationResponse({
          filters: {
            drug_name: "Pembrolizumab", comparison_targets: null,
            condition: null,
            phase: null,
          sponsor: null,
          country: null,
          start_year: null,
          end_year: null,
          },
          visualizationType: "network_graph",
          networkDimension: "drug_sponsor",
          aggregation,
          fetchedStudies: 2,
          skippedMalformed: 0,
          studiesWithMultiplePhases: 0,
          truncated: false,
          studyExcerptIndex: new Map(),
        });

        const parsed = VisualizationResponseSchema.safeParse(response);
        assert(parsed.success, `response failed schema validation: ${parsed.error?.message}`);

        assert(parsed.data.visualization.type === "network_graph", "expected network_graph visualization");
        assert(
          parsed.data.visualization.title === "Drug–sponsor network for Pembrolizumab",
          `unexpected title: ${parsed.data.visualization.title}`,
        );
        assert(parsed.data.meta.network_dimension === "drug_sponsor", "expected drug_sponsor dimension");
        assert(parsed.data.visualization.data.nodes.length >= 2, "expected at least two nodes");
        assert(parsed.data.visualization.data.edges.length >= 1, "expected at least one edge");
        assert(
          parsed.data.visualization.data.edges.some(
            (edge) =>
              edge.source === "drug:pembrolizumab" &&
              edge.target === "sponsor:merck-sharp-dohme-llc" &&
              edge.weight === 2,
          ),
          "expected weighted drug-sponsor edge",
        );
        for (const edge of parsed.data.visualization.data.edges) {
          assert(!("source_nct_ids" in edge), "expected source_nct_ids stripped from edges");
        }
      },
    },
    {
      name: "[MOCK] Grouped comparison pipeline returns grouped_bar_chart with series encoding",
      mocked: true,
      async run() {
        const aggregation = aggregateGroupedByPhase([
          { series: "Metformin", studies: [validSinglePhaseStudy] },
          { series: "Pembrolizumab", studies: [validMultiPhaseStudy] },
        ]);

        const response = assembleVisualizationResponse({
          filters: {
            drug_name: null,
            comparison_targets: ["Metformin", "Pembrolizumab"],
            condition: null,
            phase: null,
          sponsor: null,
          country: null,
          start_year: null,
          end_year: null,
          },
          visualizationType: "grouped_bar_chart",
          comparisonTargets: ["Metformin", "Pembrolizumab"],
          aggregation: aggregation.rows,
          fetchedStudies: 2,
          skippedMalformed: 0,
          studiesWithMultiplePhases: 1,
          truncated: false,
          studyExcerptIndex: new Map(),
        });

        const parsed = VisualizationResponseSchema.safeParse(response);
        assert(parsed.success, `response failed schema validation: ${parsed.error?.message}`);

        assert(
          parsed.data.visualization.type === "grouped_bar_chart",
          "expected grouped_bar_chart visualization",
        );
        assert(
          parsed.data.visualization.title === "Trial phases: Metformin vs Pembrolizumab",
          `unexpected title: ${parsed.data.visualization.title}`,
        );
        assert(parsed.data.visualization.data.length === 12, "expected six phase bins × two series");
        assert(
          parsed.data.meta.comparison_targets?.join(", ") === "Metformin, Pembrolizumab",
          "expected comparison_targets in meta",
        );
        assert(parsed.data.meta.comparison_dimension === "phase", "expected phase comparison_dimension");
        assert(
          parsed.data.visualization.data.some(
            (row) => row.series === "Metformin" && row.phase === "Phase 2" && row.trial_count === 1,
          ),
          "expected Metformin Phase 2 count",
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
  const { aggregateByEnrollment, aggregateGroupedByPhase, aggregateByNetwork, aggregateByRelationship, aggregateByStartYear } = await import(
    "../src/domain/aggregations/index.js"
  );
  const { assembleVisualizationResponse } = await import(
    "../src/domain/assembleVisualizationResponse.js"
  );
  const { buildStudyExcerptIndex } = await import("../src/domain/citations/index.js");
  const { VisualizationResponseSchema } = await import("../src/domain/schemas/index.js");
  const { buildServer } = await import("../src/server.js");
  const {
    validEnrollmentMidStudy,
    validEnrollmentSmallStudy,
    validMultiPhaseStudy,
    validNetworkSamePairSecondStudy,
    validNetworkSingleInterventionStudy,
    validRelationshipStudy,
    validRelationshipStudySecondYear,
    validSinglePhaseStudy,
    validStudyGapYearStartDate,
    validStudyIsoStartDate,
  } = await import("../tests/fixtures/ctgovStudies.js");

  const { live, llmRouting, running, verbose, baseUrl } = parseArgs(process.argv.slice(2), config.PORT);
  const client = running
    ? createFetchClient(baseUrl)
    : await createInjectClient(buildServer);
  const smokeCases = createSmokeCases({
    aggregateByEnrollment,
    aggregateGroupedByPhase,
    aggregateByNetwork,
    aggregateByRelationship,
    aggregateByStartYear,
    assembleVisualizationResponse,
    buildStudyExcerptIndex,
    VisualizationResponseSchema,
    validEnrollmentMidStudy,
    validEnrollmentSmallStudy,
    validMultiPhaseStudy,
    validNetworkSamePairSecondStudy,
    validNetworkSingleInterventionStudy,
    validRelationshipStudy,
    validRelationshipStudySecondYear,
    validSinglePhaseStudy,
    validStudyGapYearStartDate,
    validStudyIsoStartDate,
  });
  const mode = running ? `running server (${baseUrl})` : "in-process";
  const cases = smokeCases.filter((testCase) => {
    if (llmRouting && !testCase.llmRouting) {
      return false;
    }

    if (testCase.liveOnly && !live) {
      return false;
    }

    return true;
  });

  console.log(
    `Smoke test mode: ${mode}${live ? " + live pipeline" : ""}` +
      `${llmRouting ? " + LLM routing only" : ""}` +
      `${verbose ? " + verbose logs" : ""}`,
  );
  console.log("");

  const failures: string[] = [];

  for (const testCase of cases) {
    process.stdout.write(`  ${testCase.name} ... `);

    try {
      const summary = await testCase.run(client);
      console.log("ok");
      if (testCase.liveOnly && summary !== undefined) {
        if (testCase.llmRouting) {
          console.log(`      → ${summary.visualization.type}: ${summary.visualization.title}`);
        } else {
          printLiveValidationSummary(summary);
        }
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
