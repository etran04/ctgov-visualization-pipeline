export const PHASE_BIN_ORDER = [
  "Phase 1",
  "Phase 2",
  "Phase 3",
  "Phase 4",
  "Early Phase 1",
  "Not Applicable",
] as const;

export type PhaseLabel = (typeof PHASE_BIN_ORDER)[number];

const API_TO_DOMAIN_PHASE_MAP: Record<string, PhaseLabel> = {
  PHASE1: "Phase 1",
  PHASE2: "Phase 2",
  PHASE3: "Phase 3",
  PHASE4: "Phase 4",
  EARLY_PHASE1: "Early Phase 1",
  NA: "Not Applicable",
};

const DOMAIN_TO_API_PHASE_MAP: Record<PhaseLabel, string> = {
  "Phase 1": "PHASE1",
  "Phase 2": "PHASE2",
  "Phase 3": "PHASE3",
  "Phase 4": "PHASE4",
  "Early Phase 1": "EARLY_PHASE1",
  "Not Applicable": "NA",
};

export function mapCtgovPhaseToDomain(phase: string): PhaseLabel | null {
  return API_TO_DOMAIN_PHASE_MAP[phase] ?? null;
}

export function mapDomainPhaseToCtgov(phase: string): string | null {
  return (DOMAIN_TO_API_PHASE_MAP as Record<string, string>)[phase] ?? null;
}
