import type { Intent } from "../../domain/schemas/intents.js";
import type {
  CtgovStudyRecord,
  DistributionStudyRecord,
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

function normalizePhaseStudy(study: unknown): PhaseStudyRecord | null {
  if (typeof study !== "object" || study === null) {
    return null;
  }

  const rawStudy = study as Record<string, unknown>;
  const nctId = extractNctId(rawStudy);
  if (nctId === null) {
    return null;
  }

  const protocolSection = rawStudy.protocolSection as Record<string, unknown>;
  const phases = normalizePhases(protocolSection.designModule);
  if (phases === null) {
    return null;
  }

  return {
    protocolSection: {
      identificationModule: { nctId },
      designModule: { phases },
    },
  };
}

function normalizeTimelineStudy(study: unknown): TimelineStudyRecord | null {
  if (typeof study !== "object" || study === null) {
    return null;
  }

  const rawStudy = study as Record<string, unknown>;
  const nctId = extractNctId(rawStudy);
  if (nctId === null) {
    return null;
  }

  const protocolSection = rawStudy.protocolSection as Record<string, unknown>;
  const date = normalizeStartDate(protocolSection.statusModule);
  if (date === null) {
    return null;
  }

  return {
    protocolSection: {
      identificationModule: { nctId },
      statusModule: {
        startDateStruct: { date },
      },
    },
  };
}

function normalizeDistributionStudy(study: unknown): DistributionStudyRecord | null {
  if (typeof study !== "object" || study === null) {
    return null;
  }

  const rawStudy = study as Record<string, unknown>;
  const nctId = extractNctId(rawStudy);
  if (nctId === null) {
    return null;
  }

  const protocolSection = rawStudy.protocolSection as Record<string, unknown>;
  const count = normalizeEnrollmentCount(protocolSection.designModule);
  if (count === null) {
    return null;
  }

  return {
    protocolSection: {
      identificationModule: { nctId },
      designModule: {
        enrollmentInfo: { count },
      },
    },
  };
}

function normalizeRelationshipStudy(study: unknown): RelationshipStudyRecord | null {
  if (typeof study !== "object" || study === null) {
    return null;
  }

  const rawStudy = study as Record<string, unknown>;
  const nctId = extractNctId(rawStudy);
  if (nctId === null) {
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
      identificationModule: { nctId },
      designModule: {
        enrollmentInfo: { count },
      },
      statusModule: {
        startDateStruct: { date },
      },
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
        return normalizePhaseStudy(study);
      case "trend_over_time":
        return normalizeTimelineStudy(study);
      case "distribution":
        return normalizeDistributionStudy(study);
      case "relationship":
        return normalizeRelationshipStudy(study);
    }
  }

  const fieldSet = new Set(requestedFields);

  if (fieldSet.has("Phase")) {
    return normalizePhaseStudy(study);
  }

  if (fieldSet.has("StartDate")) {
    return normalizeTimelineStudy(study);
  }

  if (fieldSet.has("EnrollmentCount")) {
    return normalizeDistributionStudy(study);
  }

  return null;
}
