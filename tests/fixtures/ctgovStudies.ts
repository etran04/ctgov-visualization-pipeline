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
