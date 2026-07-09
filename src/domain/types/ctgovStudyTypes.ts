import type { Intent } from "../schemas/intents.js";

/**
 * Shape expected from CT.gov before runtime validation.
 *
 * Not trusted until parsed by `normalizePhaseStudy` or `normalizeTimelineStudy`.
 */
export type CtgovRawStudy = {
  protocolSection?: {
    identificationModule?: { nctId?: unknown; briefTitle?: unknown };
    designModule?: {
      phases?: unknown;
      enrollmentInfo?: { count?: unknown };
    };
    statusModule?: { startDateStruct?: { date?: unknown } };
    armsInterventionsModule?: { interventions?: unknown };
    sponsorCollaboratorsModule?: { leadSponsor?: { name?: unknown } };
  };
};

type StudyIdentificationModule = {
  nctId: string;
  briefTitle?: string;
};

type StudyIdentification = {
  protocolSection: {
    identificationModule: StudyIdentificationModule;
  };
};

/** Validated study with phases — output of comparison fetch. */
export type PhaseStudyRecord = StudyIdentification & {
  protocolSection: StudyIdentification["protocolSection"] & {
    designModule: {
      phases: string[];
    };
  };
};

/** Validated study with start date — output of timeline fetch. */
export type TimelineStudyRecord = StudyIdentification & {
  protocolSection: StudyIdentification["protocolSection"] & {
    statusModule: {
      startDateStruct: {
        date: string;
      };
    };
  };
};

/** Validated study with enrollment count — output of distribution fetch. */
export type DistributionStudyRecord = StudyIdentification & {
  protocolSection: StudyIdentification["protocolSection"] & {
    designModule: {
      enrollmentInfo: {
        count: number;
      };
    };
  };
};

/** Validated study with enrollment and start date — output of relationship fetch. */
export type RelationshipStudyRecord = StudyIdentification & {
  protocolSection: StudyIdentification["protocolSection"] & {
    designModule: {
      enrollmentInfo: {
        count: number;
      };
    };
    statusModule: {
      startDateStruct: {
        date: string;
      };
    };
  };
};

/** Validated study with interventions and lead sponsor — output of network fetch. */
export type NetworkStudyRecord = StudyIdentification & {
  protocolSection: StudyIdentification["protocolSection"] & {
    armsInterventionsModule: { interventions: { name: string }[] };
    sponsorCollaboratorsModule: { leadSponsor: { name: string } };
  };
};

/** Any successfully normalized study record from `fetchStudies`. */
export type CtgovStudyRecord =
  | PhaseStudyRecord
  | TimelineStudyRecord
  | DistributionStudyRecord
  | RelationshipStudyRecord
  | NetworkStudyRecord;

/** Map intent to the strict record shape produced by fetch for that intent. */
export type StudyRecordForIntent<I extends Intent> = I extends "comparison"
  ? PhaseStudyRecord
  : I extends "trend_over_time"
    ? TimelineStudyRecord
    : I extends "distribution"
      ? DistributionStudyRecord
      : I extends "relationship"
        ? RelationshipStudyRecord
        : I extends "network"
          ? NetworkStudyRecord
          : never;
