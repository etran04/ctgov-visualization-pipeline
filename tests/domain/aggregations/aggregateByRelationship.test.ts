import { describe, expect, it } from "vitest";
import { aggregateByRelationship } from "../../../src/domain/aggregations/index.js";
import { NoAggregatableDataError } from "../../../src/domain/errors.js";
import {
  asRelationshipStudy,
  malformedRelationshipStudyMissingEnrollment,
  malformedRelationshipStudyMissingStartDate,
  malformedRelationshipStudyUnparseableStartDate,
  malformedRelationshipStudyZeroEnrollment,
  validRelationshipStudy,
  validRelationshipStudyMonthYearDate,
  validRelationshipStudySameYearHigherEnrollment,
  validRelationshipStudySameYearLowerEnrollment,
  validRelationshipStudySecondYear,
} from "../../fixtures/ctgovStudies.js";

describe("aggregateByRelationship", () => {
  it("returns a single point for one valid study", () => {
    const result = aggregateByRelationship([validRelationshipStudy]);

    expect(result.points).toEqual([
      { nct_id: "NCT00000301", enrollment_count: 120, year: 2020 },
    ]);
    expect(result.skipped_malformed).toBe(0);
  });

  it("returns one point per valid study across multiple studies", () => {
    const result = aggregateByRelationship([
      validRelationshipStudy,
      validRelationshipStudySecondYear,
      validRelationshipStudyMonthYearDate,
    ]);

    expect(result.points).toEqual([
      { nct_id: "NCT00000301", enrollment_count: 120, year: 2020 },
      { nct_id: "NCT00000302", enrollment_count: 75, year: 2021 },
      { nct_id: "NCT00000305", enrollment_count: 300, year: 2023 },
    ]);
    expect(result.skipped_malformed).toBe(0);
  });

  it("skips studies with missing enrollment", () => {
    const result = aggregateByRelationship([
      validRelationshipStudy,
      asRelationshipStudy(malformedRelationshipStudyMissingEnrollment),
      malformedRelationshipStudyZeroEnrollment,
    ]);

    expect(result.points).toEqual([
      { nct_id: "NCT00000301", enrollment_count: 120, year: 2020 },
    ]);
    expect(result.skipped_malformed).toBe(2);
  });

  it("skips studies with missing or unparseable start date", () => {
    const result = aggregateByRelationship([
      validRelationshipStudy,
      asRelationshipStudy(malformedRelationshipStudyMissingStartDate),
      malformedRelationshipStudyUnparseableStartDate,
    ]);

    expect(result.points).toEqual([
      { nct_id: "NCT00000301", enrollment_count: 120, year: 2020 },
    ]);
    expect(result.skipped_malformed).toBe(2);
  });

  it("sorts points deterministically by year, enrollment, then nct_id", () => {
    const result = aggregateByRelationship([
      validRelationshipStudySecondYear,
      validRelationshipStudySameYearHigherEnrollment,
      validRelationshipStudySameYearLowerEnrollment,
      validRelationshipStudy,
    ]);

    expect(result.points).toEqual([
      { nct_id: "NCT00000303", enrollment_count: 50, year: 2020 },
      { nct_id: "NCT00000301", enrollment_count: 120, year: 2020 },
      { nct_id: "NCT00000304", enrollment_count: 200, year: 2020 },
      { nct_id: "NCT00000302", enrollment_count: 75, year: 2021 },
    ]);
  });

  it("throws when the input study list is empty", () => {
    expect(() => aggregateByRelationship([])).toThrow(NoAggregatableDataError);
  });

  it("throws when every study is malformed or unmappable", () => {
    expect(() =>
      aggregateByRelationship([
        asRelationshipStudy(malformedRelationshipStudyMissingEnrollment),
        asRelationshipStudy(malformedRelationshipStudyMissingStartDate),
        malformedRelationshipStudyZeroEnrollment,
        malformedRelationshipStudyUnparseableStartDate,
      ]),
    ).toThrow(NoAggregatableDataError);
  });
});
