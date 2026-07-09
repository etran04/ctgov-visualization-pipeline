import { describe, expect, it } from "vitest";
import { parseEnrollmentCount } from "../../../src/domain/utils/parseEnrollmentCount.js";

describe("parseEnrollmentCount", () => {
  it("returns positive integers unchanged", () => {
    expect(parseEnrollmentCount(1)).toBe(1);
    expect(parseEnrollmentCount(50)).toBe(50);
    expect(parseEnrollmentCount(5001)).toBe(5001);
  });

  it("returns null for zero", () => {
    expect(parseEnrollmentCount(0)).toBeNull();
  });

  it("returns null for negative values", () => {
    expect(parseEnrollmentCount(-1)).toBeNull();
    expect(parseEnrollmentCount(-100)).toBeNull();
  });

  it("returns null for non-integer values", () => {
    expect(parseEnrollmentCount(100.5)).toBeNull();
    expect(parseEnrollmentCount(1.1)).toBeNull();
  });

  it("returns null for missing or wrong-type values", () => {
    expect(parseEnrollmentCount(undefined)).toBeNull();
    expect(parseEnrollmentCount(null)).toBeNull();
    expect(parseEnrollmentCount("500")).toBeNull();
    expect(parseEnrollmentCount(NaN)).toBeNull();
    expect(parseEnrollmentCount(Infinity)).toBeNull();
  });
});
