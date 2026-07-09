import { describe, expect, it } from "vitest";
import { aggregateGroupedByPhase } from "../../../src/domain/aggregations/aggregateGroupedByPhase.js";
import { NoAggregatableDataError } from "../../../src/domain/errors.js";
import { PHASE_BIN_ORDER } from "../../../src/domain/mappings/phases.js";
import {
  asPhaseStudy,
  malformedStudyMissingPhases,
  validMultiPhaseStudy,
  validSinglePhaseStudy,
} from "../../fixtures/ctgovStudies.js";

describe("aggregateGroupedByPhase", () => {
  it("returns long-format rows with per-series counts and zero-fill across all phase bins", () => {
    const result = aggregateGroupedByPhase([
      { series: "Metformin", studies: [validSinglePhaseStudy] },
      { series: "Pembrolizumab", studies: [validMultiPhaseStudy] },
    ]);

    expect(result.rows).toHaveLength(PHASE_BIN_ORDER.length * 2);
    expect(result.rows.map((row) => row.phase)).toEqual(
      PHASE_BIN_ORDER.flatMap((phase) => [phase, phase]),
    );
    expect(result.rows.map((row) => row.series)).toEqual(
      PHASE_BIN_ORDER.flatMap(() => ["Metformin", "Pembrolizumab"]),
    );

    expect(
      result.rows.filter((row) => row.series === "Metformin" && row.phase === "Phase 2"),
    ).toEqual([
      {
        phase: "Phase 2",
        series: "Metformin",
        trial_count: 1,
        source_nct_ids: ["NCT00000001"],
      },
    ]);
    expect(
      result.rows.filter((row) => row.series === "Pembrolizumab" && row.phase === "Phase 1"),
    ).toEqual([
      {
        phase: "Phase 1",
        series: "Pembrolizumab",
        trial_count: 1,
        source_nct_ids: ["NCT00000002"],
      },
    ]);
    expect(
      result.rows.filter((row) => row.series === "Pembrolizumab" && row.phase === "Phase 3"),
    ).toEqual([
      {
        phase: "Phase 3",
        series: "Pembrolizumab",
        trial_count: 1,
        source_nct_ids: ["NCT00000002"],
      },
    ]);
    expect(result.rows.every((row) => row.trial_count >= 0)).toBe(true);
    expect(result.skipped_malformed).toBe(0);
    expect(result.studies_with_multiple_phases).toBe(1);
  });

  it("zero-fills a series with no studies while preserving counts for other series", () => {
    const result = aggregateGroupedByPhase([
      { series: "Metformin", studies: [] },
      { series: "Pembrolizumab", studies: [validSinglePhaseStudy] },
    ]);

    const metforminRows = result.rows.filter((row) => row.series === "Metformin");
    expect(metforminRows).toHaveLength(PHASE_BIN_ORDER.length);
    expect(metforminRows.every((row) => row.trial_count === 0)).toBe(true);
    expect(metforminRows.every((row) => row.source_nct_ids.length === 0)).toBe(true);

    const pembrolizumabPhase2 = result.rows.find(
      (row) => row.series === "Pembrolizumab" && row.phase === "Phase 2",
    );
    expect(pembrolizumabPhase2).toEqual({
      phase: "Phase 2",
      series: "Pembrolizumab",
      trial_count: 1,
      source_nct_ids: ["NCT00000001"],
    });
  });

  it("zero-fills a series when every study is malformed", () => {
    const result = aggregateGroupedByPhase([
      {
        series: "Metformin",
        studies: [asPhaseStudy(malformedStudyMissingPhases)],
      },
      { series: "Pembrolizumab", studies: [validSinglePhaseStudy] },
    ]);

    const metforminRows = result.rows.filter((row) => row.series === "Metformin");
    expect(metforminRows.every((row) => row.trial_count === 0)).toBe(true);
    expect(result.skipped_malformed).toBe(1);
  });

  it("throws when no series are provided", () => {
    expect(() => aggregateGroupedByPhase([])).toThrow(NoAggregatableDataError);
  });

  it("throws when every series lacks aggregatable phase data", () => {
    expect(() =>
      aggregateGroupedByPhase([
        { series: "Metformin", studies: [] },
        { series: "Pembrolizumab", studies: [] },
      ]),
    ).toThrow(NoAggregatableDataError);

    expect(() =>
      aggregateGroupedByPhase([
        {
          series: "Metformin",
          studies: [asPhaseStudy(malformedStudyMissingPhases)],
        },
        {
          series: "Pembrolizumab",
          studies: [asPhaseStudy(malformedStudyMissingPhases)],
        },
      ]),
    ).toThrow(NoAggregatableDataError);
  });
});
