import { describe, expect, it } from "vitest";
import { NoAggregatableDataError } from "../../src/domain/errors.js";
import { aggregateByPhase } from "../../src/domain/aggregateByPhase.js";
import { PHASE_BIN_ORDER } from "../../src/domain/mapPhaseValues.js";
import {
  malformedStudyEmptyPhases,
  malformedStudyInvalidPhasesType,
  malformedStudyMissingPhases,
  malformedStudyUnknownPhase,
  validDuplicatePhaseStudy,
  validMultiPhaseStudy,
  validSinglePhaseStudy,
} from "../fixtures/ctgovStudies.js";

describe("aggregateByPhase", () => {
  it("returns zero-filled bins in deterministic order for single-phase studies", () => {
    const result = aggregateByPhase([validSinglePhaseStudy]);

    expect(result.bins.map((bin) => bin.phase)).toEqual(PHASE_BIN_ORDER);
    expect(result.bins).toEqual([
      { phase: "Phase 1", trial_count: 0 },
      { phase: "Phase 2", trial_count: 1 },
      { phase: "Phase 3", trial_count: 0 },
      { phase: "Phase 4", trial_count: 0 },
      { phase: "Early Phase 1", trial_count: 0 },
      { phase: "Not Applicable", trial_count: 0 },
    ]);
    expect(result.skipped_malformed).toBe(0);
    expect(result.studies_with_multiple_phases).toBe(0);
  });

  it("counts multi-phase studies in every applicable phase bin once", () => {
    const result = aggregateByPhase([validMultiPhaseStudy, validDuplicatePhaseStudy]);

    expect(result.bins).toEqual([
      { phase: "Phase 1", trial_count: 2 },
      { phase: "Phase 2", trial_count: 0 },
      { phase: "Phase 3", trial_count: 1 },
      { phase: "Phase 4", trial_count: 0 },
      { phase: "Early Phase 1", trial_count: 0 },
      { phase: "Not Applicable", trial_count: 0 },
    ]);
    expect(result.studies_with_multiple_phases).toBe(1);
  });

  it("skips malformed studies and reports how many were skipped", () => {
    const result = aggregateByPhase([
      validSinglePhaseStudy,
      malformedStudyMissingPhases,
      malformedStudyInvalidPhasesType,
      malformedStudyUnknownPhase,
      malformedStudyEmptyPhases,
    ]);

    expect(result.bins).toEqual([
      { phase: "Phase 1", trial_count: 0 },
      { phase: "Phase 2", trial_count: 1 },
      { phase: "Phase 3", trial_count: 0 },
      { phase: "Phase 4", trial_count: 0 },
      { phase: "Early Phase 1", trial_count: 0 },
      { phase: "Not Applicable", trial_count: 0 },
    ]);
    expect(result.skipped_malformed).toBe(4);
  });

  it("throws when the input study list is empty", () => {
    expect(() => aggregateByPhase([])).toThrow(NoAggregatableDataError);
  });

  it("throws when every study is malformed or unmappable", () => {
    expect(() =>
      aggregateByPhase([
        malformedStudyMissingPhases,
        malformedStudyInvalidPhasesType,
        malformedStudyUnknownPhase,
        malformedStudyEmptyPhases,
      ]),
    ).toThrow(NoAggregatableDataError);
  });
});
