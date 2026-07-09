import { describe, expect, it } from "vitest";
import { resolveVisualizationType } from "../../../src/domain/intents/visualizationType.js";

describe("resolveVisualizationType", () => {
  it("maps comparison intent to a bar chart", () => {
    expect(resolveVisualizationType("comparison")).toBe("bar_chart");
  });

  it("maps grouped comparison mode to a grouped bar chart", () => {
    expect(
      resolveVisualizationType("comparison", {
        comparisonMode: {
          kind: "grouped",
          targets: ["Metformin", "Pembrolizumab"],
          sharedFilters: { condition: null, phase: null, sponsor: null, country: null, start_year: null, end_year: null },
        },
      }),
    ).toBe("grouped_bar_chart");
  });

  it("maps single comparison mode to a bar chart", () => {
    expect(
      resolveVisualizationType("comparison", {
        comparisonMode: {
          kind: "single",
          entities: {
            drug_name: "Metformin",
            comparison_targets: null,
            condition: null,
            phase: null,
          sponsor: null,
          country: null,
          start_year: null,
          end_year: null,
          },
        },
      }),
    ).toBe("bar_chart");
  });

  it("maps trend_over_time intent to a line chart", () => {
    expect(resolveVisualizationType("trend_over_time")).toBe("line_chart");
  });

  it("maps distribution intent to a histogram", () => {
    expect(resolveVisualizationType("distribution")).toBe("histogram");
  });

  it("maps relationship intent to a scatterplot", () => {
    expect(resolveVisualizationType("relationship")).toBe("scatterplot");
  });

  it("maps network intent to a network graph", () => {
    expect(resolveVisualizationType("network")).toBe("network_graph");
  });
});
