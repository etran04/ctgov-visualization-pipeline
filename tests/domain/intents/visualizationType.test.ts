import { describe, expect, it } from "vitest";
import { resolveVisualizationType } from "../../../src/domain/intents/visualizationType.js";

describe("resolveVisualizationType", () => {
  it("maps comparison intent to a bar chart", () => {
    expect(resolveVisualizationType("comparison")).toBe("bar_chart");
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
