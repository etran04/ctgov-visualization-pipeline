import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseQueryInterpretation,
  type QueryInterpretationOpenAi,
} from "../../../src/domain/schemas/index.js";

const mockParse = vi.fn();

vi.mock("openai", () => {
  class APIError extends Error {
    status: number;

    constructor(message: string, status = 500) {
      super(message);
      this.name = "APIError";
      this.status = status;
    }
  }

  class APIConnectionError extends Error {
    constructor(message = "connection error") {
      super(message);
      this.name = "APIConnectionError";
    }
  }

  class APIConnectionTimeoutError extends Error {
    constructor(message = "timeout") {
      super(message);
      this.name = "APIConnectionTimeoutError";
    }
  }

  return {
    default: class OpenAI {
      chat = {
        completions: {
          parse: mockParse,
        },
      };
    },
    APIError,
    APIConnectionError,
    APIConnectionTimeoutError,
  };
});

vi.mock("../../../src/config.js", () => ({
  config: {
    OPENAI_API_KEY: "test-key",
    OPENAI_MODEL: "gpt-test",
    OPENAI_RETRY_ATTEMPTS: 1,
    OPENAI_TIMEOUT_MS: 1000,
    LOG_LEVEL: "silent",
  },
}));

function mockOpenAiInterpretation(parsed: QueryInterpretationOpenAi): void {
  mockParse.mockResolvedValueOnce({
    choices: [
      {
        finish_reason: "stop",
        message: { parsed },
      },
    ],
  });
}

describe("interpretQuery interpretation shape", () => {
  it("accepts comparison intent from OpenAI flat output", () => {
    const interpretation = parseQueryInterpretation({
      intent: "comparison",
      entities: { drug_name: "Pembrolizumab", comparison_targets: null, condition: null, phase: null },
      comparison_dimension: "phase",
      time_dimension: null,
      distribution_dimension: null,
      relationship_dimension: null,
      network_dimension: null,
      suggested_viz_type: "bar_chart",
    });

    expect(interpretation).toEqual({
      intent: "comparison",
      entities: { drug_name: "Pembrolizumab", comparison_targets: null, condition: null, phase: null },
      comparison_dimension: "phase",
      suggested_viz_type: "bar_chart",
    });
  });

  it("accepts trend_over_time intent from OpenAI flat output", () => {
    const interpretation = parseQueryInterpretation({
      intent: "trend_over_time",
      entities: { drug_name: "Pembrolizumab", comparison_targets: null, condition: null, phase: null },
      comparison_dimension: null,
      time_dimension: "start_year",
      distribution_dimension: null,
      relationship_dimension: null,
      network_dimension: null,
      suggested_viz_type: "line_chart",
    });

    expect(interpretation).toEqual({
      intent: "trend_over_time",
      entities: { drug_name: "Pembrolizumab", comparison_targets: null, condition: null, phase: null },
      time_dimension: "start_year",
      suggested_viz_type: "line_chart",
    });
  });

  it("accepts distribution intent from OpenAI flat output", () => {
    const interpretation = parseQueryInterpretation({
      intent: "distribution",
      entities: { drug_name: "Pembrolizumab", comparison_targets: null, condition: null, phase: null },
      comparison_dimension: null,
      time_dimension: null,
      distribution_dimension: "enrollment_count",
      relationship_dimension: null,
      network_dimension: null,
      suggested_viz_type: "histogram",
    });

    expect(interpretation).toEqual({
      intent: "distribution",
      entities: { drug_name: "Pembrolizumab", comparison_targets: null, condition: null, phase: null },
      distribution_dimension: "enrollment_count",
      suggested_viz_type: "histogram",
    });
  });

  it("accepts relationship intent from OpenAI flat output", () => {
    const interpretation = parseQueryInterpretation({
      intent: "relationship",
      entities: { drug_name: "Pembrolizumab", comparison_targets: null, condition: null, phase: null },
      comparison_dimension: null,
      time_dimension: null,
      distribution_dimension: null,
      relationship_dimension: "enrollment_vs_start_year",
      network_dimension: null,
      suggested_viz_type: "scatterplot",
    });

    expect(interpretation).toEqual({
      intent: "relationship",
      entities: { drug_name: "Pembrolizumab", comparison_targets: null, condition: null, phase: null },
      relationship_dimension: "enrollment_vs_start_year",
      suggested_viz_type: "scatterplot",
    });
  });

  it("accepts network intent from OpenAI flat output", () => {
    const interpretation = parseQueryInterpretation({
      intent: "network",
      entities: { drug_name: "Pembrolizumab", comparison_targets: null, condition: null, phase: null },
      comparison_dimension: null,
      time_dimension: null,
      distribution_dimension: null,
      relationship_dimension: null,
      network_dimension: "drug_sponsor",
      suggested_viz_type: "network_graph",
    });

    expect(interpretation).toEqual({
      intent: "network",
      entities: { drug_name: "Pembrolizumab", comparison_targets: null, condition: null, phase: null },
      network_dimension: "drug_sponsor",
      suggested_viz_type: "network_graph",
    });
  });
});

describe("interpretQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("returns network interpretation from mocked OpenAI output", async () => {
    mockOpenAiInterpretation({
      intent: "network",
      entities: { drug_name: "Pembrolizumab", comparison_targets: null, condition: null, phase: null },
      comparison_dimension: null,
      time_dimension: null,
      distribution_dimension: null,
      relationship_dimension: null,
      network_dimension: "drug_sponsor",
      suggested_viz_type: "network_graph",
    });

    const { interpretQuery } = await import("../../../src/externals/openai/interpretQuery.js");
    const interpretation = await interpretQuery("Which sponsors are running Pembrolizumab trials?");

    expect(interpretation).toEqual({
      intent: "network",
      entities: { drug_name: "Pembrolizumab", comparison_targets: null, condition: null, phase: null },
      network_dimension: "drug_sponsor",
      suggested_viz_type: "network_graph",
    });
  });

  it("returns relationship interpretation with null network_dimension from mocked OpenAI output", async () => {
    mockOpenAiInterpretation({
      intent: "relationship",
      entities: { drug_name: "Pembrolizumab", comparison_targets: null, condition: null, phase: null },
      comparison_dimension: null,
      time_dimension: null,
      distribution_dimension: null,
      relationship_dimension: "enrollment_vs_start_year",
      network_dimension: null,
      suggested_viz_type: "scatterplot",
    });

    const { interpretQuery } = await import("../../../src/externals/openai/interpretQuery.js");
    const interpretation = await interpretQuery(
      "What is the relationship between enrollment and start year for Pembrolizumab trials?",
    );

    expect(interpretation).toEqual({
      intent: "relationship",
      entities: { drug_name: "Pembrolizumab", comparison_targets: null, condition: null, phase: null },
      relationship_dimension: "enrollment_vs_start_year",
      suggested_viz_type: "scatterplot",
    });
  });

  it("throws InterpretationError when mocked OpenAI output fails schema validation", async () => {
    mockOpenAiInterpretation({
      intent: "network",
      entities: { drug_name: "Pembrolizumab", comparison_targets: null, condition: null, phase: null },
      comparison_dimension: null,
      time_dimension: null,
      distribution_dimension: null,
      relationship_dimension: null,
      network_dimension: null,
      suggested_viz_type: "network_graph",
    });

    const { interpretQuery } = await import("../../../src/externals/openai/interpretQuery.js");

    await expect(
      interpretQuery("Which sponsors are running Pembrolizumab trials?"),
    ).rejects.toMatchObject({
      code: "INTERPRETATION_FAILURE",
      message: "OpenAI interpretation failed schema validation",
    });
  });
});
