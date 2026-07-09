import { describe, expect, it } from "vitest";
import { InvalidParametersError } from "../../src/domain/errors.js";
import { resolveComparisonMode } from "../../src/domain/resolveComparisonMode.js";
import { validateEntities } from "../../src/domain/validateEntities.js";

describe("resolveComparisonMode", () => {
  it("returns grouped mode for 2–4 comparison targets", () => {
    const entities = validateEntities({
      drug_name: null,
      comparison_targets: ["Metformin", "Pembrolizumab"],
      condition: "diabetes",
      phase: null,
    });

    expect(resolveComparisonMode(entities)).toEqual({
      kind: "grouped",
      targets: ["Metformin", "Pembrolizumab"],
      sharedFilters: {
        condition: "diabetes",
        phase: null,
      },
    });
  });

  it("returns single mode using drug_name", () => {
    const entities = validateEntities({
      drug_name: "Metformin",
      comparison_targets: null,
      condition: null,
      phase: null,
    });

    expect(resolveComparisonMode(entities)).toEqual({
      kind: "single",
      entities: {
        drug_name: "Metformin",
        comparison_targets: null,
        condition: null,
        phase: null,
      },
    });
  });

  it("returns single mode using a sole comparison target as drug_name", () => {
    const entities = validateEntities({
      drug_name: null,
      comparison_targets: ["Metformin"],
      condition: null,
      phase: null,
    });

    expect(resolveComparisonMode(entities)).toEqual({
      kind: "single",
      entities: {
        drug_name: "Metformin",
        comparison_targets: null,
        condition: null,
        phase: null,
      },
    });
  });

  it("prefers drug_name over a sole comparison target in single mode", () => {
    const entities = validateEntities({
      drug_name: "Metformin",
      comparison_targets: ["Pembrolizumab"],
      condition: null,
      phase: null,
    });

    expect(resolveComparisonMode(entities)).toEqual({
      kind: "single",
      entities: {
        drug_name: "Metformin",
        comparison_targets: null,
        condition: null,
        phase: null,
      },
    });
  });

  it("rejects grouped mode when drug_name is also set", () => {
    expect(() =>
      validateEntities({
        drug_name: "Metformin",
        comparison_targets: ["Metformin", "Pembrolizumab"],
        condition: null,
        phase: null,
      }),
    ).toThrow(InvalidParametersError);
  });
});
