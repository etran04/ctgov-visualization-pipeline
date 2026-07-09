import { describe, expect, it } from "vitest";
import { MAX_CITATIONS_PER_DATUM } from "../../../src/domain/citations/buildCitations.js";
import { buildAssumptions } from "../../../src/domain/meta/buildAssumptions.js";

describe("buildAssumptions", () => {
  it("includes baseline interpretation and citation policy", () => {
    const assumptions = buildAssumptions({
      visualizationType: "bar_chart",
      truncated: false,
      skippedMalformed: 0,
      studiesWithMultiplePhases: 0,
    });

    expect(assumptions[0]).toContain("LLM");
    expect(assumptions[1]).toContain(String(MAX_CITATIONS_PER_DATUM));
  });

  it("adds grouped comparison and truncation notes when applicable", () => {
    const assumptions = buildAssumptions({
      visualizationType: "grouped_bar_chart",
      truncated: true,
      skippedMalformed: 2,
      studiesWithMultiplePhases: 1,
      comparisonTargets: ["Metformin", "Pembrolizumab"],
    });

    expect(assumptions.some((note) => note.includes("Compared 2 drugs"))).toBe(true);
    expect(assumptions.some((note) => note.includes("pagination limit"))).toBe(true);
    expect(assumptions.some((note) => note.includes("skipped"))).toBe(true);
    expect(assumptions.some((note) => note.includes("multiple phases"))).toBe(true);
  });
});
