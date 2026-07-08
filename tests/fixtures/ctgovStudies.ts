import type { PhaseStudyRecord, TimelineStudyRecord } from "../../src/domain/ctgovStudyTypes.js";

export const validSinglePhaseStudy = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000001",
    },
    designModule: {
      phases: ["PHASE2"],
    },
  },
} satisfies PhaseStudyRecord;

export const validMultiPhaseStudy = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000002",
    },
    designModule: {
      phases: ["PHASE1", "PHASE3"],
    },
  },
} satisfies PhaseStudyRecord;

export const validDuplicatePhaseStudy = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000003",
    },
    designModule: {
      phases: ["PHASE1", "PHASE1"],
    },
  },
} satisfies PhaseStudyRecord;

export const malformedStudyMissingPhases = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000004",
    },
    designModule: {},
  },
};

export const malformedStudyInvalidPhasesType = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000005",
    },
    designModule: {
      phases: "PHASE1",
    },
  },
};

export const malformedStudyUnknownPhase = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000006",
    },
    designModule: {
      phases: ["PHASE5"],
    },
  },
} satisfies PhaseStudyRecord;

export const malformedStudyEmptyPhases = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000007",
    },
    designModule: {
      phases: [],
    },
  },
} satisfies PhaseStudyRecord;

export const validStudyIsoStartDate = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000101",
    },
    statusModule: {
      startDateStruct: {
        date: "2020-06-15",
      },
    },
  },
} satisfies TimelineStudyRecord;

export const validStudyMonthYearStartDate = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000102",
    },
    statusModule: {
      startDateStruct: {
        date: "January 2023",
      },
    },
  },
} satisfies TimelineStudyRecord;

export const validStudyYearOnlyStartDate = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000103",
    },
    statusModule: {
      startDateStruct: {
        date: "2023",
      },
    },
  },
} satisfies TimelineStudyRecord;

export const validStudySameYearAsIso = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000104",
    },
    statusModule: {
      startDateStruct: {
        date: "2020-11-01",
      },
    },
  },
} satisfies TimelineStudyRecord;

export const validStudyGapYearStartDate = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000105",
    },
    statusModule: {
      startDateStruct: {
        date: "2023-03-01",
      },
    },
  },
} satisfies TimelineStudyRecord;

export const malformedStudyMissingStartDate = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000106",
    },
    statusModule: {},
  },
};

export const malformedStudyInvalidStartDateType = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000107",
    },
    statusModule: {
      startDateStruct: {
        date: 2023,
      },
    },
  },
};

export const malformedStudyUnparseableStartDate = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000108",
    },
    statusModule: {
      startDateStruct: {
        date: "TBD",
      },
    },
  },
} satisfies TimelineStudyRecord;

export const malformedStudyEmptyStartDate = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000109",
    },
    statusModule: {
      startDateStruct: {
        date: "",
      },
    },
  },
} satisfies TimelineStudyRecord;

/** Cast intentionally malformed fixtures for defensive aggregator tests. */
export function asPhaseStudy(study: unknown): PhaseStudyRecord {
  return study as PhaseStudyRecord;
}

/** Cast intentionally malformed fixtures for defensive aggregator tests. */
export function asTimelineStudy(study: unknown): TimelineStudyRecord {
  return study as TimelineStudyRecord;
}
