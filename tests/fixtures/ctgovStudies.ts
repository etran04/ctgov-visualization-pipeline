import type { NetworkStudyRecord } from "../../src/domain/network/types.js";
import type {
  DistributionStudyRecord,
  PhaseStudyRecord,
  RelationshipStudyRecord,
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

export const validRelationshipStudy = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000301",
    },
    designModule: {
      enrollmentInfo: {
        count: 120,
      },
    },
    statusModule: {
      startDateStruct: {
        date: "2020-06-15",
      },
    },
  },
} satisfies RelationshipStudyRecord;

export const validRelationshipStudySecondYear = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000302",
    },
    designModule: {
      enrollmentInfo: {
        count: 75,
      },
    },
    statusModule: {
      startDateStruct: {
        date: "2021-03-01",
      },
    },
  },
} satisfies RelationshipStudyRecord;

export const validRelationshipStudySameYearLowerEnrollment = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000303",
    },
    designModule: {
      enrollmentInfo: {
        count: 50,
      },
    },
    statusModule: {
      startDateStruct: {
        date: "2020-11-01",
      },
    },
  },
} satisfies RelationshipStudyRecord;

export const validRelationshipStudySameYearHigherEnrollment = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000304",
    },
    designModule: {
      enrollmentInfo: {
        count: 200,
      },
    },
    statusModule: {
      startDateStruct: {
        date: "2020-01-01",
      },
    },
  },
} satisfies RelationshipStudyRecord;

export const validRelationshipStudyMonthYearDate = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000305",
    },
    designModule: {
      enrollmentInfo: {
        count: 300,
      },
    },
    statusModule: {
      startDateStruct: {
        date: "January 2023",
      },
    },
  },
} satisfies RelationshipStudyRecord;

export const malformedRelationshipStudyMissingEnrollment = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000306",
    },
    designModule: {},
    statusModule: {
      startDateStruct: {
        date: "2022-01-01",
      },
    },
  },
};

export const malformedRelationshipStudyZeroEnrollment = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000307",
    },
    designModule: {
      enrollmentInfo: {
        count: 0,
      },
    },
    statusModule: {
      startDateStruct: {
        date: "2022-01-01",
      },
    },
  },
} satisfies RelationshipStudyRecord;

export const malformedRelationshipStudyMissingStartDate = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000308",
    },
    designModule: {
      enrollmentInfo: {
        count: 100,
      },
    },
    statusModule: {},
  },
};

export const malformedRelationshipStudyUnparseableStartDate = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000309",
    },
    designModule: {
      enrollmentInfo: {
        count: 100,
      },
    },
    statusModule: {
      startDateStruct: {
        date: "TBD",
      },
    },
  },
} satisfies RelationshipStudyRecord;

/** Cast intentionally malformed fixtures for defensive aggregator tests. */
export function asRelationshipStudy(study: unknown): RelationshipStudyRecord {
  return study as RelationshipStudyRecord;
}

export const validNetworkSingleInterventionStudy = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000401",
    },
    armsInterventionsModule: {
      interventions: [{ name: "Pembrolizumab" }],
    },
    sponsorCollaboratorsModule: {
      leadSponsor: { name: "Merck Sharp & Dohme LLC" },
    },
  },
} satisfies NetworkStudyRecord;

export const validNetworkMultiInterventionStudy = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000402",
    },
    armsInterventionsModule: {
      interventions: [{ name: "Pembrolizumab" }, { name: "Carboplatin" }],
    },
    sponsorCollaboratorsModule: {
      leadSponsor: { name: "National Cancer Institute" },
    },
  },
} satisfies NetworkStudyRecord;

export const validNetworkSamePairSecondStudy = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000403",
    },
    armsInterventionsModule: {
      interventions: [{ name: "Pembrolizumab 2 mg/kg" }],
    },
    sponsorCollaboratorsModule: {
      leadSponsor: { name: "Merck Sharp & Dohme LLC" },
    },
  },
} satisfies NetworkStudyRecord;

export const validNetworkComboTrialStudy = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000404",
    },
    armsInterventionsModule: {
      interventions: [{ name: "Drug A" }, { name: "Drug B" }, { name: "Placebo" }],
    },
    sponsorCollaboratorsModule: {
      leadSponsor: { name: "Acme Pharma Inc." },
    },
  },
} satisfies NetworkStudyRecord;

export const malformedNetworkStudyMissingSponsor = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000405",
    },
    armsInterventionsModule: {
      interventions: [{ name: "Pembrolizumab" }],
    },
    sponsorCollaboratorsModule: {
      leadSponsor: { name: "" },
    },
  },
} satisfies NetworkStudyRecord;

export const malformedNetworkStudyEmptyInterventions = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000406",
    },
    armsInterventionsModule: {
      interventions: [],
    },
    sponsorCollaboratorsModule: {
      leadSponsor: { name: "Merck Sharp & Dohme LLC" },
    },
  },
} satisfies NetworkStudyRecord;

export const malformedNetworkStudyMissingNctId = {
  protocolSection: {
    identificationModule: {
      nctId: "",
    },
    armsInterventionsModule: {
      interventions: [{ name: "Pembrolizumab" }],
    },
    sponsorCollaboratorsModule: {
      leadSponsor: { name: "Merck Sharp & Dohme LLC" },
    },
  },
} satisfies NetworkStudyRecord;

/** Cast intentionally malformed fixtures for defensive aggregator tests. */
export function asNetworkStudy(study: unknown): NetworkStudyRecord {
  return study as NetworkStudyRecord;
}
