import { NoAggregatableDataError } from "./errors.js";
import { mapCtgovPhaseToDomain, PHASE_BIN_ORDER, type PhaseLabel } from "./mapPhaseValues.js";

type CtgovStudyLike = {
  protocolSection?: {
    designModule?: {
      phases?: unknown;
    };
  };
};

export type PhaseAggregationResult = {
  bins: Array<{
    phase: PhaseLabel;
    trial_count: number;
  }>;
  skipped_malformed: number;
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

export function aggregateByPhase(studies: CtgovStudyLike[]): PhaseAggregationResult {
  if (studies.length === 0) {
    throw new NoAggregatableDataError("No studies were provided for aggregation");
  }

  const counts = new Map<PhaseLabel, number>(
    PHASE_BIN_ORDER.map((phase) => [phase, 0] satisfies [PhaseLabel, number]),
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

    for (const phase of mappedPhases) {
      counts.set(phase, (counts.get(phase) ?? 0) + 1);
    }
  }

  if (aggregatableStudies === 0) {
    throw new NoAggregatableDataError("No studies contained aggregatable phase data");
  }

  return {
    bins: PHASE_BIN_ORDER.map((phase) => ({
      phase,
      trial_count: counts.get(phase) ?? 0,
    })),
    skipped_malformed: skippedMalformed,
    studies_with_multiple_phases: studiesWithMultiplePhases,
  };
}
