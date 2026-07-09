type StudyWithIdentification = {
  protocolSection: {
    identificationModule: {
      nctId: string;
      briefTitle?: string;
    };
  };
};

/**
 * Build a lookup from NCT ID to trimmed brief title for citation assembly.
 * Skips studies missing nctId or with an empty briefTitle.
 */
export function buildStudyExcerptIndex(
  studies: readonly StudyWithIdentification[],
): Map<string, string> {
  const index = new Map<string, string>();

  for (const study of studies) {
    const { nctId, briefTitle } = study.protocolSection.identificationModule;
    if (nctId.length === 0) {
      continue;
    }

    if (typeof briefTitle !== "string") {
      continue;
    }

    const trimmed = briefTitle.trim();
    if (trimmed.length === 0) {
      continue;
    }

    index.set(nctId, trimmed);
  }

  return index;
}
