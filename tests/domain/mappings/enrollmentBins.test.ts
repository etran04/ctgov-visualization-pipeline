import { describe, expect, it } from "vitest";
import {
  ENROLLMENT_BIN_ORDER,
  mapEnrollmentToBin,
} from "../../../src/domain/mappings/enrollmentBins.js";

describe("mapEnrollmentToBin", () => {
  it("assigns counts to the correct closed bins", () => {
    expect(mapEnrollmentToBin(1)).toBe("1–50");
    expect(mapEnrollmentToBin(25)).toBe("1–50");
    expect(mapEnrollmentToBin(75)).toBe("51–100");
    expect(mapEnrollmentToBin(250)).toBe("101–500");
    expect(mapEnrollmentToBin(750)).toBe("501–1,000");
    expect(mapEnrollmentToBin(2500)).toBe("1,001–5,000");
  });

  it("places boundary values in the lower bin at upper edges", () => {
    expect(mapEnrollmentToBin(50)).toBe("1–50");
    expect(mapEnrollmentToBin(100)).toBe("51–100");
    expect(mapEnrollmentToBin(500)).toBe("101–500");
    expect(mapEnrollmentToBin(1000)).toBe("501–1,000");
    expect(mapEnrollmentToBin(5000)).toBe("1,001–5,000");
  });

  it("places values above 5000 in the open-ended top bin", () => {
    expect(mapEnrollmentToBin(5001)).toBe("5,001+");
    expect(mapEnrollmentToBin(10000)).toBe("5,001+");
  });

  it("returns null for non-positive or non-integer counts", () => {
    expect(mapEnrollmentToBin(0)).toBeNull();
    expect(mapEnrollmentToBin(-1)).toBeNull();
    expect(mapEnrollmentToBin(50.5)).toBeNull();
  });
});

describe("ENROLLMENT_BIN_ORDER", () => {
  it("keeps deterministic display order with fixed bin edges", () => {
    expect(ENROLLMENT_BIN_ORDER).toEqual([
      { bin_label: "1–50", bin_start: 1, bin_end: 50 },
      { bin_label: "51–100", bin_start: 51, bin_end: 100 },
      { bin_label: "101–500", bin_start: 101, bin_end: 500 },
      { bin_label: "501–1,000", bin_start: 501, bin_end: 1000 },
      { bin_label: "1,001–5,000", bin_start: 1001, bin_end: 5000 },
      { bin_label: "5,001+", bin_start: 5001, bin_end: null },
    ]);
  });
});
