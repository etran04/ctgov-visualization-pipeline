import { describe, expect, it } from "vitest";
import { parseStudyStartYear } from "../../../src/domain/utils/parseStudyDate.js";

describe("parseStudyStartYear", () => {
  it("parses ISO full dates", () => {
    expect(parseStudyStartYear("2024-01-15")).toBe(2024);
    expect(parseStudyStartYear("2020-06-15")).toBe(2020);
  });

  it("parses ISO year-month dates", () => {
    expect(parseStudyStartYear("2024-01")).toBe(2024);
    expect(parseStudyStartYear("2023-12")).toBe(2023);
  });

  it("parses month-year strings", () => {
    expect(parseStudyStartYear("January 2024")).toBe(2024);
    expect(parseStudyStartYear("March 2020")).toBe(2020);
    expect(parseStudyStartYear("Dec 2019")).toBe(2019);
  });

  it("parses year-only strings", () => {
    expect(parseStudyStartYear("2023")).toBe(2023);
    expect(parseStudyStartYear("1999")).toBe(1999);
  });

  it("returns null for missing, empty, or invalid values", () => {
    expect(parseStudyStartYear(undefined)).toBeNull();
    expect(parseStudyStartYear(null)).toBeNull();
    expect(parseStudyStartYear("")).toBeNull();
    expect(parseStudyStartYear("   ")).toBeNull();
    expect(parseStudyStartYear("TBD")).toBeNull();
    expect(parseStudyStartYear("15-01-2024")).toBeNull();
    expect(parseStudyStartYear(2024)).toBeNull();
  });

  it("rejects years outside the supported range", () => {
    expect(parseStudyStartYear("1899-01-01")).toBeNull();
    expect(parseStudyStartYear("2101")).toBeNull();
  });
});
