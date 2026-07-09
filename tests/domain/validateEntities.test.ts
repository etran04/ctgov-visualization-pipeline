import { describe, expect, it } from "vitest";
import { InvalidParametersError } from "../../src/domain/errors.js";
import { validateEntities } from "../../src/domain/validateEntities.js";

describe("validateEntities", () => {
  it("trims string filters and preserves phase", () => {
    expect(
      validateEntities({
        drug_name: "  Pembrolizumab  ",
        comparison_targets: null,
        condition: "  lung cancer ",
        phase: "Phase 3",
      sponsor: null,
      country: null,
      start_year: null,
      end_year: null,
      }),
    ).toEqual({
      drug_name: "Pembrolizumab",
      comparison_targets: null,
      condition: "lung cancer",
      phase: "Phase 3",
    sponsor: null,
    country: null,
    start_year: null,
    end_year: null,
    });
  });

  it("rejects empty strings after trimming", () => {
    expect(() =>
      validateEntities({
        drug_name: "   ",
        comparison_targets: null,
        condition: null,
        phase: null,
      sponsor: null,
      country: null,
      start_year: null,
      end_year: null,
      }),
    ).toThrow(InvalidParametersError);
  });

  it("rejects all-null entities", () => {
    expect(() =>
      validateEntities({
        drug_name: null,
        comparison_targets: null,
        condition: null,
        phase: null,
      sponsor: null,
      country: null,
      start_year: null,
      end_year: null,
      }),
    ).toThrow(InvalidParametersError);
  });

  it("deduplicates comparison_targets case-insensitively", () => {
    expect(
      validateEntities({
        drug_name: null,
        comparison_targets: ["Metformin", " metformin ", "Pembrolizumab"],
        condition: null,
        phase: null,
      sponsor: null,
      country: null,
      start_year: null,
      end_year: null,
      }),
    ).toEqual({
      drug_name: null,
      comparison_targets: ["Metformin", "Pembrolizumab"],
      condition: null,
      phase: null,
    sponsor: null,
    country: null,
    start_year: null,
    end_year: null,
    });
  });

  it("rejects more than four unique comparison targets", () => {
    expect(() =>
      validateEntities({
        drug_name: null,
        comparison_targets: ["A", "B", "C", "D", "E"],
        condition: null,
        phase: null,
      sponsor: null,
      country: null,
      start_year: null,
      end_year: null,
      }),
    ).toThrow(InvalidParametersError);
  });

  it("rejects empty comparison target strings", () => {
    expect(() =>
      validateEntities({
        drug_name: null,
        comparison_targets: ["Metformin", "  "],
        condition: null,
        phase: null,
      sponsor: null,
      country: null,
      start_year: null,
      end_year: null,
      }),
    ).toThrow(InvalidParametersError);
  });

  it("rejects drug_name together with multiple comparison targets", () => {
    expect(() =>
      validateEntities({
        drug_name: "Metformin",
        comparison_targets: ["Metformin", "Pembrolizumab"],
        condition: null,
        phase: null,
      sponsor: null,
      country: null,
      start_year: null,
      end_year: null,
      }),
    ).toThrow(InvalidParametersError);
  });

  it("accepts comparison_targets alone as a valid filter", () => {
    expect(
      validateEntities({
        drug_name: null,
        comparison_targets: ["Metformin", "Pembrolizumab"],
        condition: null,
        phase: null,
      sponsor: null,
      country: null,
      start_year: null,
      end_year: null,
      }),
    ).toEqual({
      drug_name: null,
      comparison_targets: ["Metformin", "Pembrolizumab"],
      condition: null,
      phase: null,
    sponsor: null,
    country: null,
    start_year: null,
    end_year: null,
    });
  });

  it("accepts sponsor or country alone as a primary filter", () => {
    expect(
      validateEntities({
        drug_name: null,
        comparison_targets: null,
        condition: null,
        phase: null,
        sponsor: " Merck ",
        country: null,
        start_year: null,
        end_year: null,
      }),
    ).toEqual({
      drug_name: null,
      comparison_targets: null,
      condition: null,
      phase: null,
      sponsor: "Merck",
      country: null,
      start_year: null,
      end_year: null,
    });

    expect(
      validateEntities({
        drug_name: null,
        comparison_targets: null,
        condition: null,
        phase: null,
        sponsor: null,
        country: "United States",
        start_year: null,
        end_year: null,
      }),
    ).toMatchObject({ country: "United States" });
  });

  it("validates year bounds and ordering", () => {
    expect(() =>
      validateEntities({
        drug_name: "Metformin",
        comparison_targets: null,
        condition: null,
        phase: null,
        sponsor: null,
        country: null,
        start_year: 1800,
        end_year: null,
      }),
    ).toThrow(InvalidParametersError);

    expect(() =>
      validateEntities({
        drug_name: "Metformin",
        comparison_targets: null,
        condition: null,
        phase: null,
        sponsor: null,
        country: null,
        start_year: 2020,
        end_year: 2015,
      }),
    ).toThrow(InvalidParametersError);
  });

  it("rejects year-only filters without a primary filter", () => {
    expect(() =>
      validateEntities({
        drug_name: null,
        comparison_targets: null,
        condition: null,
        phase: null,
        sponsor: null,
        country: null,
        start_year: 2015,
        end_year: 2020,
      }),
    ).toThrow(InvalidParametersError);
  });
});
