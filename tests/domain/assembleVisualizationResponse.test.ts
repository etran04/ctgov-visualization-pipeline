import { describe, expect, it } from "vitest";
import { aggregateGroupedByPhase } from "../../src/domain/aggregations/aggregateGroupedByPhase.js";
import { VisualizationResponseSchema } from "../../src/domain/schemas/index.js";
import { aggregateByNetwork } from "../../src/domain/aggregations/aggregateByNetwork.js";
import { assembleVisualizationResponse } from "../../src/domain/assembleVisualizationResponse.js";
import { ENROLLMENT_BIN_ORDER } from "../../src/domain/mappings/enrollmentBins.js";
import { PHASE_BIN_ORDER } from "../../src/domain/mappings/phases.js";
import {
  validMultiPhaseStudy,
  validNetworkSamePairSecondStudy,
  validNetworkSingleInterventionStudy,
  validSinglePhaseStudy,
} from "../fixtures/ctgovStudies.js";

const baseAggregation = PHASE_BIN_ORDER.map((phase) => ({
  phase,
  trial_count: phase === "Phase 2" ? 3 : 0,
  source_nct_ids: phase === "Phase 2" ? ["NCT00000001", "NCT00000002", "NCT00000003"] : [],
}));

const emptyStudyExcerptIndex = new Map<string, string>();

describe("assembleBarChartResponse", () => {
  it("builds a drug-first title when both drug and condition are present", () => {
    const response = assembleVisualizationResponse({
      filters: {
        drug_name: "Pembrolizumab", comparison_targets: null,
        condition: "lung cancer",
        phase: null,
      sponsor: null,
      country: null,
      start_year: null,
      end_year: null,
      },
      visualizationType: "bar_chart",
      aggregation: baseAggregation,
      fetchedStudies: 12,
      skippedMalformed: 2,
      studiesWithMultiplePhases: 1,
      truncated: false,
      studyExcerptIndex: emptyStudyExcerptIndex,
    });

    expect(response.visualization.title).toBe(
      "Trial phases for Pembrolizumab in lung cancer",
    );
  });

  it("builds a condition-only title when only condition is present", () => {
    const response = assembleVisualizationResponse({
      filters: {
        drug_name: null, comparison_targets: null,
        condition: "melanoma",
        phase: null,
      sponsor: null,
      country: null,
      start_year: null,
      end_year: null,
      },
      visualizationType: "bar_chart",
      aggregation: baseAggregation,
      fetchedStudies: 6,
      skippedMalformed: 0,
      studiesWithMultiplePhases: 0,
      truncated: false,
      studyExcerptIndex: emptyStudyExcerptIndex,
    });

    expect(response.visualization.title).toBe("Trial phases for melanoma");
  });

  it("strips source_nct_ids from the HTTP response payload", () => {
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
      visualizationType: "bar_chart",
      aggregation: baseAggregation,
      fetchedStudies: 3,
      skippedMalformed: 0,
      studiesWithMultiplePhases: 0,
      truncated: false,
      studyExcerptIndex: emptyStudyExcerptIndex,
    });

    expect(response.visualization.type).toBe("bar_chart");
    if (response.visualization.type !== "bar_chart") {
      throw new Error("expected bar_chart");
    }

    for (const point of response.visualization.data) {
      expect(point).not.toHaveProperty("source_nct_ids");
    }
    expect(response.visualization.data).toEqual([
      { phase: "Phase 1", trial_count: 0 },
      { phase: "Phase 2", trial_count: 3 },
      { phase: "Phase 3", trial_count: 0 },
      { phase: "Phase 4", trial_count: 0 },
      { phase: "Early Phase 1", trial_count: 0 },
      { phase: "Not Applicable", trial_count: 0 },
    ]);
    expect(VisualizationResponseSchema.parse(response)).toEqual(response);
  });

  it("allows empty aggregation bins and preserves truncated meta", () => {
    const response = assembleVisualizationResponse({
      filters: {
        drug_name: null, comparison_targets: null,
        condition: null,
        phase: "Phase 1",
      sponsor: null,
      country: null,
      start_year: null,
      end_year: null,
      },
      visualizationType: "bar_chart",
      aggregation: [],
      fetchedStudies: 100,
      skippedMalformed: 4,
      studiesWithMultiplePhases: 9,
      truncated: true,
      studyExcerptIndex: emptyStudyExcerptIndex,
    });

    expect(response.visualization.data).toEqual([]);
    expect(response.meta.truncated).toBe(true);
    expect(VisualizationResponseSchema.parse(response)).toEqual(response);
  });
});

describe("assembleGroupedBarChartResponse", () => {
  const groupedAggregation = aggregateGroupedByPhase([
    { series: "Metformin", studies: [validSinglePhaseStudy] },
    { series: "Pembrolizumab", studies: [validMultiPhaseStudy] },
  ]);

  it("builds a drug-vs-drug title and comparison meta", () => {
    const response = assembleVisualizationResponse({
      filters: {
        drug_name: null,
        comparison_targets: ["Metformin", "Pembrolizumab"],
        condition: "diabetes",
        phase: null,
      sponsor: null,
      country: null,
      start_year: null,
      end_year: null,
      },
      visualizationType: "grouped_bar_chart",
      comparisonTargets: ["Metformin", "Pembrolizumab"],
      aggregation: groupedAggregation.rows,
      fetchedStudies: 5600,
      skippedMalformed: 12,
      studiesWithMultiplePhases: 508,
      truncated: false,
      studyExcerptIndex: emptyStudyExcerptIndex,
    });

    expect(response.visualization.title).toBe(
      "Trial phases: Metformin vs Pembrolizumab in diabetes",
    );
    expect(response.meta.comparison_targets).toEqual(["Metformin", "Pembrolizumab"]);
    expect(response.meta.comparison_dimension).toBe("phase");
    expect(response.meta.filters).toEqual({
      drug_name: null,
      comparison_targets: null,
      condition: "diabetes",
      phase: null,
    sponsor: null,
    country: null,
    start_year: null,
    end_year: null,
    });
  });

  it("uses color series encoding and strips source_nct_ids", () => {
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
      aggregation: groupedAggregation.rows,
      fetchedStudies: 2,
      skippedMalformed: 0,
      studiesWithMultiplePhases: 1,
      truncated: false,
      studyExcerptIndex: emptyStudyExcerptIndex,
    });

    expect(response.visualization.type).toBe("grouped_bar_chart");
    if (response.visualization.type !== "grouped_bar_chart") {
      throw new Error("expected grouped_bar_chart");
    }

    expect(response.visualization.encoding).toEqual({
      x: { field: "phase", type: "nominal" },
      y: { field: "trial_count", type: "quantitative" },
      color: { field: "series", type: "nominal" },
    });
    expect(response.visualization.data).toHaveLength(PHASE_BIN_ORDER.length * 2);
    for (const point of response.visualization.data) {
      expect(point).not.toHaveProperty("source_nct_ids");
    }
    expect(
      response.visualization.data.filter(
        (row) => row.series === "Metformin" && row.phase === "Phase 2",
      ),
    ).toEqual([{ phase: "Phase 2", series: "Metformin", trial_count: 1 }]);
    expect(VisualizationResponseSchema.parse(response)).toEqual(response);
  });
});

describe("assembleLineChartResponse", () => {
  const baseYearAggregation = [
    { year: 2020, trial_count: 2, source_nct_ids: ["NCT00000001", "NCT00000002"] },
    { year: 2021, trial_count: 0, source_nct_ids: [] },
    { year: 2022, trial_count: 0, source_nct_ids: [] },
    { year: 2023, trial_count: 1, source_nct_ids: ["NCT00000003"] },
  ];

  it("builds a drug-first title when both drug and condition are present", () => {
    const response = assembleVisualizationResponse({
      filters: {
        drug_name: "Pembrolizumab", comparison_targets: null,
        condition: "lung cancer",
        phase: null,
      sponsor: null,
      country: null,
      start_year: null,
      end_year: null,
      },
      visualizationType: "line_chart",
      aggregation: baseYearAggregation,
      fetchedStudies: 12,
      skippedMalformed: 2,
      studiesWithMultiplePhases: 0,
      truncated: false,
      studyExcerptIndex: emptyStudyExcerptIndex,
    });

    expect(response.visualization.title).toBe(
      "Trials started per year for Pembrolizumab in lung cancer",
    );
  });

  it("uses temporal year encoding and strips source_nct_ids", () => {
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
      aggregation: baseYearAggregation,
      fetchedStudies: 3,
      skippedMalformed: 0,
      studiesWithMultiplePhases: 0,
      truncated: false,
      studyExcerptIndex: emptyStudyExcerptIndex,
    });

    expect(response.visualization.type).toBe("line_chart");
    expect(response.visualization.encoding).toEqual({
      x: { field: "year", type: "temporal" },
      y: { field: "trial_count", type: "quantitative" },
    });

    if (response.visualization.type !== "line_chart") {
      throw new Error("expected line_chart");
    }

    for (const point of response.visualization.data) {
      expect(point).not.toHaveProperty("source_nct_ids");
    }

    expect(response.visualization.data).toEqual([
      { year: 2020, trial_count: 2 },
      { year: 2021, trial_count: 0 },
      { year: 2022, trial_count: 0 },
      { year: 2023, trial_count: 1 },
    ]);
    expect(VisualizationResponseSchema.parse(response)).toEqual(response);
  });
});

describe("assembleHistogramResponse", () => {
  const baseEnrollmentAggregation = ENROLLMENT_BIN_ORDER.map((bin) => ({
    bin_label: bin.bin_label,
    bin_start: bin.bin_start,
    bin_end: bin.bin_end,
    trial_count: bin.bin_label === "101–500" ? 2 : 0,
    source_nct_ids:
      bin.bin_label === "101–500" ? ["NCT00000001", "NCT00000002"] : [],
  }));

  it("builds a drug-first title when both drug and condition are present", () => {
    const response = assembleVisualizationResponse({
      filters: {
        drug_name: "Pembrolizumab", comparison_targets: null,
        condition: "lung cancer",
        phase: null,
      sponsor: null,
      country: null,
      start_year: null,
      end_year: null,
      },
      visualizationType: "histogram",
      aggregation: baseEnrollmentAggregation,
      fetchedStudies: 12,
      skippedMalformed: 2,
      studiesWithMultiplePhases: 0,
      truncated: false,
      studyExcerptIndex: emptyStudyExcerptIndex,
    });

    expect(response.visualization.title).toBe(
      "Enrollment distribution for Pembrolizumab in lung cancer",
    );
  });

  it("uses ordinal bin_label encoding and strips source_nct_ids", () => {
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
      aggregation: baseEnrollmentAggregation,
      fetchedStudies: 2,
      skippedMalformed: 0,
      studiesWithMultiplePhases: 0,
      truncated: false,
      studyExcerptIndex: emptyStudyExcerptIndex,
    });

    expect(response.visualization.type).toBe("histogram");
    expect(response.visualization.encoding).toEqual({
      x: { field: "bin_label", type: "ordinal" },
      y: { field: "trial_count", type: "quantitative" },
    });

    if (response.visualization.type !== "histogram") {
      throw new Error("expected histogram");
    }

    for (const point of response.visualization.data) {
      expect(point).not.toHaveProperty("source_nct_ids");
    }

    expect(response.visualization.data).toEqual(
      ENROLLMENT_BIN_ORDER.map((bin) => ({
        bin_label: bin.bin_label,
        bin_start: bin.bin_start,
        bin_end: bin.bin_end,
        trial_count: bin.bin_label === "101–500" ? 2 : 0,
      })),
    );
    expect(VisualizationResponseSchema.parse(response)).toEqual(response);
  });
});

describe("assembleScatterplotResponse", () => {
  const baseRelationshipAggregation = [
    { nct_id: "NCT00000001", enrollment_count: 120, year: 2020 },
    { nct_id: "NCT00000002", enrollment_count: 350, year: 2021 },
    { nct_id: "NCT00000003", enrollment_count: 80, year: 2020 },
  ];

  it("builds a drug-first title when both drug and condition are present", () => {
    const response = assembleVisualizationResponse({
      filters: {
        drug_name: "Pembrolizumab", comparison_targets: null,
        condition: "lung cancer",
        phase: null,
      sponsor: null,
      country: null,
      start_year: null,
      end_year: null,
      },
      visualizationType: "scatterplot",
      aggregation: baseRelationshipAggregation,
      fetchedStudies: 12,
      skippedMalformed: 2,
      studiesWithMultiplePhases: 0,
      truncated: false,
      studyExcerptIndex: emptyStudyExcerptIndex,
    });

    expect(response.visualization.title).toBe(
      "Enrollment vs start year for Pembrolizumab in lung cancer",
    );
  });

  it("uses quantitative/temporal encoding and preserves nct_id in data", () => {
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
      aggregation: baseRelationshipAggregation,
      fetchedStudies: 3,
      skippedMalformed: 0,
      studiesWithMultiplePhases: 0,
      truncated: false,
      studyExcerptIndex: emptyStudyExcerptIndex,
    });

    expect(response.visualization.type).toBe("scatterplot");
    expect(response.visualization.encoding).toEqual({
      x: { field: "enrollment_count", type: "quantitative" },
      y: { field: "year", type: "temporal" },
    });

    expect(response.visualization.data).toEqual(baseRelationshipAggregation);
    expect(VisualizationResponseSchema.parse(response)).toEqual(response);
  });
});

describe("assembleNetworkGraphResponse", () => {
  const baseNetworkAggregation = aggregateByNetwork(
    [validNetworkSingleInterventionStudy, validNetworkSamePairSecondStudy],
    "drug_sponsor",
    { drug_name: "Pembrolizumab" },
  );

  it("builds a drug-first title when both drug and condition are present", () => {
    const response = assembleVisualizationResponse({
      filters: {
        drug_name: "Pembrolizumab", comparison_targets: null,
        condition: "lung cancer",
        phase: null,
      sponsor: null,
      country: null,
      start_year: null,
      end_year: null,
      },
      visualizationType: "network_graph",
      networkDimension: "drug_sponsor",
      aggregation: baseNetworkAggregation,
      fetchedStudies: 12,
      skippedMalformed: 2,
      studiesWithMultiplePhases: 0,
      truncated: false,
      studyExcerptIndex: emptyStudyExcerptIndex,
    });

    expect(response.visualization.title).toBe(
      "Drug–sponsor network for Pembrolizumab in lung cancer",
    );
  });

  it("strips source_nct_ids from edges and sets meta.network_dimension", () => {
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
      aggregation: baseNetworkAggregation,
      fetchedStudies: 2,
      skippedMalformed: 0,
      studiesWithMultiplePhases: 0,
      truncated: false,
      studyExcerptIndex: emptyStudyExcerptIndex,
    });

    expect(response.visualization.type).toBe("network_graph");
    if (response.visualization.type !== "network_graph") {
      throw new Error("expected network_graph");
    }

    expect(response.visualization.encoding).toEqual({
      nodes: {
        id: { field: "id", type: "nominal" },
        label: { field: "label", type: "nominal" },
        entity_type: { field: "entity_type", type: "nominal" },
      },
      edges: {
        source: { field: "source", type: "nominal" },
        target: { field: "target", type: "nominal" },
        weight: { field: "weight", type: "quantitative" },
      },
    });

    for (const edge of response.visualization.data.edges) {
      expect(edge).not.toHaveProperty("source_nct_ids");
    }

    expect(response.visualization.data.edges).toEqual([
      {
        source: "drug:pembrolizumab",
        target: "sponsor:merck-sharp-dohme-llc",
        weight: 2,
      },
    ]);
    expect(response.meta.network_dimension).toBe("drug_sponsor");
    expect(VisualizationResponseSchema.parse(response)).toEqual(response);
  });
});
