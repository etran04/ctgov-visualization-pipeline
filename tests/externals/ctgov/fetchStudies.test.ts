import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NoStudiesFoundError } from "../../../src/domain/errors.js";
import { getFieldsForIntent } from "../../../src/domain/intentFieldProfiles.js";
import { fetchStudies } from "../../../src/externals/ctgov/fetchStudies.js";
import {
  malformedStudyEmptyPhases,
  malformedStudyMissingStartDate,
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
      fields: getFieldsForIntent("trend_over_time"),
    });

    expect(result.studies).toHaveLength(1);
    expect(result.studies[0]).toEqual(validStudyIsoStartDate);
    expect(result.skipped_malformed).toBe(1);
  });

  it("requests the provided fields in the CT.gov query", async () => {
    mockCtgovPage([validStudyIsoStartDate]);

    await fetchStudies(entities, { fields: getFieldsForIntent("trend_over_time") });

    const calledUrl = new URL(mockFetch.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get("fields")).toBe("NCTId,StartDate");
  });

  it("throws NoStudiesFoundError when every study is malformed", async () => {
    mockCtgovPage([malformedStudyMissingStartDate]);

    await expect(
      fetchStudies(entities, { fields: getFieldsForIntent("trend_over_time") }),
    ).rejects.toThrow(NoStudiesFoundError);
  });
});
