import { describe, expect, it } from "vitest";
import { aggregateByEnrollment } from "../../../src/domain/aggregations/index.js";
import { NoAggregatableDataError } from "../../../src/domain/errors.js";
import { ENROLLMENT_BIN_ORDER } from "../../../src/domain/mappings/enrollmentBins.js";
import {
  asDistributionStudy,
  malformedStudyInvalidEnrollmentType,
  malformedStudyMissingEnrollment,
  malformedStudyNegativeEnrollment,
  malformedStudyNonIntegerEnrollment,
  malformedStudyZeroEnrollment,
  validEnrollmentBoundary5000Study,
  validEnrollmentBoundary5001Study,
  validEnrollmentBoundary50Study,
  validEnrollmentBoundary51Study,
  validEnrollmentLargeStudy,
  validEnrollmentMidStudy,
  validEnrollmentSameBinStudy,
  validEnrollmentSmallStudy,
} from "../../fixtures/ctgovStudies.js";

const zeroFilledBins = ENROLLMENT_BIN_ORDER.map((bin) => ({
  bin_label: bin.bin_label,
  bin_start: bin.bin_start,
  bin_end: bin.bin_end,
  trial_count: 0,
  source_nct_ids: [],
}));

describe("aggregateByEnrollment", () => {
  it("returns zero-filled bins in deterministic order for a single study", () => {
    const result = aggregateByEnrollment([validEnrollmentSmallStudy]);

    expect(result.bins.map((bin) => bin.bin_label)).toEqual(
      ENROLLMENT_BIN_ORDER.map((bin) => bin.bin_label),
    );
    expect(result.bins).toEqual([
      { bin_label: "1–50", bin_start: 1, bin_end: 50, trial_count: 1, source_nct_ids: ["NCT00000201"] },
      ...zeroFilledBins.slice(1),
    ]);
    expect(result.skipped_malformed).toBe(0);
  });

  it("counts multiple studies in the same bin", () => {
    const result = aggregateByEnrollment([validEnrollmentSmallStudy, validEnrollmentSameBinStudy]);

    expect(result.bins[0]).toEqual({
      bin_label: "1–50",
      bin_start: 1,
      bin_end: 50,
      trial_count: 2,
      source_nct_ids: ["NCT00000201", "NCT00000208"],
    });
  });

  it("assigns boundary values to the correct bins", () => {
    const result = aggregateByEnrollment([
      validEnrollmentBoundary50Study,
      validEnrollmentBoundary51Study,
      validEnrollmentBoundary5000Study,
      validEnrollmentBoundary5001Study,
    ]);

    expect(result.bins).toEqual([
      { bin_label: "1–50", bin_start: 1, bin_end: 50, trial_count: 1, source_nct_ids: ["NCT00000203"] },
      { bin_label: "51–100", bin_start: 51, bin_end: 100, trial_count: 1, source_nct_ids: ["NCT00000204"] },
      { bin_label: "101–500", bin_start: 101, bin_end: 500, trial_count: 0, source_nct_ids: [] },
      { bin_label: "501–1,000", bin_start: 501, bin_end: 1000, trial_count: 0, source_nct_ids: [] },
      {
        bin_label: "1,001–5,000",
        bin_start: 1001,
        bin_end: 5000,
        trial_count: 1,
        source_nct_ids: ["NCT00000206"],
      },
      { bin_label: "5,001+", bin_start: 5001, bin_end: null, trial_count: 1, source_nct_ids: ["NCT00000207"] },
    ]);
  });

  it("distributes studies across multiple bins", () => {
    const result = aggregateByEnrollment([
      validEnrollmentSmallStudy,
      validEnrollmentMidStudy,
      validEnrollmentLargeStudy,
    ]);

    expect(result.bins.map((bin) => bin.trial_count)).toEqual([1, 1, 0, 0, 0, 1]);
    expect(result.bins[0]?.source_nct_ids).toEqual(["NCT00000201"]);
    expect(result.bins[1]?.source_nct_ids).toEqual(["NCT00000202"]);
    expect(result.bins[5]?.source_nct_ids).toEqual(["NCT00000205"]);
  });

  it("skips malformed studies and reports how many were skipped", () => {
    const result = aggregateByEnrollment([
      validEnrollmentSmallStudy,
      asDistributionStudy(malformedStudyMissingEnrollment),
      asDistributionStudy(malformedStudyInvalidEnrollmentType),
      malformedStudyZeroEnrollment,
      malformedStudyNegativeEnrollment,
      malformedStudyNonIntegerEnrollment,
    ]);

    expect(result.bins[0]?.trial_count).toBe(1);
    expect(result.skipped_malformed).toBe(5);
  });

  it("throws when the input study list is empty", () => {
    expect(() => aggregateByEnrollment([])).toThrow(NoAggregatableDataError);
  });

  it("throws when every study is malformed or unmappable", () => {
    expect(() =>
      aggregateByEnrollment([
        asDistributionStudy(malformedStudyMissingEnrollment),
        asDistributionStudy(malformedStudyInvalidEnrollmentType),
        malformedStudyZeroEnrollment,
        malformedStudyNegativeEnrollment,
        malformedStudyNonIntegerEnrollment,
      ]),
    ).toThrow(NoAggregatableDataError);
  });
});
