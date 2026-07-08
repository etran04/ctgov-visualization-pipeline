import { describe, expect, it } from "vitest";
import { VisualizationResponseSchema } from "../../src/domain/schemas/index.js";
import { assembleVisualizationResponse } from "../../src/domain/assembleVisualizationResponse.js";
import { PHASE_BIN_ORDER } from "../../src/domain/mapPhaseValues.js";

const baseAggregation = PHASE_BIN_ORDER.map((phase) => ({
  phase,
  trial_count: phase === "Phase 2" ? 3 : 0,
  source_nct_ids: phase === "Phase 2" ? ["NCT00000001", "NCT00000002", "NCT00000003"] : [],
}));

describe("assembleVisualizationResponse", () => {
  it("builds a drug-first title when both drug and condition are present", () => {
    const response = assembleVisualizationResponse({
      filters: {
        drug_name: "Pembrolizumab",
        condition: "lung cancer",
        phase: null,
      },
      visualizationType: "bar_chart",
      aggregation: baseAggregation,
      fetchedStudies: 12,
      skippedMalformed: 2,
      studiesWithMultiplePhases: 1,
      truncated: false,
    });

    expect(response.visualization.title).toBe(
      "Trial phases for Pembrolizumab in lung cancer",
    );
  });

  it("builds a condition-only title when only condition is present", () => {
    const response = assembleVisualizationResponse({
      filters: {
        drug_name: null,
        condition: "melanoma",
        phase: null,
      },
      visualizationType: "bar_chart",
      aggregation: baseAggregation,
      fetchedStudies: 6,
      skippedMalformed: 0,
      studiesWithMultiplePhases: 0,
      truncated: false,
    });

    expect(response.visualization.title).toBe("Trial phases for melanoma");
  });

  it("strips source_nct_ids from the HTTP response payload", () => {
    const response = assembleVisualizationResponse({
      filters: {
        drug_name: "Pembrolizumab",
        condition: null,
        phase: null,
      },
      visualizationType: "bar_chart",
      aggregation: baseAggregation,
      fetchedStudies: 3,
      skippedMalformed: 0,
      studiesWithMultiplePhases: 0,
      truncated: false,
    });

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
        drug_name: null,
        condition: null,
        phase: "Phase 1",
      },
      visualizationType: "bar_chart",
      aggregation: [],
      fetchedStudies: 100,
      skippedMalformed: 4,
      studiesWithMultiplePhases: 9,
      truncated: true,
    });

    expect(response.visualization.data).toEqual([]);
    expect(response.meta.truncated).toBe(true);
    expect(VisualizationResponseSchema.parse(response)).toEqual(response);
  });
});
