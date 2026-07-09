import { describe, expect, it } from "vitest";
import { buildStartDateRangeFilter } from "../../../src/externals/ctgov/buildStartDateRangeFilter.js";

describe("buildStartDateRangeFilter", () => {
  it("returns null when both years are null", () => {
    expect(buildStartDateRangeFilter(null, null)).toBeNull();
  });

  it("builds a lower-bounded range when only start_year is set", () => {
    expect(buildStartDateRangeFilter(2015, null)).toBe(
      "AREA[StartDate]RANGE[2015-01-01,MAX]",
    );
  });

  it("builds an upper-bounded range when only end_year is set", () => {
    expect(buildStartDateRangeFilter(null, 2020)).toBe(
      "AREA[StartDate]RANGE[MIN,2020-12-31]",
    );
  });

  it("builds a closed range when both years are set", () => {
    expect(buildStartDateRangeFilter(2015, 2020)).toBe(
      "AREA[StartDate]RANGE[2015-01-01,2020-12-31]",
    );
  });
});
