import { describe, expect, it } from "vitest";
import { VisualizationResponseSchema } from "../../src/domain/schemas.js";
import { assembleVisualizationResponse } from "../../src/domain/assembleVisualizationResponse.js";
import { PHASE_BIN_ORDER } from "../../src/domain/mapPhaseValues.js";

const baseAggregation = PHASE_BIN_ORDER.map((phase) => ({
  phase,
  trial_count: phase === "Phase 2" ? 3 : 0,
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
