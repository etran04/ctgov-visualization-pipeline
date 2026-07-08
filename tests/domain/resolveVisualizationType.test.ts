import { describe, expect, it } from "vitest";
import { UnsupportedIntentError } from "../../src/domain/errors.js";
import { resolveVisualizationType } from "../../src/domain/resolveVisualizationType.js";

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

  it("throws for unsupported intents", () => {
    expect(() => resolveVisualizationType("relationship")).toThrow(UnsupportedIntentError);
  });
});
