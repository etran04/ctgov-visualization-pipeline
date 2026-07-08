import type { CtgovStudyLike, PhaseAggregationBin } from "./types.js";
import { NoAggregatableDataError } from "../errors.js";
import { mapCtgovPhaseToDomain, PHASE_BIN_ORDER, type PhaseLabel } from "../mapPhaseValues.js";

/** Output of deterministic phase-bin aggregation. */
export type PhaseAggregationResult = {
  /** All phase bins in stable order, zero-filled where count is 0. */
  bins: PhaseAggregationBin[];
  /** Studies skipped due to missing or unmappable phase data. */
  skipped_malformed: number;
  /** Studies counted in more than one phase bin. */
  studies_with_multiple_phases: number;
};

function extractMappedPhases(study: CtgovStudyLike): PhaseLabel[] | null {
  const rawPhases = study.protocolSection?.designModule?.phases;
  if (!Array.isArray(rawPhases)) {
    return null;
  }

  const mapped = rawPhases
    .filter((phase): phase is string => typeof phase === "string")
    .map((phase) => mapCtgovPhaseToDomain(phase))
    .filter((phase): phase is PhaseLabel => phase !== null);

  if (mapped.length === 0) {
    return null;
  }

  return [...new Set(mapped)];
}

/**
 * Count trials per phase bin from CT.gov study records.
 *
 * Reads phases from `designModule.phases` only. Multi-phase studies are
 * counted in every applicable bin. `source_nct_ids` is kept internal for
 * future citation work and is stripped at HTTP assembly.
 *
 * @throws {NoAggregatableDataError} When input is empty or every study is skipped.
 */
export function aggregateByPhase(studies: CtgovStudyLike[]): PhaseAggregationResult {
  if (studies.length === 0) {
    throw new NoAggregatableDataError("No studies were provided for aggregation");
  }

  const counts = new Map<PhaseLabel, number>(
    PHASE_BIN_ORDER.map((phase) => [phase, 0] satisfies [PhaseLabel, number]),
  );
  const sourceNctIds = new Map<PhaseLabel, string[]>(
    PHASE_BIN_ORDER.map((phase) => [phase, []] satisfies [PhaseLabel, string[]]),
  );

  let skippedMalformed = 0;
  let studiesWithMultiplePhases = 0;
  let aggregatableStudies = 0;

  for (const study of studies) {
    const mappedPhases = extractMappedPhases(study);
    if (mappedPhases === null) {
      skippedMalformed += 1;
      continue;
    }

    aggregatableStudies += 1;
    if (mappedPhases.length > 1) {
      studiesWithMultiplePhases += 1;
    }

    const nctId = study.protocolSection?.identificationModule?.nctId;
    const sourceId = typeof nctId === "string" ? nctId : null;

    for (const phase of mappedPhases) {
      counts.set(phase, (counts.get(phase) ?? 0) + 1);
      if (sourceId !== null) {
        sourceNctIds.get(phase)?.push(sourceId);
      }
    }
  }

  if (aggregatableStudies === 0) {
    throw new NoAggregatableDataError("No studies contained aggregatable phase data");
  }

  return {
    bins: PHASE_BIN_ORDER.map((phase) => ({
      phase,
      trial_count: counts.get(phase) ?? 0,
      source_nct_ids: sourceNctIds.get(phase) ?? [],
    })),
    skipped_malformed: skippedMalformed,
    studies_with_multiple_phases: studiesWithMultiplePhases,
  };
}
