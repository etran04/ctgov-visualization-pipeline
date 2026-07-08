export const validSinglePhaseStudy = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000001",
    },
    designModule: {
      phases: ["PHASE2"],
    },
  },
};

export const validMultiPhaseStudy = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000002",
    },
    designModule: {
      phases: ["PHASE1", "PHASE3"],
    },
  },
};

export const validDuplicatePhaseStudy = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000003",
    },
    designModule: {
      phases: ["PHASE1", "PHASE1"],
    },
  },
};

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
};

export const malformedStudyEmptyPhases = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000007",
    },
    designModule: {
      phases: [],
    },
  },
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};
