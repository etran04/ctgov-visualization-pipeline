import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NoStudiesFoundError } from "../../../src/domain/errors.js";
import { getFieldsForIntent } from "../../../src/domain/intents/fieldProfiles.js";
import { fetchStudies } from "../../../src/externals/ctgov/fetchStudies.js";
import {
  malformedRelationshipStudyMissingEnrollment,
  malformedRelationshipStudyMissingStartDate,
  malformedRelationshipStudyZeroEnrollment,
  malformedStudyEmptyPhases,
  malformedStudyInvalidEnrollmentType,
  malformedStudyMissingEnrollment,
  malformedStudyMissingStartDate,
  malformedStudyNonIntegerEnrollment,
  malformedStudyZeroEnrollment,
  validEnrollmentSmallStudy,
  validRelationshipStudy,
  validSinglePhaseStudy,
  validStudyIsoStartDate,
} from "../../fixtures/ctgovStudies.js";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function mockCtgovPage(studies: unknown[], nextPageToken?: string): void {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      studies,
      ...(nextPageToken !== undefined ? { nextPageToken } : {}),
    }),
  });
}

describe("fetchStudies", () => {
  const entities = { drug_name: "Pembrolizumab", condition: null, phase: null };

  it("normalizes phase fields for comparison fetches", async () => {
    mockCtgovPage([validSinglePhaseStudy, malformedStudyEmptyPhases]);

    const result = await fetchStudies(entities, {
      intent: "comparison",
      fields: getFieldsForIntent("comparison"),
    });

    expect(result.studies).toHaveLength(1);
    expect(result.studies[0]).toEqual(validSinglePhaseStudy);
    expect(result.skipped_malformed).toBe(1);
    expect(result.pages_fetched).toBe(1);
  });

  it("normalizes start date fields for timeline fetches without requiring phases", async () => {
    mockCtgovPage([validStudyIsoStartDate, malformedStudyMissingStartDate]);

    const result = await fetchStudies(entities, {
      intent: "trend_over_time",
      fields: getFieldsForIntent("trend_over_time"),
    });

    expect(result.studies).toHaveLength(1);
    expect(result.studies[0]).toEqual(validStudyIsoStartDate);
    expect(result.skipped_malformed).toBe(1);
  });

  it("normalizes enrollment fields for distribution fetches", async () => {
    mockCtgovPage([
      validEnrollmentSmallStudy,
      malformedStudyMissingEnrollment,
      malformedStudyZeroEnrollment,
      malformedStudyNonIntegerEnrollment,
      malformedStudyInvalidEnrollmentType,
    ]);

    const result = await fetchStudies(entities, {
      intent: "distribution",
      fields: getFieldsForIntent("distribution"),
    });

    expect(result.studies).toHaveLength(1);
    expect(result.studies[0]).toEqual(validEnrollmentSmallStudy);
    expect(result.skipped_malformed).toBe(4);
  });

  it("requests enrollment fields in the CT.gov query for distribution fetches", async () => {
    mockCtgovPage([validEnrollmentSmallStudy]);

    await fetchStudies(entities, {
      intent: "distribution",
      fields: getFieldsForIntent("distribution"),
    });

    const calledUrl = new URL(mockFetch.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get("fields")).toBe("NCTId,EnrollmentCount");
  });

  it("throws NoStudiesFoundError when every distribution study is malformed", async () => {
    mockCtgovPage([malformedStudyMissingEnrollment, malformedStudyZeroEnrollment]);

    await expect(
      fetchStudies(entities, {
        intent: "distribution",
        fields: getFieldsForIntent("distribution"),
      }),
    ).rejects.toThrow(NoStudiesFoundError);
  });

  it("requests the provided fields in the CT.gov query", async () => {
    mockCtgovPage([validStudyIsoStartDate]);

    await fetchStudies(entities, {
      intent: "trend_over_time",
      fields: getFieldsForIntent("trend_over_time"),
    });

    const calledUrl = new URL(mockFetch.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get("fields")).toBe("NCTId,StartDate");
  });

  it("throws NoStudiesFoundError when every study is malformed", async () => {
    mockCtgovPage([malformedStudyMissingStartDate]);

    await expect(
      fetchStudies(entities, {
        intent: "trend_over_time",
        fields: getFieldsForIntent("trend_over_time"),
      }),
    ).rejects.toThrow(NoStudiesFoundError);
  });

  it("normalizes enrollment and start date fields for relationship fetches", async () => {
    mockCtgovPage([
      validRelationshipStudy,
      malformedRelationshipStudyMissingEnrollment,
      malformedRelationshipStudyMissingStartDate,
      malformedRelationshipStudyZeroEnrollment,
    ]);

    const result = await fetchStudies(entities, {
      intent: "relationship",
      fields: getFieldsForIntent("relationship"),
    });

    expect(result.studies).toHaveLength(1);
    expect(result.studies[0]).toEqual(validRelationshipStudy);
    expect(result.skipped_malformed).toBe(3);
  });

  it("requests enrollment and start date fields in the CT.gov query for relationship fetches", async () => {
    mockCtgovPage([validRelationshipStudy]);

    await fetchStudies(entities, {
      intent: "relationship",
      fields: getFieldsForIntent("relationship"),
    });

    const calledUrl = new URL(mockFetch.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get("fields")).toBe("NCTId,EnrollmentCount,StartDate");
  });

  it("uses relationship normalization even when all three field types are requested", async () => {
    mockCtgovPage([
      validRelationshipStudy,
      validStudyIsoStartDate,
      validEnrollmentSmallStudy,
    ]);

    const result = await fetchStudies(entities, {
      intent: "relationship",
      fields: getFieldsForIntent("relationship"),
    });

    expect(result.studies).toHaveLength(1);
    expect(result.studies[0]).toEqual(validRelationshipStudy);
    expect(result.skipped_malformed).toBe(2);
  });

  it("throws NoStudiesFoundError when every relationship study is malformed", async () => {
    mockCtgovPage([
      malformedRelationshipStudyMissingEnrollment,
      malformedRelationshipStudyMissingStartDate,
      malformedRelationshipStudyZeroEnrollment,
    ]);

    await expect(
      fetchStudies(entities, {
        intent: "relationship",
        fields: getFieldsForIntent("relationship"),
      }),
    ).rejects.toThrow(NoStudiesFoundError);
  });
});
