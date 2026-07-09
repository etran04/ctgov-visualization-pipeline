import { describe, expect, it } from "vitest";
import {
  getFieldsForIntent,
  getRequiredFieldsForNetworkDimension,
  INTENT_FIELD_PROFILES,
} from "../../../src/domain/intents/fieldProfiles.js";

describe("fieldProfiles", () => {
  it("maps comparison intent to phase fields", () => {
    expect(getFieldsForIntent("comparison")).toEqual(["NCTId", "Phase"]);
  });

  it("maps trend_over_time intent to start date fields", () => {
    expect(getFieldsForIntent("trend_over_time")).toEqual(["NCTId", "StartDate"]);
  });

  it("maps distribution intent to enrollment fields", () => {
    expect(getFieldsForIntent("distribution")).toEqual(["NCTId", "EnrollmentCount"]);
  });

  it("maps relationship intent to enrollment and start date fields", () => {
    expect(getFieldsForIntent("relationship")).toEqual([
      "NCTId",
      "EnrollmentCount",
      "StartDate",
    ]);
  });

  it("maps network intent to intervention and sponsor fields from the dimension registry", () => {
    expect(getFieldsForIntent("network")).toEqual([
      "NCTId",
      "InterventionName",
      "LeadSponsorName",
    ]);
    expect(getFieldsForIntent("network", "drug_sponsor")).toEqual(
      getRequiredFieldsForNetworkDimension("drug_sponsor"),
    );
  });

  it("covers every supported intent", () => {
    expect(Object.keys(INTENT_FIELD_PROFILES).sort()).toEqual([
      "comparison",
      "distribution",
      "network",
      "relationship",
      "trend_over_time",
    ]);
  });
});
