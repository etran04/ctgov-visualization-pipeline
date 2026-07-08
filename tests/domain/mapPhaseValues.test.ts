import { describe, expect, it } from "vitest";
import {
  mapCtgovPhaseToDomain,
  mapDomainPhaseToCtgov,
  PHASE_BIN_ORDER,
} from "../../src/domain/mapPhaseValues.js";

describe("mapCtgovPhaseToDomain", () => {
  it("maps known CT.gov phase constants to domain labels", () => {
    expect(mapCtgovPhaseToDomain("PHASE1")).toBe("Phase 1");
    expect(mapCtgovPhaseToDomain("PHASE2")).toBe("Phase 2");
    expect(mapCtgovPhaseToDomain("PHASE3")).toBe("Phase 3");
    expect(mapCtgovPhaseToDomain("PHASE4")).toBe("Phase 4");
    expect(mapCtgovPhaseToDomain("EARLY_PHASE1")).toBe("Early Phase 1");
    expect(mapCtgovPhaseToDomain("NA")).toBe("Not Applicable");
  });

  it("returns null for unknown values", () => {
    expect(mapCtgovPhaseToDomain("PHASE5")).toBeNull();
    expect(mapCtgovPhaseToDomain("")).toBeNull();
  });
});

describe("mapDomainPhaseToCtgov", () => {
  it("maps known domain labels to CT.gov constants", () => {
    expect(mapDomainPhaseToCtgov("Phase 1")).toBe("PHASE1");
    expect(mapDomainPhaseToCtgov("Phase 2")).toBe("PHASE2");
    expect(mapDomainPhaseToCtgov("Phase 3")).toBe("PHASE3");
    expect(mapDomainPhaseToCtgov("Phase 4")).toBe("PHASE4");
    expect(mapDomainPhaseToCtgov("Early Phase 1")).toBe("EARLY_PHASE1");
    expect(mapDomainPhaseToCtgov("Not Applicable")).toBe("NA");
  });

  it("returns null for unknown labels", () => {
    expect(mapDomainPhaseToCtgov("Phase 5")).toBeNull();
    expect(mapDomainPhaseToCtgov("")).toBeNull();
  });
});

describe("PHASE_BIN_ORDER", () => {
  it("keeps deterministic display order", () => {
    expect(PHASE_BIN_ORDER).toEqual([
      "Phase 1",
      "Phase 2",
      "Phase 3",
      "Phase 4",
      "Early Phase 1",
      "Not Applicable",
    ]);
  });
});
