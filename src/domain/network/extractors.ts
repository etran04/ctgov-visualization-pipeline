import type { NetworkStudyRecord } from "./types.js";

/** Pull non-empty intervention names from a normalized network study. */
export function extractInterventions(study: NetworkStudyRecord): string[] | null {
  const interventions = study.protocolSection.armsInterventionsModule.interventions;
  if (!Array.isArray(interventions) || interventions.length === 0) {
    return null;
  }

  const names = interventions
    .map((intervention) =>
      typeof intervention.name === "string" ? intervention.name.trim() : "",
    )
    .filter((name) => name.length > 0);

  return names.length > 0 ? names : null;
}

/** Pull the lead sponsor name from a normalized network study. */
export function extractLeadSponsor(study: NetworkStudyRecord): string | null {
  const name = study.protocolSection.sponsorCollaboratorsModule.leadSponsor.name;
  if (typeof name !== "string") {
    return null;
  }

  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : null;
}
