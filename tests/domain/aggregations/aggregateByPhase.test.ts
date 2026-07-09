import { describe, expect, it } from "vitest";
import { aggregateByPhase } from "../../../src/domain/aggregations/index.js";
import { NoAggregatableDataError } from "../../../src/domain/errors.js";
import { PHASE_BIN_ORDER } from "../../../src/domain/mappings/phases.js";
import {
  asPhaseStudy,
  malformedStudyEmptyPhases,
  malformedStudyInvalidPhasesType,
  malformedStudyMissingPhases,
  malformedStudyUnknownPhase,
  validDuplicatePhaseStudy,
  validMultiPhaseStudy,
  validSinglePhaseStudy,
} from "../../fixtures/ctgovStudies.js";

describe("aggregateByPhase", () => {
  it("returns zero-filled bins in deterministic order for single-phase studies", () => {
    const result = aggregateByPhase([validSinglePhaseStudy]);

    expect(result.bins.map((bin) => bin.phase)).toEqual(PHASE_BIN_ORDER);
    expect(result.bins).toEqual([
      { phase: "Phase 1", trial_count: 0, source_nct_ids: [] },
      { phase: "Phase 2", trial_count: 1, source_nct_ids: ["NCT00000001"] },
      { phase: "Phase 3", trial_count: 0, source_nct_ids: [] },
      { phase: "Phase 4", trial_count: 0, source_nct_ids: [] },
      { phase: "Early Phase 1", trial_count: 0, source_nct_ids: [] },
      { phase: "Not Applicable", trial_count: 0, source_nct_ids: [] },
    ]);
    expect(result.skipped_malformed).toBe(0);
    expect(result.studies_with_multiple_phases).toBe(0);
  });

  it("counts multi-phase studies in every applicable phase bin once", () => {
    const result = aggregateByPhase([validMultiPhaseStudy, validDuplicatePhaseStudy]);

    expect(result.bins).toEqual([
      { phase: "Phase 1", trial_count: 2, source_nct_ids: ["NCT00000002", "NCT00000003"] },
      { phase: "Phase 2", trial_count: 0, source_nct_ids: [] },
      { phase: "Phase 3", trial_count: 1, source_nct_ids: ["NCT00000002"] },
      { phase: "Phase 4", trial_count: 0, source_nct_ids: [] },
      { phase: "Early Phase 1", trial_count: 0, source_nct_ids: [] },
      { phase: "Not Applicable", trial_count: 0, source_nct_ids: [] },
    ]);
    expect(result.studies_with_multiple_phases).toBe(1);
  });

  it("skips malformed studies and reports how many were skipped", () => {
    const result = aggregateByPhase([
      validSinglePhaseStudy,
      asPhaseStudy(malformedStudyMissingPhases),
      asPhaseStudy(malformedStudyInvalidPhasesType),
      malformedStudyUnknownPhase,
      malformedStudyEmptyPhases,
    ]);

    expect(result.bins).toEqual([
      { phase: "Phase 1", trial_count: 0, source_nct_ids: [] },
      { phase: "Phase 2", trial_count: 1, source_nct_ids: ["NCT00000001"] },
      { phase: "Phase 3", trial_count: 0, source_nct_ids: [] },
      { phase: "Phase 4", trial_count: 0, source_nct_ids: [] },
      { phase: "Early Phase 1", trial_count: 0, source_nct_ids: [] },
      { phase: "Not Applicable", trial_count: 0, source_nct_ids: [] },
    ]);
    expect(result.skipped_malformed).toBe(4);
  });

  it("throws when the input study list is empty", () => {
    expect(() => aggregateByPhase([])).toThrow(NoAggregatableDataError);
  });

  it("throws when every study is malformed or unmappable", () => {
    expect(() =>
      aggregateByPhase([
        asPhaseStudy(malformedStudyMissingPhases),
        asPhaseStudy(malformedStudyInvalidPhasesType),
        malformedStudyUnknownPhase,
        malformedStudyEmptyPhases,
      ]),
    ).toThrow(NoAggregatableDataError);
  });
});
