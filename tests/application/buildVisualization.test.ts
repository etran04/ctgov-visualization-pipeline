import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvalidParametersError } from "../../src/domain/errors.js";
import { VisualizationResponseSchema } from "../../src/domain/schemas/index.js";
import {
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
} from "../fixtures/ctgovStudies.js";

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
      { intent: "comparison", fields: ["NCTId", "Phase"] },
    );

    expect(response.visualization.type).toBe("bar_chart");
    expect(response.visualization.title).toBe("Trial phases for Pembrolizumab");
    expect(response.meta.fetched_studies).toBe(2);
    expect(response.meta.skipped_malformed).toBe(1);
    expect(response.meta.studies_with_multiple_phases).toBe(1);
    expect(response.meta.truncated).toBe(false);
    expect(VisualizationResponseSchema.parse(response)).toEqual(response);
  });

  it("wires timeline interpretation into a valid line chart response", async () => {
    mockInterpretQuery.mockResolvedValue({
      intent: "trend_over_time",
      entities: {
        drug_name: "Pembrolizumab",
        condition: null,
        phase: null,
      },
      time_dimension: "start_year",
      suggested_viz_type: "line_chart",
    });

    mockFetchStudies.mockResolvedValue({
      studies: [validStudyIsoStartDate, validStudyGapYearStartDate],
      pages_fetched: 1,
      skipped_malformed: 0,
      truncated: false,
    });

    const response = await buildVisualization({
      query: "How have Pembrolizumab trials changed over time?",
    });

    expect(mockFetchStudies).toHaveBeenCalledWith(
      {
        drug_name: "Pembrolizumab",
        condition: null,
        phase: null,
      },
      { intent: "trend_over_time", fields: ["NCTId", "StartDate"] },
    );

    expect(response.visualization.type).toBe("line_chart");
    expect(response.visualization.title).toBe("Trials started per year for Pembrolizumab");
    expect(response.visualization.data).toEqual([
      { year: 2020, trial_count: 1 },
      { year: 2021, trial_count: 0 },
      { year: 2022, trial_count: 0 },
      { year: 2023, trial_count: 1 },
    ]);
    expect(response.meta.fetched_studies).toBe(2);
    expect(response.meta.skipped_malformed).toBe(0);
    expect(response.meta.studies_with_multiple_phases).toBe(0);
    expect(response.meta.truncated).toBe(false);
    expect(VisualizationResponseSchema.parse(response)).toEqual(response);
  });

  it("wires distribution interpretation into a valid histogram response", async () => {
    mockInterpretQuery.mockResolvedValue({
      intent: "distribution",
      entities: {
        drug_name: "Pembrolizumab",
        condition: null,
        phase: null,
      },
      distribution_dimension: "enrollment_count",
      suggested_viz_type: "histogram",
    });

    mockFetchStudies.mockResolvedValue({
      studies: [validEnrollmentSmallStudy, validEnrollmentMidStudy],
      pages_fetched: 1,
      skipped_malformed: 0,
      truncated: false,
    });

    const response = await buildVisualization({
      query: "What is the enrollment distribution for Pembrolizumab trials?",
    });

    expect(mockFetchStudies).toHaveBeenCalledWith(
      {
        drug_name: "Pembrolizumab",
        condition: null,
        phase: null,
      },
      { intent: "distribution", fields: ["NCTId", "EnrollmentCount"] },
    );

    expect(response.visualization.type).toBe("histogram");
    expect(response.visualization.title).toBe("Enrollment distribution for Pembrolizumab");
    expect(response.visualization.data).toEqual([
      { bin_label: "1–50", bin_start: 1, bin_end: 50, trial_count: 1 },
      { bin_label: "51–100", bin_start: 51, bin_end: 100, trial_count: 1 },
      { bin_label: "101–500", bin_start: 101, bin_end: 500, trial_count: 0 },
      { bin_label: "501–1,000", bin_start: 501, bin_end: 1000, trial_count: 0 },
      { bin_label: "1,001–5,000", bin_start: 1001, bin_end: 5000, trial_count: 0 },
      { bin_label: "5,001+", bin_start: 5001, bin_end: null, trial_count: 0 },
    ]);
    expect(response.meta.fetched_studies).toBe(2);
    expect(response.meta.skipped_malformed).toBe(0);
    expect(response.meta.studies_with_multiple_phases).toBe(0);
    expect(response.meta.truncated).toBe(false);
    expect(VisualizationResponseSchema.parse(response)).toEqual(response);
  });

  it("wires relationship interpretation into a valid scatterplot response", async () => {
    mockInterpretQuery.mockResolvedValue({
      intent: "relationship",
      entities: {
        drug_name: "Pembrolizumab",
        condition: null,
        phase: null,
      },
      relationship_dimension: "enrollment_vs_start_year",
      suggested_viz_type: "scatterplot",
    });

    mockFetchStudies.mockResolvedValue({
      studies: [validRelationshipStudy, validRelationshipStudySecondYear],
      pages_fetched: 1,
      skipped_malformed: 0,
      truncated: false,
    });

    const response = await buildVisualization({
      query:
        "What is the relationship between enrollment and start year for Pembrolizumab trials?",
    });

    expect(mockFetchStudies).toHaveBeenCalledWith(
      {
        drug_name: "Pembrolizumab",
        condition: null,
        phase: null,
      },
      { intent: "relationship", fields: ["NCTId", "EnrollmentCount", "StartDate"] },
    );

    expect(response.visualization.type).toBe("scatterplot");
    expect(response.visualization.title).toBe("Enrollment vs start year for Pembrolizumab");
    expect(response.visualization.data).toEqual([
      { nct_id: "NCT00000301", enrollment_count: 120, year: 2020 },
      { nct_id: "NCT00000302", enrollment_count: 75, year: 2021 },
    ]);
    expect(response.meta.fetched_studies).toBe(2);
    expect(response.meta.skipped_malformed).toBe(0);
    expect(response.meta.studies_with_multiple_phases).toBe(0);
    expect(response.meta.truncated).toBe(false);
    expect(VisualizationResponseSchema.parse(response)).toEqual(response);
  });

  it("wires network interpretation into a valid network_graph response", async () => {
    mockInterpretQuery.mockResolvedValue({
      intent: "network",
      entities: {
        drug_name: "Pembrolizumab",
        condition: null,
        phase: null,
      },
      network_dimension: "drug_sponsor",
      suggested_viz_type: "network_graph",
    });

    mockFetchStudies.mockResolvedValue({
      studies: [validNetworkSingleInterventionStudy, validNetworkSamePairSecondStudy],
      pages_fetched: 1,
      skipped_malformed: 0,
      truncated: false,
    });

    const response = await buildVisualization({
      query: "Which sponsors are running Pembrolizumab trials?",
    });

    expect(mockFetchStudies).toHaveBeenCalledWith(
      {
        drug_name: "Pembrolizumab",
        condition: null,
        phase: null,
      },
      {
        intent: "network",
        fields: ["NCTId", "InterventionName", "LeadSponsorName"],
      },
    );

    expect(response.visualization.type).toBe("network_graph");
    expect(response.visualization.title).toBe("Drug–sponsor network for Pembrolizumab");
    if (response.visualization.type !== "network_graph") {
      throw new Error("expected network_graph");
    }

    expect(response.visualization.data.nodes).toEqual(
      expect.arrayContaining([
        {
          id: "drug:pembrolizumab",
          label: "Pembrolizumab",
          entity_type: "drug",
        },
        {
          id: "sponsor:merck-sharp-dohme-llc",
          label: "Merck Sharp & Dohme LLC",
          entity_type: "sponsor",
        },
      ]),
    );
    expect(response.visualization.data.edges).toEqual([
      {
        source: "drug:pembrolizumab",
        target: "sponsor:merck-sharp-dohme-llc",
        weight: 2,
      },
    ]);
    for (const edge of response.visualization.data.edges) {
      expect(edge).not.toHaveProperty("source_nct_ids");
    }
    expect(response.meta.network_dimension).toBe("drug_sponsor");
    expect(response.meta.fetched_studies).toBe(2);
    expect(response.meta.skipped_malformed).toBe(0);
    expect(response.meta.studies_with_multiple_phases).toBe(0);
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
