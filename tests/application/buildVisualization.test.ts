import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvalidParametersError } from "../../src/domain/errors.js";
import { VisualizationResponseSchema } from "../../src/domain/schemas/index.js";
import { validMultiPhaseStudy, validSinglePhaseStudy } from "../fixtures/ctgovStudies.js";

vi.mock("../../src/externals/openai/interpretQuery.js", () => ({
  interpretQuery: vi.fn(),
}));

vi.mock("../../src/externals/ctgov/fetchStudies.js", () => ({
  fetchStudies: vi.fn(),
}));

import { buildVisualization } from "../../src/application/buildVisualization.js";
import { fetchStudies } from "../../src/externals/ctgov/fetchStudies.js";
import { interpretQuery } from "../../src/externals/openai/interpretQuery.js";

const mockInterpretQuery = vi.mocked(interpretQuery);
const mockFetchStudies = vi.mocked(fetchStudies);

describe("buildVisualization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("wires interpretation, fetch, aggregation, and assembly into a valid response", async () => {
    mockInterpretQuery.mockResolvedValue({
      intent: "comparison",
      entities: {
        drug_name: "Pembrolizumab",
        condition: null,
        phase: null,
      },
      comparison_dimension: "phase",
      suggested_viz_type: "bar_chart",
    });

    mockFetchStudies.mockResolvedValue({
      studies: [validSinglePhaseStudy, validMultiPhaseStudy],
      pages_fetched: 1,
      skipped_malformed: 1,
      truncated: false,
    });

    const response = await buildVisualization({
      query: "Compare trial phases for Pembrolizumab",
    });

    expect(mockInterpretQuery).toHaveBeenCalledWith(
      "Compare trial phases for Pembrolizumab",
      undefined,
    );
    expect(mockFetchStudies).toHaveBeenCalledWith(
      {
        drug_name: "Pembrolizumab",
        condition: null,
        phase: null,
      },
      { intent: "comparison" },
    );

    expect(response.visualization.type).toBe("bar_chart");
    expect(response.visualization.title).toBe("Trial phases for Pembrolizumab");
    expect(response.meta.fetched_studies).toBe(2);
    expect(response.meta.skipped_malformed).toBe(1);
    expect(response.meta.studies_with_multiple_phases).toBe(1);
    expect(response.meta.truncated).toBe(false);
    expect(VisualizationResponseSchema.parse(response)).toEqual(response);
  });

  it("passes advisory hints to query interpretation", async () => {
    const hints = {
      entities: { drug_name: "Pembrolizumab", condition: null, phase: null },
    };

    mockInterpretQuery.mockResolvedValue({
      intent: "comparison",
      entities: {
        drug_name: "Pembrolizumab",
        condition: null,
        phase: null,
      },
      comparison_dimension: "phase",
      suggested_viz_type: "bar_chart",
    });

    mockFetchStudies.mockResolvedValue({
      studies: [validSinglePhaseStudy],
      pages_fetched: 1,
      skipped_malformed: 0,
      truncated: false,
    });

    await buildVisualization({
      query: "Compare trial phases",
      hints,
    });

    expect(mockInterpretQuery).toHaveBeenCalledWith("Compare trial phases", hints);
  });

  it("propagates InvalidParametersError when interpretation has no usable filters", async () => {
    mockInterpretQuery.mockResolvedValue({
      intent: "comparison",
      entities: {
        drug_name: null,
        condition: null,
        phase: null,
      },
      comparison_dimension: "phase",
      suggested_viz_type: "bar_chart",
    });

    await expect(buildVisualization({ query: "show me trials" })).rejects.toThrow(
      InvalidParametersError,
    );
    expect(mockFetchStudies).not.toHaveBeenCalled();
  });
});
