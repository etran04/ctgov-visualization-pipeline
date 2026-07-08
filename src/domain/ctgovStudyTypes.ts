import type { Intent } from "./schemas/intents.js";

/**
 * Shape expected from CT.gov before runtime validation.
 *
 * Not trusted until parsed by `normalizePhaseStudy` or `normalizeTimelineStudy`.
 */
export type CtgovRawStudy = {
  protocolSection?: {
    identificationModule?: { nctId?: unknown };
    designModule?: { phases?: unknown };
    statusModule?: { startDateStruct?: { date?: unknown } };
  };
};

type StudyIdentification = {
  protocolSection: {
    identificationModule: {
      nctId: string;
    };
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

/** Any successfully normalized study record from `fetchStudies`. */
export type CtgovStudyRecord = PhaseStudyRecord | TimelineStudyRecord;

/** Map intent to the strict record shape produced by fetch for that intent. */
export type StudyRecordForIntent<I extends Intent> = I extends "comparison"
  ? PhaseStudyRecord
  : I extends "trend_over_time"
    ? TimelineStudyRecord
    : never;
