import { describe, expect, it } from "vitest";
import { parseQueryInterpretation } from "../../../src/domain/schemas/index.js";

describe("interpretQuery interpretation shape", () => {
  it("accepts comparison intent from OpenAI flat output", () => {
    const interpretation = parseQueryInterpretation({
      intent: "comparison",
      entities: { drug_name: "Pembrolizumab", condition: null, phase: null },
      comparison_dimension: "phase",
      time_dimension: null,
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
      suggested_viz_type: "line_chart",
    });

    expect(interpretation).toEqual({
      intent: "trend_over_time",
      entities: { drug_name: "Pembrolizumab", condition: null, phase: null },
      time_dimension: "start_year",
      suggested_viz_type: "line_chart",
    });
  });
});
