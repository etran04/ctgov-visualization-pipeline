import { describe, expect, it } from "vitest";
import { mapQueryParams } from "../../../src/externals/ctgov/mapQueryParams.js";
import type { ValidatedEntities } from "../../../src/domain/validateEntities.js";

const baseEntities: ValidatedEntities = {
  drug_name: null,
  comparison_targets: null,
  condition: null,
  phase: null,
  sponsor: null,
  country: null,
  start_year: null,
  end_year: null,
};

describe("mapQueryParams", () => {
  it("maps drug, condition, and phase filters", () => {
    expect(
      mapQueryParams({
        ...baseEntities,
        drug_name: "Pembrolizumab",
        condition: "melanoma",
        phase: "Phase 3",
      }),
    ).toEqual({
      "query.intr": "Pembrolizumab",
      "query.cond": "melanoma",
      "filter.phase": "PHASE3",
    });
  });

  it("maps sponsor and country filters", () => {
    expect(
      mapQueryParams({
        ...baseEntities,
        sponsor: "Merck",
        country: "United States",
        condition: "melanoma",
      }),
    ).toEqual({
      "query.cond": "melanoma",
      "query.spons": "Merck",
      "query.locn": "United States",
    });
  });

  it("maps start and end year filters to filter.advanced", () => {
    expect(
      mapQueryParams({
        ...baseEntities,
        drug_name: "Metformin",
        start_year: 2015,
        end_year: 2020,
      }),
    ).toEqual({
      "query.intr": "Metformin",
      "filter.advanced": "AREA[StartDate]RANGE[2015-01-01,2020-12-31]",
    });
  });

  it("maps open-ended start year only", () => {
    expect(
      mapQueryParams({
        ...baseEntities,
        condition: "diabetes",
        start_year: 2018,
      }),
    ).toEqual({
      "query.cond": "diabetes",
      "filter.advanced": "AREA[StartDate]RANGE[2018-01-01,MAX]",
    });
  });
});
