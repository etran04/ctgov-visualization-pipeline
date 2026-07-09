import { describe, expect, it } from "vitest";
import { NETWORK_DIMENSIONS } from "../../../src/domain/network/dimensions.js";

describe("NETWORK_DIMENSIONS", () => {
  it("registers drug_sponsor with left/right extractors and required CT.gov fields", () => {
    const config = NETWORK_DIMENSIONS.drug_sponsor;

    expect(config.leftEntityType).toBe("drug");
    expect(config.rightEntityType).toBe("sponsor");
    expect(typeof config.extractLeft).toBe("function");
    expect(typeof config.extractRight).toBe("function");
    expect(config.requiredFields).toEqual(["NCTId", "InterventionName", "LeadSponsorName"]);
  });

  it("only exposes drug_sponsor in V1", () => {
    expect(Object.keys(NETWORK_DIMENSIONS)).toEqual(["drug_sponsor"]);
  });
});
