import type { Intent } from "../../domain/schemas/intents.js";
import type {
  CtgovStudyRecord,
  DistributionStudyRecord,
  NetworkStudyRecord,
  PhaseStudyRecord,
  RelationshipStudyRecord,
  TimelineStudyRecord,
} from "../../domain/types/ctgovStudyTypes.js";
import { parseEnrollmentCount } from "../../domain/utils/parseEnrollmentCount.js";
import { parseStudyStartYear } from "../../domain/utils/parseStudyDate.js";

function extractNctId(study: Record<string, unknown>): string | null {
  const protocolSection = study.protocolSection;
  if (typeof protocolSection !== "object" || protocolSection === null) {
    return null;
  }

  const identificationModule = (protocolSection as Record<string, unknown>).identificationModule;
  if (typeof identificationModule !== "object" || identificationModule === null) {
    return null;
  }

  const nctId = (identificationModule as Record<string, unknown>).nctId;
  return typeof nctId === "string" ? nctId : null;
}

function extractBriefTitle(study: Record<string, unknown>): string | null {
  const protocolSection = study.protocolSection;
  if (typeof protocolSection !== "object" || protocolSection === null) {
    return null;
  }

  const identificationModule = (protocolSection as Record<string, unknown>).identificationModule;
  if (typeof identificationModule !== "object" || identificationModule === null) {
    return null;
  }

  const briefTitle = (identificationModule as Record<string, unknown>).briefTitle;
  if (typeof briefTitle !== "string") {
    return null;
  }

  const trimmed = briefTitle.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildIdentificationModule(
  rawStudy: Record<string, unknown>,
  requestedFields: readonly string[],
): { nctId: string; briefTitle?: string } | null {
  const nctId = extractNctId(rawStudy);
  if (nctId === null) {
    return null;
  }

  const fieldSet = new Set(requestedFields);
  if (!fieldSet.has("BriefTitle")) {
    return { nctId };
  }

  const briefTitle = extractBriefTitle(rawStudy);
  if (briefTitle === null) {
    return { nctId };
  }

  return { nctId, briefTitle };
}

function normalizePhases(designModule: unknown): string[] | null {
  if (typeof designModule !== "object" || designModule === null) {
    return null;
  }

  const phases = (designModule as Record<string, unknown>).phases;
  if (!Array.isArray(phases)) {
    return null;
  }

  const normalizedPhases = phases.filter((phase): phase is string => typeof phase === "string");
  if (normalizedPhases.length === 0) {
    return null;
  }

  return normalizedPhases;
}

function normalizeStartDate(statusModule: unknown): string | null {
  if (typeof statusModule !== "object" || statusModule === null) {
    return null;
  }

  const startDateStruct = (statusModule as Record<string, unknown>).startDateStruct;
  if (typeof startDateStruct !== "object" || startDateStruct === null) {
    return null;
  }

  const date = (startDateStruct as Record<string, unknown>).date;
  if (typeof date !== "string" || parseStudyStartYear(date) === null) {
    return null;
  }

  return date;
}

function normalizeEnrollmentCount(designModule: unknown): number | null {
  if (typeof designModule !== "object" || designModule === null) {
    return null;
  }

  const enrollmentInfo = (designModule as Record<string, unknown>).enrollmentInfo;
  if (typeof enrollmentInfo !== "object" || enrollmentInfo === null) {
    return null;
  }

  return parseEnrollmentCount((enrollmentInfo as Record<string, unknown>).count);
}

function normalizePhaseStudy(
  study: unknown,
  requestedFields: readonly string[],
): PhaseStudyRecord | null {
  if (typeof study !== "object" || study === null) {
    return null;
  }

  const rawStudy = study as Record<string, unknown>;
  const identificationModule = buildIdentificationModule(rawStudy, requestedFields);
  if (identificationModule === null) {
    return null;
  }

  const protocolSection = rawStudy.protocolSection as Record<string, unknown>;
  const phases = normalizePhases(protocolSection.designModule);
  if (phases === null) {
    return null;
  }

  return {
    protocolSection: {
      identificationModule,
      designModule: { phases },
    },
  };
}

function normalizeTimelineStudy(
  study: unknown,
  requestedFields: readonly string[],
): TimelineStudyRecord | null {
  if (typeof study !== "object" || study === null) {
    return null;
  }

  const rawStudy = study as Record<string, unknown>;
  const identificationModule = buildIdentificationModule(rawStudy, requestedFields);
  if (identificationModule === null) {
    return null;
  }

  const protocolSection = rawStudy.protocolSection as Record<string, unknown>;
  const date = normalizeStartDate(protocolSection.statusModule);
  if (date === null) {
    return null;
  }

  return {
    protocolSection: {
      identificationModule,
      statusModule: {
        startDateStruct: { date },
      },
    },
  };
}

function normalizeDistributionStudy(
  study: unknown,
  requestedFields: readonly string[],
): DistributionStudyRecord | null {
  if (typeof study !== "object" || study === null) {
    return null;
  }

  const rawStudy = study as Record<string, unknown>;
  const identificationModule = buildIdentificationModule(rawStudy, requestedFields);
  if (identificationModule === null) {
    return null;
  }

  const protocolSection = rawStudy.protocolSection as Record<string, unknown>;
  const count = normalizeEnrollmentCount(protocolSection.designModule);
  if (count === null) {
    return null;
  }

  return {
    protocolSection: {
      identificationModule,
      designModule: {
        enrollmentInfo: { count },
      },
    },
  };
}

function normalizeRelationshipStudy(
  study: unknown,
  requestedFields: readonly string[],
): RelationshipStudyRecord | null {
  if (typeof study !== "object" || study === null) {
    return null;
  }

  const rawStudy = study as Record<string, unknown>;
  const identificationModule = buildIdentificationModule(rawStudy, requestedFields);
  if (identificationModule === null) {
    return null;
  }

  const protocolSection = rawStudy.protocolSection as Record<string, unknown>;
  const count = normalizeEnrollmentCount(protocolSection.designModule);
  if (count === null) {
    return null;
  }

  const date = normalizeStartDate(protocolSection.statusModule);
  if (date === null) {
    return null;
  }

  return {
    protocolSection: {
      identificationModule,
      designModule: {
        enrollmentInfo: { count },
      },
      statusModule: {
        startDateStruct: { date },
      },
    },
  };
}

function normalizeInterventions(armsInterventionsModule: unknown): { name: string }[] | null {
  if (typeof armsInterventionsModule !== "object" || armsInterventionsModule === null) {
    return null;
  }

  const interventions = (armsInterventionsModule as Record<string, unknown>).interventions;
  if (!Array.isArray(interventions) || interventions.length === 0) {
    return null;
  }

  const normalized = interventions
    .map((intervention) => {
      if (typeof intervention !== "object" || intervention === null) {
        return null;
      }

      const name = (intervention as Record<string, unknown>).name;
      if (typeof name !== "string") {
        return null;
      }

      const trimmed = name.trim();
      return trimmed.length > 0 ? { name: trimmed } : null;
    })
    .filter((intervention): intervention is { name: string } => intervention !== null);

  return normalized.length > 0 ? normalized : null;
}

function normalizeLeadSponsor(sponsorCollaboratorsModule: unknown): { name: string } | null {
  if (typeof sponsorCollaboratorsModule !== "object" || sponsorCollaboratorsModule === null) {
    return null;
  }

  const leadSponsor = (sponsorCollaboratorsModule as Record<string, unknown>).leadSponsor;
  if (typeof leadSponsor !== "object" || leadSponsor === null) {
    return null;
  }

  const name = (leadSponsor as Record<string, unknown>).name;
  if (typeof name !== "string") {
    return null;
  }

  const trimmed = name.trim();
  return trimmed.length > 0 ? { name: trimmed } : null;
}

function normalizeNetworkStudy(
  study: unknown,
  requestedFields: readonly string[],
): NetworkStudyRecord | null {
  if (typeof study !== "object" || study === null) {
    return null;
  }

  const rawStudy = study as Record<string, unknown>;
  const identificationModule = buildIdentificationModule(rawStudy, requestedFields);
  if (identificationModule === null || identificationModule.nctId.length === 0) {
    return null;
  }

  const protocolSection = rawStudy.protocolSection as Record<string, unknown>;
  const interventions = normalizeInterventions(protocolSection.armsInterventionsModule);
  if (interventions === null) {
    return null;
  }

  const leadSponsor = normalizeLeadSponsor(protocolSection.sponsorCollaboratorsModule);
  if (leadSponsor === null) {
    return null;
  }

  return {
    protocolSection: {
      identificationModule,
      armsInterventionsModule: { interventions },
      sponsorCollaboratorsModule: { leadSponsor },
    },
  };
}

/**
 * Normalize a raw CT.gov study payload into a typed record.
 *
 * When `intent` is provided, routing is intent-aware (e.g. relationship requires
 * both enrollment and start date). Otherwise falls back to field-based routing
 * for backward compatibility.
 */
export function normalizeStudy(
  study: unknown,
  requestedFields: readonly string[],
  intent?: Intent,
): CtgovStudyRecord | null {
  if (intent !== undefined) {
    switch (intent) {
      case "comparison":
        return normalizePhaseStudy(study, requestedFields);
      case "trend_over_time":
        return normalizeTimelineStudy(study, requestedFields);
      case "distribution":
        return normalizeDistributionStudy(study, requestedFields);
      case "relationship":
        return normalizeRelationshipStudy(study, requestedFields);
      case "network":
        return normalizeNetworkStudy(study, requestedFields);
    }
  }

  const fieldSet = new Set(requestedFields);

  if (fieldSet.has("InterventionName") || fieldSet.has("LeadSponsorName")) {
    return normalizeNetworkStudy(study, requestedFields);
  }

  if (fieldSet.has("Phase")) {
    return normalizePhaseStudy(study, requestedFields);
  }

  if (fieldSet.has("StartDate")) {
    return normalizeTimelineStudy(study, requestedFields);
  }

  if (fieldSet.has("EnrollmentCount")) {
    return normalizeDistributionStudy(study, requestedFields);
  }

  return null;
}
