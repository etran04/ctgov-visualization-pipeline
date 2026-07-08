import { describe, expect, it } from "vitest";
import { InvalidParametersError } from "../../src/domain/errors.js";
import { validateEntities } from "../../src/domain/validateEntities.js";

describe("validateEntities", () => {
  it("trims string filters and preserves phase", () => {
    expect(
      validateEntities({
        drug_name: "  Pembrolizumab  ",
        condition: "  lung cancer ",
        phase: "Phase 3",
      }),
    ).toEqual({
      drug_name: "Pembrolizumab",
      condition: "lung cancer",
      phase: "Phase 3",
    });
  });

  it("rejects empty strings after trimming", () => {
    expect(() =>
      validateEntities({
        drug_name: "   ",
        condition: null,
        phase: null,
      }),
    ).toThrow(InvalidParametersError);
  });

  it("rejects all-null entities", () => {
    expect(() =>
      validateEntities({
        drug_name: null,
        condition: null,
        phase: null,
      }),
    ).toThrow(InvalidParametersError);
  });
});
