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

  it("throws for unsupported intents", () => {
    expect(() =>
      resolveVisualizationType("distribution" as never),
    ).toThrow(UnsupportedIntentError);
  });
});
