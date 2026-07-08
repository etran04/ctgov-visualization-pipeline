import type {
  DistributionStudyRecord,
  PhaseStudyRecord,
  TimelineStudyRecord,
} from "../../src/domain/types/ctgovStudyTypes.js";

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

export const validEnrollmentSmallStudy = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000201",
    },
    designModule: {
      enrollmentInfo: {
        count: 25,
      },
    },
  },
} satisfies DistributionStudyRecord;

export const validEnrollmentMidStudy = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000202",
    },
    designModule: {
      enrollmentInfo: {
        count: 75,
      },
    },
  },
} satisfies DistributionStudyRecord;

export const validEnrollmentBoundary50Study = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000203",
    },
    designModule: {
      enrollmentInfo: {
        count: 50,
      },
    },
  },
} satisfies DistributionStudyRecord;

export const validEnrollmentBoundary51Study = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000204",
    },
    designModule: {
      enrollmentInfo: {
        count: 51,
      },
    },
  },
} satisfies DistributionStudyRecord;

export const validEnrollmentLargeStudy = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000205",
    },
    designModule: {
      enrollmentInfo: {
        count: 6000,
      },
    },
  },
} satisfies DistributionStudyRecord;

export const validEnrollmentBoundary5000Study = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000206",
    },
    designModule: {
      enrollmentInfo: {
        count: 5000,
      },
    },
  },
} satisfies DistributionStudyRecord;

export const validEnrollmentBoundary5001Study = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000207",
    },
    designModule: {
      enrollmentInfo: {
        count: 5001,
      },
    },
  },
} satisfies DistributionStudyRecord;

export const validEnrollmentSameBinStudy = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000208",
    },
    designModule: {
      enrollmentInfo: {
        count: 30,
      },
    },
  },
} satisfies DistributionStudyRecord;

export const malformedStudyMissingEnrollment = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000209",
    },
    designModule: {},
  },
};

export const malformedStudyZeroEnrollment = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000210",
    },
    designModule: {
      enrollmentInfo: {
        count: 0,
      },
    },
  },
} satisfies DistributionStudyRecord;

export const malformedStudyNegativeEnrollment = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000211",
    },
    designModule: {
      enrollmentInfo: {
        count: -10,
      },
    },
  },
} satisfies DistributionStudyRecord;

export const malformedStudyNonIntegerEnrollment = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000212",
    },
    designModule: {
      enrollmentInfo: {
        count: 100.5,
      },
    },
  },
} satisfies DistributionStudyRecord;

export const malformedStudyInvalidEnrollmentType = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000213",
    },
    designModule: {
      enrollmentInfo: {
        count: "500",
      },
    },
  },
};

/** Cast intentionally malformed fixtures for defensive aggregator tests. */
export function asDistributionStudy(study: unknown): DistributionStudyRecord {
  return study as DistributionStudyRecord;
}
