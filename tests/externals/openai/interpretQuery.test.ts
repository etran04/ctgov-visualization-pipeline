import { describe, expect, it } from "vitest";
import { parseQueryInterpretation } from "../../../src/domain/schemas/index.js";

describe("interpretQuery interpretation shape", () => {
  it("accepts comparison intent from OpenAI flat output", () => {
    const interpretation = parseQueryInterpretation({
      intent: "comparison",
      entities: { drug_name: "Pembrolizumab", condition: null, phase: null },
      comparison_dimension: "phase",
      time_dimension: null,
      distribution_dimension: null,
      relationship_dimension: null,
      network_dimension: null,
      suggested_viz_type: "bar_chart",
    });

    expect(interpretation).toEqual({
      intent: "comparison",
      entities: { drug_name: "Pembrolizumab", condition: null, phase: null },
      comparison_dimension: "phase",
      suggested_viz_type: "bar_chart",
    });
  });

  it("accepts trend_over_time intent from OpenAI flat output", () => {
    const interpretation = parseQueryInterpretation({
      intent: "trend_over_time",
      entities: { drug_name: "Pembrolizumab", condition: null, phase: null },
      comparison_dimension: null,
      time_dimension: "start_year",
      distribution_dimension: null,
      relationship_dimension: null,
      network_dimension: null,
      suggested_viz_type: "line_chart",
    });

    expect(interpretation).toEqual({
      intent: "trend_over_time",
      entities: { drug_name: "Pembrolizumab", condition: null, phase: null },
      time_dimension: "start_year",
      suggested_viz_type: "line_chart",
    });
  });

  it("accepts distribution intent from OpenAI flat output", () => {
    const interpretation = parseQueryInterpretation({
      intent: "distribution",
      entities: { drug_name: "Pembrolizumab", condition: null, phase: null },
      comparison_dimension: null,
      time_dimension: null,
      distribution_dimension: "enrollment_count",
      relationship_dimension: null,
      network_dimension: null,
      suggested_viz_type: "histogram",
    });

    expect(interpretation).toEqual({
      intent: "distribution",
      entities: { drug_name: "Pembrolizumab", condition: null, phase: null },
      distribution_dimension: "enrollment_count",
      suggested_viz_type: "histogram",
    });
  });

  it("accepts relationship intent from OpenAI flat output", () => {
    const interpretation = parseQueryInterpretation({
      intent: "relationship",
      entities: { drug_name: "Pembrolizumab", condition: null, phase: null },
      comparison_dimension: null,
      time_dimension: null,
      distribution_dimension: null,
      relationship_dimension: "enrollment_vs_start_year",
      network_dimension: null,
      suggested_viz_type: "scatterplot",
    });

    expect(interpretation).toEqual({
      intent: "relationship",
      entities: { drug_name: "Pembrolizumab", condition: null, phase: null },
      relationship_dimension: "enrollment_vs_start_year",
      suggested_viz_type: "scatterplot",
    });
  });

  it("accepts network intent from OpenAI flat output", () => {
    const interpretation = parseQueryInterpretation({
      intent: "network",
      entities: { drug_name: "Pembrolizumab", condition: null, phase: null },
      comparison_dimension: null,
      time_dimension: null,
      distribution_dimension: null,
      relationship_dimension: null,
      network_dimension: "drug_sponsor",
      suggested_viz_type: "network_graph",
    });

    expect(interpretation).toEqual({
      intent: "network",
      entities: { drug_name: "Pembrolizumab", condition: null, phase: null },
      network_dimension: "drug_sponsor",
      suggested_viz_type: "network_graph",
    });
  });
});
