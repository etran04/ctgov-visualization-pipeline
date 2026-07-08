import { describe, expect, it } from "vitest";
import { aggregateByStartYear } from "../../../src/domain/aggregations/index.js";
import { NoAggregatableDataError } from "../../../src/domain/errors.js";
import {
  malformedStudyEmptyStartDate,
  malformedStudyInvalidStartDateType,
  malformedStudyMissingStartDate,
  malformedStudyUnparseableStartDate,
  validStudyGapYearStartDate,
  validStudyIsoStartDate,
  validStudyMonthYearStartDate,
  validStudySameYearAsIso,
  validStudyYearOnlyStartDate,
} from "../../fixtures/ctgovStudies.js";

describe("aggregateByStartYear", () => {
  it("returns a single bin for one study with an ISO start date", () => {
    const result = aggregateByStartYear([validStudyIsoStartDate]);

    expect(result.bins).toEqual([
      { year: 2020, trial_count: 1, source_nct_ids: ["NCT00000101"] },
    ]);
    expect(result.skipped_malformed).toBe(0);
  });

  it("counts multiple studies in the same year", () => {
    const result = aggregateByStartYear([
      validStudyIsoStartDate,
      validStudySameYearAsIso,
    ]);

    expect(result.bins).toEqual([
      {
        year: 2020,
        trial_count: 2,
        source_nct_ids: ["NCT00000101", "NCT00000104"],
      },
    ]);
    expect(result.skipped_malformed).toBe(0);
  });

  it("parses month-year and year-only start date formats", () => {
    const result = aggregateByStartYear([
      validStudyMonthYearStartDate,
      validStudyYearOnlyStartDate,
    ]);

    expect(result.bins).toEqual([
      {
        year: 2023,
        trial_count: 2,
        source_nct_ids: ["NCT00000102", "NCT00000103"],
      },
    ]);
  });

  it("zero-fills gap years between min and max inclusive", () => {
    const result = aggregateByStartYear([
      validStudyIsoStartDate,
      validStudyGapYearStartDate,
    ]);

    expect(result.bins).toEqual([
      { year: 2020, trial_count: 1, source_nct_ids: ["NCT00000101"] },
      { year: 2021, trial_count: 0, source_nct_ids: [] },
      { year: 2022, trial_count: 0, source_nct_ids: [] },
      { year: 2023, trial_count: 1, source_nct_ids: ["NCT00000105"] },
    ]);
  });

  it("skips malformed studies and reports how many were skipped", () => {
    const result = aggregateByStartYear([
      validStudyIsoStartDate,
      malformedStudyMissingStartDate,
      malformedStudyInvalidStartDateType,
      malformedStudyUnparseableStartDate,
      malformedStudyEmptyStartDate,
    ]);

    expect(result.bins).toEqual([
      { year: 2020, trial_count: 1, source_nct_ids: ["NCT00000101"] },
    ]);
    expect(result.skipped_malformed).toBe(4);
  });

  it("throws when the input study list is empty", () => {
    expect(() => aggregateByStartYear([])).toThrow(NoAggregatableDataError);
  });

  it("throws when every study lacks a parseable start date", () => {
    expect(() =>
      aggregateByStartYear([
        malformedStudyMissingStartDate,
        malformedStudyInvalidStartDateType,
        malformedStudyUnparseableStartDate,
        malformedStudyEmptyStartDate,
      ]),
    ).toThrow(NoAggregatableDataError);
  });
});
