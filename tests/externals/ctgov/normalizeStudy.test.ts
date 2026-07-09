import { describe, expect, it } from "vitest";
import { getFieldsForIntent } from "../../../src/domain/intents/fieldProfiles.js";
import { normalizeStudy } from "../../../src/externals/ctgov/normalizeStudy.js";
import {
  malformedNetworkStudyEmptyInterventions,
  malformedNetworkStudyMissingNctId,
  malformedNetworkStudyMissingSponsor,
  validNetworkComboTrialStudy,
  validNetworkMultiInterventionStudy,
  validNetworkSingleInterventionStudy,
} from "../../fixtures/ctgovStudies.js";

const networkFields = getFieldsForIntent("network");

describe("normalizeStudy — network", () => {
  it("normalizes a single-intervention study", () => {
    const result = normalizeStudy(validNetworkSingleInterventionStudy, networkFields, "network");

    expect(result).toEqual(validNetworkSingleInterventionStudy);
  });

  it("normalizes a multi-intervention study", () => {
    const result = normalizeStudy(validNetworkMultiInterventionStudy, networkFields, "network");

    expect(result).toEqual(validNetworkMultiInterventionStudy);
  });

  it("normalizes a combo trial with multiple drugs", () => {
    const result = normalizeStudy(validNetworkComboTrialStudy, networkFields, "network");

    expect(result).toEqual(validNetworkComboTrialStudy);
  });

  it("trims intervention and sponsor names", () => {
    const raw = {
      protocolSection: {
        identificationModule: { nctId: "NCT00000499" },
        armsInterventionsModule: {
          interventions: [{ name: "  Pembrolizumab  " }],
        },
        sponsorCollaboratorsModule: {
          leadSponsor: { name: "  Merck Sharp & Dohme LLC  " },
        },
      },
    };

    const result = normalizeStudy(raw, networkFields, "network");

    expect(result).toEqual({
      protocolSection: {
        identificationModule: { nctId: "NCT00000499" },
        armsInterventionsModule: {
          interventions: [{ name: "Pembrolizumab" }],
        },
        sponsorCollaboratorsModule: {
          leadSponsor: { name: "Merck Sharp & Dohme LLC" },
        },
      },
    });
  });

  it("drops interventions with empty or non-string names but keeps valid ones", () => {
    const raw = {
      protocolSection: {
        identificationModule: { nctId: "NCT00000498" },
        armsInterventionsModule: {
          interventions: [
            { name: "" },
            { name: "   " },
            { name: 42 },
            { name: "Carboplatin" },
          ],
        },
        sponsorCollaboratorsModule: {
          leadSponsor: { name: "National Cancer Institute" },
        },
      },
    };

    const result = normalizeStudy(raw, networkFields, "network");

    expect(result).toEqual({
      protocolSection: {
        identificationModule: { nctId: "NCT00000498" },
        armsInterventionsModule: {
          interventions: [{ name: "Carboplatin" }],
        },
        sponsorCollaboratorsModule: {
          leadSponsor: { name: "National Cancer Institute" },
        },
      },
    });
  });

  it("rejects studies with a missing sponsor", () => {
    expect(
      normalizeStudy(malformedNetworkStudyMissingSponsor, networkFields, "network"),
    ).toBeNull();
  });

  it("rejects studies with empty interventions", () => {
    expect(
      normalizeStudy(malformedNetworkStudyEmptyInterventions, networkFields, "network"),
    ).toBeNull();
  });

  it("rejects studies with a missing NCT ID", () => {
    expect(
      normalizeStudy(malformedNetworkStudyMissingNctId, networkFields, "network"),
    ).toBeNull();
  });

  it("rejects studies missing the interventions module", () => {
    const raw = {
      protocolSection: {
        identificationModule: { nctId: "NCT00000497" },
        sponsorCollaboratorsModule: {
          leadSponsor: { name: "Merck Sharp & Dohme LLC" },
        },
      },
    };

    expect(normalizeStudy(raw, networkFields, "network")).toBeNull();
  });

  it("rejects studies missing the sponsor module", () => {
    const raw = {
      protocolSection: {
        identificationModule: { nctId: "NCT00000496" },
        armsInterventionsModule: {
          interventions: [{ name: "Pembrolizumab" }],
        },
      },
    };

    expect(normalizeStudy(raw, networkFields, "network")).toBeNull();
  });

  it("routes by requested fields when intent is omitted", () => {
    const result = normalizeStudy(validNetworkSingleInterventionStudy, networkFields);

    expect(result).toEqual(validNetworkSingleInterventionStudy);
  });
});

describe("normalizeStudy — BriefTitle", () => {
  const comparisonFields = getFieldsForIntent("comparison");

  it("includes briefTitle when BriefTitle is requested", () => {
    const raw = {
      protocolSection: {
        identificationModule: {
          nctId: "NCT00000001",
          briefTitle: "  A Study of Pembrolizumab  ",
        },
        designModule: { phases: ["PHASE3"] },
      },
    };

    const result = normalizeStudy(raw, comparisonFields, "comparison");

    expect(result).toEqual({
      protocolSection: {
        identificationModule: {
          nctId: "NCT00000001",
          briefTitle: "A Study of Pembrolizumab",
        },
        designModule: { phases: ["PHASE3"] },
      },
    });
  });

  it("omits briefTitle when BriefTitle is not requested", () => {
    const raw = {
      protocolSection: {
        identificationModule: {
          nctId: "NCT00000002",
          briefTitle: "Should not appear",
        },
        designModule: { phases: ["PHASE2"] },
      },
    };

    const result = normalizeStudy(raw, ["NCTId", "Phase"], "comparison");

    expect(result).toEqual({
      protocolSection: {
        identificationModule: { nctId: "NCT00000002" },
        designModule: { phases: ["PHASE2"] },
      },
    });
  });
});
